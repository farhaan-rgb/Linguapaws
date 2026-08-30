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

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.lang = langCode;
    utterance.rate = rate;
    utterance.pitch = pitch;
    window.speechSynthesis.speak(utterance);
    return true;
}
