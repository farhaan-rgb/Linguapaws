/**
 * The live half of `stt-check`. Everything asserted in `shared/asr.js` came out
 * of this script, and it is committed so the table can be re-checked rather than
 * believed — speech-model lineups change monthly, and a coverage table that
 * nobody can re-derive is how "Deepgram covers Telugu" survived being false.
 *
 *   node tools/stt-check.mjs --probe
 *
 * Needs `DEEPGRAM_API_KEY` and `OPENAI_API_KEY` in `backend/.env`. It sends a
 * few seconds of audio a couple of dozen times; the cost is under a cent.
 *
 * The audio is Google's own published sample for `kn-IN-Chirp3-HD-Achernar`,
 * fetched at run time from the voice list's static host. Using a real recording
 * of a known language is the point: "the API accepted the language code" and
 * "the API transcribed the language" are different claims, and only a probe with
 * audio in it can tell them apart. It also means the probe needs no fixture
 * committed and no Google credential.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const SAMPLE_URL = 'https://cloud.google.com/static/text-to-speech/docs/audio/kn-IN-Chirp3-HD-Achernar.wav';

/** Our ten target languages plus the codes worth trying for the missing ones. */
const CODES = ['en', 'hi', 'te', 'kn', 'ta', 'ml', 'bn', 'gu', 'mr', 'ur', 'pa', 'or'];
const ODIA_SPELLINGS = ['or', 'ori', 'ory', 'or-IN', 'odia', 'oriya'];

const loadEnv = () => {
    /* backend/.env is where the keys live; the tools directory has no env of its
       own and inventing a second place to put a key is how one of them goes
       stale. */
    const envPath = path.join(HERE, '..', 'backend', '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
};

export async function probeVendors() {
    loadEnv();

    console.log('# Live vendor probe\n');
    console.log(`Run ${new Date().toISOString().slice(0, 10)}. Audio: Google's published`);
    console.log('`kn-IN-Chirp3-HD-Achernar` sample — real Kannada speech of known content.\n');

    const res = await fetch(SAMPLE_URL);
    if (!res.ok) { console.log(`Could not fetch the sample audio (${res.status}). Nothing probed.`); return; }
    const audio = Buffer.from(await res.arrayBuffer());
    console.log(`Fetched ${audio.length} bytes of audio.\n`);

    /* ── Deepgram: the model catalogue, which is authoritative and free ── */
    console.log('## Deepgram — GET /v1/models\n');
    if (!process.env.DEEPGRAM_API_KEY) {
        console.log('_DEEPGRAM_API_KEY not set — skipped._\n');
    } else {
        const r = await fetch('https://api.deepgram.com/v1/models', {
            headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` },
        });
        const json = await r.json();
        const byModel = new Map();
        for (const m of json.stt || []) {
            if (!byModel.has(m.canonical_name)) byModel.set(m.canonical_name, new Set());
            for (const l of m.languages || []) byModel.get(m.canonical_name).add(l);
        }
        console.log(`${(json.stt || []).length} STT model entries, ${byModel.size} distinct models.\n`);
        console.log('| code | models listing it |');
        console.log('|------|-------------------|');
        for (const code of CODES) {
            const hits = [...byModel.entries()]
                .filter(([, langs]) => [...langs].some(l => l === code || l.startsWith(`${code}-`)))
                .map(([name]) => name)
                .filter(n => /^nova|^whisper/.test(n));
            console.log(`| ${code.padEnd(4)} | ${hits.join(', ') || '**none**'} |`);
        }
        console.log('');
    }

    /* ── OpenAI: the language parameter, which only audio can settle ── */
    console.log('## OpenAI — POST /v1/audio/transcriptions, explicit `language`\n');
    if (!process.env.OPENAI_API_KEY) {
        console.log('_OPENAI_API_KEY not set — skipped._\n');
        return;
    }
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    for (const model of ['whisper-1', 'gpt-transcribe', 'gpt-4o-transcribe']) {
        const ok = [];
        const rejected = [];
        for (const code of CODES) {
            try {
                const file = await OpenAI.toFile(audio, 'a.wav', { type: 'audio/wav' });
                await openai.audio.transcriptions.create({ file, model, language: code });
                ok.push(code);
            } catch (err) {
                if (err.status === 400) rejected.push(code);
                else rejected.push(`${code}(${err.status})`);
            }
        }
        console.log(`**${model}**`);
        console.log(`  accepts : ${ok.join(' ') || '(none)'}`);
        console.log(`  rejects : ${rejected.join(' ') || '(none)'}\n`);
    }

    /* Odia gets its own pass, because "no code spelling works" is a stronger and
       more useful claim than "the two-letter code failed". */
    console.log('## Odia, every spelling — gpt-transcribe\n');
    for (const code of ODIA_SPELLINGS) {
        try {
            const file = await OpenAI.toFile(audio, 'a.wav', { type: 'audio/wav' });
            await openai.audio.transcriptions.create({ file, model: 'gpt-transcribe', language: code });
            console.log(`  ${code.padEnd(8)} ACCEPTED`);
        } catch (err) {
            console.log(`  ${code.padEnd(8)} ${err.status} ${String(err.message).slice(0, 60)}`);
        }
    }
    console.log('\nCompare against the table in shared/asr.js. Any difference is the table\ngoing stale, and the table is what the app refuses languages on.\n');
}
