#!/usr/bin/env node
/**
 * grammar-check — do grammatical STRUCTURES arrive in a learnable order?
 *
 *   node tools/grammar-check.mjs Telugu            # default: flag lessons adding > 2 structures
 *   node tools/grammar-check.mjs Telugu --max 3
 *
 * gap-check answers "does a drill need a WORD nobody taught yet?". This answers
 * the same question one level up: does a drill need a STRUCTURE (a person
 * ending, a tense, the dative subject, -andi) before the lesson that explains it?
 * Teachability research says grammar sticks when it arrives in order, a little
 * at a time, and keeps coming back — so three reports:
 *
 *   1. drills that need a structure before the lesson that introduces it
 *   2. lessons that introduce more than --max new structures
 *   3. structures introduced and never used again in a later lesson
 *
 * The structure list is hand-tagged, not derived: tools/structures/<lang>.json
 * says which lesson teaches each structure and how to spot it in an answer.
 * Every tag carries the curriculum text it rests on and whether it is a guess,
 * so a native speaker can review it without opening curriculum.js.
 *
 * A drill REQUIRES a structure only when its correct answer and every
 * acceptable form use it. If some accepted answer avoids it, the drill merely
 * EXPOSES it — reported, but not as a blocker, since the learner has a way through.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CURRICULUM } from '../src/services/curriculum.js';

const args = process.argv.slice(2);
const lang = args.find(a => !a.startsWith('--') && !/^\d+$/.test(a)) || 'Telugu';
const maxAt = args.indexOf('--max');
const MAX = maxAt >= 0 ? Number(args[maxAt + 1]) : 2;

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, 'structures', `${lang.toLowerCase()}.json`);
if (!existsSync(file)) { console.log(`no structure tags for ${lang} (expected ${file})`); process.exit(1); }
const { structures } = JSON.parse(readFileSync(file, 'utf8'));

const lessons = CURRICULUM[lang] || [];
if (!lessons.length) { console.log(`no curriculum for ${lang}`); process.exit(1); }

const norm = (v) => String(v || '').toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/\[[^\]]*\]/g, ' x ')
    .replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).join(' ');

const matchers = structures.map(s => ({
    ...s,
    res: (s.detect || []).map(p => new RegExp(`\\b(?:${p})\\b`, 'g')),
    skip: new Set(s.except || []),
}));

/* The form(s) of `text` that make it use structure `s`, or [] if none. */
const uses = (s, text) => {
    const hits = [];
    for (const re of s.res) {
        for (const m of text.matchAll(re)) if (!s.skip.has(m[0])) hits.push(m[0]);
    }
    return hits;
};

/* Every drill, with its lesson number. */
const drills = [];
lessons.forEach((lesson, i) => {
    const all = [
        ...(lesson.phrases || []).map((p, k) => ({ ...p, where: `phrase ${k + 1}` })),
        ...(lesson.conversations || []).map((p, k) => ({ ...p, where: `conv ${k + 1}` })),
    ];
    for (const d of all) {
        drills.push({
            lesson: i + 1, where: d.where, correct: d.correct,
            forms: [d.correct, ...(d.acceptable || [])].map(norm),
        });
    }
});

/* For every structure: which drills require it, which merely expose it. */
const early = [];          // [structure, drill, kind, hits]
const usedIn = new Map();  // id -> Set of lessons
for (const s of matchers) {
    usedIn.set(s.id, new Set());
    if (!s.res.length) continue;
    for (const d of drills) {
        const perForm = d.forms.map(f => uses(s, f));
        const any = perForm.some(h => h.length);
        if (!any) continue;
        usedIn.get(s.id).add(d.lesson);
        const required = perForm.every(h => h.length);
        const intro = s.introducedIn;
        if (intro == null || d.lesson < intro) {
            early.push({ s, d, kind: required ? 'REQUIRES' : 'exposes', hits: [...new Set(perForm.flat())] });
        }
    }
}

const tag = (s) => s.confidence === 'guess' ? ' (tag is a guess)' : '';

console.log(`# Grammar order: ${lang}\n`);
console.log(`${structures.length} structures tagged in ${file.replace(process.cwd() + '/', '')}, `
    + `${structures.filter(s => s.confidence === 'guess').length} of them guesses. `
    + `${drills.length} drills across ${lessons.length} lessons.\n`);

/* 1 */
const req = early.filter(e => e.kind === 'REQUIRES');
const exp = early.filter(e => e.kind !== 'REQUIRES');
console.log(`## 1. Structure needed before the lesson that teaches it (${req.length} required, ${exp.length} exposed)\n`);
const byStruct = new Map();
for (const e of early) {
    if (!byStruct.has(e.s.id)) byStruct.set(e.s.id, []);
    byStruct.get(e.s.id).push(e);
}
if (!byStruct.size) console.log('none\n');
for (const [, list] of byStruct) {
    const s = list[0].s;
    const at = s.introducedIn == null ? 'taught nowhere' : `taught L${s.introducedIn}`;
    console.log(`- **${s.name}** — ${at}${tag(s)}`);
    for (const e of list) {
        console.log(`    - L${e.d.lesson} ${e.d.where} ${e.kind}: "${e.d.correct}"  [${e.hits.join(', ')}]`);
    }
}

/* 2 */
console.log(`\n## 2. Lessons introducing more than ${MAX} new structures\n`);
const perLesson = new Map();
for (const s of structures) {
    if (s.introducedIn == null) continue;
    if (!perLesson.has(s.introducedIn)) perLesson.set(s.introducedIn, []);
    perLesson.get(s.introducedIn).push(s);
}
const heavy = [...perLesson].filter(([, l]) => l.length > MAX).sort((a, b) => a[0] - b[0]);
if (!heavy.length) console.log('none');
for (const [n, list] of heavy) {
    console.log(`- L${n} (${lessons[n - 1]?.scenario || ''}): ${list.length} — ${list.map(s => s.id + (s.confidence === 'guess' ? '?' : '')).join(', ')}`);
}
console.log(`\nPer lesson: ${lessons.map((_, i) => `L${i + 1}:${(perLesson.get(i + 1) || []).length}`).join(' ')}`);

/* 3 */
console.log(`\n## 3. Recycling: lessons after its introduction that use each structure\n`);
const rows = matchers.filter(s => s.introducedIn != null).map(s => {
    const later = [...usedIn.get(s.id)].filter(n => n > s.introducedIn).sort((a, b) => a - b);
    return { s, later };
}).sort((a, b) => a.later.length - b.later.length || a.s.introducedIn - b.s.introducedIn);
for (const { s, later } of rows) {
    if (!s.res.length) { console.log(`- L${s.introducedIn} ${s.id}: not auto-detectable`); continue; }
    const mark = later.length === 0 ? '**never recycled**' : `${later.length} later lesson(s): ${later.map(n => 'L' + n).join(' ')}`;
    console.log(`- L${s.introducedIn} ${s.id}: ${mark}${tag(s)}`);
}
