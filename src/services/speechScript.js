/* What the voice is handed, as opposed to what the learner reads.
 *
 * The course is written in romanised Latin — `Idu`, not `ಇದು` — because that
 * is what a beginner can read, type and be graded against. A real Kannada
 * neural voice handed that Latin string does not read it as Kannada; it reads
 * it as English. Measured 2026-10-05, Azure `kn-IN-SapnaNeural` via edge-tts,
 * transcribed by Deepgram `nova-3` `kn`:
 *
 *     ಇದು   → ಇದು        conf 0.989      the word
 *     Idu   → "Idea"     conf 0.564      an English noun
 *     ಹೇಗೆ   → ಹೇಗೆ        conf 0.701
 *     Hege  → ಈಜ್         conf 0.483
 *
 * Across all 57 Kannada vocabulary words, 54 round-tripped to the intended
 * word in native script against 25 in Latin (the other three are ASR
 * artifacts, not spelling errors — see the report). That is the bug Farhaan
 * heard as "Eye-dee-you", and no vendor fixes it: it is an orthography
 * problem, recorded as VOICE-STACK.md §7.5 before it was fixed here.
 *
 * So the curriculum now carries a `native` field beside the `word` and
 * `correct` strings. It is **audio only**. Nothing displays it, nothing grades
 * against it, and `lessonEngine.scoreAnswer` has never seen it.
 *
 * Telugu was converted next, on 2026-10-05, and the result is worth knowing
 * before converting a third language: Telugu's romanisation was already
 * working. 146 of its 163 words come back as the intended word in native
 * script against **131** in Latin — a 9-point gap, where Kannada's was 51
 * (VOICE-STACK.md §7.5.2). Native script is still the right answer for Telugu
 * — `Pani` was being heard as the Hindi पानी, "water" — but do not assume the
 * next language is a Kannada-sized emergency. Measure it with
 * `tools/script-check.mjs --tts` first.
 *
 * One deliberate limit, for whoever adds the next language: this resolves
 * all-or-nothing. A phrase whose every token has a native form is spoken in
 * native script; one with a single unmapped token is spoken exactly as before.
 * A half-and-half string would make the voice change alphabet mid-sentence,
 * which is worse than either end.
 */

import { CURRICULUM } from './curriculum.js';
import { toNativeWithLexicon } from '../../shared/transliterate.js';

/** Languages `shared/transliterate.js` can write in native script from the
 *  course's romanisation. Everywhere else the all-or-nothing rule above holds. */
const TRANSLITERATED = new Set(['Kannada', 'Telugu']);

/** Lookup key: case and punctuation carry no sound, so they carry no key. */
const keyOf = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** `{ words, phrases }` for a language, built once and kept. */
const tables = new Map();

function tableFor(langName) {
    if (tables.has(langName)) return tables.get(langName);
    const words = new Map();
    const phrases = new Map();
    const phonetics = new Map();
    /* Every token the course writes in the target language, native or not —
       what lets a tip line tell `*Nanna*` from `*not*`. */
    const known = new Set();
    /* Romanised token → native token, for building words the course never
       stored whole: every single-word vocabulary entry, plus each token of a
       drill line whose Latin and native split into the same number of words
       (`Naanu manege hoguttene` gives `manege` → ಮನೆಗೆ). First seen wins. */
    const lexicon = new Map();
    const align = (latin, native) => {
        const a = keyOf(latin).split(' ').filter(Boolean);
        const b = String(native).replace(/[^\p{L}\p{M}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
        if (a.length !== b.length) return;
        a.forEach((t, i) => { if (/^[a-z]+$/.test(t) && !lexicon.has(t)) lexicon.set(t, b[i]); });
    };
    for (const lesson of CURRICULUM[langName] || []) {
        for (const v of lesson.vocabulary || []) {
            if (v?.word && v.native) { words.set(keyOf(v.word), v.native); align(v.word, v.native); }
            if (v?.word && v.phonetic) phonetics.set(keyOf(v.word), v.phonetic);
            /* "See it in a sentence" examples written for words the course has
               no sentence for: said whole, like a drill line. Not aligned into
               `lexicon` and not `known` — they are display-only. */
            for (const x of v?.examples || []) if (x?.text && x.native) phrases.set(keyOf(x.text), x.native);
            for (const t of keyOf(v?.word).split(' ')) if (t) known.add(t);
        }
        for (const d of [...(lesson.phrases || []), ...(lesson.conversations || [])]) {
            if (d?.correct && d.native) { phrases.set(keyOf(d.correct), d.native); align(d.correct, d.native); }
            for (const t of keyOf(d?.correct).split(' ')) if (t) known.add(t);
        }
    }
    const table = { words, phrases, phonetics, known, lexicon, any: words.size > 0 || phrases.size > 0 };
    tables.set(langName, table);
    return table;
}

/** Does this language carry native script at all? Languages that do not are
 *  untouched by everything below — the point of adding Kannada first, and then
 *  Telugu without touching a line of code, was that nothing else had to
 *  change. Hindi, Odiya and the six one-lesson courses are still romanised. */
export function hasNativeScript(langName) {
    return tableFor(langName).any;
}

/**
 * The string to synthesise for a target-language string the course displays.
 *
 * Returns `text` unchanged whenever there is nothing better to say: no native
 * script for the language, an unrecognised phrase, or a phrase with any token
 * the course has not given a native form.
 *
 * @param {string} langName e.g. `'Kannada'`
 * @param {string} text the romanised string shown on screen
 * @returns {string}
 */
export function speechTextFor(langName, text) {
    const raw = String(text || '');
    if (!raw.trim()) return raw;
    const { words, phrases, lexicon, any } = tableFor(langName);
    if (!any) return raw;

    /* A whole drill line first: the curriculum writes these out, so fused and
       inflected forms (*manege*, *hegiddeera*) come through correct rather
       than being rebuilt word by word from their dictionary shapes. */
    const whole = phrases.get(keyOf(raw)) || words.get(keyOf(raw));
    if (whole) return whole;

    /* Kannada and Telugu: every token gets native script — the course's own
       form where it has one, otherwise built by `shared/transliterate.js`.
       That is what reaches the learner's own misspelling in a miss line
       (`hogutiddene`) and inflections the course never stored whole; read as
       Latin, a Kannada voice says both in an English accent (VOICE-STACK.md
       §7.5). Punctuation stays where it was, for the voice's intonation. */
    if (TRANSLITERATED.has(langName)) {
        return raw.split(/(\s+)/).map((piece) => {
            const m = piece.match(/^([^\p{L}]*)([\p{L}'’-]+)([^\p{L}]*)$/u);
            /* `[name]` is a slot for the learner, not a word to say. */
            if (!m || !/^[A-Za-z'’-]+$/.test(m[2]) || m[1].includes('[')) return piece;
            const native = words.get(keyOf(m[2])) || toNativeWithLexicon(m[2], langName, lexicon);
            return native ? m[1] + native + m[3] : piece;
        }).join('');
    }

    /* Otherwise a teach step, which joins two or three vocabulary words with a
       space and so is not in either table verbatim. */
    const tokens = raw.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) return raw;
    const out = [];
    for (const token of tokens) {
        const native = words.get(keyOf(token));
        if (!native) return raw;             // all-or-nothing, on purpose
        out.push(native);
    }
    /* Keep a trailing question mark: an Indic voice uses it for intonation,
       and a drill that asks a question should sound like one. */
    const tail = /[?!.]$/.test(raw) ? raw.slice(-1) : '';
    return out.join(' ') + tail;
}

/**
 * The string to hand a voice that does NOT speak the language — a laptop with
 * no Kannada voice, where the English voice reads the Latin `Mane` as "main".
 * Each word the course gives a pronunciation guide for is swapped for that
 * guide (`muh-neh`), which an English voice reads close to right. Words with
 * no guide stay as they are. A stopgap until the course ships recorded audio.
 */
export function englishVoiceTextFor(langName, text) {
    const raw = String(text || '');
    const { phonetics } = tableFor(langName);
    if (!raw.trim() || !phonetics.size) return raw;
    return raw.split(/\s+/).filter(Boolean).map((token) => {
        const guide = phonetics.get(keyOf(token));
        return guide ? guide.replace(/-/g, ' ') : token;
    }).join(' ');
}

/* The `explainMiss` templates that carry a bare target word, one capture per
   word. Kept narrow on purpose: each anchor is a phrase only those lines use. */
const W = "([\\p{L}'’-]+)";
const P = "([\\p{L}'’ ,?-]+)";   // a whole drill line, in the word-order lines
const MISS_TEMPLATES = [
    `you wrote ${W}`,
    `the word is ${W}(?=\\.|$)`,
    `\\bNot ${W} but ${W}`,
    `\\bNot ${W}(?=: it is| — it is)`,
    `^${W} means "`,
    `check the vowels in ${W}`,
    `check the spelling of ${W}`,
    `: ${W}, not ${W}(?=\\.)`,
    `the order is not\\. ${W} (?=goes|comes)`,
    `goes right after ${W}(?:: ${P}(?=\\.))?`,
    `(?:goes last|comes first): ${P}(?=\\.)`,
    `Almost — ${W} (?=states|is the question form)`,
    `; ${W} states it`,
];
const MISS_SLOTS = new RegExp(MISS_TEMPLATES.map(t => `(?:${t})`).join('|'), 'gu');
const MISS_SLOT_GROUPS = (MISS_TEMPLATES.join('').match(/\(\[/g) || []).length;

/**
 * A line as it should be HEARD. Meanings are written for the eye — "Then / in
 * that case", "If (someone) goes", "Town / hometown" — and round K5 heard every
 * "You can now say:" summary read them out symbol by symbol. A slash between
 * words is said as "or"; brackets go and their words stay. A doubled stop left
 * where a quoted sentence ends a prompt (`'I have no change.'.`, `"Really?"?`)
 * is said once. Display text is never touched; this is for voices only.
 */
export function speakableText(text) {
    return String(text || '')
        .replace(/([\p{L}'’)?!.])\s*\/\s*(?=[\p{L}(*-])/gu, '$1 or ')
        /* A bracketed aside is set off with commas, so the voice pauses round
           it: "That person (polite)" ran together as "that person polite". */
        .replace(/\s*\(([^()]*)\)\s*/g, (m, inner, at, all) => {
            const rest = all.slice(at + m.length);
            /* Only a trailing qualifier — "(polite)" closing a phrase — is set
               off; one mid-phrase, "If (someone) goes", reads straight on. */
            const trailing = !rest || /^[,.;:!?"'”’]/.test(rest);
            if (!trailing) return `${at > 0 ? ' ' : ''}${inner.trim()} `;
            return `${at > 0 ? ', ' : ''}${inner.trim()}`;
        })
        /* And a quoted phrase after a word gets a pause before it — `say
           "That person"` — since the quote marks themselves are not spoken. */
        .replace(/\b(say|says|said|ask|asks|tell|answer|reply)\s+(["“‘]|'(?=\p{L}))/giu, '$1, $2')
        .replace(/([.?!])(["'”’]?)[.?!]+/g, '$1$2')
        .replace(/[ \t]{2,}/g, ' ');
}

/**
 * Split an English tip line into what the English voice reads and what the
 * target path reads. Step mode's lines mark target words the same way chat's
 * do — `*Nanna* means “my”`, `*mane* + -ge` — so an emphasised span is target
 * language — single-star italics are, unless they are an English contraction
 * (*I'm*); bold must contain a word this course teaches (`**not**` does not). A quoted span in a prompt (`Someone asks
 * 'Neevu yelli?'`) counts only when every token in it is a course word, since
 * most quotes in a prompt are the English sentence to translate.
 *
 * Checked over 1,421 prompt, hint and grammar-note lines across the ten
 * courses (2026-10-14): all 345 single-star italic spans are target words,
 * 15 of them inflections absent from the vocabulary, which is why italics are
 * not required to be in it.
 *
 * @returns {{target: boolean, text: string}[]} in reading order, never empty
 *          strings; markdown and quote marks removed.
 */
export function tipSegments(langName, line) {
    /* A first-letter outline (`I__`, `A____ hesaru`, `K----`) is for the eye.
       Read as written it came out "I dot"; say what it means instead. */
    const raw = speakableText(line)
        .replace(/(starts? (?:with )?)(\p{L})[_\-\u2013\u2014]{2,}/gu, '$1$2')
        .replace(/(?<![\p{L}])(\p{L})[_\-\u2013\u2014]{2,}/gu, 'a word starting with $1')
        .replace(/[_]{2,}/g, 'a word')
        /* The engine's miss lines name words bare — `Close — you wrote
           hogutiddene, and the word is hoguttiddene.` — with no markup, so the
           whole line went to the English voice, the learner's spelling and the
           right word both in an English accent. Mark the slots those templates
           put a target word in (lessonEngine.explainMiss), and they are read
           like any other italic target span. The learner's own spelling is
           kept, said in the language's voice, then the right one: hearing the
           two side by side is what the line is for. Kannada and Telugu only:
           elsewhere the language's voice would be handed Latin, which is no
           better than the English voice it replaces. */
        .replace(TRANSLITERATED.has(langName) ? MISS_SLOTS : /$^/u, (all, ...groups) => {
            let out = all;
            for (const g of groups.slice(0, MISS_SLOT_GROUPS)) {
                if (g) out = out.replace(new RegExp(`(?<![\\p{L}*])${g}(?![\\p{L}*])`, 'u'), `*${g}*`);
            }
            return out;
        });
    if (!raw.trim()) return [];
    const { known } = tableFor(langName);
    const tokensOf = (s) => keyOf(s).split(' ').filter(Boolean);
    const isTarget = (s, all) => {
        const toks = tokensOf(s);
        if (!toks.length) return false;
        return all ? toks.every(t => known.has(t)) : toks.some(t => known.has(t));
    };
    const out = [];
    let brk = false;
    const push = (target, text) => {
        const t = text.replace(/\s+/g, ' ');
        if (!t.trim()) return;
        /* Bare punctuation left between two spans — the full stop after a
           closing *Idu* — is not a segment: on its own the English voice
           reads "." as "dot". It is pause, not speech, so it is dropped. */
        if (!/[\p{L}\p{N}]/u.test(t)) {
            /* ...but a full stop between two target spans still ends one
               utterance — `*naanu ishta*. *Naanu* means` was queued as the one
               Kannada phrase "naanu ishta Naanu". */
            if (/[.!?;]/.test(t)) brk = true;
            /* A closing "?" still belongs to the line before it, or the voice
               reads a question as a statement. */
            const prev = out[out.length - 1];
            if (prev && /\?/.test(t) && !/\?$/.test(prev.text)) prev.text += '?';
            return;
        }
        const last = out[out.length - 1];
        const glue = /^[,.;:!?)]/.test(t.trim()) ? '' : ' ';
        if (last && last.target === target && !brk) last.text = `${last.text}${glue}${t.trim()}`;
        else out.push({ target, text: t.trim() });
        brk = false;
    };
    /* A course word opening the line bare — `Male is "rain"`, the shape every
       teaching line takes once its {w} is filled in without markup — is the
       word being taught, not English. Round K5 heard that Male in an English
       accent. Only at the very start, only before is/means, and only a word
       this course teaches, so an English sentence that opens "It is" stays
       English. */
    const lead = /^(\p{L}+)(?=\s+(?:is|means)\b)/u.exec(raw);
    if (lead && known.has(keyOf(lead[1])) && TRANSLITERATED.has(langName)) {
        push(true, lead[1]);
    }
    const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|(?<![\p{L}])'([^']+)'(?![\p{L}])|"([^"]+)"/gu;
    let at = out.length ? lead[1].length : 0;
    for (const m of raw.matchAll(re)) {
        push(false, raw.slice(at, m.index));
        const span = m[1] ?? m[2] ?? m[3] ?? m[4];
        /* Single-star italics are how every line in this course marks a target
           word, inflected forms included (*bagunnaru*, *doddadu*), and those
           are not all in the vocabulary — so italics are target unless they
           are an English contraction (*I'm*). Bold and quotes must prove it. */
        const target = m[2] != null
            ? (isTarget(span, false) || !/\p{L}'\p{L}/u.test(span))
            : isTarget(span, m[3] != null || m[4] != null);
        push(target, span);
        at = m.index + m[0].length;
    }
    push(false, raw.slice(at));
    return out;
}
