/**
 * The lesson engine: answer matching, teaching-line construction, drill prompts
 * and retry/outcome grading.
 *
 * Extracted from Chat.jsx so that the app and the offline playtest harness run
 * the SAME code. A harness that reimplements this logic drifts from the app the
 * moment either changes, and then reports defects the learner never sees and
 * misses ones they do.
 *
 * Everything here is pure — no React, no DOM, no network. Language context is
 * passed in rather than closed over.
 */

/* ── Normalisation ─────────────────────────────────────────────────────── */

export const splitGraphemes = (value) => {
    if (Array.isArray(value)) return value;
    const seg = typeof Intl !== 'undefined' && Intl.Segmenter
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        : null;
    if (seg) return Array.from(seg.segment(value), s => s.segment);
    return Array.from(value);
};

export const normalizePhrase = (value) => {
    if (!value) return '';
    return value
        .toLowerCase()
        .normalize('NFC')
        .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export const normalizeLatin = (value) => {
    if (!value) return '';
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9[\]()]+/g, ' ')   // brackets kept for [Place] wildcards
        .replace(/\s+/g, ' ')
        .trim();
};

export const levenshtein = (a, b) => {
    const aa = splitGraphemes(a);
    const bb = splitGraphemes(b);
    const alen = aa.length;
    const blen = bb.length;
    if (alen === 0) return blen;
    if (blen === 0) return alen;
    const dp = Array.from({ length: alen + 1 }, () => new Array(blen + 1).fill(0));
    for (let i = 0; i <= alen; i++) dp[i][0] = i;
    for (let j = 0; j <= blen; j++) dp[0][j] = j;
    for (let i = 1; i <= alen; i++) {
        for (let j = 1; j <= blen; j++) {
            const cost = aa[i - 1] === bb[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[alen][blen];
};

/* ── String similarity ─────────────────────────────────────────────────── */

/* The spelling normal form: a word with the two slips this romanisation
   actually produces normalised away, and NOTHING else.

   It used to replace every run of vowels with a single `v`, which forgave vowel
   LENGTH — the thing it was written for — but also erased vowel IDENTITY. That
   made `alli` and `illi` the same string, so the grader scored "Alli" as a
   perfect answer for *Illi* and told the learner, in a spelling note, that
   "there" was how you spell "here". A round-K1 tester was certified wrong twice
   this way (`Illi` for *Alli*, `Idu` for *Adu*) and finished the course unable
   to tell the pair apart — worse than a rejection, because it teaches the error.

   The i-/a-/e- contrast is not decoration in these languages: it is the whole
   deictic system. idu/adu (this/that), illi/alli (here/there), ivaru/avaru
   (this person/that person), and in Telugu idhi/adhi, ikkada/akkada/ekkada.
   A grader for a Dravidian language may not treat the first vowel as noise.

   So: collapse a doubled letter to a single one (vowel length, `kaavali`/
   `kavali`, and consonant doubling, `ikada`/`ikkada` — a real tester typo that
   used to be rejected while a genuinely wrong word was accepted), drop the `h`
   that marks aspiration inconsistently (`snehithulu`/`snehitulu`), and treat
   `o` as `u` because the course writes long ū as `oo` (`moodu`/`mudu`). Vowel
   quality otherwise survives. `y` is a consonant here — counting it as a vowel
   is what let the "ve" of "I've" stand in for *veyi*. */
export const vowelSkeleton = (value) => normalizeLatin(value)
    .replace(/([a-z])\1+/g, '$1')      // aa->a, kk->k: length and doubling
    .replace(/(?<=[bcdgkpt])h/g, '')   // th->t, dh->d: aspiration
    .replace(/o/g, 'u');               // the course spells long uu as "oo"

/* Dravidian deixis lives in the FIRST vowel — i- near, a- far, e-/ye- question.
   A one-character difference at the START of a word is therefore usually a
   different WORD, exactly as a one-character difference at the END is usually a
   different PERSON. This is the mirror of differsOnlyByPersonEnding, and it
   exists for the same reason: the loose `levenshtein <= 1` token rule cannot be
   allowed to forgive the distinction the lessons exist to teach. */
export const differsOnlyByDeicticInitial = (a, b) => {
    if (!a || !b || a === b) return false;
    const split = (w) => /^(y?[aei])(.+)$/.exec(w);
    const da = split(a), db = split(b);
    if (!da || !db || da[1] === db[1]) return false;
    if (da[2].length < 2) return false;
    return da[2] === db[2];
};

export const isSpellingSlip = (a, b) => {
    if (a === b) return false;
    /* Both words have to be substantial and of comparable length. Without this,
       `y` counting as a vowel collapsed *veyi* to the same skeleton as the "ve"
       left over from tokenising "I've" — so a plain-English refusal ("I can't do
       this one, I've never been taught a word for price...") scored full coverage
       against `Veyi rupayalu?` and was graded "Exactly!". A two-character
       fragment is never a misspelling of a four-character word. */
    if (Math.min(a.length, b.length) < 3) return false;
    if (Math.abs(a.length - b.length) > 2) return false;
    return vowelSkeleton(a) === vowelSkeleton(b)
        && !differsOnlyByPersonEnding(a, b)
        && !differsOnlyByDeicticInitial(a, b);
};

export const similarityRatioLatin = (actual, expected) => {
    const na = normalizeLatin(actual);
    const nb = normalizeLatin(expected);
    if (!na || !nb) return 0;

    // [Place] / (name) wildcards: structure match counts as exact
    if (nb.includes('[') || nb.includes('(')) {
        const structuralRegex = nb
            .replace(/[[\]()]/g, '\\$&')
            .replace(/\\\[.*?\\\]/g, '.+')
            .replace(/\\\(.*?\\\)/g, '.+');
        if (new RegExp(`^${structuralRegex}$`, 'i').test(na)) return 1.0;
    }

    const dist = levenshtein(na, nb);
    const len = Math.max(splitGraphemes(na).length, splitGraphemes(nb).length, 1);
    const score = 1 - dist / len;

    // forgive single-vs-double vowel spellings (kavali / kaavali). No score
    // floor: `Mudu` vs `Moodu` costs two edits and scored 0.6, under the old
    // gate of 0.8, so the commonest typo in the course was the one rejected.
    if (score < 1.0 && vowelSkeleton(na) === vowelSkeleton(nb)
        && !differsOnlyByDeicticInitial(na, nb)) return 1.0;

    return score;
};

/* ── Token coverage ────────────────────────────────────────────────────────
   Levenshtein alone lets a learner drop a whole required word and still clear
   the 0.5 threshold: "Emiti" against "Idhi emiti?" scores exactly 0.500. This
   checks the words the target needs are actually present.                   */

export const THRESHOLD = 0.5;
export const COVERAGE_FLOOR = 0.7;

/* Telugu and Kannada mark the subject in the verb ending, so a one-character
   difference at the end of a word is usually a different PERSON, not a typo:
   bagunnanu is "I am fine", bagunnaru is "you are fine". The typo tolerance
   must never forgive that — it is the distinction the lessons exist to teach. */
export const PERSON_ENDINGS = ['nu', 'ru', 'vu', 'du', 'di', 'mu', 'ni', 'ri', 'ra', 'va'];

export const differsOnlyByPersonEnding = (a, b) => {
    if (a.length < 4 || b.length < 4) return false;
    const ea = a.slice(-2), eb = b.slice(-2);
    if (ea === eb) return false;
    if (!PERSON_ENDINGS.includes(ea) || !PERSON_ENDINGS.includes(eb)) return false;
    return a.slice(0, -2) === b.slice(0, -2);
};

/** Every distinct word the course teaches, as a flat set.
 *
 *  The typo tolerance forgives a one-edit difference, which is right for a
 *  misspelling and wrong when both spellings are real, different words this
 *  course teaches: *chusanu* ("I saw") and *chesanu* ("I did") are one edit
 *  apart, and the matcher accepted "Nenu adhi chusanu" for a target of "Nenu
 *  ninna adhi chesanu". Same failure as forgiving a person ending — it blurs
 *  exactly the distinction the lessons exist to teach.
 */
export const buildRealWordSet = (lessons = []) => {
    const set = new Set();
    for (const lesson of lessons) {
        for (const v of lesson.vocabulary || []) {
            if (v.word) set.add(normalizeLatin(v.word));
            for (const a of v.alt || []) set.add(normalizeLatin(a));
        }
    }
    set.delete('');
    return set;
};

/** synonyms + the real-word set, for the matcher. Accepts a bare Map too, so
 *  older call sites keep working with the synonym behaviour alone. */
/** word -> the meaning the course gives it, for naming a learner's mistake. */
export const buildMeaningMap = (lessons = []) => {
    const map = new Map();
    for (const lesson of lessons) {
        for (const v of lesson.vocabulary || []) {
            if (!v.word || !v.meaning) continue;
            const key = normalizeLatin(v.word);
            if (!map.has(key)) map.set(key, v.meaning);
            for (const a of v.alt || []) {
                const alt = normalizeLatin(a);
                if (alt && !map.has(alt)) map.set(alt, v.meaning);
            }
        }
    }
    return map;
};

export const buildLexicon = (lessons = []) => ({
    synonyms: buildSynonymMap(lessons),
    words: buildRealWordSet(lessons),
    meanings: buildMeaningMap(lessons),
});

const asLexicon = (lex) => (lex instanceof Map)
    ? { synonyms: lex, words: new Set(), meanings: new Map() }
    : {
        synonyms: lex?.synonyms || new Map(),
        words: lex?.words || new Set(),
        meanings: lex?.meanings || new Map(),
    };

/** alt -> canonical, so a synonym means the same thing at every step. */
export const buildSynonymMap = (lessons = []) => {
    const headwords = new Set();
    for (const lesson of lessons) {
        for (const v of lesson.vocabulary || []) {
            if (v.word) headwords.add(v.word.toLowerCase());
        }
    }

    const map = new Map();
    for (const lesson of lessons) {
        for (const v of lesson.vocabulary || []) {
            if (!v.word || !Array.isArray(v.alt)) continue;
            const canon = v.word.toLowerCase();
            for (const raw of v.alt) {
                const alt = String(raw).toLowerCase();
                /* An alt that is itself a headword somewhere else would make the
                   mapping two-way and canonicalisation non-deterministic: lesson 16
                   had `santhoshamga -> santhosham` while lesson 30 had
                   `santhosham -> santhoshamga`, so the same sentence canonicalised
                   differently depending on which side you started from, and a
                   correct answer drew a spelling correction. Headwords win. */
                if (alt !== canon && headwords.has(alt)) continue;
                map.set(alt, canon);
            }
        }
    }
    return map;
};

export const tokenCoverage = (actual, expected, lexicon = new Map()) => {
    const { synonyms, words } = asLexicon(lexicon);
    const canon = (t) => synonyms.get(t) || t;
    const said = normalizeLatin(actual).split(' ').filter(Boolean);
    const need = normalizeLatin(expected).split(' ').filter(Boolean);
    if (!need.length) return 1;

    /* Two real, different words of this course are never typos of each other. */
    const bothReal = (a, b) => words.has(a) && words.has(b) && a !== b;

    /* An `alt` that EXTENDS its headword is an inflection, not a spelling: -ga on
       a feeling (*badhaga*), -ki on a noun (*paniki*). Canonicalising both to the
       base made them interchangeable in either direction, so a learner could keep
       the -ga in a negation that lesson 26 had just taught drops it, and be told
       "Spot on!". The alt still makes the form RECOGNISED where a drill needs it;
       it no longer makes it a substitute for the base. */
    const isInflection = (t) => {
        const base = synonyms.get(t);
        return Boolean(base) && t !== base && (t.startsWith(base) || base.startsWith(t));
    };
    const inflectionMismatch = (a, b) => (isInflection(a) || isInflection(b)) && a !== b;

    const pool = [...said];
    let hits = 0;
    for (const token of need) {
        if (/[[\]()]/.test(token)) { hits++; continue; }
        const want = canon(token);
        const i = pool.findIndex(raw => {
            /* Compared BOTH ways: canonicalised, so an `alt` spelling counts as
               the word it stands for, and raw, so a typo of the alt still counts.
               Canonicalising alone turned *santhoshamga* into *santhosham*, three
               characters away from the learner's *santhoshamgaa*, and a plain
               vowel slip was marked wrong while the same slip on *baga* passed. */
            if (raw === token || isSpellingSlip(raw, token)) return true;
            if (inflectionMismatch(raw, token)) return false;
            const s = canon(raw);
            if (s === want) return true;
            if (bothReal(s, want)) return false;
            /* The SHORTER word must be substantial. Gated on the longer one, a
               stray two-letter fragment of English could stand in for a real
               target word and satisfy the coverage check — "ve" out of "I've"
               passed for *veyi*.
               Short target words still need a route in, or `Me` for *Mee* is
               marked wrong: allowed when the lengths differ by at most one and
               the words start alike, which "ve"/"veyi" (two apart) does not. */
            const short = Math.min(s.length, want.length) < 4;
            if (short) {
                if (Math.abs(s.length - want.length) > 1) return false;
                if (s[0] !== want[0]) return false;
                return vowelSkeleton(s) === vowelSkeleton(want)
                    && !differsOnlyByPersonEnding(s, want);
            }
            if (isSpellingSlip(s, want)) return true;
            /* What makes a one-edit difference a MEANING error rather than a typo
               is not how short the word is — it is whether the learner's token is
               itself a word of this course. `bothReal` above already refuses
               `illa` for *illi* and `alli` for *illi* on exactly that test.
               I briefly gated this on length instead (under six characters, forgive
               nothing), which was redundant with `bothReal` and broke real typos: a
               learner typed `Hega Iddeera` for *hege iddeera*, one letter out, and
               was told "iddeera means Are you (polite) — here you want the word for
               You (polite)" — a wrong diagnosis of the wrong word, which then led
               them into a worse answer. *Hega* is not a Kannada word, so nothing
               was ambiguous about it.
               The length gate survives only for callers with no lexicon to consult,
               where `bothReal` cannot answer and caution is the right default. */
            if (!words.size && Math.min(s.length, want.length) < 6) return false;
            return levenshtein(s, want) <= 1
                && !differsOnlyByPersonEnding(s, want)
                && !differsOnlyByDeicticInitial(s, want);
        });
        if (i !== -1) { hits++; pool.splice(i, 1); }
    }
    return hits / need.length;
};

/* The learner who says the right thing and then adds a question about it.
   `Ee kurchilu oddu. Why is it ee and not idhi?` covers every required token, but
   the whole-string Levenshtein ratio collapses to 0.381 against a three-word
   target, so it was rejected — while the model, reading the same answer, called
   it correct. That mismatch is the "you said correct then marked me wrong"
   contradiction every playtester reported, and it taught two of them to stop
   asking questions.

   So the ratio is measured against the best-fitting stretch of what they said,
   not the whole utterance. Coverage still decides whether the required words are
   all there, and the person-ending guard still decides whether they are the
   right words — extra commentary just stops being evidence against them. */
const bestWindowRatio = (actual, expected) => {
    const said = normalizeLatin(actual).split(' ').filter(Boolean);
    const need = normalizeLatin(expected).split(' ').filter(Boolean);
    const whole = similarityRatioLatin(actual, expected);
    if (!need.length || said.length <= need.length) return whole;

    let best = whole;
    for (let i = 0; i + need.length <= said.length; i++) {
        const window = said.slice(i, i + need.length).join(' ');
        best = Math.max(best, similarityRatioLatin(window, expected));
        if (best === 1) break;
    }
    return best;
};

/* Telugu marks the subject inside the verb, so the pronoun is optional —
   *bagunnanu* alone means "I am fine". The curriculum's answers mostly spell it
   out anyway (`Nenu cheyalenu`), and a lesson 22 grammar note says outright that
   "the 'I' is already inside them" — then the drill rejected the bare
   *Cheyalenu* the tutor had just taught. Rather than adding an `acceptable` entry
   to a hundred drills, the dropped-pronoun form is generated. */
const PRONOUNS = ['nenu', 'meeru'];

/* Dropped from wherever it sits, not just the front. A time word often leads —
   *Eeroju nenu cheyalenu* — and stripping only a leading pronoun meant
   `Eeroju cheyalenu` was rejected on the same lesson where `Ippudu idhi
   cheyalenu` passed, which reads as the grader being arbitrary. */
const pronounVariants = (expected) => {
    const tokens = normalizeLatin(expected).split(' ').filter(Boolean);
    if (tokens.length < 2) return [];
    const out = [];
    tokens.forEach((t, i) => {
        if (PRONOUNS.includes(t)) out.push(tokens.filter((_, j) => j !== i).join(' '));
    });
    return out;
};

/** Was the answer OFFERED, or merely mentioned in passing?
 *
 *  Two testers passed steps without producing any Telugu at all:
 *    "Hang on, didn't we already do Sare back in lesson 4?"        -> "Correct."
 *    "I can't do that one, you never taught me the word for Telugu" -> "Spot on!"
 *  Both name the target somewhere inside a sentence of English, which is enough
 *  for the coverage check. `opensAsQuestion` catches the interrogative form of
 *  this; position catches the rest, and generally: an answer is put forward, so it
 *  sits at the start of the turn or the turn is short enough to be an answer with
 *  a remark attached. Buried in the eighth word of a twenty-word sentence, it is
 *  being talked about, not said.
 *
 *  Checked against all 688 answers the four curricula declare correct: none is
 *  rejected by this.
 */
const answerIsOffered = (actual, expected) => {
    const said = normalizeLatin(actual).split(' ').filter(Boolean);
    const need = normalizeLatin(expected).split(' ').filter(Boolean);
    if (!need.length) return true;
    if (said.length <= need.length + 4) return true;       // an answer plus an aside
    if (said.slice(0, 2).includes(need[0])) return true;   // or it leads the turn
    /* ...or it CLOSES the turn, whole and in order. Reasoning-then-answer is the
       other natural shape of a learner thinking aloud, and it was the one shape
       this rejected: a round-K3 tester wrote "Oh, I see — I'm talking to her, so
       it's 'your'. Adu nimma pustaka" and was told "You missed the word for
       'that' at the beginning", with *Adu* plainly there. Confidently wrong
       feedback on a correct answer is the fault this whole file keeps circling,
       and it punished exactly the working-out the course wants to see.
       Requiring the full target contiguously at the end keeps the original
       guarantee: a target merely MENTIONED mid-sentence still does not count. */
    const tail = said.slice(-need.length);
    return tail.length === need.length && tail.every((t, i) => t === need[i]);
};

/** Best ratio and coverage across a target and every accepted variant. */
export const scoreAnswer = (actual, expected, variants = [], lexicon = new Map()) => {
    const given = [expected, ...variants].filter(Boolean);
    if (!given.length) return { ratio: 0, coverage: 0, accepted: false };
    const all = [...given, ...given.flatMap(pronounVariants)];
    const ratio = all.reduce((b, v) => Math.max(b, bestWindowRatio(actual, v)), 0);

    /* A flat 0.7 floor let a required word be dropped from any four-word target
       — "Nenu ippudu velthunnanu" passed for "Nenu ippudu intiki velthunnanu" at
       exactly 0.75. On a short sentence every word is load-bearing, so nothing
       may be missing; only from five words up is one omission forgiven. */
    let coverage = 0, covered = false;
    for (const v of all) {
        const c = tokenCoverage(actual, v, lexicon);
        coverage = Math.max(coverage, c);
        const need = normalizeLatin(v).split(' ').filter(Boolean).length;
        const missing = Math.round(need * (1 - c));
        if (missing === 0 || (need >= 5 && missing === 1)) covered = true;
    }
    const offered = all.some(v => answerIsOffered(actual, v));

    /* Polarity has to match. "Ask for hot water" was answered `Vedi neeru oddu` —
       "hot water, DON'T want" — and graded "Great job!", because the two content
       words were there and an accepted variant did not mention wanting at all.
       Saying the opposite of the answer is not a near miss. */
    const POLARITY = new Set(['oddu', 'ledu', 'kaadu', 'kadu', 'ledhu']);
    const polarityOf = (v) => new Set(normalizeLatin(v).split(' ').filter(t => POLARITY.has(t)));
    const saidPolarity = polarityOf(actual);
    /* A copula the answer does not want. `Nenu illu lo unnaru` was praised for
       "I am in the house", whose answer has no verb at all — the learner had
       added a wrong-person verb and been told "Exactly!". Extra words are
       tolerated in general (greeting an answer is not an error), but a form of
       "to be" is structural: adding one where none belongs, or the wrong one,
       makes a different sentence. */
    const COPULA = new Set([
        'unnanu', 'unnaru', 'unnara', 'unnavu', 'unnaya', 'untanu', 'undi',
        'undhi', 'unnayi',
    ]);
    const copulaOf = (v) => new Set(normalizeLatin(v).split(' ').filter(t => COPULA.has(t)));
    const saidCopula = copulaOf(actual);
    const copulaOk = all.some(v => {
        const want = copulaOf(v);
        if (want.size !== saidCopula.size) return false;
        for (const t of want) if (!saidCopula.has(t)) return false;
        return true;
    });

    const polarityOk = all.some(v => {
        const want = polarityOf(v);
        if (want.size !== saidPolarity.size) return false;
        for (const t of want) if (!saidPolarity.has(t)) return false;
        return true;
    });

    /* Coverage is order-blind and the ratio forgives a swap, so `peru naa` passed
       for *naa peru* with no comment — and inside a longer sentence a swap passed
       too, because the first version of this check only looked at short targets.
       Any length now, but rejection requires a genuine PERMUTATION: every word of
       the target present, and not in the target's order. Anything else — a missing
       word, extra words — is coverage's business, not this check's, so the
       variation the curriculum lists as `acceptable` is untouched. */
    const isPermutedAgainst = (v) => {
        /* A [name] slot matches whatever the learner put there, so it cannot take
           part in an ordering check — and leaving it in made every target that has
           one exempt, which is how a swap inside the capstone sentence passed. */
        const need = normalizeLatin(v).split(' ').filter(Boolean)
            .filter(t => !/[[\]()]/.test(t) && t !== 'name' && t !== 'place');
        if (need.length < 2) return false;
        const said = normalizeLatin(actual).split(' ').filter(Boolean);
        // every target word must be there, or this is not a reordering
        if (!need.every(t => said.includes(t))) return false;
        let at = -1;
        for (const t of need) {
            const i = said.indexOf(t, at + 1);
            if (i === -1) return true;    // present, but not after the previous one
            at = i;
        }
        return false;
    };
    /* Order is judged against the canonical answer, and a reordering is allowed
       only where the curriculum lists that reordering itself.
       Neither half alone works. Judging against "any variant" let a SHORTER
       accepted form rescue a scrambled longer one — `Unnaru meeru ela` contains
       "meeru ela" in sequence, so it passed for *Meeru ela unnaru* with a stray
       verb in front. Judging against the canonical alone rejected five answers the
       curriculum declares correct, because Telugu really does allow the time word
       on either side of the pronoun and the course says so.
       So: a listed variant licenses an ordering only if it is as long as the
       canonical — a full alternative phrasing, not a shorter form that happens to
       sit in order inside a scrambled answer. */
    const tokenCount = (v) => normalizeLatin(v).split(' ')
        .filter(t => t && !/[[\]()]/.test(t) && t !== 'name' && t !== 'place').length;
    const ordered = !isPermutedAgainst(expected)
        || given.slice(1).some(v => tokenCount(v) === tokenCount(expected)
            && !isPermutedAgainst(v)
            && tokenCoverage(actual, v, lexicon) === 1);

    return {
        ratio,
        coverage,
        accepted: ratio >= THRESHOLD && covered && offered && ordered && polarityOk && copulaOk,
    };
};

/** A learner who misspells and is accepted never learns the spelling.
 *
 *  Both round-1 testers typed a word wrong — `Bagunanu` for *Bagunnanu*, `Ikada`
 *  for *Ikkada* — were told "Good." and moved on. Forgiving the typo is right;
 *  they had the word, and stopping them would be petty. Saying nothing is not:
 *  as far as they knew, their spelling was the spelling. One tester only got it
 *  right afterwards because the word happened to still be on screen.
 *
 *  Returns a short correction to append to the praise, or '' when they had it
 *  exactly. Case and punctuation differences are not worth mentioning.
 */
export const spellingNote = (said, expected, variants = [], lexicon = new Map()) => {
    if (!said || !expected) return '';
    /* A [name] slot is the learner's own information. Offering "Namaskaram, naa
       peru [name]" as the correct spelling shows them a placeholder and, worse,
       fired on an answer that was entirely right. */
    if (/[[\]()]/.test(expected)) return '';
    const { synonyms } = asLexicon(lexicon);
    /* A learner who wrote *santhoshamga* where the sentence lists *santhosham*
       has applied a rule, not mistyped. Three real grammar rules reached testers
       labelled "Note the spelling" — the -ga adverbial, the -ki dative, and
       illu/inti — on answers that were graded CORRECT. Canonicalising through the
       curriculum's own `alt` lists makes those forms equal here, so grammar is
       never reported as a typo. */
    const canon = (text) => normalizeLatin(text).split(' ').filter(Boolean)
        .map(t => synonyms.get(t) || t).join(' ');
    const a = canon(said);
    if (!a) return '';

    /* Every form the learner could legitimately have produced, the dropped
       pronoun included. Round-4 testers were told "It is spelled X" five, two and
       "always" times about answers they had spelled correctly — the note was
       measuring against the canonical sentence, so an optional *nenu* they had
       rightly left out looked like a misspelling. Worst case it proposed a
       different sentence entirely: `Nenu alupuga unnanu` "is spelled" `Naaku
       alupuga undi`, one line after being told theirs was also correct. */
    const forms = [expected, ...variants].filter(Boolean)
        .flatMap(v => [v, ...pronounVariants(v)]);

    /* The run-together forms `teachStepVariants` generates are synthetic — *hege*
       and *iddeera* concatenated to `HegeIddeera`, which nobody writes. They must
       still RECOGNISE a learner who fused the words correctly (they did nothing
       wrong, so no note is due), but they must never be SUGGESTED as the spelling.
       Filtering them out of `forms` wholesale got that backwards and produced a
       note on a correct answer; filtering only the suggestion is the right cut. */
    const expectedIsMultiWord = normalizeLatin(expected).split(' ').filter(Boolean).length > 1;
    const suggestable = forms.filter(v => !(expectedIsMultiWord
        && normalizeLatin(v).split(' ').filter(Boolean).length === 1));

    const containsIntact = (hay, needle) => {
        const said_ = hay.split(' ').filter(Boolean);
        const need = needle.split(' ').filter(Boolean);
        if (!need.length) return false;
        for (let i = 0; i + need.length <= said_.length; i++) {
            if (said_.slice(i, i + need.length).join(' ') === needle) return true;
        }
        return false;
    };

    // Said one of them exactly, or said it intact with commentary around it?
    // Compared token by token, not as a raw substring — `Unnaraa` "contains"
    // `unnara`, and the doubled vowel is exactly what needed pointing out.
    for (const form of forms) {
        const b = canon(form);
        if (!b) continue;
        if (a === b || containsIntact(a, b)) return '';
    }

    /* If every word the target needs is there EXACTLY, whatever else they wrote,
       this is not a spelling matter — a tester's correct final answer drew a
       "spelling" note that silently reordered their words and deleted the name the
       prompt had asked for.
       Exactly, not fuzzily: measured with the fuzzy coverage, `Dhanyavadalu`
       counted as `Dhanyavaadaalu` and the note was suppressed, so the tester never
       learned they had flattened two long vowels. */
    const saidTokens = new Set(a.split(' ').filter(Boolean));
    for (const form of forms) {
        const need = canon(form).split(' ').filter(Boolean);
        if (need.length && need.every(t => saidTokens.has(t))) return '';
    }

    /* Which form were they actually reaching for? The closest one — otherwise a
       learner who correctly produced a short accepted variant gets shown the long
       canonical sentence as their "spelling". */
    let best = null, bestScore = -1;
    for (const form of (suggestable.length ? suggestable : forms)) {
        const score = similarityRatioLatin(said, form);
        if (score > bestScore) { bestScore = score; best = form; }
    }
    // Too far from anything to be a spelling slip — that is a wrong answer, and
    // the grader has its own way of saying so.
    if (!best || bestScore < 0.6) return '';
    return ` Note the spelling: **${best}**.`;
};

/* ── Teaching steps ────────────────────────────────────────────────────────
   Five steps per lesson, however many words the lesson holds. Slicing rather
   than vocabulary[step] because some lessons carry six or seven and the extras
   were previously taught to nobody while the drills demanded them.          */

export const TEACH_STEPS = 5;

export const teachSliceFor = (vocabulary = [], step = 0) => {
    const n = vocabulary.length;
    if (!n) return [];
    const from = Math.floor((step * n) / TEACH_STEPS);
    const to = Math.floor(((step + 1) * n) / TEACH_STEPS);
    return vocabulary.slice(from, Math.max(to, from + 1));
};

/** One fact: what to say and what it means. Anything more goes in a grammarNote. */
export const buildTeachingLine = (wordObj, opener = '') => {
    if (!wordObj?.word) return null;
    // An authored `teach` line explains the word but does not ask for it, so it
    // must close with the same direct instruction the plain template carries —
    // otherwise the learner is left reading grammar with no idea it is their turn.
    const body = wordObj.teach
        ? `${wordObj.teach.replaceAll('{w}', `**${wordObj.word}**`)} Your turn — say **${wordObj.word}**`
        : `To say "${wordObj.meaning}", say **${wordObj.word}**`;
    const phon = wordObj.phonetic ? `\n<phonetic>${wordObj.phonetic}</phonetic>` : '';
    return `${opener}${opener ? ' ' : ''}${body}${phon}`;
};

/** The whole slice as one message. The LAST bold span is what is being asked for. */
export const buildTeachingStep = (slice, opener = '') => {
    const words = (slice || []).filter(w => w?.word);
    if (!words.length) return null;
    if (words.length === 1) return buildTeachingLine(words[0], opener);

    const lead = words.slice(0, -1).map(w => {
        const body = w.teach
            ? w.teach.replaceAll('{w}', `**${w.word}**`)
            : `"${w.meaning}" is **${w.word}**`;
        return body.replace(/\.$/, '');
    }).join('. ');
    const last = words[words.length - 1];
    const lastRaw = last.teach
        ? last.teach.replaceAll('{w}', `**${last.word}**`)
        : `"${last.meaning}" is **${last.word}**`;
    const lastBody = /[.?!]$/.test(lastRaw) ? lastRaw : `${lastRaw}.`;
    /* Ask for every word the step shows. Asking only for the last one meant the
       other was displayed, never practised, and then quizzed in the memory check
       — reported on lessons 1, 5, 9, 10, 19 and 27 across five rounds, with the
       banner claiming six words when five had been elicited. */
    const asked = words.length > 1
        ? `Your turn — say **${words.slice(0, -1).map(w => w.word).join('**, then **')}**, then **${last.word}**`
        : `Your turn — say **${last.word}**`;
    /* Every word in the step, not just the last — the others were shown with no
       pronunciation and then quizzed first. One tag, though: two tags each with
       a label inside rendered as
       "[say it like: Guruvulu: gu-ru-vu-lu]  [say it like: Kurchilu: kur-chee-lu]",
       which a tester flagged as malformed. */
    /* One tag per word, on its own line. A single merged tag rendered as
       "[say it like: Guruvulu — gu-ru-vu-lu, Kurchilu — kur-chee-lu]", which five
       testers across three rounds called mangled; two tags with labels nested
       inside were the version before that. */
    const phon = words.filter(w => w.phonetic)
        .map(w => `\n<phonetic>${w.word} = ${w.phonetic}</phonetic>`).join('');
    return `${opener}${opener ? ' ' : ''}${lead}. ${lastBody} ${asked}${phon}`;
};

/** Every word a teaching step put on screen — a doubled step shows two but the
    bold instruction names only one, so the other was shown and never practised.
    Saying either back counts. */
export const wordsOfferedBy = (slice = []) => (slice || []).filter(w => w?.word).map(w => w.word);

export const extractPromptedPhrase = (text) => {
    if (!text) return null;
    const bold = text.match(/\*\*(.*?)\*\*/g);
    return bold?.length ? bold[bold.length - 1].replace(/\*\*/g, '').trim() : null;
};

/** What a teaching step is actually asking the learner to produce.
 *
 *  One place, because three callers need the same answer and disagreed: a step
 *  that shows two words now asks for both, so the last bold span alone is not the
 *  task. Accepting only that span let a learner type one word, be told "Correct",
 *  and be quizzed later on a word they had never produced.
 */
export const expectedForTeachStep = (slice) => {
    const words = wordsOfferedBy(slice);
    return words.length ? words.join(' ') : null;
};

/** Accepted orderings of a multi-word teaching step.
 *
 *  The RUN-TOGETHER form has to be here too. These languages fuse adjacent words
 *  constantly — *hege* + *iddeera* is said as *hegiddeera* — and lesson 1's own
 *  teaching line tells the learner so in the same breath as it asks them to say
 *  the two words. A tester read that, answered `Hegiddeera?`, and was told "the
 *  word for How is missing": the tutor declared a form correct and the grader
 *  then refused it, which is the single worst thing this matcher can do and the
 *  fault four separate rounds were spent removing.
 *
 *  Joining the words is only an approximation of the sandhi — *hege iddeera*
 *  concatenates to *hegeiddeera*, one elision away from what is actually said —
 *  but one edit is exactly what the typo tolerance downstream is for. */
export const teachStepVariants = (slice) => {
    const words = wordsOfferedBy(slice);
    if (words.length < 2) return [];
    /* Built from each word's `alt` spellings as well as its headword, or the
       learner who fuses using the alt is refused: the course lists *iddira* for
       *Iddeera* and accepts `hegiddira?` in its own drill, so `hegiddira` on the
       teaching step has to pass too. Capped, because this is a cartesian product
       and a step with three multi-alt words would otherwise blow up. */
    const formsPerWord = (slice || [])
        .filter(w => w?.word)
        .map(w => [w.word, ...(w.alt || [])]);
    /* Two joins per pair, because plain concatenation is not what gets said.
       When the first word ends in a vowel and the next begins with one, Kannada
       drops that final vowel: *hege* + *iddeera* is *hegiddeera*, not
       *hegeiddeera*. Both are generated — the elided form is the one a learner
       actually types, and having it here EXACTLY matters beyond grading, because
       `spellingNote` recognises an accepted form by exact match and would
       otherwise flag a correctly fused answer as a misspelling. */
    const joins = (prefix, next) => {
        const out = [prefix + next];
        if (/[aeiou]$/i.test(prefix) && /^[aeiou]/i.test(next)) out.push(prefix.slice(0, -1) + next);
        return out;
    };
    const fused = formsPerWord.reduce(
        (acc, forms) => acc.flatMap(prefix => forms.flatMap(f => (prefix ? joins(prefix, f) : [f]))),
        [''],
    ).slice(0, 32);
    return [[...words].reverse().join(' '), ...fused];
};

/** Accepted spoken variants of a taught word, from the curriculum's `alt`. */
export const altsFor = (lessons = [], word) => {
    if (!word) return [];
    const target = word.toLowerCase();
    for (const lesson of lessons) {
        for (const v of lesson.vocabulary || []) {
            if (v.word?.toLowerCase() === target) return v.alt || [];
        }
    }
    return [];
};

/* ── Drill prompts ─────────────────────────────────────────────────────── */

/** Every turn must give the learner something to do. */
export const drillPrompt = (items, idx) => {
    const item = items?.[idx];
    if (!item?.prompt) return null;
    const p = item.prompt.trim();
    return /[.?!]$/.test(p) ? p : `${p}.`;
};

/* ── Retry, reveal, grading ────────────────────────────────────────────── */

export const REVIEW_RETRY_LIMIT = 2;

/** Every stage must include one of these when it rejects an answer, or
    consecutiveMisses cannot see the miss and the retry cap never fires. The
    conversation stage emitted none of them, so it could reject forever. */
export const MISS_MARKER = 'Not quite';
const MISS_RE = /Not quite|The answer (was|is)|try again/i;
const ADVANCED_RE = /Spot on|Exactly|Great job|Perfect|Correct|Good\.|Right\.|Yes\.|come back|💡|🎓/i;

/** Misses on the current drill. Walks PAST neutral turns — a learner who asks a
    question must not lose their progress toward the escape hatch. */
export const consecutiveMisses = (msgs = []) => {
    let n = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (m.role === 'user') continue;
        if (MISS_RE.test(m.content)) { n++; continue; }
        if (ADVANCED_RE.test(m.content)) break;
    }
    return n;
};

/** Did the previous turn hand over the answer? Looks for the answer itself, not
    for a form of words, so the model volunteering it also counts. */
export const answerWasRevealed = (text, expected) => {
    const haystack = normalizeLatin(text || '');
    if (!haystack) return false;
    if (/the answer (was|is)|it'?s \*\*/i.test(text || '')) return true;
    const needle = normalizeLatin(expected || '');
    if (!needle) return false;
    if (needle.length >= 4 && haystack.includes(needle)) return true;

    /* A near-quote is just as copyable as an exact one. A tester asked for an
       example sentence and was handed `Nenu Hyderabad nundi perigaanu` — the
       target minus two words — which an exact substring test missed entirely.
       Four or more of the answer's words, in the answer's order, is the answer. */
    const need = needle.split(' ').filter(Boolean);
    if (need.length < 4) return false;
    const said = haystack.split(' ').filter(Boolean);
    let at = -1, run = 0;
    for (const t of need) {
        const i = said.indexOf(t, at + 1);
        if (i === -1) continue;
        at = i; run++;
    }
    return run >= 4;
};

/** Never mark a learner wrong for saying back what the tutor just modelled.
    Narrow: must appear in the tutor's turn, be length-comparable, and share a
    word with the real answer — so echoing the English hint fails. */
export const tutorModelled = (said, tutorText, expected) => {
    const a = normalizeLatin(said);
    const t = normalizeLatin(tutorText || '');
    const e = normalizeLatin(expected || '');
    if (a.length < 4 || !t.includes(a) || !e) return false;
    const saidTokens = a.split(' ').filter(Boolean);
    const wantTokens = e.split(' ').filter(Boolean);
    /* As many words as the answer needs. One word of a two-word teaching step was
       accepted here — "Correct." — and the other was quizzed two steps later
       having never been produced, with a spelling note that concatenated the pair
       into nonsense. */
    if (saidTokens.length < wantTokens.length) return false;
    /* A one-edit overlap is not enough on its own: `illi` and `alli` are one edit
       apart and mean here and there, so a learner echoing the WRONG half of a pair
       the tutor modelled slipped through this door after the main matcher had
       closed it. Same two guards as everywhere else. */
    return saidTokens.some(x => wantTokens.some(y =>
        x === y || (Math.max(x.length, y.length) >= 4 && levenshtein(x, y) <= 1
            && !differsOnlyByPersonEnding(x, y)
            && !differsOnlyByDeicticInitial(x, y))));
};

export const gradeOutcome = ({ correct, misses, revealed }) => {
    if (!correct) return 'missed';
    if (revealed) return 'revealed';
    return misses > 0 ? 'hinted' : 'unaided';
};

/* ── Learner questions ─────────────────────────────────────────────────────
   The signal is that they switched to ENGLISH, not that the text ends in a
   question mark — plenty of valid answers do ("Emiti?", "Neevu hegiddira?"). */

export const ENGLISH_TELLS = new Set([
    'can', 'cant', 'could', 'why', 'what', 'whats', 'how', 'is', 'are', 'was',
    'do', 'does', 'did', 'the', 'a', 'an', 'and', 'or', 'but', 'not', 'no',
    'i', 'you', 'me', 'my', 'it', 'this', 'that', 'also', 'as', 'well', 'too',
    'say', 'said', 'mean', 'means', 'meaning', 'same', 'different', 'instead',
    'another', 'other', 'both', 'use', 'used', 'about', 'in', 'of', 'to', 'for',
    'should', 'would', 'isnt', 'dont', 'doesnt', 'wrong', 'right', 'correct',
    'remember', 'know', 'understand', 'again', 'repeat', 'help', 'hint', 'taught',
]);

/* An utterance that OPENS with an interrogative or an auxiliary is asking, not
   answering — even when it names the very word being asked for. "Is santhosham a
   noun or an adjective?" was graded "Great job!" and passed the review, because
   the word it asks about is also the answer it was checked against. An answer
   leads with the answer; a question leads with the question. */
const OPENING_INTERROGATIVES = new Set([
    'is', 'are', 'was', 'were', 'am', 'do', 'does', 'did', 'can', 'could',
    'should', 'would', 'will', 'shall', 'have', 'has', 'had', 'what', 'whats',
    'why', 'how', 'hows', 'when', 'where', 'which', 'who', 'whose', 'whom',
    'isnt', 'arent', 'doesnt', 'dont', 'didnt', 'cant', 'couldnt', 'wouldnt',
    'shouldnt', 'wasnt', 'werent', 'hasnt', 'havent',
]);

export const opensAsQuestion = (text) => {
    const first = normalizeLatin(text).split(' ').filter(Boolean)[0];
    return Boolean(first) && OPENING_INTERROGATIVES.has(first);
};

export const looksLikeQuestion = (t) => {
    const words = (t || '').toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length < 3) return false;
    return words.filter(w => ENGLISH_TELLS.has(w.replace(/'/g, ''))).length >= 2;
};

/* Asking for help is not a wrong answer. Kept here rather than inline in the
   chat page so the offline harness recognises the same phrases the app does —
   the harness previously graded "I don't know" as a miss at the vocabulary
   stage and re-presented the same word forever, which the app never did. */
export const HELP_WORDS = [
    "don't know", 'dont know', "i don't know", 'idk', 'how', 'how?', 'help',
    'hint', 'tell me', 'show me', 'not sure', 'what', 'what?', 'confused',
    'no idea', 'repeat', 'again', 'what part', 'not clear',
];

/* Matched on word boundaries, not as raw substrings. A plain `includes` finds
   "hint" inside the Telugu word *Thinte* ("if eating"), so a learner giving that
   exact correct answer was read as asking for a hint — and in the review quiz,
   which routes questions to the model without grading them, that stalled the
   lesson permanently. Multi-word phrases still match as phrases. */
export const isHelpRequest = (text) => {
    const t = (text || '').trim().toLowerCase();
    if (!t) return false;
    const words = new Set(t.replace(/[^a-z\s']/g, ' ').split(/\s+/).filter(Boolean));
    return HELP_WORDS.some(h => (h.includes(' ') ? t.includes(h) : words.has(h)));
};

export const CONTINUE_WORDS = new Set([
    'continue', 'next', 'next please', 'next one', 'go on', 'goon',
    'proceed', 'move on', 'carry on', 'keep going', 'ready', 'im ready',
    'okay', 'ok', 'okey', 'sure', 'got it', 'gotit', 'yes', 'yeah', 'yep',
    'hmm', 'hm', 'alright', 'right', 'cool', 'done', 'understood', 'k',
]);

/* The escape hatch the tutor already promises.
 *
 *  When a learner reports a hole in the course, the reply offers: 'Say "skip" and
 *  I will give you the answer and move us on'. Typing "skip" was then graded as a
 *  wrong answer — twice over, with the learner stuck on the same step. A promise
 *  the app does not keep is worse than no promise, and "no way out" was the
 *  complaint that made two testers stop asking questions and start guessing.
 *
 *  Deliberately narrow. "next" and "move on" live in CONTINUE_WORDS, where they
 *  mean "carry on with what you were saying" — reading those as a skip would let
 *  an eager learner blow through the lesson without answering anything.
 */
const SKIP_PHRASES = [
    'skip', 'skip this', 'skip it', 'skip this one', 'skip for now',
    'pass', 'i pass', 'give me the answer', 'just tell me', 'tell me the answer',
    'show me the answer', 'i give up', 'i give up on this one',
];

export const isSkipRequest = (text) => {
    const t = String(text || '').trim().toLowerCase().replace(/[^a-z\s']/g, '').replace(/\s+/g, ' ').trim();
    return SKIP_PHRASES.includes(t);
};

export const isAcknowledgement = (text) => CONTINUE_WORDS.has(
    (text || '').trim().toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
);

/* ── What the tutor may say about an answer ────────────────────────────────
   Every playtester's worst moment was the same one: the tutor stated an answer
   and the grader then marked that exact answer wrong. "Ninna + nenu + **chesa**"
   when the answer was *chesanu*; "the correct form is **Repu okati ganta**" when
   it was *Repu oka ganta*; "the plural of Illu is **Illulu**", which is not a
   word at all. Four testers, eleven instances, every stuck point in two of the
   reports.

   The cause is the instruction, not the model. The model is handed the target
   and told to reveal no part of it, then asked to help someone who has said "I
   don't know". Complying with both at once is impossible, so it improvises a
   form that looks like help and is wrong. Forbidding the reveal harder makes
   more fabrication, not less.

   So the rule changes shape: the model may not invent. If it refers to the
   answer at all it must quote the string it was given, character for character,
   and it may never produce a target-language word that is not either in that
   string or on the learner's known list. Withholding is expressed as saying
   nothing, never as substituting something.                                  */
export const antiFabricationRule = (target, knownWords = []) => {
    const known = knownWords.length ? knownWords.join(', ') : '(none yet)';
    return `You are always free to explain anything in English, at any length — nothing below restricts English, and refusing to answer is never correct. `
        + `The rule is only about TARGET-LANGUAGE words. Never invent one. The only correct answer here is exactly "${target}". `
        + `You may not write any ${''}target-language word that is not either inside that string or in this list of words the learner has been taught: ${known}. `
        + `Do not conjugate, pluralise, shorten, lengthen or otherwise construct a form of your own — not as an example, not as a hint, not to be helpful. `
        + `If you decide not to give the answer away, say nothing about its wording at all; do NOT substitute a different version of it. `
        + `If you do quote it, quote "${target}" character for character. `
        + `This restriction is about TARGET-LANGUAGE WORDS ONLY. If the learner asked you something, answer it, in English, fully and now — do not defer it, do not say you will come back to it, do not say you will explain later. Deferring is never the right response to a question. `
        + `If you are unsure whether a particular target-language FORM is correct, leave that form out and answer around it. `
        + `A learner is graded against "${target}" alone, so any other form you write is marked wrong and reads to them as the course contradicting itself.`;
};

/** Did the tutor write a form of a taught word that is not the taught word?
 *
 *  The instruction above tells the model not to invent. This checks whether it
 *  obeyed, because the failure is silent and expensive: a learner shown *chesa*
 *  when the answer is *chesanu* has no way to tell that the course is wrong
 *  rather than them, and every tester who hit it lost several turns.
 *
 *  Deliberately narrow, to stay high-precision on English prose. A token is a
 *  fabrication only if it is CLOSE to something real — a taught word or a word
 *  of the target answer — without being it. That is exactly the shape of an
 *  invented inflection — *chesa* for *chesanu*, *okati* for *oka*, *Illulu* for
 *  *illu*, *chestanu* for *cheyali* — and English words are not near-misses of
 *  Telugu ones, so they do not trip it.
 */
export const fabricatedForms = (text, target = '', allowedWords = []) => {
    const real = new Set([
        ...normalizeLatin(target).split(' ').filter(Boolean),
        ...allowedWords.flatMap(w => normalizeLatin(w).split(' ')).filter(Boolean),
    ]);
    if (!real.size) return [];

    const found = [];
    for (const token of normalizeLatin(text).split(' ').filter(Boolean)) {
        if (token.length < 4 || real.has(token)) continue;
        for (const word of real) {
            if (word.length < 4) continue;
            const d = levenshtein(token, word);
            // 1..3 edits from a real word, and sharing its opening — an invented
            // ending, not a different word that happens to look similar.
            if (d >= 1 && d <= 3 && token.slice(0, 3) === word.slice(0, 3)) {
                found.push({ wrote: token, insteadOf: word });
                break;
            }
        }
    }
    return found;
};

/* Words a beginner-facing tutor reply is made of. The system wordlist is not
   available in the browser and omits words as ordinary as "hang" and "using", so
   this is deliberately a small closed list — enough to tell English prose from a
   sentence that has slipped into the target language. */
const TUTOR_ENGLISH = new Set(`
a about add adds adding after again all also always am an and answer any are around as ask
asked asking at back be because been before being below best better between book books both
build building but by call called can cannot case change changes changing choose close
comes coming complete correct could course day describe did different do does doesn't doing
don't done down each easy either end ending endings enough even every exactly example
examples explain far feel feeling few first follow following for form forms from front full
get gets getting give given gives go goes going good got great had happen happens has have
having he help her here hers him his hold how however i idea if in instead into is it its
just keep kept know known knows language last later learn learned learner learning least
leave left less let letter like liked likes little long look looks lot made make makes
making many may mean means meant might mind more most move much must my name named names
near need needs never new next nice no nor not note noted nothing now number of off often
oh ok okay old on once one only or order other others our out over own part parts past
people perfect person phrase phrases place please point points polite position practice
present pretty put question questions quick quite rather read ready real really remember
repeat right rule rules said same say saying says scene second see seen sense sentence
sentences set she short should show shown side simple simply since single sit so some
something sometimes soon sort sound sounds speak speaking spell spelled spelling spoken
start starts state stay step still stop story such sure take takes talk talking tell
tells than that the their them then there these they thing things think this those though
three through time times to today together tomorrow too try trying turn two under
understand until up us use used uses using usually verb very want wants was way we well
went were what when where whether which while who whole why will with within without
word words work works would write writing wrong yes yesterday yet you your yours
above action actually adjective adverb alone anybody anyone anything apart attach
attached becomes bit bold carries
carry case clause colour comes command consonant context ending exception female
feminine flat food form front future gender grammar greet greeting house houses idea itself join
joined joins length letter literally masculine meaning noun object often
past phrase plural polite position possessive pronoun pronounce pronunciation
question root rule sentence shape shorten shortened singular sound spelling stem
stand stands story stories subject suffix swap swapped swaps syllable tense
translate translation
verb vowel vowels weight whereas whichever whose
`.trim().split(/\s+/));

/** Has the tutor slipped into the target language at a level that forbids it?
 *
 *  `zero` and `basic` both tell the model its entire reply must be in the
 *  learner's own language, and it mostly complies — but a round-4 tester asking
 *  in English how to pluralise a noun was answered "Katha anedi stories ki, illu
 *  anedi houses ki", and a round-3 tester got ten untaught words in one reply.
 *  `fabricatedForms` cannot catch these: they are real Telugu, just not words
 *  this course teaches, so nothing they resemble is on the allow-list.
 *
 *  Returns the offending tokens. Two or more is the threshold — one unusual word
 *  is a name or a loanword, several together is a sentence in the wrong language.
 */
const ENGLISH_SUFFIXES = ['s', 'es', 'ed', 'd', 'ing', 'ly', 'er', 'est'];

/* The curated list is a floor, not a dictionary. It rejected a perfectly good
   reply for "possession", "delicious", "ownership" and "imagine" — and no hand-
   written list ever stops needing another word. Callers that HAVE a dictionary
   (Node can read the system wordlist; a browser cannot) pass it in, and it is
   consulted first. */
const looksEnglish = (t, extra = null) => {
    if (extra && (extra.has(t) || englishBySuffix(t, extra))) return true;
    if (TUTOR_ENGLISH.has(t)) return true;
    return englishBySuffix(t, TUTOR_ENGLISH);
};

const englishBySuffix = (t, dict) => {
    if (t.endsWith('ies') && dict.has(`${t.slice(0, -3)}y`)) return true;
    for (const suf of ENGLISH_SUFFIXES) {
        if (!t.endsWith(suf) || t.length - suf.length < 3) continue;
        const stem = t.slice(0, -suf.length);
        if (dict.has(stem) || dict.has(`${stem}e`)) return true;
    }
    return false;
};

export const foreignIntrusions = (text, allowedWords = [], extraEnglish = null) => {
    const allowed = new Set(allowedWords.flatMap(w => normalizeLatin(w).split(' ')).filter(Boolean));

    /* A form of a word the course teaches is a legitimate reference to the
       lesson's own material, not a slip into the target language — a reply
       explaining that *pusthakam* becomes *pusthakalu* must not be thrown away
       for naming the plural it is explaining. */
    const nearAllowed = (t) => {
        for (const w of allowed) {
            if (w.length < 4 || Math.abs(w.length - t.length) > 4) continue;
            if (t.startsWith(w.slice(0, 4)) || w.startsWith(t.slice(0, 4))) return true;
        }
        return false;
    };

    const found = [];
    for (const token of normalizeLatin(text).split(' ').filter(Boolean)) {
        if (token.length < 3) continue;
        if (allowed.has(token) || looksEnglish(token, extraEnglish) || nearAllowed(token)) continue;
        found.push(token);
    }
    return found;
};

/** Has the reply slipped out of the learner's language?
 *
 *  Decided on the PROPORTION of unrecognised words, not a raw count. A closed
 *  English list always has holes — "greeting" and "anyone" were missing from the
 *  first draft — and every hole is a false rejection if two stray tokens are
 *  enough to condemn a reply. English prose scores a few percent unrecognised
 *  however incomplete the list; a sentence in Telugu scores a third or more.
 *
 *  A false positive costs only responsiveness: the caller falls back to the
 *  lesson's own authored explanation, which is correct but less conversational.
 *  A false negative puts untaught Telugu in front of a beginner, which is a wall.
 *  So this errs toward rejecting.
 */
export const speaksForeign = (text, allowedWords = [], extraEnglish = null) => {
    /* Pronunciation guides are not prose. Their contents ("pah", "loo") were
       being counted as foreign words and helped push good replies over the line. */
    const prose = String(text || '')
        .replace(/<phonetic>[\s\S]*?<\/phonetic>/gi, ' ')
        .replace(/\[say it like:[^\]]*\]/gi, ' ');
    const considered = normalizeLatin(prose).split(' ').filter(t => t.length >= 3);
    if (considered.length < 4) {
        /* Too short for a proportion to mean anything, and a reply this brief is
           foreign if ANY of it is — one tester's entire tutor turn was
           "ani adugandi." in answer to them saying, in English, that they did
           not understand the task. */
        return foreignIntrusions(prose, allowedWords, extraEnglish).length > 0;
    }
    const intrusions = foreignIntrusions(prose, allowedWords, extraEnglish);
    return intrusions.length >= 2 && intrusions.length / considered.length >= 0.25;
};

/** Strip the model's own questions out of a helper reply.
 *
 *  Every stage answers a learner's question by showing the model's reply and
 *  then a templated line carrying the real instruction. When the model also asks
 *  something, the learner has two live tasks and no way to tell which is scored:
 *  "please say 'I can do'" followed by "So — Say 'I can't do'". Three of four
 *  testers in round 1 reported it, and all four did in round 2 — the instruction
 *  not to ask is not enough on its own, so the questions are removed.
 *
 *  Sentences are kept in order; only interrogatives go. If that empties the
 *  reply, return '' and let the caller show the templated line alone.
 */
export const stripQuestions = (text) => {
    if (!text) return '';
    // The boundary may sit after a closing quote or bracket: "...I can't do.'"
    // ends a sentence just as much as a bare full stop, and splitting only on
    // the bare form swallowed the whole reply as one interrogative.
    const kept = String(text)
        .split(/(?<=[.!?]["'\u201d\u2019)\]]?)\s+/)
        .filter(part => {
            const t = part.trim().replace(/["'\u201d\u2019)\]]+$/, '');
            return t && !t.endsWith('?');
        })
        .join(' ')
        .trim();
    return kept;
};

/** Remove the model's re-teaching from a helper reply.
 *
 *  The templated line immediately after it already teaches the word and asks for
 *  it. When the model does the same, the learner reads the instruction twice in
 *  slightly different words — "Now, let's continue. To reply, say **Idhi**."
 *  followed by the real teaching step. Sentences that hand over an instruction,
 *  rather than explaining something, are dropped.
 */
/* The template says whether the answer was right. When the model also does, the
   two can disagree in the same turn — a tester's plain-English refusal drew
   "Correct!" from the model with the grader's verdict underneath, and several
   rounds of "you said correct then marked me wrong" reports trace here. */
const PRAISE_OPENER = /^\s*(that(?:'s| is) (?:correct|right|it)|(?:great|good|nice|excellent)\s+question|spot on|exactly|great job|perfect|correct|got it|good|right|yes|nice(?: one)?|well done|purr-?fect|paws-?ome)\b[!.,]*\s*/i;

export const stripPraise = (text) => String(text || '').replace(PRAISE_OPENER, '').trim();

/** Is this "reply" just the word, echoed back?
 *
 *  Asked a question and told to answer briefly, the model sometimes returns the
 *  target and nothing else — testers got whole tutor turns reading `Mariyu.`,
 *  `Aakhari.` and `Idhi naa aakhari.` in answer to questions about grammar. That
 *  is not an answer, and showing it is worse than falling back to the lesson's
 *  own note, because it looks like the tutor did not read the question.
 */
/** Does this reply actually explain anything?
 *
 *  "I understand you'd like an example sentence." acknowledges the question and
 *  says nothing, and at seven words it slipped past the too-short filter. An
 *  explanation either names something in the target language or uses the
 *  vocabulary of explaining.
 */
const EXPLAINING = /\b(because|means?|meaning|order|ending|endings|form|forms|goes|comes|same|different|instead|literally|stem|plural|singular|verb|noun|adjective|question|polite|past|future|present|tense|drop|dropped|add|added|attach|shape|pair)\b/i;

export const explainsSomething = (text, allowedWords = []) => {
    const t = String(text || '');
    if (!t.trim()) return false;
    if (EXPLAINING.test(t)) return true;
    const said = new Set(normalizeLatin(t).split(' ').filter(Boolean));
    return allowedWords.some(w => said.has(normalizeLatin(w)));
};

export const isBareEcho = (text, target = '') => {
    const a = normalizeLatin(text);
    const b = normalizeLatin(target);
    if (!a) return true;
    if (a.split(' ').filter(Boolean).length > 6) return false;
    return Boolean(b) && (a === b || b.includes(a) || a === `${b} ${b}`);
};

export const stripInstructions = (text) => {
    if (!text) return '';
    // Curly quotes normalised first, so every test below sees one apostrophe
    // form. "Now, let’s move on!" defeated a pattern written with a straight one.
    return String(text)
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/<phonetic>[\s\S]*?<\/phonetic>/gi, ' ')
        .replace(/\[say it like:[^\]]*\]/gi, ' ')
        .split(/(?<=[.!?]["'\u201d\u2019)\]]?)\s+/)
        .filter((part, idx) => {
            const t = part.trim();
            if (!t) return false;
            /* A sentence starting lowercase anywhere in the reply is the tail of
               one whose head was removed — a tester heard "That was a
               misunderstanding. in a polite way." */
            if (idx > 0 && /^[a-z]/.test(t) && !/^(i|i'm|it|its|it's)\b/i.test(t)) return false;
            // "say **X**", "repeat **X**", "your turn", "let's continue"
            if (/\b(say|repeat|try saying|your turn)\b[^.!?]*\*\*/i.test(t)) return false;
            /* A task the model set itself. One tester was graded "Perfect!" on a
               turn they never took, because the model had asked for something and
               the template's praise landed on the same turn; another was handed a
               bonus drill needing a word the lesson had not taught. An imperative
               addressed to the learner is the template's job, never this line's. */
            if (/^(now,?\s+)?(tell|ask|say|try|repeat|give|point|answer|count|practi[sc]e|respond)\b/i.test(t)) return false;
            if (/\b(next|now),?\s+\w+\s+(is used for|means)\b/i.test(t)) return false;
            // ’ as well as ' — "Now, let’s move on!" slipped straight through
            if (/\b(now,? let['\u2019]?s|let['\u2019]?s (continue|keep going|move on|get back))\b/i.test(t)) return false;
            // Scene-setting belongs to the teaching step, which follows this line
            if (/\byou(?:'re| are| see| walk| meet| notice)\b/i.test(t)
                && !/\b(because|means|stands|used|difference|form|ending|word order|so that)\b/i.test(t)) return false;
            // Third-person staging: "Your friend is asking...", "Miko is offering..."
            if (/^(your|a|an|the|someone|somebody|miko)\b[^.!?]*\b((is|are)\s+\w+ing|says?|asks?|tells?|offers?|wants?|smiles?|waves?)\b/i.test(t)) return false;
            // "Go ahead and say it!" — the bold word lands in the next fragment,
            // so the imperative survived a rule that looked for both together.
            if (/^(go ahead|now|please)\b[^.!?]*\b(say|repeat|try)\b/i.test(t)) return false;
            // A fragment that is only a bold word: the leftover of such a line.
            if (/^\*\*[^*]+\*\*[.!]?$/.test(t)) return false;
            return true;
        })
        .join(' ')
        .trim();
};

/** What the lesson itself says about its own material.
 *
 *  Asked "why idhi and not ee?", the model answered that one is for things
 *  further away — recasting a grammatical distinction as distance, which is
 *  wrong, contradicts the lesson's own wording, and collides with what *adhi*
 *  means. A tester with only that answer walks away with wrong Telugu. So the
 *  lesson's authored explanations are handed to the model as the authority,
 *  rather than leaving it to reconstruct them.
 */
export const lessonExplanationParts = (lesson, upToStep = Infinity) => {
    if (!lesson) return [];
    const parts = [];
    /* Only words the learner has actually been shown. A note about *Malli*
       appeared on the *Perigaanu* step, four words early. `word` is carried
       alongside because a learner who names a word in their question wants that
       word's own explanation, not whichever note shares the most incidental
       vocabulary with them. */
    const vocab = lesson.vocabulary || [];
    vocab.forEach((v, i) => {
        if (!v.teach) return;
        const shownAtStep = Math.floor((i * TEACH_STEPS) / Math.max(vocab.length, 1));
        if (shownAtStep > upToStep) return;
        parts.push({ text: v.teach.replaceAll('{w}', v.word), word: v.word });
    });
    /* Only drills the learner has actually reached. A note belonging to the
       self-introduction drill printed on a drill three steps earlier, which reads
       as the tutor answering a question nobody asked. Steps 8-10 are the sentence
       drills, 11-14 the conversations. */
    const phrases = lesson.phrases || [];
    const convos = lesson.conversations || [];
    phrases.forEach((d, i) => {
        if (d.grammarNote && 8 + i <= upToStep) parts.push({ text: d.grammarNote, word: null });
    });
    convos.forEach((d, i) => {
        if (d.grammarNote && 11 + i <= upToStep) parts.push({ text: d.grammarNote, word: null });
    });
    return parts;
};

export const lessonExplanations = (lesson) =>
    lessonExplanationParts(lesson).map(p => p.text).join(' ');

/** The one explanation that answers this question.
 *
 *  Handing back every note the lesson carries is worse than saying nothing — it
 *  is a wall of text where the learner asked one thing, and the answer is buried.
 *  Scored on shared words, ignoring the ones every sentence has.
 */
const QUESTION_STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'do',
    'does', 'did', 'how', 'what', 'why', 'when', 'which', 'who', 'that', 'this',
    'it', 'its', 'i', 'you', 'me', 'my', 'to', 'of', 'in', 'on', 'for', 'with',
    'can', 'could', 'should', 'would', 'will', 'not', 'no', 'yes', 'if', 'so',
    'about', 'just', 'always', 'ever', 'again', 'there', 'here', 'they', 'them',
    'word', 'words', 'say', 'said', 'mean', 'means', 'use', 'used', 'telugu',
    'form', 'forms', 'make', 'makes', 'add', 'adds', 'work', 'works', 'goes', 'go',
]);

/** The lesson's explanations, most relevant first.
 *
 *  Picking exactly one was the wrong target. Keyword scoring over eight or ten
 *  short paragraphs is inherently noisy — asked how to pluralise a noun it
 *  preferred a note that merely mentioned "noun" and "plural" to the note that
 *  IS the plural rule — and no amount of tie-breaking fixes that reliably.
 *  Handing the model the top few and requiring it to answer from them is both
 *  more robust and warmer than reciting one paragraph: retrieval only has to get
 *  the right note into the shortlist, and the fabrication and foreign-language
 *  guards still hold it to the truth.
 */
export const rankedExplanationsFor = (lesson, question, limit = 3, upToStep = Infinity) => {
    const parts = lessonExplanationParts(lesson, upToStep);
    if (!parts.length) return [];
    const asked = new Set(normalizeLatin(question).split(' ')
        .filter(t => t.length >= 2 && !QUESTION_STOPWORDS.has(t)));
    if (!asked.size) return parts.slice(0, limit).map(p => p.text);

    /* Scored on how many DISTINCT things the learner asked about the note covers,
       not on total word hits — otherwise a note that happens to repeat one of
       their words outranks the note that actually answers them. Shorter wins ties,
       because a learner who asked one question wants one paragraph. */
    const scored = parts.map(({ text, word }) => {
        const tokens = new Set(normalizeLatin(text).split(' ').filter(Boolean));
        // Naming the word outright wins outright.
        const named = word && asked.has(normalizeLatin(word)) ? 5 : 0;
        /* Prefer the part that actually EXPLAINS. Asked "which verb goes with
           kopamga", the definition "Kopam is anger, kopamga angrily" is on topic
           and answers nothing. Judged on substance rather than on where the text
           lives, because some vocabulary lines carry a lesson's whole rule — the
           plural rule sits on the word `Lu`, and gating this on "is it a grammar
           note" made a passing mention of "noun" outrank it. */
        const explanatory = (!word || text.length > 150) ? 1 : 0;
        let matched = 0;
        let exact = 0;
        for (const t of asked) {
            // Naming the thing outright counts double; sharing a stem counts once.
            if (tokens.has(t)) { matched += 2; exact++; continue; }
            for (const w of tokens) {
                if (w.length >= 4 && t.length >= 4
                    && (w.startsWith(t.slice(0, 4)) || t.startsWith(w.slice(0, 4)))) { matched++; break; }
            }
        }
        return { text, exact: exact + (named ? 1 : 0), matched: matched + named + (matched ? explanatory : 0) };
    /* At least one term named outright. A single shared stem was enough to return
       a note, and testers reported "an unrelated note reprinted" as the usual
       answer to a question — five times out of eight in one session. An off-topic
       note read as the tutor not listening; handing the question to the model is
       better than that. */
    }).filter(p => p.matched > 0 && p.exact > 0)
      .sort((a, b) => b.matched - a.matched || a.text.length - b.text.length);

    return scored.slice(0, limit).map(p => p.text);
};

/** The explanation to fall back on when the model gives nothing usable.
 *
 *  The most substantive of the shortlist rather than the top-ranked one. Ranking
 *  is good enough to get the right note into three candidates and not always good
 *  enough to put it first — asked how to pluralise a noun it preferred a note
 *  that mentions "noun" and "plural" to the note that IS the plural rule. Length
 *  is a crude proxy for "this one is the rule", and a crude proxy beats a
 *  coin-flip here. */
export const bestExplanationFor = (lesson, question, upToStep = Infinity, excludeWords = []) => {
    /* The deterministic fallback prefers a grammar note over a vocabulary line.
       A vocabulary line is what the learner has just finished reading on screen,
       and re-serving it as the answer to their question is the commonest
       complaint in the reports — "it printed the teaching line I'd just read as
       if it were an answer". A real note is at least new information. */
    const notes = lessonExplanationParts(lesson, upToStep).filter(p => !p.word).map(p => p.text);
    /* A word whose teaching line is about to be printed anyway must not also be
       the answer to the question — the learner would read the same paragraph
       twice in one turn. */
    const skip = new Set(lessonExplanationParts(lesson, upToStep)
        .filter(p => p.word && excludeWords.some(w => String(w).toLowerCase() === p.word.toLowerCase()))
        .map(p => p.text));
    const ranked = rankedExplanationsFor(lesson, question, 3, upToStep).filter(t => !skip.has(t));
    const preferred = ranked.filter(t => notes.includes(t));
    const shortlist = preferred.length ? preferred : ranked;
    if (!shortlist.length) return '';
    return shortlist.reduce((a, b) => (b.length > a.length ? b : a));
};

/* One live instruction per turn. Testers were handed a model reply that asked a
   fresh question and then a templated line re-asking the original — two tasks,
   neither of them clearly the one being scored. */
export const ONE_QUESTION_RULE =
    'Do NOT ask a question of your own and do NOT restate the task. A separate line '
    + 'immediately after yours gives the learner their instruction, so anything you ask '
    + 'competes with it and they cannot tell which one is being scored.';

/** Why this attempt failed, stated from what the grader actually checked.
 *
 *  The app asks the model to write this sentence, and across thirteen wrong
 *  answers in one session it named the wrong part of the word five times, gave
 *  backwards instructions twice, and invented a meaning once — telling a learner
 *  that *Badha* meant "obstacle" four cards after teaching it as "sadness".
 *  Confidently wrong feedback is worse than a plain hint: the learner acts on it.
 *
 *  Everything needed is already computed. `scoreAnswer` knows whether the words
 *  were present, whether they were in order, and whether an ending was swapped;
 *  the curriculum knows what every word means. So the common cases are answered
 *  from that, exactly, and the model is only asked when none of them fits.
 *
 *  Returns null when nothing certain can be said — the caller falls back to the
 *  curriculum's hint, which is at least never wrong.
 */
/* What an ending actually signals. Mood is in here as well as person, because
   the pair that trips learners most is *unnaru* against *unnara* — a statement
   against a question — and calling that "the wrong person" is simply false. */
const ENDING_MEANS = {
    nu: 'I', ru: 'you', vu: 'you (a friend)', di: 'it', du: 'he',
    ra: 'a question', ya: 'a question', mu: 'we',
};

export const explainMiss = (said, expected, variants = [], lexicon = new Map()) => {
    const { synonyms, meanings } = asLexicon(lexicon);
    const canon = (t) => synonyms.get(t) || t;
    const need = normalizeLatin(expected).split(' ')
        .filter(t => t && !/[[\]()]/.test(t) && t !== 'name' && t !== 'place');
    const got = normalizeLatin(said).split(' ').filter(Boolean);
    if (!need.length || !got.length) return null;

    // Right words, wrong order.
    const allPresent = need.every(t => got.includes(t));
    if (allPresent && need.length > 1) {
        let at = -1, ordered = true;
        for (const t of need) {
            const i = got.indexOf(t, at + 1);
            if (i === -1) { ordered = false; break; }
            at = i;
        }
        if (!ordered) return `All the right words — the order is not. ${need[0]} comes first.`;
    }

    /* An ending that changes who — or what — is meant.
       Only claimed when BOTH endings can be named. The vague fallback that used
       to sit here ("the ending is the wrong one for who you mean") fired on two
       cases where the person was perfectly right — *unnaru* for *unnara*, where
       the missing -a is the question, and a mood swap — and telling a learner
       their person is wrong when it is not sends them to fix the wrong thing.
       Better to say nothing and let the hint stand. */
    for (const t of need) {
        if (got.includes(t)) continue;
        const swapped = got.find(g => differsOnlyByPersonEnding(g, t));
        if (!swapped) continue;
        let mine = ENDING_MEANS[swapped.slice(-2)];
        let want = ENDING_MEANS[t.slice(-2)];
        /* -ru is "you" when addressing someone and the respectful "he/she" when
           speaking ABOUT them. Told "you want the 'you' form" for *Ayana badhaga
           unnaru*, a learner goes looking for a second person that is not there —
           and the card's own note says the opposite one line later. */
        const thirdPerson = /\b(ayana|ame|atanu|vaaru)\b/.test(normalizeLatin(expected));
        if (thirdPerson) {
            if (want === 'you') want = 'he/she (respectful)';
            if (mine === 'you') mine = 'he/she (respectful)';
        }
        if (!mine || !want || mine === want) break;
        return want.startsWith('a question')
            ? `Almost — ${t} is the question form; ${swapped} states it instead of asking.`
            : `That ending makes it "${mine}" — you want the "${want}" form.`;
    }

    /* An inflected form against its base. "It should not have the ending sound
       you used" is near-useless by ear; the ending has a name and the learner has
       just been taught it. */
    for (const t of need) {
        if (got.includes(t)) continue;
        const near = got.find(g => (g.startsWith(t) || t.startsWith(g)) && g !== t
            && Math.min(g.length, t.length) >= 3 && Math.abs(g.length - t.length) <= 3);
        if (!near) continue;
        const [longer, shorter] = near.length > t.length ? [near, t] : [t, near];
        const ending = longer.slice(shorter.length);
        if (!ending) continue;
        return near.length > t.length
            ? `Drop the -${ending} here: ${t}, not ${near}.`
            : `That one needs the -${ending} ending: ${t}, not ${near}.`;
    }

    // A word of the course used in place of another.
    for (const g of got) {
        if (need.includes(g) || need.includes(canon(g))) continue;
        const meaning = meanings.get(g) || meanings.get(canon(g));
        if (!meaning) continue;
        const missing = need.find(t => !got.some(x => x === t || canon(x) === canon(t)));
        const wanted = missing ? (meanings.get(missing) || meanings.get(canon(missing))) : null;
        if (wanted) return `${g} means "${meaning}" — here you want the word for "${wanted}".`;
        return `${g} means "${meaning}", which is not what this asks for.`;
    }

    /* A first-vowel swap. `differsOnlyByDeicticInitial` exists because i-/a-/e-
       is the whole pointing system in these languages — idhi/adhi, ikkada/akkada
       — so the grader refuses to forgive it, and the learner deserves to be told
       WHICH distinction they have just tripped over rather than "a word is
       missing". */
    for (const t of need) {
        if (got.includes(t)) continue;
        const near = got.find(g => differsOnlyByDeicticInitial(g, t));
        if (near) {
            const meaning = meanings.get(near) || meanings.get(canon(near));
            return meaning
                ? `${near} means "${meaning}" — the first vowel is what separates them, and in Telugu that changes the word.`
                : `Not ${near} but ${t} — it is the first vowel, and that changes the word.`;
        }
    }

    /* A plain near-miss: one letter out, and not one of the distinctions above.
       Saying "a word is missing" about a word they very nearly wrote is the kind
       of unhelpful accuracy that sends a learner looking in the wrong place. */
    for (const t of need) {
        if (got.includes(t)) continue;
        const near = got.find(g => Math.min(g.length, t.length) >= 3 && levenshtein(g, t) <= 1);
        if (near) return `Close — you wrote ${near}, and the word is ${t}.`;
    }

    // A word simply absent.
    const missing = need.filter(t => !got.some(g => g === t || canon(g) === canon(t)
        || (Math.min(g.length, t.length) >= 4 && isSpellingSlip(g, t))));
    if (missing.length === 1) {
        const meaning = meanings.get(missing[0]) || meanings.get(canon(missing[0]));
        return meaning
            ? `The word for "${meaning}" is missing.`
            : 'One word of the answer is missing.';
    }
    if (missing.length > 1 && missing.length < need.length) {
        return `${missing.length} of the words are missing.`;
    }

    // A misspelling, and nothing else.
    for (const t of need) {
        const slip = got.find(g => Math.min(g.length, t.length) >= 4 && isSpellingSlip(g, t));
        if (slip) return `Close — check the vowels in ${t}.`;
    }
    return null;
};

/* ── What the voice says ───────────────────────────────────────────────────
   The app is voice-first, and it sent ONLY `role: 'assistant'` messages to
   text-to-speech. Every 💡 grammar note and 🎓 banner is `role: 'system'`, so
   the whole of the feedback was printed and never spoken — the audio went
   straight from "Perfect!" to the next instruction while the explanation of what
   the learner had just done scrolled by in silence.

   That is backwards for learning. The verdict tells you whether; the note tells
   you why; and the why is the part worth hearing. So the voice now carries all
   three, in the order a teacher would say them: verdict, then why, then what's
   next.

   The notes are written to be read, though — several run to three or four
   sentences, which is half a minute of audio on every correct answer. The voice
   takes the first sentence, which is where each note states its rule, and the
   screen keeps the whole thing. Headline aloud, detail in text.                */

const NOTE_MARKERS = /^\s*(💡|🎓|✨|🎉|📋)\s*/u;

/** The spoken form of a feedback line.
 *
 *  The WHOLE note, not an opening extract. The first version spoke as many
 *  sentences as fitted a character cap, and both voice testers found the same
 *  fault: the cut landed on the caveat. Fourteen of seventy notes lost their
 *  second half, which is where the exception lives — and in lesson 26 that made
 *  the audio actively wrong, promising "use naaku X-ga undi and you will be right
 *  with every feeling here" while the qualifier that follows it stayed on screen.
 *  A half-rule spoken confidently is worse than no rule.
 *
 *  So the note is spoken entire, and the length limit moved to the content:
 *  `matcher-check` fails any note that would take more than about twenty seconds
 *  to say. Four had to be shortened; that is the right place for the constraint.
 */
export const spokenFormOfNote = (text, maxChars = Infinity) => {
    const plain = String(text || '')
        .replace(NOTE_MARKERS, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/[“”]/g, '"')
        // Emoji and list bullets are punctuation for the eye. A tester heard the
        // end-of-lesson summary read its 📋 aloud and run six · separators
        // together into one breathless sentence.
        //
        // NOT \p{Emoji_Component}: that property includes the ASCII digits 0-9,
        // because they are the components of keycap emoji like 1️⃣. Using it here
        // silently deleted every NUMBER from the spoken track, in every language —
        // "Vocabulary done — 6 words" was said as "Vocabulary done — words", and
        // "the same one that turns hogu into hogi back in lesson 3" as "back in
        // lesson". Round-K2 testers reported it in every lesson they played; for an
        // audio-only learner it breaks the sentence, and every cross-lesson
        // reference the course makes is a number. Pictographs, skin tones, flags,
        // the variation selector, ZWJ and the keycap mark are listed explicitly.
        .replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D\u20E3]/gu, '')
        .replace(/\s*·\s*/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!plain) return '';
    if (plain.length <= maxChars) return plain;

    const sentences = plain.split(/(?<=[.!?])\s+/);
    if (maxChars === 1) return sentences[0] || plain;
    let out = '';
    for (const part of sentences) {
        if (out && (`${out} ${part}`).length > maxChars) break;
        out = out ? `${out} ${part}` : part;
    }
    return out || sentences[0] || plain.slice(0, maxChars);
};

/** Everything in one turn that should be spoken, in the order it should be said.
 *
 *  Both roles, because a system note is feedback and feedback is the point. The
 *  caller passes the messages it is about to display; this returns the single
 *  utterance to synthesise. */
export const speechForTurn = (messages = []) => messages
    .map(m => (m.role === 'system' ? spokenFormOfNote(m.content) : String(m.content || '')))
    .filter(Boolean)
    .join(' ')
    .trim();

/* ── Lesson shape ──────────────────────────────────────────────────────── */

export const CYCLE_SIZE = 15;
export const MAX_SCENARIO_IDX = 29;

/** Which stage a step within a lesson belongs to. */
export const stageOf = (inScenario) => {
    if (inScenario < 5) return 'teach';
    if (inScenario < 8) return 'review';
    if (inScenario < 11) return 'phrase';
    return 'converse';
};
