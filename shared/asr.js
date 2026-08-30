/* Which engine can actually hear which language, and what to do when none can.
 *
 * The precedent this file exists to stop repeating: the transcribe route used to
 * ask Deepgram `nova-2` for Telugu and Kannada, `nova-2` covers neither, and the
 * request quietly decoded as **Hindi**. A Telugu learner was graded on a Hindi
 * transcription for months and nothing in the logs said so. The rule that came
 * out of it is in the voice agent's brief: never substitute a neighbouring
 * language — say the language cannot be heard, out loud, and fall back to
 * something honest. This table is that rule made mechanical.
 *
 * ── Everything below was probed against the live APIs on 2026-08-30 ──
 * Not read off a docs page, not remembered. Reproduce with `tools/stt-check.mjs
 * --probe`, which is the script these numbers came from.
 *
 * Deepgram — GET https://api.deepgram.com/v1/models, 443 STT model entries,
 * grouped by canonical name:
 *   nova-3-general  covers bn gu hi kn mr pa ta te ur (and 60-odd others)
 *   nova-2-general  covers hi and NO other Indian language — the old bug
 *   ml (Malayalam)  appears in NO nova model, only in Deepgram's whisper tiers
 *   or (Odia)       appears in NO Deepgram model at all, of any generation
 *
 * OpenAI — POST /v1/audio/transcriptions with an explicit `language`, real audio,
 * one call per code. A rejected language is an HTTP 400, not a bad transcript:
 *   whisper-1        accepts en hi kn mr ta ur ne
 *                    REJECTS te ml bn gu pa or — "Language 'te' is not supported."
 *   gpt-transcribe   accepts en hi kn mr ta ur te ml bn gu
 *                    REJECTS pa or — "Language code 'pa' is not recognized."
 *   gpt-4o-transcribe and gpt-4o-mini-transcribe accepted and rejected exactly
 *                    the same codes as gpt-transcribe on the seven Indic codes
 *                    tried against all three (te kn ml bn gu pa or).
 *
 * The two findings that matter to the product:
 *
 *  1. **Odiya cannot be heard by anything we are wired to.** Thirty lessons —
 *     joint-largest course in the app — and no Deepgram model, no OpenAI model,
 *     no code spelling (`or`, `ori`, `ory`, `or-IN`, `odia`, `oriya`) accepted by
 *     any of them. Today the route sends it to Whisper with auto-detect, which
 *     is the Hindi-substitution bug wearing a different hat: it returns
 *     confident text in whatever language Whisper guesses. It now refuses
 *     instead, and says why. Google Cloud Speech-to-Text V2 `chirp_2` does list
 *     or-IN — https://docs.cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages
 *     checked 2026-08-30 — and is the way out; it needs the same Google
 *     credential the TTS side has been waiting on. Unverified by ear.
 *
 *  2. **Malayalam had the same hole and it was invisible.** Not on any Deepgram
 *     nova model, rejected by whisper-1, so it fell to Whisper auto-detect too.
 *     `gpt-transcribe` accepts `ml`, so it is covered now — by second choice
 *     rather than by luck.
 *
 * Measured latency, this machine, same 1.6s Kannada clip, 6 runs each:
 *   gpt-transcribe    645 / 812 / 1025 ms   (min / median / max)
 *   deepgram nova-3   870 / 1227 / 1688 ms
 *   whisper-1        1302 / 3718 / 6501 ms  (3 runs, and it wandered)
 *
 * Price per minute of audio, both vendors' own pages, checked 2026-08-30:
 *   Deepgram nova-3 pre-recorded  $0.0043/min  https://deepgram.com/pricing
 *   OpenAI gpt-transcribe         see VOICE-STACK.md for the per-lesson maths
 */

/** Deepgram `nova-3` language codes, per language id. `null` means no Deepgram
 *  model covers it — fall through, never substitute. */
const DEEPGRAM = {
    en: 'en', hi: 'hi', te: 'te', kn: 'kn', ta: 'ta', bn: 'bn',
    gu: 'gu', mr: 'mr', pa: 'pa', ur: 'ur',
    ml: null,   // absent from every nova model
    or: null,   // absent from every Deepgram model of any generation
};

/** OpenAI `gpt-transcribe` language codes.
 *
 *  Read VOICE-STACK.md §2 before promoting this to first rung. Given synthesised
 *  Telugu containing a deliberate learner error — ఉన్నాము where the target is
 *  ఉన్నారు, the exact mistake the course exists to correct — `gpt-transcribe`
 *  returned the *right* form. It repaired the learner. That is the one thing a
 *  transcriber feeding a grader must never do, and it is a property of the model
 *  being good rather than a bug that can be configured away.
 *
 *  It is here anyway, at second rung, because the alternative for Malayalam is
 *  nothing at all and the alternative everywhere else is a slower, less accurate
 *  Whisper. What follows from it: a transcript that reached the app through this
 *  engine is evidence of roughly what was said and is NOT evidence of how it was
 *  pronounced. Nothing should build a pronunciation score on it.
 *
 *  `gpt-4o-transcribe` was faithful on the same clip and is the better model for
 *  a grader, but it accepts `language=te`/`ml`/`bn` and then ignores them —
 *  returning Kannada for all three. The wrong-script guard in the transcribe
 *  route now catches that, so the swap is worth revisiting once there is human
 *  audio to test it on. */
const OPENAI_GPT = {
    en: 'en', hi: 'hi', te: 'te', kn: 'kn', ta: 'ta', ml: 'ml',
    bn: 'bn', gu: 'gu', mr: 'mr', ur: 'ur',
    pa: null,   // 400 "Language code 'pa' is not recognized"
    or: null,   // 400, for every spelling tried
};

/** OpenAI `whisper-1` language codes. Kept as a third rung because it is the
 *  only one of the three that has never been down mid-lesson, not because it is
 *  good: it is the slowest and the least accurate of the three on Kannada. */
const WHISPER = {
    en: 'en', hi: 'hi', kn: 'kn', ta: 'ta', mr: 'mr', ur: 'ur', ne: 'ne',
    te: null, ml: null, bn: null, gu: null, pa: null, or: null,
};

export const ENGINES = [
    { id: 'deepgram', model: 'nova-3', codes: DEEPGRAM },
    { id: 'openai', model: 'gpt-transcribe', codes: OPENAI_GPT },
    { id: 'whisper', model: 'whisper-1', codes: WHISPER },
];

/** Normalise whatever the caller has — `'Kannada'`, `'kn'`, `{ id, name }`. */
const idOf = (lang) => {
    if (!lang) return '';
    const raw = typeof lang === 'object' ? (lang.id || lang.name || '') : lang;
    return String(raw).trim().toLowerCase().slice(0, 2);
};

/**
 * The ordered list of engines that can genuinely hear this language.
 *
 * An empty array is a real answer and the most important one this function
 * returns: it means no vendor we are wired to covers the language, and the
 * caller must say so rather than pick the nearest thing. Odiya is empty today.
 */
export function asrLadder(lang) {
    const id = idOf(lang);
    if (!id) return [];
    return ENGINES
        .map(e => ({ engine: e.id, model: e.model, code: e.codes[id] || null }))
        .filter(e => e.code);
}

/** True when nothing in the stack can transcribe this language at all. */
export function isUnhearable(lang) {
    return asrLadder(lang).length === 0;
}

/** Every language id the table knows, for the coverage report in tools. */
export const KNOWN_IDS = Object.keys(DEEPGRAM);
