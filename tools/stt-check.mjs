#!/usr/bin/env node
/**
 * stt-check — can the app hear each language, and does what it hears reach the
 * grader intact?
 *
 *   node tools/stt-check.mjs           the coverage table and the round trip
 *   node tools/stt-check.mjs --probe   re-run the live vendor probes
 *
 * There are two separate promises being checked here.
 *
 * The first is that **no language is silently substituted**. Deepgram `nova-2`
 * covered no Indian language except Hindi, the route asked it for Telugu anyway,
 * and it answered in Hindi with no error for months. So the coverage table in
 * `shared/asr.js` is printed with the empty cells left visibly empty, and a
 * language with no engine at all is a named failure rather than a blank row.
 *
 * The second is that **a correct spoken answer survives the alphabet**. Every
 * recogniser returns Indic languages in their own script; the course is
 * romanised; so between the microphone and `scoreAnswer` there is a
 * transliteration, and if it drifts, learners are told they said the wrong thing.
 * Each case below is a real word from lesson 1 of that language's own course,
 * written in the script an engine would actually return, and it has to score as
 * accepted against the spelling the curriculum uses.
 *
 * The negative controls are the point of the exercise. `ನಮಸ್ತೆ` (Namaste) must
 * NOT be accepted for `Namaskara` — the reported bug had exactly that word in
 * the answer box, and a transliteration loose enough to let it pass would have
 * hidden the mishearing instead of fixing it.
 */

import { CURRICULUM } from '../src/services/curriculum.js';
import { probeVendors } from './stt-probe.mjs';
import * as E from '../src/services/lessonEngine.js';
import { toLatin, latinVariants, hasBrahmicScript, detectScript, SCRIPT_BY_LANGUAGE } from '../shared/transliterate.js';
import { asrLadder, ENGINES, KNOWN_IDS } from '../shared/asr.js';
import { LANGUAGES } from '../shared/languages.js';

if (process.argv.includes('--probe')) {
    /* The live half. Everything in shared/asr.js came out of this; it is here so
       the table can be re-checked rather than trusted, because speech model
       lineups change monthly and a stale coverage table is how the
       Deepgram-substitutes-Hindi bug survived. Needs DEEPGRAM_API_KEY and
       OPENAI_API_KEY from backend/.env, and it spends a few cents. */
    await probeVendors();
    process.exit(0);
}

let failures = 0;
const fail = (line) => { failures++; console.log(`  FAIL  ${line}`); };

/* ── 1. Coverage ────────────────────────────────────────────────────────── */

console.log('# Can the app hear it?\n');
console.log('Per-language ASR coverage. An empty cell is an empty cell.\n');

const lessonCount = (name) => (CURRICULUM[name] || []).length;
const rows = LANGUAGES.map(l => ({
    name: l.name, id: l.id, lessons: lessonCount(l.name),
    ...Object.fromEntries(ENGINES.map(e => [e.id, e.codes[l.id] || ''])),
    ladder: asrLadder(l.id),
}));

const w = (s, n) => String(s).padEnd(n);
console.log(`| ${w('Language', 11)}| ${w('id', 4)}| ${w('lessons', 8)}| ${w('deepgram nova-3', 16)}| ${w('gpt-transcribe', 15)}| ${w('whisper-1', 10)}| script      |`);
console.log(`|${'-'.repeat(12)}|${'-'.repeat(5)}|${'-'.repeat(9)}|${'-'.repeat(17)}|${'-'.repeat(16)}|${'-'.repeat(11)}|-------------|`);
for (const r of rows) {
    console.log(`| ${w(r.name, 11)}| ${w(r.id, 4)}| ${w(r.lessons || '', 8)}| ${w(r.deepgram, 16)}| ${w(r.openai, 15)}| ${w(r.whisper, 10)}| ${w(SCRIPT_BY_LANGUAGE[r.id] || '', 12)}|`);
}

const deaf = rows.filter(r => r.ladder.length === 0);
console.log(`\n## Languages nothing in the stack can transcribe (${deaf.length})\n`);
if (!deaf.length) console.log('_None._\n');
for (const r of deaf) {
    console.log(`- **${r.name}** (${r.id}) — ${r.lessons} lessons, and no engine.`);
    console.log(`  The route refuses rather than guessing. Google Cloud STT v2 \`chirp_2\` lists or-IN`);
    console.log(`  (checked 2026-08-30) and is the way out; it needs the Google credential.`);
}

/* A language the table does not know at all is worse than one it knows is
   uncovered, because the route would fall back to 'en'. */
console.log('');
for (const l of LANGUAGES) {
    if (!KNOWN_IDS.includes(l.id)) fail(`shared/asr.js has no row for ${l.name} (${l.id}) — it would be heard as English`);
}

/* ── 2. Transliteration is a no-op on the course itself ─────────────────── */

console.log('\n## Does romanising touch anything already romanised?\n');
console.log('The curriculum is Latin throughout. If `toLatin` alters one character of it,\nevery existing match is at risk — so this is the regression gate on the safety\nnet added to `normalizeLatin`.\n');

let scanned = 0;
const touched = [];
for (const [langName, lessons] of Object.entries(CURRICULUM)) {
    for (const lesson of lessons) {
        const strings = [
            ...(lesson.vocabulary || []).flatMap(v => [v.word, ...(v.alt || [])]),
            ...(lesson.phrases || []).flatMap(p => [p.correct, ...(p.acceptable || [])]),
            ...(lesson.conversations || []).flatMap(p => [p.correct, ...(p.acceptable || [])]),
        ].filter(Boolean);
        for (const str of strings) {
            scanned++;
            if (toLatin(str) !== str) touched.push({ langName, str, got: toLatin(str) });
        }
    }
}
console.log(`Scanned ${scanned} curriculum strings across ${Object.keys(CURRICULUM).length} languages.`);
if (!touched.length) console.log('_None altered — the romanisation is inert on Latin input._\n');
for (const t of touched.slice(0, 20)) fail(`${t.langName}: ${JSON.stringify(t.str)} -> ${JSON.stringify(t.got)}`);

/* ── 3. Round trip: script in, accepted answer out ──────────────────────── */

/* Each entry is [native script, the spelling the course uses]. The script forms
   are the ordinary written forms of words the course's own lesson 1 teaches —
   what an engine returns when a learner says them. */
const ROUND_TRIP = [
    ['Kannada', 'ನಮಸ್ಕಾರ', 'Namaskara'],
    ['Kannada', 'ನಾನು', 'Naanu'],
    ['Kannada', 'ನೀವು', 'Neevu'],
    ['Kannada', 'ಚೆನ್ನಾಗಿದ್ದೀನಿ', 'Chennagiddeeni'],
    ['Kannada', 'ಹೇಗೆ', 'Hege'],
    ['Telugu', 'నమస్కారం', 'Namaskaram'],
    ['Telugu', 'నేను', 'Nenu'],
    ['Telugu', 'మీరు', 'Meeru'],
    ['Telugu', 'బాగున్నాను', 'Bagunnanu'],
    ['Odiya', 'ନମସ୍କାର', 'Namaskara'],
    ['Odiya', 'ମୁଁ', 'Mu'],
    ['Odiya', 'ଭଲ', 'Bhala'],
    ['Hindi', 'नमस्ते', 'Namaste'],
    ['Hindi', 'मैं', 'Main'],
    ['Hindi', 'आप', 'Aap'],
    ['Hindi', 'ठीक', 'Theek'],
    ['Hindi', 'कैसे', 'Kaise'],
    ['Marathi', 'नमस्कार', 'Namaskar'],
    ['Marathi', 'मी', 'Mi'],
    ['Marathi', 'तुम्ही', 'Tumhi'],
    ['Marathi', 'कसा', 'Kasa'],
    ['Bengali', 'নমস্কার', 'Namaskar'],
    ['Bengali', 'আমি', 'Ami'],
    ['Bengali', 'ভালো', 'Bhalo'],
    ['Bengali', 'কেমন', 'Kemon'],
    ['Punjabi', 'ਤੁਸੀਂ', 'Tusi'],
    ['Punjabi', 'ਠੀਕ', 'Theek'],
    ['Tamil', 'வணக்கம்', 'Vanakkam'],
    ['Tamil', 'நான்', 'Naan'],
    ['Tamil', 'நல்ல', 'Nalla'],
    ['Tamil', 'எப்படி', 'Eppadi'],
    ['Malayalam', 'ഞാൻ', 'Njan'],
    ['Malayalam', 'നിങ്ങൾ', 'Ningal'],
    ['Malayalam', 'നമസ്കാരം', 'Namaskkaram'],
    ['Malayalam', 'എങ്ങനെ', 'Engane'],
];

/* Known misses, stated rather than hidden. Both are the course romanising a
   different sound from the one the script writes, which no table can bridge:
   ਸਤਿ really carries a short i and the course writes `Sat`; സുഖം really has an
   aspirated kh and the course writes `Sugam`. Both languages have one lesson. */
const KNOWN_UNREACHABLE = [
    ['Punjabi', 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ', 'Sat Sri Akaal'],
    ['Malayalam', 'സുഖം', 'Sugam'],
];

console.log('\n## Spoken answer in native script → the spelling the course grades\n');
console.log('Each row is a real lesson-1 word, written the way a recogniser returns it.\n');

for (const [langName, native, expected] of ROUND_TRIP) {
    const lexicon = E.buildLexicon(CURRICULUM[langName] || []);
    const got = E.pickRomanisation(native, expected, [], lexicon);
    const { accepted } = E.scoreAnswer(got, expected, [], lexicon);
    if (accepted) {
        console.log(`  ok    ${w(langName, 10)} ${w(native, 16)} -> ${w(got, 18)} = ${expected}`);
    } else {
        fail(`${langName}: ${native} -> ${JSON.stringify(got)} was NOT accepted for ${JSON.stringify(expected)}`);
    }
    if (detectScript(native) !== SCRIPT_BY_LANGUAGE[LANGUAGES.find(l => l.name === langName)?.id]) {
        fail(`${langName}: ${native} detected as ${detectScript(native)}, table says ${SCRIPT_BY_LANGUAGE[LANGUAGES.find(l => l.name === langName)?.id]}`);
    }
}

console.log(`\n### Known unreachable by any table (${KNOWN_UNREACHABLE.length})\n`);
for (const [langName, native, expected] of KNOWN_UNREACHABLE) {
    const lexicon = E.buildLexicon(CURRICULUM[langName] || []);
    const got = E.pickRomanisation(native, expected, [], lexicon);
    const { accepted } = E.scoreAnswer(got, expected, [], lexicon);
    console.log(`  ${accepted ? 'now ok' : 'miss  '} ${w(langName, 10)} ${w(native, 16)} -> ${w(got, 18)} vs ${expected}`);
}

/* ── 4. Negative controls ───────────────────────────────────────────────── */

console.log('\n## A different word must still be a different word\n');
console.log('The reported bug put "Namaste" in the box for a learner who said "Namaskara".\nA transliteration loose enough to accept it would hide the mishearing.\n');

const MUST_REJECT = [
    ['Kannada', 'ನಮಸ್ತೆ', 'Namaskara', 'namaste is a different greeting from namaskara'],
    ['Kannada', 'ನೀವು', 'Naanu', 'you / I'],
    ['Telugu', 'ఇది', 'Adhi', 'this / that — the deictic contrast the course teaches'],
    ['Telugu', 'ఇక్కడ', 'Akkada', 'here / there'],
];
for (const [langName, native, expected, why] of MUST_REJECT) {
    const got = E.pickRomanisation(native, expected, [], new Map());
    const { accepted } = E.scoreAnswer(got, expected, [], new Map());
    if (accepted) fail(`${langName}: ${native} -> ${got} WAS accepted for ${expected} (${why})`);
    else console.log(`  ok    ${w(langName, 10)} ${w(native, 16)} -> ${w(got, 18)} rejected for ${expected}`);
}

/* ── 5. The variant sets stay small ─────────────────────────────────────── */

console.log('\n## Candidate romanisations per utterance\n');
let worst = { n: 0, s: '' };
for (const [, native] of ROUND_TRIP) {
    const n = latinVariants(native).length;
    if (n > worst.n) worst = { n, s: native };
}
console.log(`Largest candidate set: ${worst.n} (${worst.s}). The picker scores each against the`);
console.log(`target, so this is the per-answer cost of accepting both romanisations.`);
if (worst.n > 16) fail(`candidate set of ${worst.n} is above the documented bound of 16`);

/* ── 6. Anything Brahmic that romanises to nothing ──────────────────────── */

console.log('\n## Characters that romanise away to nothing\n');
const holes = [];
for (const [, native] of [...ROUND_TRIP, ...KNOWN_UNREACHABLE]) {
    for (const ch of native) {
        if (!hasBrahmicScript(ch)) continue;
        const r = toLatin(ch);
        if (!r.trim()) holes.push(`${ch} (U+${ch.codePointAt(0).toString(16).toUpperCase()})`);
    }
}
const uniqueHoles = [...new Set(holes)];
if (!uniqueHoles.length) console.log('_None — every character in the cases above produces output._\n');
else console.log(`Produce nothing on their own (expected for pure combining marks): ${uniqueHoles.join(', ')}\n`);

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nAll checks pass.\n');
process.exit(failures ? 1 : 0);
