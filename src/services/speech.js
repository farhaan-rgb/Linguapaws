/* The browser's own voice, in one place.
 *
 * Two surfaces used to do this separately: `_tryBrowserTTS` in
 * `src/services/ai.js`, which picks a device voice for the language and reports
 * whether it found one, and the `speak` callback in `src/pages/Steps.jsx`,
 * which set no language at all and so handed every Telugu and Kannada word to
 * whatever voice the machine happened to boot with. They now share this.
 *
 * The one real difference between them is what to do when the device has no
 * voice for the language. Chat can fall through to the server and pay for a
 * real one; step mode has nowhere to fall to, so it speaks anyway and says so
 * in the console rather than going quiet. Hence `requireVoice`.
 */

import { getLanguageName } from '../../shared/languages.js';

const warnedFor = new Set();

/** The best device voice for a BCP-47 code, or `null`. Exact locale first, then
 *  the bare language — a `te` voice is still Telugu even if it is not `te-IN`. */
export function pickVoice(langCode) {
    if (typeof window === 'undefined' || !window.speechSynthesis || !langCode) return null;
    const voices = window.speechSynthesis.getVoices();
    const prefix = langCode.split('-')[0];
    return voices.find(v => v.lang === langCode)
        || voices.find(v => v.lang.replace('_', '-') === langCode)
        || voices.find(v => v.lang.startsWith(prefix))
        || null;
}

/** Some browsers populate the voice list asynchronously and hand back an empty
 *  array on first call. Waited on once, with a short ceiling, because a lesson
 *  that stalls waiting for a voice list is worse than one that misses a voice. */
export async function waitForVoices(timeoutMs = 500) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (window.speechSynthesis.getVoices().length) return;
    await new Promise(resolve => {
        window.speechSynthesis.onvoiceschanged = resolve;
        setTimeout(resolve, timeoutMs);
    });
}

/**
 * Speak with the device's own voice.
 *
 * @param {string} text
 * @param {string|null} langCode BCP-47, e.g. `te-IN`. Null means we do not know
 *        the language, and guessing is the failure this whole file exists for.
 * @param {{rate?: number, pitch?: number, requireVoice?: boolean, lang?: string}} opts
 *        `requireVoice: true` (the default) refuses to speak unless a voice for
 *        this language is installed, so the caller can pay for a real one.
 * @returns {boolean} whether anything was spoken.
 */
export function speakInBrowser(text, langCode, opts = {}) {
    const { rate = 1, pitch = 1, requireVoice = true, lang = null } = opts;
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;
    if (!text || !langCode) return false;

    const voice = pickVoice(langCode);
    if (!voice) {
        /* Once per language per session. Which engine spoke has never been
           knowable from a log in this app, and a learner reporting "the Telugu
           sounds American" needs to be answerable. */
        if (!warnedFor.has(langCode)) {
            warnedFor.add(langCode);
            const name = lang ? getLanguageName(lang) || lang : langCode;
            console.warn(
                `[speech] this device has no ${langCode} voice installed, so ${name} `
                + 'will be read by whatever voice the system defaults to.',
            );
        }
        if (requireVoice) return false;
    }

    /* Through `cancelSpeech`, not `speechSynthesis.cancel()`: a tap on a
       speaker button must also drop the tip queue, or the queue's next item
       starts the moment this one interrupts it. */
    cancelSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.lang = langCode;
    utterance.rate = rate;
    utterance.pitch = pitch;
    window.speechSynthesis.speak(utterance);
    return true;
}

/* ── A queue, for step mode's tips ─────────────────────────────────────────
 *
 * Step mode now reads its English prompts and explanations aloud as well as the
 * target word, and a line like "*Nanna* means “my”" is two voices: the English
 * voice for the English, the target path for the word. `speakInBrowser` cancels
 * whatever is playing every time it is called, so chaining two calls to it
 * would cut the first off. These utterances are chained on `onend` instead.
 *
 * `cancelSpeech` bumps a generation counter before it cancels: the browser
 * reports the cancelled utterance as ended (Chrome fires `onerror` with
 * `interrupted`), and without the counter that would start the next item.
 *
 * The gate is asked before every item, so a queue that is mid-sentence when the
 * learner starts recording stops at the next boundary at worst — the mic tap
 * also cancels outright, this is the second line of defence.
 */
let generation = 0;
let gate = () => false;
/* Chrome garbage-collects an utterance it is still speaking and then never
   fires its `onend`, which would strand the queue. Holding them fixes that. */
let held = [];

/** `fn()` returning true means "do not speak now" (we are recording). */
export function setSpeechGate(fn) {
    gate = typeof fn === 'function' ? fn : () => false;
}

/** Stop whatever is playing and drop everything queued behind it. */
export function cancelSpeech() {
    generation += 1;
    held = [];
    try { window.speechSynthesis?.cancel(); } catch { /* no synthesis */ }
}

/**
 * Speak `items` one after another, cancelling anything already playing.
 * @param {{text: string, code: string, rate?: number}[]} items
 * @returns {number} how many items were queued.
 */
export function queueSpeech(items) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return 0;
    cancelSpeech();
    const mine = generation;
    const list = (items || []).filter(it => it && it.code && String(it.text || '').trim());
    const next = (i) => {
        if (mine !== generation || i >= list.length) return;
        if (gate()) { cancelSpeech(); return; }
        const it = list[i];
        const u = new SpeechSynthesisUtterance(it.text);
        const voice = pickVoice(it.code);
        if (voice) u.voice = voice;
        u.lang = it.code;
        u.rate = it.rate ?? 1;
        let done = false;
        u.onend = u.onerror = () => {
            if (done) return;
            done = true;
            next(i + 1);
        };
        held.push(u);
        window.speechSynthesis.speak(u);
    };
    next(0);
    return list.length;
}

/** The device's English voice code: Indian English where installed, since the
 *  learners are in India, otherwise whatever English the device has. */
export function englishCode() {
    for (const code of ['en-IN', 'en-GB', 'en-US']) {
        const v = pickVoice(code);
        if (v && v.lang.replace('_', '-') === code) return code;
    }
    return 'en-US';
}
