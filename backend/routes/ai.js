const express = require('express');
const OpenAI = require('openai');
const textToSpeech = require('@google-cloud/text-to-speech');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

let openai;
const getClient = () => {
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
};

let googleTtsClient;
const getGoogleTtsClient = () => {
    if (googleTtsClient) return googleTtsClient;
    const jsonCreds = process.env.GOOGLE_TTS_CREDENTIALS_JSON;
    if (jsonCreds) {
        const credentials = JSON.parse(jsonCreds);
        googleTtsClient = new textToSpeech.TextToSpeechClient({ credentials });
        return googleTtsClient;
    }
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        googleTtsClient = new textToSpeech.TextToSpeechClient();
        return googleTtsClient;
    }
    return null;
};

const resolveLanguageCode = (targetLang) => {
    if (!targetLang) return 'en-IN';
    const raw = typeof targetLang === 'string' ? targetLang : (targetLang.name || targetLang.id || '');
    const key = String(raw).trim().toLowerCase();
    const map = {
        english: 'en-IN',
        en: 'en-IN',
        hindi: 'hi-IN',
        hi: 'hi-IN',
        telugu: 'te-IN',
        te: 'te-IN',
        kannada: 'kn-IN',
        kn: 'kn-IN',
        tamil: 'ta-IN',
        ta: 'ta-IN',
        malayalam: 'ml-IN',
        ml: 'ml-IN',
        bengali: 'bn-IN',
        bn: 'bn-IN',
        gujarati: 'gu-IN',
        gu: 'gu-IN',
        punjabi: 'pa-IN',
        pa: 'pa-IN',
        marathi: 'mr-IN',
        mr: 'mr-IN',
        urdu: 'ur-IN',
        ur: 'ur-IN',
        odia: 'or-IN',
        or: 'or-IN'
    };
    return map[key] || 'en-IN';
};

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

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    const { messages, options = {} } = req.body;
    if (!messages?.length) return res.status(400).json({ error: 'messages are required' });
    try {
        if (process.env.GEMINI_API_KEY) {
            const content = await geminiGenerate(messages, options);
            return res.json({ content });
        }
        const response = await getClient().chat.completions.create({
            model: options.model || 'gpt-4o-mini',
            messages,
            temperature: options.temperature ?? 0.8,
            max_tokens: options.max_tokens ?? 500,
            response_format: options.response_format || undefined,
        });
        return res.json({ content: response.choices[0].message.content });
    } catch (err) {
        return res.status(502).json({ error: err.message || 'AI request failed' });
    }
});

// POST /api/ai/speech
router.post('/speech', async (req, res) => {
    const { text, voice = 'alloy', targetLang = null } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    try {
        const googleClient = getGoogleTtsClient();
        if (googleClient) {
            const languageCode = resolveLanguageCode(targetLang);
            const [response] = await googleClient.synthesizeSpeech({
                input: { text },
                voice: { languageCode, ssmlGender: 'NEUTRAL' },
                audioConfig: { audioEncoding: 'MP3' }
            });
            const buffer = Buffer.from(response.audioContent, 'base64');
            res.set('Content-Type', 'audio/mpeg');
            return res.send(buffer);
        }

        const nonEnglish = targetLang && targetLang.toLowerCase() !== 'english';
        const model = nonEnglish ? 'tts-1-hd' : 'tts-1';
        const mp3 = await getClient().audio.speech.create({ model, voice, input: text });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        res.set('Content-Type', 'audio/mpeg');
        return res.send(buffer);
    } catch (err) {
        return res.status(502).json({ error: err.message || 'TTS failed' });
    }
});

// POST /api/ai/transcribe
router.post('/transcribe', async (req, res) => {
    try {
        const { audioBase64, mimeType = 'audio/webm', nativeLang = null, targetLang = null, expectingTargetLang = false } = req.body;
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

        const file = await OpenAI.toFile(buffer, `audio.${ext}`, { type: mimeType });

        // Language IDs that Whisper's `language` parameter ACTUALLY supports (ISO 639-1).
        // Verified against OpenAI docs. Languages NOT supported include:
        // te (Telugu), bn (Bengali), gu (Gujarati), ml (Malayalam), pa (Punjabi), or (Odia)
        // For unsupported languages, we let Whisper auto-detect + GPT verification corrects.
        const supportedByWhisper = new Set([
            'hi', 'mr', 'ta', 'ur', 'kn', 'en',
            'fr', 'es', 'de', 'it', 'pt', 'ja', 'ko', 'zh',
            'ne', 'ar', 'ru', 'tr', 'pl', 'nl', 'sv', 'th', 'vi',
        ]);

        const nativeLangId = (nativeLang?.id || '').toLowerCase();
        const targetLangId = (targetLang?.id || '').toLowerCase();
        const nativeLangName = nativeLang?.name || null;
        const targetLangName = targetLang?.name || null;

        // Context-aware Whisper hinting:
        // - If the bot asked the user to repeat a target-language phrase, hint with target language
        //   so Whisper doesn't force-interpret Telugu/Hindi/etc. speech as English.
        // - Otherwise, don't force a single language — let Whisper auto-detect. The GPT
        //   verification pass will handle any misidentification.
        let whisperLang;
        if (expectingTargetLang && supportedByWhisper.has(targetLangId)) {
            whisperLang = targetLangId;
        } else if (!expectingTargetLang && supportedByWhisper.has(nativeLangId)) {
            whisperLang = nativeLangId;
        } else {
            whisperLang = undefined; // auto-detect
        }

        // Use initial_prompt to guide Whisper towards the correct script/vocab
        let prompt;
        if (expectingTargetLang && targetLangName) {
            prompt = `The user is speaking ${targetLangName}. Possibly about: ${targetLangName} phrases, greetings, or common sentences. Example words might include native scripts if needed.`;
        } else if (nativeLangName) {
            prompt = `The user is speaking ${nativeLangName} or English.`;
        }

        const transcription = await getClient().audio.transcriptions.create({
            file,
            model: 'whisper-1',
            ...(whisperLang ? { language: whisperLang } : {}),
            ...(prompt ? { prompt } : {}),
        });

        let rawText = (transcription.text || '').trim();
        if (!rawText) return res.json({ text: null });

        // If we have both language contexts, use a quick GPT pass to verify/correct
        // the transcription. This catches cases where Whisper mishears speech in one
        // language as another (e.g. Telugu "miru ela unnaru" → English "Look how they are").
        if (nativeLangName && targetLangName) {
            const likelyLang = expectingTargetLang ? targetLangName : nativeLangName;
            const otherLang = expectingTargetLang ? nativeLangName : targetLangName;
            try {
                const verifyResponse = await getClient().chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a speech transcription corrector for a language learning app.
The user is learning ${targetLangName} and their native language is ${nativeLangName}.
They will ONLY speak in one of these two languages: ${nativeLangName} or ${targetLangName}.
${expectingTargetLang
                                    ? `The user was asked to repeat a ${targetLangName} phrase, so they most likely spoke in ${targetLangName} (possibly romanized/transliterated).`
                                    : `The user is replying conversationally, so they could be speaking in either ${nativeLangName} or ${targetLangName}.`}

A speech-to-text engine produced the following transcript. Your job:
1. If the transcript is romanized ${targetLangName} (e.g. transliterated into Latin script), that is VALID — return it as-is. Do NOT convert it to ${nativeLangName}.
2. CRITICAL: If the transcript is in ${nativeLangName} but the user was expected to speak in ${targetLangName}, check if the transcript looks like a translation or a phonetic mishearing of an likely ${targetLangName} phrase. If so, return the likely ${targetLangName} phrase instead (in native script if possible, or transliterated if that's what was produced).
3. If the transcript is clearly valid ${nativeLangName} or ${targetLangName}, return it as-is.
4. If the transcript appears to be in a DIFFERENT language (neither ${nativeLangName} nor ${targetLangName}), try to figure out what the user actually said in ${targetLangName} or ${nativeLangName} based on phonetic similarity.
5. Keep your response EXTREMELY short — return ONLY the text, nothing else.`
                        },
                        { role: 'user', content: rawText }
                    ],
                    temperature: 0.1,
                    max_tokens: 150,
                });
                const corrected = (verifyResponse.choices[0].message.content || '').trim();
                if (corrected) rawText = corrected;
            } catch (verifyErr) {
                // If verification fails, use raw transcript — better than nothing
                console.warn('Transcript verification failed, using raw:', verifyErr.message);
            }
        }

        res.json({ text: rawText });
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

    const response = await getClient().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are a pronunciation analysis system. Return ONLY valid JSON.' },
            { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    res.json(result);
});

module.exports = router;
