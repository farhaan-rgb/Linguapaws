require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');

async function test() {
    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // 1. Generate an audio buffer using speech TTS to get a real audio file
        console.log("Generating audio...");
        const mp3 = await openai.audio.speech.create({
            model: 'tts-1',
            voice: 'alloy',
            input: 'Hello, this is a test audio for transcription.',
        });
        const mp3Buffer = Buffer.from(await mp3.arrayBuffer());

        // 2. Base64 encode it (simulating frontend)
        const base64 = mp3Buffer.toString('base64');
        const mimeType = 'audio/mpeg';

        // 3. Decode base64 and transcribe (simulating backend)
        const buffer = Buffer.from(base64, 'base64');
        const ext = 'mp3';

        const file = await OpenAI.toFile(buffer, `audio.${ext}`, { type: mimeType });
        console.log("Transcribing file...");

        const transcription = await openai.audio.transcriptions.create({
            file,
            model: 'whisper-1',
        });

        console.log("Transcription result:", transcription.text);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
