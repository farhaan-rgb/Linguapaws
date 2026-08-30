/* The one place a language becomes a code or a voice.
 *
 * There were three copies of this mapping before this file existed —
 * `_getLangCode` in `src/services/ai.js`, `resolveLanguageCode` in
 * `backend/routes/ai.js`, and a half-written one inline in `src/pages/Steps.jsx`
 * that read `targetLang.speechCode || targetLang.code`, two fields no language
 * object has ever carried. Three copies is how `Odiya` came to resolve to
 * `en-IN` on one side and to `null` on the other while the picker went on
 * calling it `Odiya`, and it is how a fourth copy would have gone wrong too.
 *
 * The awkward part this file has to absorb: the pickers in
 * `src/pages/LearnLanguageSelect.jsx` and `src/pages/LanguageSelect.jsx` store a
 * whole object — `{ id: 'te', name: 'Telugu', native: 'తెలుగు' }` — while chat
 * passes only `targetLang.name` and the backend receives sometimes a string and
 * sometimes the object. So every lookup here takes any of the three, and the
 * alias list carries the spellings the product actually uses, not the ones the
 * ISO tables prefer. `Odiya` is the product's spelling; `Odia` and `Oriya` are
 * aliases for it rather than the other way round.
 *
 * ESM on purpose: the frontend is ESM and Vite will not transform a CommonJS
 * source file in dev. The backend is CommonJS and reaches this file through
 * `require()`, which Node supports for a synchronous ESM graph from v22.12 —
 * hence the `engines` field in `backend/package.json`.
 */

/* Google Cloud Text-to-Speech voice names.
 *
 * Chirp 3: HD voices are selectable *by name only*; a request carrying just
 * `{ languageCode, ssmlGender }` resolves to a Standard voice, which for Telugu
 * means `te-IN-Standard-A` — a 2016-era voice bought at 2026 prices. So the
 * name is pinned here, per language.
 *
 * Every name below was checked against Google's published voice list on
 * 2026-08-30 rather than inferred from the naming pattern:
 * https://cloud.google.com/text-to-speech/docs/list-voices-and-types
 * The page was fetched in full and grepped per locale; `te-IN` and `kn-IN` each
 * return exactly 30 `Chirp3-HD` voices, and `Achernar` (FEMALE) is present for
 * every locale pinned below. Voice-name format is confirmed as
 * `<locale>-Chirp3-HD-<voice>` at
 * https://cloud.google.com/text-to-speech/docs/chirp3-hd (checked 2026-08-30),
 * which also confirms MP3 is a supported output format for batch synthesis —
 * which is the call this app makes.
 *
 * The two that had to be right were heard, indirectly: Google publishes a WAV
 * sample per voice, and `te-IN-Chirp3-HD-Achernar` transcribes through Deepgram
 * `nova-3` `te` as clean Telugu at 0.984 confidence, `kn-IN-Chirp3-HD-Achernar`
 * as clean Kannada at 0.954 (measured 2026-08-30). The same sentence from
 * `te-IN-Standard-A` came back missing its first half at 0.848 — which is the
 * quality gap this pin exists to buy.
 *
 * Which of the thirty sounds most like a patient tutor is **unverified** — that
 * needs credentials and a person listening, and `Achernar` is a starting point,
 * not a judgement. Changing it is a one-word edit here.
 *
 * `or-IN` is absent from Google's voice list at every tier — the strings "Odia"
 * and "Oriya" do not appear on the page at all — so Odiya's voice is `null` and
 * the server is expected to say so out loud rather than substitute a neighbour.
 */
const CHIRP3 = (locale) => `${locale}-Chirp3-HD-Achernar`;

/** Every language the pickers can store, with the spellings they store it as. */
export const LANGUAGES = [
    { id: 'en', name: 'English', code: 'en-IN', aliases: [], googleVoice: CHIRP3('en-IN'), googleVoiceGender: 'FEMALE' },
    { id: 'hi', name: 'Hindi', code: 'hi-IN', aliases: [], googleVoice: CHIRP3('hi-IN'), googleVoiceGender: 'FEMALE' },
    { id: 'te', name: 'Telugu', code: 'te-IN', aliases: [], googleVoice: CHIRP3('te-IN'), googleVoiceGender: 'FEMALE' },
    { id: 'kn', name: 'Kannada', code: 'kn-IN', aliases: [], googleVoice: CHIRP3('kn-IN'), googleVoiceGender: 'FEMALE' },
    { id: 'ta', name: 'Tamil', code: 'ta-IN', aliases: [], googleVoice: CHIRP3('ta-IN'), googleVoiceGender: 'FEMALE' },
    { id: 'ml', name: 'Malayalam', code: 'ml-IN', aliases: [], googleVoice: CHIRP3('ml-IN'), googleVoiceGender: 'FEMALE' },
    { id: 'bn', name: 'Bengali', code: 'bn-IN', aliases: [], googleVoice: CHIRP3('bn-IN'), googleVoiceGender: 'FEMALE' },
    { id: 'gu', name: 'Gujarati', code: 'gu-IN', aliases: [], googleVoice: CHIRP3('gu-IN'), googleVoiceGender: 'FEMALE' },
    { id: 'mr', name: 'Marathi', code: 'mr-IN', aliases: [], googleVoice: CHIRP3('mr-IN'), googleVoiceGender: 'FEMALE' },
    { id: 'ur', name: 'Urdu', code: 'ur-IN', aliases: [], googleVoice: CHIRP3('ur-IN'), googleVoiceGender: 'FEMALE' },
    /* VOICE-STACK.md recorded Punjabi's Chirp 3: HD voices as Preview. The voice
       list shows them on 2026-08-30 as Premium with no preview marker; which of
       the two is current is unverified, and Punjabi has one lesson. */
    { id: 'pa', name: 'Punjabi', code: 'pa-IN', aliases: [], googleVoice: CHIRP3('pa-IN'), googleVoiceGender: 'FEMALE' },
    /* Google has no Odia voice at any tier. Null is the honest answer; the
       caller is expected to fall back loudly rather than pick a neighbour. */
    { id: 'or', name: 'Odiya', code: 'or-IN', aliases: ['odia', 'oriya'], googleVoice: null, googleVoiceGender: null },
];

const INDEX = new Map();
for (const lang of LANGUAGES) {
    INDEX.set(lang.id, lang);
    INDEX.set(lang.name.toLowerCase(), lang);
    INDEX.set(lang.code.toLowerCase(), lang);
    for (const alias of lang.aliases) INDEX.set(alias, lang);
}

/** Accepts `'Telugu'`, `'te'`, `'te-IN'`, or the stored `{ id, name, native }`. */
function toKey(lang) {
    if (!lang) return '';
    if (typeof lang === 'object') {
        return String(lang.name || lang.id || '').trim().toLowerCase();
    }
    return String(lang).trim().toLowerCase();
}

/** The full record, or `null` when we genuinely do not know the language. */
export function findLanguage(lang) {
    return INDEX.get(toKey(lang)) || null;
}

/** BCP-47 code, or `null` when unknown — the browser-TTS ladder needs to be able
 *  to tell "no idea" from "English", because guessing English is the bug. */
export function getLangCode(lang) {
    return findLanguage(lang)?.code || null;
}

/** The pinned Chirp 3: HD voice, or `null` when Google cannot speak this
 *  language at all. Never returns a neighbouring language's voice. */
export function getGoogleVoice(lang) {
    const entry = findLanguage(lang);
    if (!entry || !entry.googleVoice) return null;
    return { name: entry.googleVoice, code: entry.code, gender: entry.googleVoiceGender };
}

/** The display name the product uses, for log lines that a human has to read. */
export function getLanguageName(lang) {
    return findLanguage(lang)?.name || null;
}
