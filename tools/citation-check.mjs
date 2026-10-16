#!/usr/bin/env node
/**
 * citation-check — a lesson number may never be the explanation.
 *
 *   node tools/citation-check.mjs                 # every language
 *   node tools/citation-check.mjs Kannada
 *
 * Farhaan hit this in Kannada lesson 10's last conversation, replayed to him
 * in lesson 13: he answered "Kshamisi, mane yaavaru" and was told "Start with
 * *kshamisi* to stop a stranger politely. The rest is lesson 3, unchanged."
 * His reply: "How would I remember your reference to lesson 3 now?" A lesson
 * number is a citation, not an explanation — the learner has no index to look
 * it up in and no memory of what lesson 3 held, and the drills he meets are
 * not read in their home lesson anyway (practice and the phrase ladder replay
 * them lessons later, see the note at the top of curriculum.js).
 *
 * So the rule, checked here:
 *
 *   A sentence of learner-facing copy that mentions "lesson N" must also name
 *   the target-language word or phrase it means, in the same sentence.
 *
 * Most of the 80-odd references already do ("*Hoguttene*, from lesson 3,
 * covers 'I go'") and they are fine — the number is decoration the learner can
 * ignore because the explanation is right there. This fails only on the ones
 * where the number carries the meaning on its own.
 *
 * Naming counts as: an italicised target word (*kshamisi*, the convention
 * everywhere in curriculum.js), a bare target word, native script, an ending
 * (*-idd-*), or the {w} / {answer} placeholders, which are substituted with
 * the real word before a learner ever sees them.
 *
 * PROMPTS are reported but do not fail. A prompt is a question: naming the
 * target word in it would hand over the answer, so the rule as written cannot
 * apply, and the four that exist ("use 'this' from lesson 2") already state
 * the meaning in English — the number is noise, not the load-bearing part.
 * The fix for a prompt is to delete the citation, not to name the word; they
 * are listed so the decision stays visible rather than silently exempt.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRICULUM } from '../src/services/curriculum.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SOURCES = ['src/services/curriculum.js', 'src/services/drillPools.js'];

const CITATION = /\blessons?\s+\d+/i;   // kept for the prompt scan's readability
const NATIVE = /[ऀ-෿]/;
/* Target words that are also ordinary English, so a bare match proves nothing. */
const AMBIGUOUS = new Set(['main', 'bus', 'miko', 'name', 'place', 'auto', 'hotel', 'coffee', 'tea', 'doctor', 'school', 'bank', 'book']);

const norm = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const words = (t) => norm(t).split(' ').filter(Boolean);

/** Every romanised token this language's course uses as target language. */
function targetTokens(lessons) {
    const set = new Set();
    const add = (t) => words(t).forEach(w => { if (w.length >= 3 && !AMBIGUOUS.has(w)) set.add(w); });
    for (const l of lessons || []) {
        for (const v of l.vocabulary || []) { add(v.word); (v.alt || []).forEach(add); }
        for (const d of [...(l.phrases || []), ...(l.conversations || []), ...(l.pool || [])]) {
            add(d.correct); (d.acceptable || []).forEach(add);
        }
    }
    return set;
}

/** A stem counts: "*maadu* ending" names *maaduttene* without being a token. */
const isTargetish = (w, tokens) => tokens.has(w)
    || (w.length >= 4 && [...tokens].some(t => t.startsWith(w) || w.startsWith(t)));

/** Does this sentence name a target-language word, by any of the ways copy does it? */
function namesAWord(sentence, tokens) {
    if (/\{w\}|\{answer\}/.test(sentence)) return true;
    if (NATIVE.test(sentence)) return true;
    for (const m of sentence.matchAll(/\*+([^*]+)\*+/g)) {
        const inner = m[1].trim();
        if (/^-|-$/.test(inner)) return true;                 // an ending: *-idd-*, *-ge*
        if (words(inner).some(w => isTargetish(w, tokens))) return true;
    }
    return words(sentence).some(w => tokens.has(w));
}

/* A sentence ends at .!? followed by something that starts one: a capital, an
   opening quote, an italic mark, a placeholder. Not at the "!" inside “go!”,
   which otherwise orphans the rest of the sentence into a bogus fragment. */
const sentences = (text) => String(text || '')
    .split(/(?<=[.!?][”"']?)\s+(?=[A-Z“"(*{])/)
    .filter(s => s.trim());

/* Where a flagged string lives, for a file:line the writer can open. */
const SRC = SOURCES.map(p => ({ path: p, lines: readFileSync(join(ROOT, p), 'utf8').split('\n') }));
function locate(text) {
    const needle = String(text).slice(0, 40);
    for (const { path, lines } of SRC) {
        const i = lines.findIndex(l => l.includes(needle));
        if (i >= 0) return `${path}:${i + 1}`;
    }
    return '(not found in source)';
}

/** Every learner-facing string of a lesson, as { field, text, advisory }. */
function copyOf(lesson) {
    const out = [];
    const push = (field, text, advisory = false) => { if (text) out.push({ field, text, advisory }); };
    push('opener', lesson.opener);
    push('farewell', lesson.farewell);
    for (const v of lesson.vocabulary || []) {
        push(`vocab ${v.word}.teach`, v.teach);
        push(`vocab ${v.word}.meaning`, v.meaning);
        (v.traps || []).forEach(t => push(`vocab ${v.word}.trap ${t.said}`, t.why));
        (v.examples || []).forEach((e, i) => push(`vocab ${v.word}.example ${i + 1}`, e?.note || e?.gloss));
    }
    const drills = [
        ...(lesson.phrases || []).map(d => ['phrase', d]),
        ...(lesson.conversations || []).map(d => ['conversation', d]),
        ...(lesson.pool || []).map(d => ['pool', d]),
    ];
    for (const [phase, d] of drills) {
        const at = `${phase} "${d.correct}"`;
        push(`${at}.grammarNote`, d.grammarNote);
        push(`${at}.hint`, d.hint);
        push(`${at}.meaning`, d.meaning);
        (d.traps || []).forEach(t => push(`${at}.trap ${t.said}`, t.why));
        push(`${at}.prompt`, d.prompt, true);     // advisory: see the header
    }
    return out;
}

const langs = process.argv.slice(2).filter(a => !a.startsWith('--'));
const targets = langs.length ? langs : Object.keys(CURRICULUM);

const failures = [];
const advisories = [];
let scanned = 0;
let cited = 0;

for (const lang of targets) {
    const lessons = CURRICULUM[lang];
    if (!lessons?.length) { failures.push({ lang, where: '-', field: 'curriculum', sentence: 'no lessons' }); continue; }
    const tokens = targetTokens(lessons);
    lessons.forEach((lesson, li) => {
        for (const { field, text, advisory } of copyOf(lesson)) {
            scanned++;
            for (const sentence of sentences(text)) {
                const refs = [...sentence.matchAll(/\blessons?\s+(\d+)(?:\s*(?:,|and|to|-|–)\s*(?:lesson\s*)?(\d+))*/gi)];
                if (!refs.length) continue;
                cited++;
                /* Forward references ("that comes in lesson 5") are reassurance,
                   not explanation: there is nothing for the learner to have
                   remembered, so they are exempt. Only a reference BACK to a
                   lesson already done has to name what it means. */
                const numbers = [...sentence.matchAll(/\b(\d+)\b/g)].map(m => Number(m[1]));
                if (numbers.every(n => n > li + 1)) continue;
                if (namesAWord(sentence, tokens)) continue;
                /* A prompt is shown whole: its citation is usually a clause,
                   and the fragment alone reads as a mystery. */
                const row = { lang, lesson: li + 1, where: locate(text), field,
                    sentence: advisory ? String(text).trim() : sentence.trim() };
                const list = advisory ? advisories : failures;
                if (!list.some(r => r.where === row.where && r.field === row.field)) list.push(row);
            }
        }
    });
}

const show = (rows) => rows.forEach(r => {
    console.log(`  ${r.lang} L${r.lesson}  ${r.where}`);
    console.log(`    ${r.field}`);
    console.log(`    “${r.sentence}”`);
});

console.log('');
console.log(`citation-check: ${scanned} learner-facing strings, ${cited} sentences mentioning a lesson number`);
console.log('');
console.log(`## A lesson number with no word named (${failures.length})`);
if (failures.length) { console.log(''); show(failures); } else console.log('  none');
console.log('');
console.log(`## Prompts citing a lesson (${advisories.length}) — reported, not failed`);
if (advisories.length) { console.log(''); show(advisories); } else console.log('  none');
console.log('');
if (failures.length) {
    console.log('A note that says "the rest is lesson 3" tells a learner nothing: there is no');
    console.log('index to look it up in, and practice replays the drill lessons later anyway.');
    console.log('Name the word — "Then *mane yelli?*, exactly as you already know it."');
    console.log('');
}
process.exit(failures.length ? 1 : 0);
