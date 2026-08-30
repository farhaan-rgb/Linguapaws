const express = require('express');
const OpenAI = require('openai');
const { createClient } = require('@deepgram/sdk');
const textToSpeech = require('@google-cloud/text-to-speech');
const requireAuth = require('../middleware/auth');
/* One table for both halves of the app. `require()` of an ESM file is
   synchronous from Node 22.12 — see `engines` in backend/package.json. */
const { findLanguage, getGoogleVoice } = require('../../shared/languages.js');
const { asrLadder } = require('../../shared/asr.js');
const { romanise, SCRIPT_BY_LANGUAGE } = require('../../shared/transliterate.js');

const router = express.Router();
router.use(requireAuth);

let openai;
const getClient = () => {
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
};

let deepgram;
const getDeepgram = () => {
    if (!deepgram) deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    return deepgram;
};

/* ── Which engine actually spoke ──
   `getGoogleTtsClient()` returning null used to be indistinguishable in the
   logs from Google working, so every request quietly landed on OpenAI
   `tts-1-hd` — a model with no Telugu and no Odia voice — and nothing said so.
   Absence of a credential now says which credential, once. A credential that is
   present and broken, and any synthesis that fails, are errors. */
let googleTtsClient = null;
let googleCredsWarned = false;

const MISSING_GOOGLE_CREDS = [
    '[tts] Google Cloud TTS is OFF: neither GOOGLE_TTS_CREDENTIALS_JSON nor',
    '[tts] GOOGLE_APPLICATION_CREDENTIALS is set in backend/.env.',
    '[tts] Every non-English utterance will be synthesised by OpenAI tts-1-hd,',
    '[tts] which has no Telugu, Kannada or Odia voice — it is an English voice',
    '[tts] sounding out a script it does not know. See backend/.env.example.',
].join('\n');

const getGoogleTtsClient = () => {
    if (googleTtsClient) return googleTtsClient;

    const jsonCreds = process.env.GOOGLE_TTS_CREDENTIALS_JSON;
    if (jsonCreds) {
        try {
            const credentials = JSON.parse(jsonCreds);
            googleTtsClient = new textToSpeech.TextToSpeechClient({ credentials });
            console.log('[tts] Google Cloud TTS enabled via GOOGLE_TTS_CREDENTIALS_JSON'
                + (credentials.client_email ? ` (${credentials.client_email})` : ''));
            return googleTtsClient;
        } catch (err) {
            /* A malformed service-account JSON used to throw out of this
               function and take the whole request with it. It is a
               configuration error, and it is loud, but it is not fatal. */
            console.error('[tts] GOOGLE_TTS_CREDENTIALS_JSON is set but unusable: '
                + err.message + ' — falling back to OpenAI tts-1-hd.');
            return null;
        }
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
            googleTtsClient = new textToSpeech.TextToSpeechClient();
            console.log('[tts] Google Cloud TTS enabled via GOOGLE_APPLICATION_CREDENTIALS='
                + process.env.GOOGLE_APPLICATION_CREDENTIALS);
            return googleTtsClient;
        } catch (err) {
            console.error('[tts] GOOGLE_APPLICATION_CREDENTIALS is set but unusable: '
                + err.message + ' — falling back to OpenAI tts-1-hd.');
            return null;
        }
    }

    if (!googleCredsWarned) {
        googleCredsWarned = true;
        console.warn(MISSING_GOOGLE_CREDS);
    }
    return null;
};

/* A line per engine-and-voice combination, once, so a session six months from
   now can read the log and know what a learner actually heard. */
const enginesSeen = new Set();
const noteEngine = (line) => {
    if (enginesSeen.has(line)) return;
    enginesSeen.add(line);
    console.log(`[tts] ${line}`);
};

/* The Node client returns a Buffer over gRPC and a base64 string over REST.
   `Buffer.from(x, 'base64')` is right for both — it ignores the encoding
   argument when handed a Buffer. The /chat branch used to do
   `Buffer.from(x).toString('base64')`, which would have double-encoded the
   REST shape into silence. */
const googleAudioToBuffer = (audioContent) => Buffer.from(audioContent, 'base64');

/**
 * Synthesise with Google, or return null and say why.
 *
 * Returns a Buffer of MP3, or null when the caller should fall back to OpenAI.
 * Never substitutes a neighbouring language's voice: a language Google cannot
 * speak comes back null with a line in the log naming it.
 */
const synthesizeWithGoogle = async (text, targetLang) => {
    const client = getGoogleTtsClient();
    if (!client) return null;

    const entry = findLanguage(targetLang);
    /* English stays on OpenAI. The cast's voice identity — alloy, shimmer,
       onyx, nova, fable per character — is an OpenAI concept and OpenAI is
       genuinely good at English. Google is here because it is the only one of
       the two that can speak Telugu or Kannada at all. */
    if (!entry || entry.id === 'en') return null;

    const voice = getGoogleVoice(entry);
    if (!voice) {
        noteEngine(`no Google voice exists for ${entry.name} (${entry.code}) at any tier — `
            + 'falling back to OpenAI tts-1-hd, which cannot speak it either. '
            + 'This language needs a second vendor; see VOICE-STACK.md.');
        return null;
    }

    try {
        const [response] = await client.synthesizeSpeech({
            /* Chirp 3: HD voices are selectable by name only. `ssmlGender` alone
               resolves to a Standard voice — `te-IN-Standard-A`, a 2016-era
               voice at 2026 prices — and is omitted entirely here because a
               gender that disagrees with the named voice is an API error.
               Voice names verified against Google's published list on
               2026-08-30; see shared/languages.js for the citation. */
            input: { text },
            voice: { languageCode: voice.code, name: voice.name },
            audioConfig: { audioEncoding: 'MP3' },
        });
        noteEngine(`Google Chirp 3: HD — ${voice.name} for ${entry.name}`);
        return googleAudioToBuffer(response.audioContent);
    } catch (err) {
        console.error(`[tts] Google synthesis FAILED for ${voice.name} (${entry.name}): `
            + `${err.message} — falling back to OpenAI tts-1-hd, which has no ${entry.name} voice.`);
        return null;
    }
};

/** True only for English. Anything unrecognised is treated as non-English,
 *  because guessing English is the failure mode this repo has already shipped. */
const isEnglish = (targetLang) => findLanguage(targetLang)?.id === 'en';

const buildGeminiPayload = (messages, options = {}) => {
    const systemText = messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n');
    const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

    const generationConfig = {
        temperature: options.temperature ?? 0.8,
        maxOutputTokens: options.max_tokens ?? 500
    };
    if (options.response_format?.type === 'json_object') {
        generationConfig.responseMimeType = 'application/json';
    }

    return {
        contents,
        ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
        generationConfig
    };
};

const geminiGenerate = async (messages, options = {}) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set');
    }
    const model = options.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = buildGeminiPayload(messages, options);
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini error ${response.status}: ${text}`);
    }
    const data = await response.json();
    const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
        throw new Error('Gemini returned empty response');
    }
    return candidate;
};

const generateWithFallback = async (messages, options = {}) => {
    if (process.env.GEMINI_API_KEY) {
        try {
            return await geminiGenerate(messages, options);
        } catch (err) {
            console.warn('Gemini generate failed, falling back to openai:', err.message);
        }
    }

    // Fallback to OpenAI
    const response = await getClient().chat.completions.create({
        model: options.model || 'gpt-4o-mini',
        messages,
        temperature: options.temperature ?? 0.8,
        max_tokens: options.max_tokens ?? 500,
        response_format: options.response_format || undefined,
    });
    return (response.choices[0].message.content || '').trim();
};

/**
 * Reflection Loop: A 'Linguistic Critic' checks the first draft for correctness 
 * and naturalness in the target language.
 */
const reflectAndCorrect = async (messages, initialDraft, options) => {
    const { targetLang = 'Telugu', nativeLang = 'English', userLevel = 'zero' } = options;

    // Only reflect on beginner levels where grammar accuracy is most critical
    if (userLevel !== 'zero' && userLevel !== 'basic') return initialDraft;

    const criticPrompt = `You are a LINGUISTIC CRITIC. A language tutor produced this draft response:
"${initialDraft}"

The target language is: ${targetLang}
The native language is: ${nativeLang}

YOUR MISSION:
1. Check if the ${targetLang} phrases in bold are grammatically PERFECT and NATURAL (how a local human actually speaks).
2. SENSITIVITY CHECK: Ensure it's not using Hindi words (like "Namaste") for ${targetLang}. 
3. FORMALITY CHECK: In ${targetLang}, prioritize standard polite/formal forms for beginners (e.g. Meeru over Nuvvu in Telugu). Avoid robotic/archaic forms (like Neevu) completely.
4. Check if the meaning in ${nativeLang} correctly matches the ${targetLang} phrase.
5. Check if the phonetic guide matches the sounds of the corrected phrase.

IF ANYTHING IS WRONG (e.g., Hindi default, robotic phrasing, or incorrect meaning), provide a specific fix. 
IF EVERYTHING IS PERFECT, just respond: "PERFECT".

If not perfect, return a JSON object: {"isError": true, "critique": "EXPLAIN THE ERROR BRIEFLY", "betterVersion": "COMPLETE CORRECTED PHRASE IN BOLD WITH PHONETIC AND MEANING"}`;

    try {
        const criticOutput = await generateWithFallback([
            { role: 'system', content: criticPrompt }
        ], { temperature: 0.1, response_format: { type: 'json_object' } });

        if (criticOutput.toLowerCase().includes('perfect') && !criticOutput.includes('{')) {
            return initialDraft;
        }

        const feedback = JSON.parse(criticOutput);
        if (!feedback || !feedback.isError) return initialDraft;

        // Second pass: Tell Miko to integrate the critic's feedback
        const finalPrompt = `Your previous draft was: "${initialDraft}"
A linguistic critic pointed out an error: "${feedback.critique}"
They suggested this better version for your lesson phrase: "${feedback.betterVersion}"

RE-GENERATE your entire response now, keeping your friendly cat persona, but correctly integrating the critic's fix. Ensure ALL formatting (bold, phonetic, tts) is preserved.`;

        return await generateWithFallback([
            ...messages,
            { role: 'assistant', content: initialDraft },
            { role: 'user', content: finalPrompt }
        ], { ...options, temperature: 0.5 });

    } catch (err) {
        console.warn('Reflection loop failed, returning initial draft:', err.message);
        return initialDraft;
    }
};

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    const { messages, options = {} } = req.body;
    if (!messages?.length) return res.status(400).json({ error: 'messages are required' });
    try {
        // Latency Fix: Disable reflectAndCorrect (double-pass). Let main LLM handle strict rules.
        const finalizedContent = await generateWithFallback(messages, options);

        // SPEED OPTIMIZATION: Generate audio on backend to save 1 round-trip
        let audioContent = null;
        if (options.generateAudio) {
            try {
                // FIX #5: If AI returned JSON (Basic/Conversational), extract only the "content" field for TTS
                let ttsSource = finalizedContent;
                try {
                    let cleanJson = finalizedContent;
                    const jsonStart = finalizedContent.indexOf('{');
                    const jsonEnd = finalizedContent.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd > jsonStart) {
                        cleanJson = finalizedContent.substring(jsonStart, jsonEnd + 1);
                    }
                    const parsed = JSON.parse(cleanJson);
                    if (parsed.content) {
                        ttsSource = parsed.content;
                    }
                } catch (_) { /* Not JSON, use raw */ }

                // Extract TTS text preserving English context, replacing target with Native Script
                const ttsMatch = ttsSource.match(/<tts>(.*?)<\/tts>/i);
                const nativeScript = ttsMatch ? ttsMatch[1].trim() : null;
                const boldMatches = ttsSource.match(/\*\*(.*?)\*\*/g);
                const lastBold = boldMatches ? boldMatches[boldMatches.length - 1].replace(/\*\*/g, '').trim() : null;

                let ttsText = ttsSource
                    .replace(/<phonetic>.*?<\/phonetic>/gi, '') // Don't read phonetics
                    .replace(/<tts>.*?<\/tts>/gi, '') // Remove tag body
                    .replace(/<[^>]+>/g, '') // Remove metadata tags
                    .replace(/\\\*/g, '') // Strip escapes like \*
                    .replace(/\*\*/g, '')
                    .replace(/\*/g, '')
                    .replace(/[\p{Extended_Pictographic}\p{Emoji_Component}]/gu, '') // Strip emojis
                    .trim();

                // Swap the transliterated bold word with its native script so TTS reads it authentically
                if (nativeScript && lastBold && ttsText.includes(lastBold)) {
                    ttsText = ttsText.replace(lastBold, nativeScript);
                }

                const targetLangToUse = options.targetLang || options.targetLanguage;
                const googleAudio = await synthesizeWithGoogle(ttsText, targetLangToUse);
                if (googleAudio) {
                    audioContent = googleAudio.toString('base64');
                } else {
                    const model = isEnglish(targetLangToUse) ? 'tts-1' : 'tts-1-hd';
                    noteEngine(`OpenAI ${model} — voice ${options.voice || 'alloy'} for `
                        + `${findLanguage(targetLangToUse)?.name || targetLangToUse || 'unknown language'}`);
                    const mp3 = await getClient().audio.speech.create({
                        model,
                        voice: options.voice || 'alloy',
                        input: ttsText
                    });
                    audioContent = Buffer.from(await mp3.arrayBuffer()).toString('base64');
                }
            } catch (ttsErr) {
                console.warn('Backend TTS optimization failed:', ttsErr.message);
            }
        }

        return res.json({ content: finalizedContent, audioContent });
    } catch (err) {
        return res.status(502).json({ error: err.message || 'AI request failed' });
    }
});

// POST /api/ai/speech
router.post('/speech', async (req, res) => {
    const { text, voice = 'alloy', targetLang = null } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    try {
        const googleAudio = await synthesizeWithGoogle(text, targetLang);
        if (googleAudio) {
            res.set('Content-Type', 'audio/mpeg');
            return res.send(googleAudio);
        }

        const model = isEnglish(targetLang) ? 'tts-1' : 'tts-1-hd';
        noteEngine(`OpenAI ${model} — voice ${voice} for `
            + `${findLanguage(targetLang)?.name || targetLang || 'unknown language'}`);
        const mp3 = await getClient().audio.speech.create({ model, voice, input: text });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        res.set('Content-Type', 'audio/mpeg');
        return res.send(buffer);
    } catch (err) {
        return res.status(502).json({ error: err.message || 'TTS failed' });
    }
});

/**
 * Guard for the transcript-correction pass. Rejects sentinel answers and
 * runaway output so a valid transcript is never replaced by something worse.
 */
const CORRECTION_SENTINELS = new Set(['null', 'none', 'n/a', 'na', 'undefined', 'nil', 'empty', '-', '']);
function isUsableCorrection(corrected, rawText) {
    if (typeof corrected !== 'string') return false;
    const c = corrected.trim();
    if (!c) return false;
    if (CORRECTION_SENTINELS.has(c.toLowerCase().replace(/[."']/g, ''))) return false;
    // A corrector that returns far more than it was given is explaining, not correcting.
    if (rawText && c.length > rawText.length * 3 + 40) return false;
    return true;
}

// POST /api/ai/transcribe
/*
 * The hearing path, and the two things it now refuses to do.
 *
 * 1. It will not guess a language. `asrLadder` (shared/asr.js) holds which
 *    engine covers which language, probed against the live APIs rather than
 *    remembered, and a language nothing covers gets an explicit refusal —
 *    `error: 'unsupported_language'` — instead of a confident transcript in
 *    whichever language the recogniser felt like. Odiya is that case today, and
 *    it is thirty lessons of the course.
 *
 * 2. It will not let a language model choose the alphabet. Every engine returns
 *    Indic languages in their own script and the course is romanised, so
 *    something has to transliterate. That used to be the gpt-4o-mini corrector
 *    below, which — run five times on the same Kannada transcript with the same
 *    prompt on 2026-08-30 — returned native script three times and "Namaste"
 *    twice. Romanisation is now a table (shared/transliterate.js) and the
 *    corrector never sees native script at all.
 */
router.post('/transcribe', async (req, res) => {
    try {
        const { audioBase64, mimeType = 'audio/webm', nativeLang = null, targetLang = null, expectingTargetLang = false, targetText = null, contextPrompt = null } = req.body;
        if (!audioBase64) return res.status(400).json({ error: 'audioBase64 is required' });

        const buffer = Buffer.from(audioBase64, 'base64');
        const mimeMap = {
            'audio/mp4': 'm4a',
            'audio/webm': 'webm',
            'audio/wav': 'wav',
            'audio/ogg': 'ogg',
            'video/mp4': 'm4a'
        };
        const ext = mimeMap[mimeType.split(';')[0]] || 'webm';

        const nativeLangId = (nativeLang?.id || '').toLowerCase();
        const targetLangId = (targetLang?.id || '').toLowerCase();
        const nativeLangName = nativeLang?.name || null;
        const targetLangName = targetLang?.name || null;

        /* Which language are we actually listening for, and can anything hear
           it? Both halves of that question are answered before a byte of audio
           leaves this process. */
        const listeningFor = (expectingTargetLang ? targetLangId : nativeLangId) || 'en';
        const listeningName = (expectingTargetLang ? targetLangName : nativeLangName)
            || findLanguage(listeningFor)?.name || listeningFor;
        const ladder = asrLadder(listeningFor);

        if (!ladder.length) {
            /* The Deepgram-Hindi precedent, refused. Returning some other
               language's transcript here would be graded, would fail, and would
               tell the learner they had said it wrong. */
            console.warn(
                `[transcribe] NO ASR COVERAGE for "${listeningName}" (${listeningFor}). `
                + 'No Deepgram model and no OpenAI transcription model accepts this '
                + 'language; see shared/asr.js. Refusing rather than guessing.'
            );
            return res.json({
                text: null,
                error: 'unsupported_language',
                language: listeningName,
                languageId: listeningFor,
            });
        }

        let rawText = null;
        let usedEngine = 'none';
        let usedModel = null;
        const attempts = [];

        for (const rung of ladder) {
            if (rung.engine === 'deepgram' && !process.env.DEEPGRAM_API_KEY) continue;
            const startedAt = Date.now();
            try {
                if (rung.engine === 'deepgram') {
                    const { result, error } = await getDeepgram().listen.prerecorded.transcribeFile(
                        buffer,
                        {
                            model: rung.model,
                            language: rung.code,
                            smart_format: true,
                            punctuate: true,
                            /* A phrase hint, where the screen knows its own
                               answer. Only useful when the target is spelled the
                               way the engine writes it, which for an Indic
                               language it is not — kept because it costs nothing
                               and helps on the English turns. */
                            ...(targetText ? { search: [String(targetText).toLowerCase()] } : {}),
                            ...(expectingTargetLang ? { filler_words: false } : {}),
                        }
                    );
                    if (error) throw error;
                    rawText = (result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '').trim();
                } else {
                    const file = await OpenAI.toFile(buffer, `audio.${ext}`, { type: mimeType });
                    const prompt = expectingTargetLang && targetLangName
                        ? `The user is speaking ${targetLangName}.${targetText ? ` The expected phrase is: ${targetText}` : ''}`
                        : (nativeLangName ? `The user is speaking ${nativeLangName} or English.` : undefined);
                    const transcription = await getClient().audio.transcriptions.create({
                        file,
                        model: rung.model,
                        language: rung.code,
                        ...(prompt ? { prompt } : {}),
                    });
                    rawText = (transcription.text || '').trim();
                }
            } catch (err) {
                attempts.push(`${rung.engine}/${rung.model} threw ${err.name}: ${err.message}`);
                rawText = null;
                continue;
            }

            const ms = Date.now() - startedAt;
            if (rawText) {
                usedEngine = rung.engine;
                usedModel = rung.model;
                console.log(`[transcribe] ${rung.engine}/${rung.model} ${rung.code} ${ms}ms`);
                break;
            }
            /* A successful call that heard nothing. Worth a line: it is
               indistinguishable from silence at the microphone otherwise, and
               Deepgram does return an empty string with confidence 0.000 on
               audio that another engine transcribes cleanly. */
            attempts.push(`${rung.engine}/${rung.model} returned empty after ${ms}ms`);
        }

        if (!rawText) {
            if (attempts.length) console.warn('[transcribe] nothing heard —', attempts.join('; '));
            return res.json({ text: null, engine: usedEngine, attempts });
        }

        /* ── Alphabet ──
           Deterministic, table-driven, and done before anything else touches the
           text. `romanise` returns the script it found, the native form (kept so
           the client can show what was actually heard) and every candidate
           spelling; the client picks among them with the target in hand. */
        const roman = romanise(rawText);
        const nativeForm = roman.romanised ? roman.native : null;

        /* ── Did it answer in the wrong language? ──
           The one failure this stack keeps producing. `nova-2` decoded Telugu
           as Hindi; `gpt-4o-transcribe` accepts `language=te` and returns
           Kannada anyway (both measured — VOICE-STACK.md §2). Romanising that
           silently would hand the grader fluent-looking Latin from a language
           the learner was not speaking, and the learner would be told they got
           it wrong.
           A script is a cheap, reliable check on this: we know what script the
           target language is written in, and if a non-Latin transcript is in a
           different one, the engine has changed languages on us. Hindi and
           Marathi share Devanagari, which is fine — that is a real ambiguity in
           the writing system, not an engine error. */
        const expectedScript = SCRIPT_BY_LANGUAGE[listeningFor] || null;
        if (roman.romanised && expectedScript && roman.script !== expectedScript) {
            console.warn(
                `[transcribe] WRONG SCRIPT: asked ${usedEngine}/${usedModel} for `
                + `${listeningName} (expects ${expectedScript}) and it returned `
                + `${roman.script}: ${JSON.stringify(roman.native)}. Not romanising — `
                + 'a transcript in another language is a mishearing, not an answer.'
            );
            return res.json({
                text: null, error: 'wrong_language', native: roman.native,
                script: roman.script, language: listeningName, engine: usedEngine,
            });
        }

        if (roman.romanised) {
            console.log(`[transcribe] ${roman.script} script romanised: ${JSON.stringify(roman.native)} -> ${JSON.stringify(roman.text)}`);
            rawText = roman.text;
        } else if (!roman.translatable) {
            /* Letters, but not Latin and not a script the table covers — Urdu's
               Arabic script is the real case, and an abjad cannot be romanised
               without inventing the vowels it does not write. Say so; do not
               guess. */
            console.warn(`[transcribe] transcript is in a script we cannot romanise: ${JSON.stringify(rawText)}`);
            return res.json({
                text: null, error: 'untranslatable_script', native: rawText,
                language: listeningName, engine: usedEngine,
            });
        }

        /* ── The corrector ──
           Only ever sees Latin now. Its job used to include transliteration and
           it was not deterministic at it; what is left is the thing it is
           actually good for — catching an engine that heard a target-language
           phrase as a native-language one, e.g. Telugu "miru ela unnaru" coming
           back as English "Look how they are". Skipped entirely on a romanised
           transcript, where the table has already produced the right answer and
           a model can only spoil it. */
        if (nativeLangName && targetLangName && !roman.romanised) {
            try {
                const corrected = await generateWithFallback([
                    {
                        role: 'system',
                        content: `You are a speech transcription corrector for a language learning app.
The user is learning ${targetLangName} and their native language is ${nativeLangName}.
They will ONLY speak in one of these two languages: ${nativeLangName} or ${targetLangName}.
${expectingTargetLang
                                ? `The user was asked to repeat a ${targetLangName} phrase, so they most likely spoke in ${targetLangName}, romanized into the Latin alphabet.`
                                : `The user is replying conversationally, so they could be speaking in either ${nativeLangName} or ${targetLangName}.`}

A speech-to-text engine produced the following transcript, already in the Latin alphabet. Your job:
1. ALWAYS reply in the Latin alphabet. Never reply in ${targetLangName} script — the app cannot read it.
2. If the transcript is romanized ${targetLangName}, that is VALID — return it as-is. Do NOT translate it into ${nativeLangName}.
3. If the transcript is in ${nativeLangName} but the user was expected to speak ${targetLangName}, and it looks like a phonetic mishearing of a likely ${targetLangName} phrase, return that ${targetLangName} phrase, romanized.
4. If the user was asked to say '${targetText}', and the transcript sounds phonetically similar to '${targetText}', return exactly '${targetText}'.
5. The tutor's prompt was: "${contextPrompt}". Use it only to resolve genuine ambiguity.
6. If the transcript is already clearly valid ${nativeLangName} or ${targetLangName}, return it unchanged.
7. Return ONLY the text, nothing else.`
                    },
                    { role: 'user', content: rawText }
                ], {
                    model: 'gpt-4o-mini',
                    temperature: 0.1,
                    max_tokens: 150,
                });
                // The corrector sometimes answers with a sentinel ("null", "none")
                // when it cannot map the audio to the expected language. Those are
                // truthy strings, so an unguarded assignment would replace a perfectly
                // good transcript with garbage that then shows up as the user's message.
                if (isUsableCorrection(corrected, rawText)) {
                    rawText = corrected.trim();
                } else if (corrected) {
                    console.warn('[transcribe] discarded correction %j, keeping raw transcript', corrected);
                }
            } catch (verifyErr) {
                // If verification fails, use raw transcript — better than nothing
                console.warn('Transcript verification failed, using raw:', verifyErr.message);
            }
        }

        /* A corrector that answered in native script anyway — it has done it
           before — is romanised rather than believed. */
        const finalRoman = romanise(rawText);
        if (finalRoman.romanised) rawText = finalRoman.text;

        res.json({
            text: rawText,
            /* What the client needs to pick the best spelling and to show the
               learner what was actually heard. */
            variants: roman.romanised ? roman.variants : undefined,
            native: nativeForm,
            script: roman.script || undefined,
            engine: usedEngine,
            model: usedModel,
            language: listeningName,
        });
    } catch (error) {
        const errorDetail = error?.response?.data?.error?.message || error?.message || 'Unknown error';
        console.error('Transcription Detailed Error:', errorDetail);
        res.status(500).json({ error: `Transcription failed: ${errorDetail}` });
    }
});

// POST /api/ai/pronunciation
// Body: { targetText, transcript }
// Returns word-level comparison with tips tailored to Indian English
router.post('/pronunciation', async (req, res) => {
    const { targetText, transcript, targetLang } = req.body;
    if (!targetText || !transcript) {
        return res.status(400).json({ error: 'targetText and transcript are required' });
    }

    const targetLangName = targetLang || 'English';
    const prompt = `You are a ${targetLangName} pronunciation coach.

Target sentence (what the user was supposed to say):
"${targetText}"

What Whisper transcribed (what the user actually said):
"${transcript}"

Analyze word by word when possible. For each word or meaningful chunk in the target:
- Check if it was pronounced correctly (matched in transcript)
- If incorrect, identify the most likely pronunciation issue
- Provide a concise, actionable tip (max 10 words)

Also give:
- An overall score out of 100
- One short encouragement line (max 15 words, warm and motivating)

Return ONLY valid JSON in this exact format:
{
  "score": 82,
  "words": [
    { "target": "word", "heard": "ward", "correct": false, "tip": "Shorten the vowel sound" },
    { "target": "phrase", "heard": "phrase", "correct": true, "tip": null }
  ],
  "encouragement": "Great attempt! Keep going."
}`;

    const content = await generateWithFallback([
        { role: 'system', content: 'You are a pronunciation analysis system. Return ONLY valid JSON.' },
        { role: 'user', content: prompt },
    ], {
        model: 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
    });

    const cleanContent = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const result = JSON.parse(cleanContent);
    res.json(result);
});

module.exports = router;
