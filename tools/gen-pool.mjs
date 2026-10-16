#!/usr/bin/env node
/**
 * gen-pool — AI-generated drill pools, made offline and validated before any
 * learner sees them (adaptive phase 4, ADAPTIVE.md).
 *
 *   node tools/gen-pool.mjs gen Telugu 5-12        generate, validate, write
 *   node tools/gen-pool.mjs gen Kannada 1-30 --per 6 --max-usd 6 --dry
 *   node tools/gen-pool.mjs validate Telugu [--prune]  re-run the gate on every stored gen drill (--prune drops failures)
 *   node tools/gen-pool.mjs review Telugu           write the speaker checklist + answers file
 *   node tools/gen-pool.mjs apply Telugu            apply the answers file (ok → reviewed, no → removed)
 *
 * Nothing is generated at runtime. A drill reaches drillPools.js only if it
 * passes EVERY mechanical check below and then a second, independent model's
 * grading. Rejects are written, with reasons, to playtests/gen-pool/.
 *
 * The gate (any failure rejects):
 *   taught      every token of every listed form is a word taught by lessons
 *               1..N (or an alt spelling), a taught stem + taught ending, or a
 *               free loanword/name — stricter than gap-check, which scores the
 *               easiest form only
 *   grader      scoreAnswer accepts `correct` and every `acceptable`; no
 *               DISTINCT_WORDS partner swapped in is accepted; no variant
 *               differs only by a person ending; no plain-English refusal
 *               passes; no listed form reads as a question; no other drill of
 *               the lesson passes for it (or it for them) as a shorter answer
 *   script      `native` is in the language's script, romanises back to an
 *               accepted answer, has one word per Latin word, and agrees with
 *               the native the course already gives any word it shares (the
 *               voice's token table is built from these; a bad token would
 *               leak into hand-written lines)
 *   skill       tagStep tags it, and tags the skill it was generated for
 *   duplicate   its normalised answer is no course drill, pool drill or other
 *               candidate's
 *   english     prompt and hint are plain ASCII English: every word is English
 *               (system dictionary), a free name, or a target word already
 *               taught; neither carries the answer's own words
 *   judge       a second model grades naturalness and correctness 1–5; both
 *               must be ≥ 4 and the prompt must ask for exactly this answer
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { CURRICULUM, WORD_ENDINGS } from '../src/services/curriculum.js';
import { SEED_POOLS, GENERATED_POOLS } from '../src/services/drillPools.js';
import * as E from '../src/services/lessonEngine.js';
import { tagStep, tagAnswer, skillsFor } from '../src/services/skills.js';
import { toLatin, detectScript, SCRIPT_BY_LANGUAGE } from '../shared/transliterate.js';
import { LANGUAGES } from '../shared/languages.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const POOLS_FILE = path.join(ROOT, 'src/services/drillPools.js');
const OUT_DIR = path.join(ROOT, 'playtests/gen-pool');
const TODAY = new Date().toISOString().slice(0, 10);

const GEN_MODEL = 'gpt-5.4';
const JUDGE_MODEL = 'gpt-4.1';
/* USD per million tokens, input/output — list prices as assumed on the run
   date; only used for the --max-usd cap and the report's estimate. */
const PRICE = { 'gpt-5.4': [2.5, 15], 'gpt-4.1': [2, 8] };

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const has = (name) => args.includes(name);
const VALUED = new Set(['--per', '--max-usd', '--concurrency']);
const [mode, lang, range] = args.filter((a, i) => !a.startsWith('--') && !VALUED.has(args[i - 1]));

if (!mode || !lang || !CURRICULUM[lang]) {
    console.error('usage: node tools/gen-pool.mjs gen|validate|review|apply <Language> [from-to] [--per 5] [--max-usd 8] [--dry]');
    process.exit(2);
}
const lessons = CURRICULUM[lang];
const langId = (LANGUAGES.find(l => l.name === lang) || {}).id;
const initial = lang[0].toLowerCase();

/* ── Shared knowledge ─────────────────────────────────────────────────── */

const nl = (v) => E.normalizeLatin(v);
const toks = (v) => nl(v).split(' ').filter(Boolean);
const lex = E.buildLexicon(lessons);

const FREE = new Set([
    'miko', 'coffee', 'tea', 'chai', 'bus', 'auto', 'hotel', 'film', 'cinema',
    'phone', 'school', 'college', 'office', 'doctor', 'hospital', 'final',
    'ravi', 'hyderabad', 'bangalore', 'chennai', 'mumbai', 'delhi', 'telugu',
    'kannada', 'hindi', 'odia', 'odisha', 'india', 'roti', 'rupees', 'ok',
]);

/* Every target token the course teaches anywhere, and where first. */
const firstTaught = new Map();
lessons.forEach((l, i) => (l.vocabulary || []).forEach(v => {
    for (const t of [...toks(v.word), ...(v.alt || []).flatMap(toks)]) if (!firstTaught.has(t)) firstTaught.set(t, i + 1);
}));
const knownBy = (n) => new Set([...firstTaught].filter(([, at]) => at <= n).map(([t]) => t));

/* English, from the system word list, with crude inflection stripping. */
const DICT = new Set(fs.existsSync('/usr/share/dict/words')
    ? fs.readFileSync('/usr/share/dict/words', 'utf8').split('\n').map(w => w.toLowerCase()) : []);
const EXTRA_EN = new Set(['okay', 'ok', 'im', 'ive', 'youre', 'dont', 'doesnt', 'isnt', 'cant', 'wont', 'its', 'lets',
    'whats', 'wheres', 'hows', 'thats', 'theyre', 'theres', 'someone', 'respectfully', 'politely', 'something', 'shopkeeper']);
const isEnglish = (w) => {
    if (!w || /\d/.test(w) || DICT.has(w) || EXTRA_EN.has(w)) return true;
    for (const [suf, rep] of [['ies', 'y'], ['es', ''], ['s', ''], ['ed', ''], ['ed', 'e'], ['d', ''], ['ing', ''], ['ing', 'e'], ['er', ''], ['ly', ''], ['n', '']]) {
        if (w.endsWith(suf) && DICT.has(w.slice(0, -suf.length) + rep)) return true;
    }
    return false;
};

/* Every drill the course has, per lesson, including pools. */
const drillsOf = (l) => [...(l.phrases || []), ...(l.conversations || []), ...(l.pool || [])].filter(d => d?.correct);
// Unreviewed generated drills are not on lesson.pool, so add them here too.
const allKeys = new Set([...lessons.flatMap(drillsOf), ...Object.values(GENERATED_POOLS[lang] || {}).flat()]
    .filter(d => d?.correct).map(d => nl(d.correct)));

/* The voice's token table (speechScript.align), built from hand-written content. */
const nativeTok = new Map();
const splitNative = (s) => String(s).replace(/[^\p{L}\p{M}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
for (const l of lessons) {
    for (const v of l.vocabulary || []) {
        if (v.word && v.native && toks(v.word).length === 1 && splitNative(v.native).length === 1) {
            if (!nativeTok.has(toks(v.word)[0])) nativeTok.set(toks(v.word)[0], splitNative(v.native)[0]);
        }
    }
    for (const d of [...(l.phrases || []), ...(l.conversations || []), ...(l.pool || []).filter(p => p.source !== 'gen')]) {
        if (!d.native) continue;
        const a = toks(d.correct), b = splitNative(d.native);
        if (a.length === b.length) a.forEach((t, i) => { if (!nativeTok.has(t)) nativeTok.set(t, b[i]); });
    }
}

const asStep = (d, phase) => ({ kind: 'drill', phase: phase || d.phase || 'phrase', drill: d, expected: d.correct, variants: d.acceptable || [] });

/* How many drills already test each skill (lesson drills + pools). */
const coverage = new Map();
lessons.forEach((l, i) => drillsOf(l).forEach(d => {
    for (const id of tagStep(asStep(d), { lang, lessonNo: i + 1 }).skills) coverage.set(id, (coverage.get(id) || 0) + 1);
}));

const REFUSALS = ["I don't know that one", 'I have no idea, sorry', "You haven't taught me that yet",
    'no idea what you want here', 'I give up on this one', 'ok', 'what does that mean again?'];

/* ── The mechanical gate ──────────────────────────────────────────────── */

function gate(d, n, others) {
    const reasons = [];
    const lessonNo = n;
    const forms = [d.correct, ...(d.acceptable || [])].filter(Boolean);
    if (!d.correct || !d.prompt || !d.meaning || !d.hint || !d.native) return ['shape: missing a field'];
    if (!['phrase', 'conversation'].includes(d.phase)) reasons.push('shape: phase');

    /* taught */
    const known = knownBy(n);
    for (const f of forms) {
        const tag = tagAnswer(f, { lang, lessonNo });
        const bad = toks(f).filter(t => !known.has(t) && !FREE.has(t) && !tag.stems.has(t));
        if (bad.length) { reasons.push(`taught: \`${f}\` needs ${bad.join(', ')}`); break; }
    }

    /* grader */
    for (const f of forms) {
        if (!E.scoreAnswer(f, d.correct, d.acceptable || [], lex).accepted) reasons.push(`grader: rejects listed \`${f}\``);
        if (E.isLearnerQuestion(f, { lexicon: lex })) reasons.push(`grader: \`${f}\` reads as a question`);
    }
    const listed = new Set(forms.map(nl));
    for (const f of forms) {
        const ft = toks(f);
        ft.forEach((t, k) => {
            for (const g of E.DISTINCT_WORDS) {
                if (!g.includes(t)) continue;
                for (const o of g.filter(w => w !== t)) {
                    const said = ft.map((x, j) => (j === k ? o : x)).join(' ');
                    if (!listed.has(said) && E.scoreAnswer(said, d.correct, d.acceptable || [], lex).accepted) {
                        reasons.push(`grader: taught-against \`${said}\` accepted`);
                    }
                }
            }
        });
    }
    for (const v of d.acceptable || []) {
        const a = toks(v), b = toks(d.correct);
        if (a.length === b.length && a.some((x, k) => x !== b[k] && E.differsOnlyByPersonEnding(x, b[k]))) {
            reasons.push(`grader: \`${v}\` differs only by a person ending`);
        }
    }
    for (const r of REFUSALS) {
        if (!E.opensAsQuestion(r) && E.scoreAnswer(r, d.correct, d.acceptable || [], lex).accepted) reasons.push(`grader: refusal "${r}" accepted`);
    }
    for (const o of others) {
        if (nl(o.correct) === nl(d.correct)) continue;
        const ot = toks(o.correct).length, dt = toks(d.correct).length;
        if (ot < dt && E.scoreAnswer(o.correct, d.correct, d.acceptable || [], lex).accepted) reasons.push(`grader: shorter \`${o.correct}\` passes for it`);
        if (dt < ot && E.scoreAnswer(d.correct, o.correct, o.acceptable || [], lex).accepted) reasons.push(`grader: it passes for longer \`${o.correct}\``);
    }

    /* script */
    const script = SCRIPT_BY_LANGUAGE[langId];
    const got = detectScript(d.native);
    if (script && got !== script) reasons.push(`script: native is ${got || 'not Indic'}`);
    else {
        const back = toLatin(d.native, { language: langId });
        if (!E.scoreAnswer(back, d.correct, d.acceptable || [], lex).accepted) reasons.push(`script: native reads \`${back}\``);
        const a = toks(d.correct), b = splitNative(d.native);
        if (a.length !== b.length) reasons.push('script: native word count differs');
        else a.forEach((t, i) => {
            if (nativeTok.has(t) && nativeTok.get(t) !== b[i]) reasons.push(`script: ${t} is ${nativeTok.get(t)} in the course, not ${b[i]}`);
        });
    }

    /* skill */
    const tag = tagStep(asStep(d), { lang, lessonNo });
    if (!tag.skills.length) reasons.push('skill: no skill');
    else if (d.skill && !tag.skills.includes(d.skill)) reasons.push(`skill: does not test ${d.skill} (tests ${tag.skills.join(' ')})`);

    /* duplicate */
    if (allKeys.has(nl(d.correct))) reasons.push('duplicate: already in the course');

    /* english */
    const ascii = /^[\x20-\x7E‘’“”—–]+$/;
    for (const [field, text] of [['prompt', d.prompt], ['hint', d.hint], ['meaning', d.meaning]]) {
        if (!ascii.test(text) || /\*/.test(text)) { reasons.push(`english: ${field} is not plain text`); continue; }
        const words = String(text).toLowerCase().replace(/[’']/g, '').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
        const foreign = words.filter(w => !isEnglish(w) && !FREE.has(w) && !known.has(w));
        if (foreign.length) reasons.push(`english: ${field} has ${foreign.join(', ')}`);
        if (field !== 'meaning') {
            const leaked = toks(d.correct).filter(t => t.length > 2 && !FREE.has(t) && !isEnglish(t) && words.includes(t));
            if (leaked.length) reasons.push(`english: ${field} gives away ${leaked.join(', ')}`);
        }
    }
    return [...new Set(reasons)];
}

/* ── Model calls ──────────────────────────────────────────────────────── */

function loadKey() {
    const envPath = path.join(ROOT, 'backend', '.env');
    if (fs.existsSync(envPath)) {
        for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
            const m = /^\s*(OPENAI_API_KEY)\s*=\s*(.*)\s*$/.exec(line);
            if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
        }
    }
    return process.env.OPENAI_API_KEY;
}
const usage = {};
const spent = () => Object.entries(usage).reduce((s, [m, u]) => s + (u.in * PRICE[m][0] + u.out * PRICE[m][1]) / 1e6, 0);
async function chat(model, system, user) {
    const body = {
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        response_format: { type: 'json_object' },
        ...(model.startsWith('gpt-5') ? { reasoning_effort: 'low' } : { temperature: 0 }),
    };
    for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loadKey()}` },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(180000),
        }).catch(() => null);
        if (!res?.ok) { await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); continue; }
        const json = await res.json();
        const u = usage[model] || (usage[model] = { in: 0, out: 0, calls: 0 });
        u.in += json.usage?.prompt_tokens || 0; u.out += json.usage?.completion_tokens || 0; u.calls++;
        try { return JSON.parse(json.choices?.[0]?.message?.content || '{}'); } catch { return {}; }
    }
    return {};
}

/* ── Generation ───────────────────────────────────────────────────────── */

const CONVENTIONS = {
    Kannada: [
        'Romanisation: copy spellings EXACTLY from the word list. Long ii is written ee, long e is e, long o is o (Hoguttene, Hode, Beku).',
        '"I want / like / know / feel / can" is nanage + beku / ishta / gottu / ... — never naanu with those. naanu is for "I am doing / I go".',
        'Verb (or beku/ishta/ide) goes last. Question words (yenu, yelli, yaaru, eshtu) go last.',
        'Things take -galu in the plural, people take -aru.',
    ],
    Telugu: [
        'Romanisation: copy spellings EXACTLY from the word list (e.g. pusthakam, velthunnanu, idhi).',
        '"I want X" is written "X kaavali" with "naaku X kaavali" in acceptable — the naaku form MUST be listed whenever naaku is taught. "I like" is naaku ... ishtam. nenu is for "I am doing / I go" — never nenu with kaavali/ishtam.',
        'Verb goes last. Question words (emiti, ekkada, evaru, entha) go last.',
        'okati becomes oka before a noun. idhi/adhi are for things, not people.',
    ],
};

function lessonBrief(n) {
    const l = lessons[n - 1];
    const vocab = lessons.slice(0, n).flatMap((x, i) => (x.vocabulary || []).map(v =>
        `${v.word}${v.alt?.length ? ` (also ${v.alt.join(', ')})` : ''} = ${E.cleanGloss ? E.cleanGloss(v.meaning) : v.meaning}${i + 1 === n ? '  [NEW]' : ''}`));
    const ends = (WORD_ENDINGS[lang]?.endings || []).filter(e => e.lesson <= n)
        .map(e => `-${e.ending}: ${e.means}${e.example ? ` (e.g. ${e.example.word} = ${e.example.meaning})` : ''}`);
    const style = [...drillsOf(l).slice(0, 8), ...lessons.slice(Math.max(0, n - 3), n - 1).flatMap(drillsOf).slice(0, 6)]
        .map(d => JSON.stringify({ phase: d.phase || ((l.conversations || []).includes(d) ? 'conversation' : 'phrase'), prompt: d.prompt, correct: d.correct, native: d.native, meaning: d.meaning, hint: d.hint, acceptable: d.acceptable || [] }));
    const tax = skillsFor(lang);
    const lessonWords = (l.vocabulary || []).map(v => `w:${nl(v.word).replace(/ /g, '-')}`);
    const fromLesson = [...tax.values()].filter(s => s.lesson === n && s.type !== 'word').map(s => s.id);
    const targets = [...new Set([...fromLesson, ...lessonWords])].filter(id => tax.has(id))
        .sort((a, b) => (coverage.get(a) || 0) - (coverage.get(b) || 0)).slice(0, 6);
    return { l, vocab, ends, style, targets, tax };
}

async function generate(n, per, feedback = []) {
    const { l, vocab, ends, style, targets, tax } = lessonBrief(n);
    const system = `You write practice drills for a ${lang} course for English-speaking beginners. Output JSON only.`;
    const user = [
        `Lesson ${n} of ${lessons.length}: "${l.scenario}". The learner knows ONLY these words (and the endings below). Use no other ${lang} word, no other spelling, and no inflection that is not built from a listed word plus a listed ending.`,
        '', 'WORDS:', ...vocab, '', 'ENDINGS:', ...(ends.length ? ends : ['(none yet)']), '',
        'RULES:', ...CONVENTIONS[lang],
        `Taught-against pairs — never use one where the other belongs, and never list both in one drill: ${E.DISTINCT_WORDS.map(g => g.join('/')).join('; ')}.`,
        'prompt: plain English instruction, no target-language words in it, never the answer. "phrase" prompts look like Say \'...\'; "conversation" prompts are a small situation with Miko (the tutor) or a shopkeeper/friend.',
        'hint: English glosses joined with + in the target word order (e.g. "Big + house").',
        'native: the same sentence in native script, word for word, one native word per romanised word.',
        'acceptable: only genuinely equivalent alternative romanised answers the learner could give (often []). Never an answer with a different meaning, person or tense.',
        'Keep sentences short (2–5 words), natural, and exactly what a native speaker would say.',
        '', 'STYLE EXAMPLES (from the course — do not repeat any of these answers):', ...style, '',
        `SKILLS TO TARGET (${per} drills total, spread over these, thinnest first; each drill names the one it targets in "skill"):`,
        ...targets.map(id => `${id} — ${tax.get(id).label}`),
        ...(feedback.length ? ['', 'Earlier attempts were rejected for these reasons — avoid them:', ...feedback.slice(0, 15)] : []),
        '', `Return {"drills":[{"skill","phase","prompt","correct","native","meaning","hint","acceptable"}]} with ${per + 4} drills.`,
    ].join('\n');
    const out = await chat(GEN_MODEL, system, user);
    return { drills: Array.isArray(out.drills) ? out.drills : [], targets };
}

async function judge(cands) {
    if (!cands.length) return [];
    const system = `You are a native ${lang} speaker and a strict language teacher reviewing drills for English-speaking beginners. Output JSON only.`;
    const user = [
        `Grade each ${lang} drill. The learner reads the English prompt and must produce the romanised answer.`,
        'natural: 1–5, would a native speaker say exactly this (5) or is it odd/wrong (1)?',
        'correct: 1–5, does the answer mean exactly the English meaning, with correct grammar and romanisation, and does native script match it?',
        'matches_prompt: true only if the prompt asks for this answer and no other reasonable answer.',
        'acceptable_ok: true only if every acceptable alternative means the same thing.',
        'reason: one short sentence.',
        '', ...cands.map((d, i) => JSON.stringify({ i, prompt: d.prompt, answer: d.correct, native: d.native, meaning: d.meaning, acceptable: d.acceptable || [] })),
        '', 'Return {"grades":[{"i","natural","correct","matches_prompt","acceptable_ok","reason"}]}.',
    ].join('\n');
    const out = await chat(JUDGE_MODEL, system, user);
    return Array.isArray(out.grades) ? out.grades : [];
}

const clean = (d) => ({
    skill: String(d.skill || ''), phase: String(d.phase || ''), prompt: String(d.prompt || '').trim(),
    correct: String(d.correct || '').trim(), native: String(d.native || '').trim(),
    meaning: String(d.meaning || '').trim(), hint: String(d.hint || '').trim(),
    acceptable: (Array.isArray(d.acceptable) ? d.acceptable : []).map(String).map(s => s.trim()).filter(s => s && nl(s) !== nl(d.correct)),
});

/* Answers kept by any lesson in this run: lessons run concurrently, so the
   course-wide duplicate check alone would let two lessons keep the same line. */
const claimed = new Set();
async function runLesson(n, per, maxUsd, log) {
    const kept = [];
    const rejects = [];
    let generated = 0;
    const others = drillsOf(lessons[n - 1]);
    for (let round = 0; round < 2 && kept.length < per; round++) {
        if (spent() > maxUsd) { log.push(`L${n}: budget reached, stopped`); break; }
        const { drills } = await generate(n, per - kept.length, rejects.map(r => `${r.correct}: ${r.reasons[0]}`));
        generated += drills.length;
        const passed = [];
        for (const raw of drills) {
            const d = clean(raw);
            const seen = [...kept, ...passed];
            let reasons = gate(d, n, [...others, ...seen]);
            if (seen.some(k => nl(k.correct) === nl(d.correct))) reasons = ['duplicate: same as another candidate'];
            if (reasons.length) rejects.push({ ...d, reasons });
            else passed.push(d);
        }
        const grades = await judge(passed);
        passed.forEach((d, i) => {
            const g = grades.find(x => Number(x.i) === i);
            if (!g) { rejects.push({ ...d, reasons: ['judge: no grade returned'] }); return; }
            const score = Math.min(Number(g.natural) || 0, Number(g.correct) || 0);
            const ok = score >= 4 && g.matches_prompt === true && g.acceptable_ok === true;
            const rec = { ...d, judge: { score, natural: g.natural, correct: g.correct, reason: String(g.reason || '') } };
            if (ok && claimed.has(nl(d.correct))) { rejects.push({ ...rec, reasons: ['duplicate: kept by another lesson this run'] }); return; }
            if (!ok) rejects.push({ ...rec, reasons: [`judge: ${score}/5${g.matches_prompt === true ? '' : ', prompt ambiguous'}${g.acceptable_ok === true ? '' : ', bad alternative'} — ${g.reason}`] });
            else { kept.push(rec); claimed.add(nl(d.correct)); }
        });
    }
    /* Most per lesson: spread over skills first, then by judge score. */
    kept.sort((a, b) => b.judge.score - a.judge.score);
    const out = [];
    const bySkill = new Map();
    for (const d of kept) if (!bySkill.has(d.skill)) { bySkill.set(d.skill, 1); out.push(d); }
    for (const d of kept) if (!out.includes(d)) out.push(d);
    const chosen = out.slice(0, per);
    for (const d of out.slice(per)) rejects.push({ ...d, reasons: ['surplus: lesson already has enough'] });
    return { n, generated, chosen, rejects };
}

/* ── drillPools.js block ──────────────────────────────────────────────── */

function writeGenerated(pools) {
    const src = fs.readFileSync(POOLS_FILE, 'utf8');
    const begin = src.indexOf('// BEGIN GENERATED');
    const end = src.indexOf('// END GENERATED');
    if (begin < 0 || end < 0) throw new Error('drillPools.js has no GENERATED markers');
    const lines = ['// BEGIN GENERATED', 'export const GENERATED_POOLS = {'];
    for (const l of Object.keys(pools).sort()) {
        lines.push(`    ${l}: {`);
        for (const n of Object.keys(pools[l]).map(Number).sort((a, b) => a - b)) {
            if (!pools[l][n].length) continue;
            lines.push(`        ${n}: [`);
            for (const d of pools[l][n]) lines.push(`            ${JSON.stringify(d)},`);
            lines.push('        ],');
        }
        lines.push('    },');
    }
    lines.push('};', '');
    fs.writeFileSync(POOLS_FILE, src.slice(0, begin) + lines.join('\n') + src.slice(end));
}
const clonePools = () => JSON.parse(JSON.stringify(GENERATED_POOLS));
const genOf = (n) => (GENERATED_POOLS[lang]?.[n] || []);
const nextId = (n, pools) => {
    const used = [...(pools[lang]?.[n] || []), ...(SEED_POOLS[lang]?.[n] || [])].map(d => d.id);
    let k = 1;
    while (used.includes(`${initial}${n}-g${k}`)) k++;
    return `${initial}${n}-g${k}`;
};

/* ── Modes ────────────────────────────────────────────────────────────── */

async function modeGen() {
    if (!loadKey()) { console.error('no OPENAI_API_KEY in backend/.env'); process.exit(1); }
    const [from, to] = String(range || `1-${lessons.length}`).split('-').map(Number);
    const per = Number(flag('--per', 5));
    const maxUsd = Number(flag('--max-usd', 8));
    const conc = Number(flag('--concurrency', 5));
    const todo = [];
    for (let n = from; n <= (to || from); n++) if (genOf(n).length < per) todo.push(n);
    const log = [];
    const results = [];
    let i = 0;
    await Promise.all(Array.from({ length: conc }, async () => {
        while (i < todo.length) {
            const n = todo[i++];
            const r = await runLesson(n, per - genOf(n).length, maxUsd, log);
            results.push(r);
            console.log(`L${n}: generated ${r.generated}, kept ${r.chosen.length}, rejected ${r.rejects.length}  ($${spent().toFixed(2)})`);
        }
    }));
    results.sort((a, b) => a.n - b.n);

    /* Re-read the file now: another language's run may have written since. */
    const fresh = await import(`${pathToFileURL(POOLS_FILE).href}?t=${Date.now()}`);
    const pools = JSON.parse(JSON.stringify(fresh.GENERATED_POOLS));
    for (const r of results) {
        pools[lang] = pools[lang] || {};
        pools[lang][r.n] = pools[lang][r.n] || [];
        for (const d of r.chosen) {
            pools[lang][r.n].push({
                id: nextId(r.n, pools), phase: d.phase, prompt: d.prompt, correct: d.correct, native: d.native,
                meaning: d.meaning, hint: d.hint, acceptable: d.acceptable, source: 'gen', reviewed: false,
                gen: { model: GEN_MODEL, judge: JUDGE_MODEL, date: TODAY, skill: d.skill, score: d.judge.score, reason: d.judge.reason },
            });
        }
    }
    if (!has('--dry')) writeGenerated(pools);

    /* The report. */
    const gen = results.reduce((s, r) => s + r.generated, 0);
    const keptN = results.reduce((s, r) => s + r.chosen.length, 0);
    const rej = results.flatMap(r => r.rejects.map(x => ({ ...x, n: r.n })));
    const byKind = {};
    for (const x of rej) { const k = x.reasons[0].split(':')[0]; byKind[k] = (byKind[k] || 0) + 1; }
    const md = [
        `# Generated drill pool — ${lang}, ${TODAY}`, '',
        `Generator \`${GEN_MODEL}\`, judge \`${JUDGE_MODEL}\`, lessons ${from}–${to || from}, target ${per} per lesson.`, '',
        `- candidates generated: **${gen}**, kept: **${keptN}**, rejected: **${rej.length}** (${gen ? ((rej.length / gen) * 100).toFixed(0) : 0}%; surplus counts as rejected)`,
        `- rejects by first reason: ${Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, c]) => `${k} ${c}`).join(', ')}`,
        ...Object.entries(usage).map(([m, u]) => `- ${m}: ${u.calls} calls, ${u.in} in / ${u.out} out tokens`),
        `- estimated cost: $${spent().toFixed(2)} (list prices assumed: ${Object.entries(PRICE).map(([m, p]) => `${m} $${p[0]}/$${p[1]} per M`).join(', ')})`,
        ...log.map(x => `- ${x}`), '',
        '## Kept, per lesson', '',
        ...results.map(r => `- L${r.n}: ${r.chosen.length} kept of ${r.generated} — ${r.chosen.map(d => `\`${d.correct}\` (${d.skill}, ${d.judge.score}/5)`).join(', ')}`), '',
        '## Rejects', '',
        ...rej.map(x => `- L${x.n} \`${x.correct}\` ${x.native} — "${x.prompt}" → ${x.reasons.join('; ')}`), '',
    ].join('\n');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const file = path.join(OUT_DIR, `${lang.toLowerCase()}-${TODAY}.md`);
    fs.writeFileSync(file, md);
    console.log(`\n${keptN} kept of ${gen} generated; report ${path.relative(ROOT, file)}; ~$${spent().toFixed(2)}`);
}

function modeValidate() {
    const bad = [];
    let total = 0;
    for (const [n, list] of Object.entries(GENERATED_POOLS[lang] || {})) {
        for (const d of list) {
            total++;
            const others = drillsOf(lessons[n - 1]).filter(o => o !== d && o.id !== d.id);
            const r = gate({ ...d, skill: d.gen?.skill }, Number(n), others)
                .filter(x => !x.startsWith('duplicate: already'));
            /* allKeys includes the drill itself; count only a second copy. */
            /* Hand-written drills come first, then pools in lesson order: only a
               later copy fails, so pruning keeps the first. */
            /* Generated drills are read from GENERATED_POOLS, not lesson.pool:
               only reviewed ones are attached to lessons, and an unreviewed
               drill must still be found as its own first copy. */
            const all = [
                ...lessons.flatMap(l => [...(l.phrases || []), ...(l.conversations || [])]),
                ...lessons.flatMap((l, i) => [
                    ...(l.pool || []).filter(o => o.source !== 'gen'),
                    ...((GENERATED_POOLS[lang] || {})[i + 1] || []),
                ]),
            ];
            const first = all.find(o => o?.correct && nl(o.correct) === nl(d.correct));
            if (first !== d) r.push(`duplicate: already in the course${first?.id ? ` as ${first.id}` : ''}`);
            if (r.length) { bad.push(d.id); console.log(`${d.id} \`${d.correct}\`: ${r.join('; ')}`); }
        }
    }
    if (has('--prune') && bad.length) {
        const pools = clonePools();
        for (const n of Object.keys(pools[lang] || {})) pools[lang][n] = pools[lang][n].filter(d => !bad.includes(d.id));
        writeGenerated(pools);
        console.log(`${lang}: pruned ${bad.join(', ')}`);
        return;
    }
    console.log(`${lang}: ${total} generated drills, ${bad.length} fail the gate`);
    process.exit(bad.length ? 1 : 0);
}

const reviewFile = path.join(OUT_DIR, `review-${lang.toLowerCase()}.md`);
const answersFile = path.join(OUT_DIR, `review-${lang.toLowerCase()}.answers.txt`);

function modeReview() {
    const rows = Object.entries(GENERATED_POOLS[lang] || {}).flatMap(([n, list]) => list.map(d => ({ n, d })));
    const pending = rows.filter(r => !r.d.reviewed);
    const md = [
        `# ${lang} generated drills — speaker review`, '',
        `${pending.length} to review (${rows.length - pending.length} already approved). For each: is the ${lang} exactly what a native speaker says for the English, and is the script right?`,
        `Answer in \`${path.basename(answersFile)}\`: change \`?\` to \`ok\` or \`no\` (anything after # is a note). Then run \`node tools/gen-pool.mjs apply ${lang}\`.`, '',
        '| id | lesson | say (English) | ' + lang + ' | native | also accepted |', '|--|--|--|--|--|--|',
        ...pending.map(({ n, d }) => `| ${d.id} | L${n} | ${d.meaning} | **${d.correct}** | ${d.native} | ${(d.acceptable || []).join(' / ') || '—'} |`), '',
    ].join('\n');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(reviewFile, md);
    const prior = fs.existsSync(answersFile) ? fs.readFileSync(answersFile, 'utf8') : '';
    const have = new Set(prior.split('\n').map(l => l.split(/\s+/)[0]).filter(Boolean));
    const add = pending.filter(({ d }) => !have.has(d.id)).map(({ d }) => `${d.id} ?   # ${d.correct} = ${d.meaning}`);
    const head = prior || `# ${lang} review answers: <id> ok|no  # note\n`;
    fs.writeFileSync(answersFile, head + (add.length ? `${head.endsWith('\n') ? '' : '\n'}${add.join('\n')}\n` : ''));
    console.log(`${pending.length} to review → ${path.relative(ROOT, reviewFile)}, answers in ${path.relative(ROOT, answersFile)}`);
}

function modeApply() {
    if (!fs.existsSync(answersFile)) { console.error(`no ${answersFile}`); process.exit(1); }
    const verdict = new Map();
    for (const line of fs.readFileSync(answersFile, 'utf8').split('\n')) {
        const m = /^\s*([a-z]\d+-g\d+)\s+(ok|no)\b/i.exec(line);
        if (m) verdict.set(m[1], m[2].toLowerCase());
    }
    const pools = clonePools();
    let ok = 0, no = 0;
    for (const n of Object.keys(pools[lang] || {})) {
        pools[lang][n] = pools[lang][n].filter(d => {
            if (verdict.get(d.id) === 'no') { no++; return false; }
            if (verdict.get(d.id) === 'ok' && !d.reviewed) { d.reviewed = true; ok++; }
            return true;
        });
    }
    writeGenerated(pools);
    console.log(`${lang}: ${ok} approved, ${no} removed`);
}

if (mode === 'gen') await modeGen();
else if (mode === 'validate') modeValidate();
else if (mode === 'review') modeReview();
else if (mode === 'apply') modeApply();
else { console.error(`unknown mode ${mode}`); process.exit(2); }
