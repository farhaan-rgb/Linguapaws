const express = require('express');
const OpenAI = require('openai');
const { createClient } = require('@deepgram/sdk');
const textToSpeech = require('@google-cloud/text-to-speech');
const requireAuth = require('../middleware/auth');

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

                const googleClient = getGoogleTtsClient();
                if (googleClient) {
                    const targetLangToUse = options.targetLang || options.targetLanguage;
                    const resolvedCode = resolveLanguageCode(targetLangToUse);

                    const [ttsResponse] = await googleClient.synthesizeSpeech({
                        input: { text: ttsText },
                        voice: { languageCode: resolvedCode, ssmlGender: 'NEUTRAL' },
                        audioConfig: { audioEncoding: 'MP3' }
                    });
                    audioContent = Buffer.from(ttsResponse.audioContent).toString('base64');
                } else {
                    const targetLangToUse = options.targetLang || options.targetLanguage;
                    const nonEnglish = targetLangToUse && targetLangToUse.toLowerCase() !== 'english';
                    const mp3 = await getClient().audio.speech.create({
                        model: nonEnglish ? 'tts-1-hd' : 'tts-1',
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

        let rawText = null;
        let usedEngine = 'none';

        // --- PHASE 1: Try Deepgram (Primary) ---
        // Deepgram nova-2 supported language codes — unsupported langs fall back to 'hi' (best proxy for Indian languages)
        const deepgramSupported = new Set(['en','es','fr','de','hi','pt','ja','nl','it','zh','sv','pl','ru','tr','ko','uk','ro','id','cs','da','no','ms','ca','fi','bg','sk','el','hu','vi','th','ar','pa']);
        const deepgramLang = expectingTargetLang
            ? (deepgramSupported.has(targetLangId) ? targetLangId : (targetLangId ? 'hi' : 'en'))
            : (nativeLangId || 'en');
        if (process.env.DEEPGRAM_API_KEY) {
            try {
                const deepgramClient = getDeepgram();
                const { result, error } = await deepgramClient.listen.prerecorded.transcribeFile(
                    buffer,
                    {
                        model: 'nova-2',
                        language: deepgramLang,
                        smart_format: true,
                        punctuate: true,
                        // Search for the specific phrase if provided (high accuracy boost)
                        ...(targetText ? { search: [targetText.toLowerCase()] } : {}),
                        // If we're expecting target language, boost common phonetic patterns
                        ...(expectingTargetLang ? { filler_words: false } : {})
                    }
                );

                if (error) throw error;

                rawText = result?.results?.channels[0]?.alternatives[0]?.transcript;
                if (rawText) usedEngine = 'deepgram';
            } catch (dgErr) {
                console.warn('Deepgram transcription failed or credits exhausted. Falling back to Whisper:', dgErr.message);
            }
        }

        // --- PHASE 2: Fallback to OpenAI Whisper ---
        if (!rawText) {
            try {
                const file = await OpenAI.toFile(buffer, `audio.${ext}`, { type: mimeType });

                // Languages where forcing Whisper's language param reliably helps.
                // Indian languages spoken as transliteration (te, kn, ml, etc.) do better with
                // auto-detect + prompt, so they are intentionally excluded here.
                const supportedByWhisper = new Set([
                    'hi', 'mr', 'ta', 'ur', 'en',
                    'fr', 'es', 'de', 'it', 'pt', 'ja', 'ko', 'zh',
                    'ne', 'ar', 'ru', 'tr', 'pl', 'nl', 'sv', 'th', 'vi',
                ]);

                let whisperLang;
                if (expectingTargetLang && supportedByWhisper.has(targetLangId)) {
                    whisperLang = targetLangId;
                } else if (!expectingTargetLang && supportedByWhisper.has(nativeLangId)) {
                    whisperLang = nativeLangId;
                }

                let prompt;
                if (expectingTargetLang && targetLangName) {
                    prompt = `The user is speaking ${targetLangName}. Focus on target language accuracy. ${targetText ? `The expected phrase is: ${targetText}` : ''}`;
                } else if (nativeLangName) {
                    prompt = `The user is speaking ${nativeLangName} or English.`;
                }

                const transcription = await getClient().audio.transcriptions.create({
                    file,
                    model: 'whisper-1',
                    ...(whisperLang ? { language: whisperLang } : {}),
                    ...(prompt ? { prompt } : {}),
                });

                rawText = (transcription.text || '').trim();
                if (rawText) usedEngine = 'whisper';
            } catch (wErr) {
                console.error('Whisper fallback also failed:', wErr.message);
            }
        }

        if (!rawText) return res.json({ text: null });

        // If we have both language contexts, use a quick GPT pass to verify/correct
        // the transcription. This catches cases where Whisper mishears speech in one
        // language as another (e.g. Telugu "miru ela unnaru" → English "Look how they are").
        if (nativeLangName && targetLangName) {
            const likelyLang = expectingTargetLang ? targetLangName : nativeLangName;
            const otherLang = expectingTargetLang ? nativeLangName : targetLangName;
            try {
                const corrected = await generateWithFallback([
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
3. If the user was specifically asked to say '${targetText}', and the transcript sounds phonetically similar to '${targetText}', return exactly '${targetText}'.
4. The user is responding to this context from the tutor: "${contextPrompt}". Use this context to resolve ambiguities. For example, if the transcript sounds like a plausible answer to the tutor's prompt but is phonetically messy, favor the logical ${targetLangName} response.
5. If the transcript is clearly valid ${nativeLangName} or ${targetLangName}, return it as-is.
6. If the transcript appears to be in a DIFFERENT language (neither ${nativeLangName} nor ${targetLangName}), try to figure out what the user actually said in ${targetLangName} or ${nativeLangName} based on phonetic similarity.
7. Keep your response EXTREMELY short — return ONLY the text, nothing else.`
                    },
                    { role: 'user', content: rawText }
                ], {
                    model: 'gpt-4o-mini',
                    temperature: 0.1,
                    max_tokens: 150,
                });
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
