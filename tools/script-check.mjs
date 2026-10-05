#!/usr/bin/env node
/**
 * script-check — is the native script in the curriculum the word it claims to be?
 *
 *   node tools/script-check.mjs              the offline check, free, deterministic
 *   node tools/script-check.mjs --tts        the live orthography A/B, costs a few cents
 *   node tools/script-check.mjs Kannada      one language
 *
 * Why this exists
 * ---------------
 * The course is romanised Latin, and a real Kannada neural voice reads the
 * Latin `Idu` as the English word "idea" — VOICE-STACK.md §7.5. The fix is a
 * `native` field beside the romanised `word`, spoken instead of it. But
 * neither the person who wrote that field nor the person reading this can
 * necessarily read the script, so "a model wrote it and it looked right" is
 * not a check. These two are.
 *
 * **The offline half** romanises every `native` string back to Latin with
 * `shared/transliterate.js` — the same table that turns a learner's spoken
 * answer into something the grader can read — and asks
 * `lessonEngine.scoreAnswer` whether the result is the word the course
 * stores. It is free, deterministic, and catches a wrong word, a typo, a
 * missing vowel sign and a word from the wrong language. It cannot catch a
 * word that is spelled plausibly and means something else.
 *
 * **The live half** (`--tts`) synthesises each string on a real Kannada voice
 * and transcribes it back with Deepgram `nova-3`, native script against the
 * stored Latin, same voice, as the before/after pair. Needs `DEEPGRAM_API_KEY`
 * in `backend/.env` and `edge-tts` on the PATH or in `$EDGE_TTS`.
 *
 * What the numbers are NOT
 * -----------------------
 * Deepgram confidence here is **not a voice-quality score** and must never be
 * read as one — VOICE-STACK.md §7.4 saturated at exactly that misuse, with a
 * 36M-parameter open model outscoring Chirp 3: HD. It is being used for a
 * different and valid purpose: checking that the audio comes back as the word
 * that was meant. A low score on a one- or two-syllable word in isolation is
 * usually the recogniser, not the spelling — re-run the word inside a carrier
 * phrase before concluding the script is wrong.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { CURRICULUM } from '../src/services/curriculum.js';
import * as E from '../src/services/lessonEngine.js';
import { speechTextFor, hasNativeScript } from '../src/services/speechScript.js';
import { toLatin, detectScript, SCRIPT_BY_LANGUAGE } from '../shared/transliterate.js';
import { LANGUAGES } from '../shared/languages.js';
import { buildLessonSteps } from '../src/services/stepPlan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const pexec = promisify(execFile);
const args = process.argv.slice(2);
const live = args.includes('--tts');
const only = args.find(a => !a.startsWith('--'));

let failures = 0;
const fail = (line) => { failures++; console.log(`  FAIL  ${line}`); };

const languages = Object.keys(CURRICULUM).filter(l => !only || l === only);
const idOf = (name) => (LANGUAGES.find(l => l.name === name) || {}).id;

/* ── 1. Coverage: who has native script and who does not ────────────────── */

console.log('# Does the voice get the right alphabet?\n');
console.log('An empty cell is an empty cell. A language with no native script is');
console.log('spoken from its romanisation, which §7.5 showed is survivable in');
console.log('Telugu and not survivable in Kannada. Both now carry script anyway;');
console.log('Hindi, Odiya and the six one-lesson courses do not.\n');

const w = (s, n) => String(s).padEnd(n);
console.log(`| ${w('Language', 11)}| ${w('lessons', 8)}| ${w('words', 6)}| ${w('with native', 12)}| ${w('drills', 7)}| ${w('with native', 12)}|`);
console.log(`|${'-'.repeat(12)}|${'-'.repeat(9)}|${'-'.repeat(7)}|${'-'.repeat(13)}|${'-'.repeat(8)}|${'-'.repeat(13)}|`);
for (const name of languages) {
    const ls = CURRICULUM[name];
    const vs = ls.flatMap(l => l.vocabulary || []);
    const ds = ls.flatMap(l => [...(l.phrases || []), ...(l.conversations || [])]);
    console.log(`| ${w(name, 11)}| ${w(ls.length, 8)}| ${w(vs.length, 6)}| `
        + `${w(vs.filter(v => v.native).length || '', 12)}| ${w(ds.length, 7)}| `
        + `${w(ds.filter(d => d.native).length || '', 12)}|`);
}

/* ── 2. Every native string romanises back to the word it sits beside ───── */

console.log('\n## Round trip through `shared/transliterate.js`\n');
console.log('Native script → Latin → `scoreAnswer` against the stored spelling.\n');

const notes = [];
for (const name of languages) {
    if (!hasNativeScript(name)) continue;
    const ls = CURRICULUM[name];
    /* The real lexicon object, not a bare array of vocabulary. `scoreAnswer`
       takes `{synonyms, words, meanings}`; handed an array, `asLexicon` falls
       through to empty maps and grades more strictly than the engine a learner
       actually meets. That was the shape passed here and at the live A/B until
       2026-10-05, and it cost one accepted word in 163. */
    const lex = E.buildLexicon(ls);
    const script = SCRIPT_BY_LANGUAGE[idOf(name)];
    let checked = 0;
    ls.forEach((lesson, li) => {
        const items = [
            ...(lesson.vocabulary || []).map(v => ({ latin: v.word, native: v.native, variants: v.alt || [] })),
            ...[...(lesson.phrases || []), ...(lesson.conversations || [])]
                .map(d => ({ latin: d.correct, native: d.native, variants: d.acceptable || [] })),
        ].filter(x => x.native);
        for (const { latin, native, variants } of items) {
            checked++;
            /* A `native` field in the wrong alphabet is the failure that would
               be invisible on screen, because nothing displays it. */
            const got = detectScript(native);
            if (script && got && got !== script) {
                fail(`${name} L${li + 1} "${latin}" — native is ${got}, expected ${script}`);
                continue;
            }
            if (!got) { fail(`${name} L${li + 1} "${latin}" — native carries no Indic script: ${native}`); continue; }
            const back = toLatin(native, { language: idOf(name) });
            if (!E.scoreAnswer(back, latin, variants, lex).accepted) {
                notes.push({ name, lesson: li + 1, latin, native, back });
            }
        }
    });
    console.log(`- **${name}** — ${checked} strings checked.`);
}

if (notes.length) {
    console.log('\n### Does not round-trip to the stored spelling\n');
    console.log('Not automatically a wrong script: the course romanises some words the');
    console.log('way they are said rather than the way they are written (Kannada `Yelli`');
    console.log('for ಎಲ್ಲಿ), and the transliterator is deliberately lossy. Each of these');
    console.log('needs a human reader of the language to settle, which is the point of');
    console.log('printing them rather than averaging them away.\n');
    console.log('| language | lesson | stored | native | romanises to |');
    console.log('|--|--|--|--|--|');
    for (const n of notes) console.log(`| ${n.name} | ${n.lesson} | \`${n.latin}\` | ${n.native} | \`${n.back}\` |`);
} else {
    console.log('\n_Every native string romanises back to the spelling it sits beside._');
}

/* ── 3. Every step utterance resolves, or none of it does ───────────────── */

console.log('\n## What the voice is actually handed, step by step\n');
console.log('`speechTextFor` is all-or-nothing by design: a phrase with one unmapped');
console.log('token is spoken in Latin rather than half in each alphabet. So a');
console.log('converted language with any unswapped step is an incomplete conversion.\n');

for (const name of languages) {
    const ls = CURRICULUM[name];
    const unswapped = [];
    let total = 0;
    for (const lesson of ls) {
        for (const step of buildLessonSteps(lesson, null, ls)) {
            total++;
            if (speechTextFor(name, step.expected) === step.expected) unswapped.push(step.expected);
        }
    }
    const swapped = total - unswapped.length;
    if (!hasNativeScript(name)) { console.log(`- ${name} — no native script; all ${total} steps spoken from Latin.`); continue; }
    console.log(`- **${name}** — ${swapped}/${total} step utterances in native script.`);
    if (unswapped.length) {
        fail(`${name} has ${unswapped.length} step utterances with no native form`);
        for (const u of [...new Set(unswapped)]) console.log(`    - \`${u}\``);
    }
}

/* ── 4. The live orthography A/B ────────────────────────────────────────── */

if (live) {
    const envPath = path.join(HERE, '..', 'backend', '.env');
    if (fs.existsSync(envPath)) {
        for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
            const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
            if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
        }
    }
    const KEY = process.env.DEEPGRAM_API_KEY;
    const EDGE = process.env.EDGE_TTS || 'edge-tts';
    /* edge-tts impersonates Microsoft Edge and is evaluation only — it must
       never end up in a shipping path. It is here because it is the one way to
       audition a real Indic neural voice with no vendor account. */
    const VOICES = { Kannada: 'kn-IN-SapnaNeural', Telugu: 'te-IN-ShrutiNeural', Hindi: 'hi-IN-SwaraNeural' };

    console.log('\n## Live orthography A/B — same voice, two spellings\n');
    if (!KEY) {
        console.log('_DEEPGRAM_API_KEY not set — skipped._');
    } else {
        const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'script-check-'));
        const say = async (text, voice, tag) => {
            const out = path.join(tmp, `${tag}.mp3`);
            await pexec(EDGE, ['--voice', voice, '--text', text, '--write-media', out], { timeout: 60000 });
            return out;
        };
        const hear = async (file, code) => {
            const r = await fetch(`https://api.deepgram.com/v1/listen?model=nova-3&language=${code}&smart_format=true&punctuate=true`, {
                method: 'POST',
                headers: { Authorization: `Token ${KEY}`, 'Content-Type': 'audio/mpeg' },
                body: fs.readFileSync(file),
            });
            if (!r.ok) return { transcript: `<HTTP ${r.status}>`, confidence: 0 };
            const a = (await r.json())?.results?.channels?.[0]?.alternatives?.[0] || {};
            return { transcript: (a.transcript || '').trim(), confidence: a.confidence ?? 0 };
        };

        for (const name of languages) {
            const voice = VOICES[name];
            if (!hasNativeScript(name) || !voice) continue;
            const id = idOf(name);
            const lex = E.buildLexicon(CURRICULUM[name]);
            console.log(`\n### ${name} — \`${voice}\` → Deepgram nova-3 \`${id}\`\n`);
            console.log('| # | stored | native | heard (native) | conf | heard (Latin) | conf |');
            console.log('|--|--|--|--|--|--|--|');
            let i = 0, nativeOk = 0, latinOk = 0;
            for (const lesson of CURRICULUM[name]) {
                for (const v of lesson.vocabulary || []) {
                    if (!v.native) continue;
                    i++;
                    const tag = `${id}_${i}`;
                    const [fn, fl] = [await say(v.native, voice, 'n' + tag), await say(v.word, voice, 'l' + tag)];
                    const [hn, hl] = [await hear(fn, id), await hear(fl, id)];
                    const ok = (t) => !!t && E.scoreAnswer(toLatin(t, { language: id }), v.word, v.alt || [], lex).accepted;
                    if (ok(hn.transcript)) nativeOk++;
                    if (ok(hl.transcript)) latinOk++;
                    console.log(`| ${i} | \`${v.word}\` | ${v.native} | ${hn.transcript || '—'} | ${hn.confidence.toFixed(3)} `
                        + `| ${hl.transcript || '—'} | ${hl.confidence.toFixed(3)} |`);
                }
            }
            console.log(`\nHeard as the intended word: **${nativeOk}/${i} in native script, ${latinOk}/${i} in Latin.**`);
            console.log('Confidence is an intelligibility floor, not a voice ranking (§7.4).');
        }
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}

console.log(failures ? `\n${failures} failure(s).` : '\nAll checks pass.');
process.exit(failures ? 1 : 0);
