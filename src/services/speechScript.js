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
    for (const lesson of CURRICULUM[langName] || []) {
        for (const v of lesson.vocabulary || []) {
            if (v?.word && v.native) words.set(keyOf(v.word), v.native);
            if (v?.word && v.phonetic) phonetics.set(keyOf(v.word), v.phonetic);
            for (const t of keyOf(v?.word).split(' ')) if (t) known.add(t);
        }
        for (const d of [...(lesson.phrases || []), ...(lesson.conversations || [])]) {
            if (d?.correct && d.native) phrases.set(keyOf(d.correct), d.native);
            for (const t of keyOf(d?.correct).split(' ')) if (t) known.add(t);
        }
    }
    const table = { words, phrases, phonetics, known, any: words.size > 0 || phrases.size > 0 };
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
    const { words, phrases, any } = tableFor(langName);
    if (!any) return raw;

    /* A whole drill line first: the curriculum writes these out, so fused and
       inflected forms (*manege*, *hegiddeera*) come through correct rather
       than being rebuilt word by word from their dictionary shapes. */
    const whole = phrases.get(keyOf(raw)) || words.get(keyOf(raw));
    if (whole) return whole;

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
    const raw = String(line || '')
        .replace(/(starts? with )(\p{L})[_\-\u2013\u2014]{2,}/gu, '$1$2')
        .replace(/(?<![\p{L}])(\p{L})[_\-\u2013\u2014]{2,}/gu, 'a word starting with $1')
        .replace(/[_]{2,}/g, 'a word');
    if (!raw.trim()) return [];
    const { known } = tableFor(langName);
    const tokensOf = (s) => keyOf(s).split(' ').filter(Boolean);
    const isTarget = (s, all) => {
        const toks = tokensOf(s);
        if (!toks.length) return false;
        return all ? toks.every(t => known.has(t)) : toks.some(t => known.has(t));
    };
    const out = [];
    const push = (target, text) => {
        const t = text.replace(/\s+/g, ' ');
        if (!t.trim()) return;
        const last = out[out.length - 1];
        const glue = /^[,.;:!?)]/.test(t.trim()) ? '' : ' ';
        if (last && last.target === target) last.text = `${last.text}${glue}${t.trim()}`;
        else out.push({ target, text: t.trim() });
    };
    const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|(?<![\p{L}])'([^']+)'(?![\p{L}])|"([^"]+)"/gu;
    let at = 0;
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
