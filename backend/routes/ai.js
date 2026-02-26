const express = require('express');
const OpenAI = require('openai');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

let openai;
const getClient = () => {
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
};

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    const { messages, options = {} } = req.body;
    if (!messages?.length) return res.status(400).json({ error: 'messages are required' });

    const response = await getClient().chat.completions.create({
        model: options.model || 'gpt-4o-mini',
        messages,
        temperature: options.temperature ?? 0.8,
        max_tokens: options.max_tokens ?? 500,
        response_format: options.response_format || undefined,
    });
    res.json({ content: response.choices[0].message.content });
});

// POST /api/ai/speech
router.post('/speech', async (req, res) => {
    const { text, voice = 'alloy', targetLang = null } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const nonEnglish = targetLang && targetLang.toLowerCase() !== 'english';
    const model = nonEnglish ? 'tts-1-hd' : 'tts-1';
    const mp3 = await getClient().audio.speech.create({ model, voice, input: text });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.send(buffer);
});

// POST /api/ai/transcribe
router.post('/transcribe', async (req, res) => {
    const { audioBase64, mimeType = 'audio/webm', language = null } = req.body;
    if (!audioBase64) return res.status(400).json({ error: 'audioBase64 is required' });

    const buffer = Buffer.from(audioBase64, 'base64');
    const file = await OpenAI.toFile(buffer, 'audio.webm', { type: mimeType });
    const languageMap = {
        hi: 'hi', bn: 'bn', te: 'te', mr: 'mr', ta: 'ta', ur: 'ur', kn: 'kn', gu: 'gu', ml: 'ml', pa: 'pa', en: 'en',
    };
    const lang = languageMap[language] || undefined;
    const transcription = await getClient().audio.transcriptions.create({
        file,
        model: 'whisper-1',
        ...(lang ? { language: lang } : {}),
    });
    res.json({ text: transcription.text });
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
