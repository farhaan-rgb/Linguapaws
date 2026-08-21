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

    // forgive single-vs-double vowel spellings (kavali / kaavali)
    if (score > 0.8 && score < 1.0
        && na.replace(/[aeiouy]+/g, 'v') === nb.replace(/[aeiouy]+/g, 'v')) return 1.0;

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

/** alt -> canonical, so a synonym means the same thing at every step. */
export const buildSynonymMap = (lessons = []) => {
    const map = new Map();
    for (const lesson of lessons) {
        for (const v of lesson.vocabulary || []) {
            if (!v.word || !Array.isArray(v.alt)) continue;
            const canon = v.word.toLowerCase();
            for (const a of v.alt) map.set(String(a).toLowerCase(), canon);
        }
    }
    return map;
};

export const tokenCoverage = (actual, expected, synonyms = new Map()) => {
    const canon = (t) => synonyms.get(t) || t;
    const said = normalizeLatin(actual).split(' ').filter(Boolean);
    const need = normalizeLatin(expected).split(' ').filter(Boolean);
    if (!need.length) return 1;

    const pool = [...said];
    let hits = 0;
    for (const token of need) {
        if (/[[\]()]/.test(token)) { hits++; continue; }
        const want = canon(token);
        const i = pool.findIndex(raw => {
            const s = canon(raw);
            return s === want
                || (Math.max(s.length, want.length) >= 4
                    && levenshtein(s, want) <= 1
                    && !differsOnlyByPersonEnding(s, want));
        });
        if (i !== -1) { hits++; pool.splice(i, 1); }
    }
    return hits / need.length;
};

/** Best ratio and coverage across a target and every accepted variant. */
export const scoreAnswer = (actual, expected, variants = [], synonyms = new Map()) => {
    const all = [expected, ...variants].filter(Boolean);
    if (!all.length) return { ratio: 0, coverage: 0, accepted: false };
    const ratio = all.reduce((b, v) => Math.max(b, similarityRatioLatin(actual, v)), 0);
    const coverage = all.reduce((b, v) => Math.max(b, tokenCoverage(actual, v, synonyms)), 0);
    return { ratio, coverage, accepted: ratio >= THRESHOLD && coverage >= COVERAGE_FLOOR };
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
        ? `${wordObj.teach.replace('{w}', `**${wordObj.word}**`)} Your turn — say **${wordObj.word}**`
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
            ? w.teach.replace('{w}', `**${w.word}**`)
            : `"${w.meaning}" is **${w.word}**`;
        return body.replace(/\.$/, '');
    }).join('. ');
    const last = words[words.length - 1];
    const lastRaw = last.teach
        ? last.teach.replace('{w}', `**${last.word}**`)
        : `"${last.meaning}" is **${last.word}**`;
    const lastBody = /[.?!]$/.test(lastRaw) ? lastRaw : `${lastRaw}.`;
    // every word in the step, not just the last — the others were shown with no
    // pronunciation and then quizzed first
    const phon = words.filter(w => w.phonetic)
        .map(w => `\n<phonetic>${w.word}: ${w.phonetic}</phonetic>`).join('');
    return `${opener}${opener ? ' ' : ''}${lead}. ${lastBody} Your turn — say **${last.word}**${phon}`;
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
    return Boolean(needle) && needle.length >= 4 && haystack.includes(needle);
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
    if (saidTokens.length < wantTokens.length - 1) return false;
    return saidTokens.some(x => wantTokens.some(y =>
        x === y || (Math.max(x.length, y.length) >= 4 && levenshtein(x, y) <= 1)));
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

export const looksLikeQuestion = (t) => {
    const words = (t || '').toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length < 3) return false;
    return words.filter(w => ENGLISH_TELLS.has(w.replace(/'/g, ''))).length >= 2;
};

export const CONTINUE_WORDS = new Set([
    'continue', 'next', 'next please', 'next one', 'go on', 'goon',
    'proceed', 'move on', 'carry on', 'keep going', 'ready', 'im ready',
    'okay', 'ok', 'okey', 'sure', 'got it', 'gotit', 'yes', 'yeah', 'yep',
    'hmm', 'hm', 'alright', 'right', 'cool', 'done', 'understood', 'k',
]);

export const isAcknowledgement = (text) => CONTINUE_WORDS.has(
    (text || '').trim().toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
);

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
