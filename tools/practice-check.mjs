#!/usr/bin/env node
/**
 * practice-check — does a practice plan draw only from finished lessons, in
 * the priority order it promises, and accept its own answers?
 *
 *   node tools/practice-check.mjs            # Kannada and Telugu
 *   node tools/practice-check.mjs Odiya
 *
 * For every possible "finished up to lesson N" it feeds buildPracticeSteps
 * sources that deliberately include words, pairs and missed screens from
 * lessons NOT yet finished, and fails if any of them reach the plan. Then it
 * pins the order: due words before confused pairs before missed screens before
 * the top-up, by squeezing the plan size until each lower source drops out.
 */

import { CURRICULUM } from '../src/services/curriculum.js';
import * as engine from '../src/services/lessonEngine.js';
import { buildPracticeSteps, PRACTICE_SIZE } from '../src/services/stepPlan.js';

const langs = process.argv[2] ? [process.argv[2]] : ['Kannada', 'Telugu'];
const problems = [];
const fail = (m) => problems.push(m);
const norm = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();
let plans = 0;

for (const lang of langs) {
    const lessons = CURRICULUM[lang];
    if (!lessons?.length) { fail(`${lang}: no curriculum`); continue; }
    const lexicon = engine.buildLexicon(lessons);
    const drillsOf = (l) => [...(l.phrases || []), ...(l.conversations || [])];

    if (buildPracticeSteps({ lessons, finishedIdx: null }).length) fail(`${lang}: a plan with nothing finished`);

    for (let f = 0; f < lessons.length; f++) {
        const scope = lessons.slice(0, f + 1);
        const scopeWords = new Set(scope.flatMap(l => (l.vocabulary || []).map(v => norm(v.word))));
        const scopeDrills = new Set(scope.flatMap(l => drillsOf(l).map(d => norm(d.correct))));
        const later = lessons.slice(f + 1);
        const laterWord = later.flatMap(l => l.vocabulary || []).find(v => !scopeWords.has(norm(v.word)));
        const laterDrill = later.flatMap(drillsOf).find(d => !scopeDrills.has(norm(d.correct)));
        const v = scope.flatMap(l => l.vocabulary || []);

        const due = [v[0], laterWord].filter(Boolean).map(w => ({ word: w.word, meaning: w.meaning }));
        const confusions = [
            v.length > 2 ? { said: v[1].word, needed: v[2].word, saidMeaning: v[1].meaning, neededMeaning: v[2].meaning } : null,
            laterWord ? { said: v[0].word, needed: laterWord.word } : null,
        ].filter(Boolean);
        const d0 = drillsOf(scope[f])[0];
        const missed = [
            d0 ? { kind: 'drill', key: d0.correct, lessonIdx: f } : null,
            laterDrill ? { kind: 'drill', key: laterDrill.correct, lessonIdx: f + 1 } : null,
            laterWord ? { kind: 'word', key: laterWord.word, lessonIdx: f + 1 } : null,
        ].filter(Boolean);

        const steps = buildPracticeSteps({ lessons, finishedIdx: f, due, confusions, missed, seed: f });
        plans++;
        const tag = `${lang} finished L${f + 1}`;
        const want = Math.min(PRACTICE_SIZE, scopeWords.size + scopeDrills.size);
        if (steps.length !== want) fail(`${tag}: ${steps.length} screens, wanted ${want}`);
        if (new Set(steps.map(s => norm(s.expected))).size !== steps.length) fail(`${tag}: a screen repeats`);
        if (steps.some(s => s.kind === 'teach')) fail(`${tag}: practice taught something new`);

        for (const s of steps) {
            if (!(s.lessonIdx <= f)) fail(`${tag}: "${s.expected}" from lesson ${s.lessonIdx + 1}`);
            const parts = s.item?.contrast ? [s.item.contrast.said, s.item.contrast.needed] : [s.expected];
            const inScope = s.kind === 'drill' ? scopeDrills.has(norm(s.expected)) : parts.every(p => scopeWords.has(norm(p)));
            if (!inScope) fail(`${tag}: "${s.expected}" is not from a finished lesson`);
            if (!engine.scoreAnswer(s.expected, s.expected, s.variants, lexicon).accepted) {
                fail(`${tag}: the grader rejects its own answer "${s.expected}"`);
            }
            if (!s.prompt) fail(`${tag}: "${s.expected}" has no prompt`);
        }

        /* Priority: each source is used before the next gets a slot. */
        const nDue = 1, nPair = v.length > 2 ? 1 : 0; // the out-of-scope pair must not count
        const nMissed = d0 ? 1 : 0;
        const count = (ss, src) => ss.filter(s => s.practice === src).length;
        if (count(steps, 'due') !== nDue) fail(`${tag}: ${count(steps, 'due')} due screens, wanted ${nDue}`);
        if (count(steps, 'confusion') !== nPair) fail(`${tag}: ${count(steps, 'confusion')} pairs, wanted ${nPair}`);
        if (count(steps, 'missed') !== nMissed) fail(`${tag}: ${count(steps, 'missed')} missed, wanted ${nMissed}`);
        for (let size = 1; size <= nDue + nPair + nMissed; size++) {
            const cut = buildPracticeSteps({ lessons, finishedIdx: f, due, confusions, missed, size, seed: f });
            const got = [count(cut, 'due'), count(cut, 'confusion'), count(cut, 'missed'), count(cut, 'mix')];
            const exp = [Math.min(size, nDue), Math.min(Math.max(size - nDue, 0), nPair),
                Math.min(Math.max(size - nDue - nPair, 0), nMissed), 0];
            if (got.join() !== exp.join()) fail(`${tag} size ${size}: sources ${got} != ${exp}`);
        }
        /* Grouped by phase so the end-of-round re-asks work. */
        const phases = steps.map(s => s.phase);
        const order = ['review', 'phrase', 'conversation'];
        if (phases.some((p, i) => i && order.indexOf(p) < order.indexOf(phases[i - 1]))) fail(`${tag}: phases out of order`);
    }
}

console.log(`practice-check: ${plans} plans across ${langs.join(', ')}`);
if (problems.length) {
    console.log(`${problems.length} problem(s):`);
    problems.slice(0, 40).forEach(p => console.log('  ' + p));
    process.exit(1);
}
console.log('ok — every screen from a finished lesson, priority order held, every answer accepted');
