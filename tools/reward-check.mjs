#!/usr/bin/env node
/**
 * reward-check — does every screen in the course have something to say?
 *
 *   node tools/reward-check.mjs            # every language
 *   node tools/reward-check.mjs Telugu
 *
 * Step mode answers a learner three times per screen, and each of the three can
 * silently come out empty:
 *
 *   the verdict        — never empty, and never the same line twice running
 *   the achievement    — what they just did; empty is a wasted moment
 *   the miss feedback  — `explainMiss`, or the curriculum hint, or the scaffold
 *
 * The third is the one worth guarding. Before this feature a wrong answer on a
 * teach or review screen printed "Not quite" and stopped, because those screens
 * carry no hint — so this walks every step of every lesson, answers it wrongly,
 * and fails if the learner would be left with nothing but the verdict.
 *
 * Runs the real `buildLessonSteps` against the real curriculum, with no review
 * queue (the offline case) — review slots are checked separately by feeding the
 * lesson's own vocabulary back in as a due set.
 */

import { CURRICULUM } from '../src/services/curriculum.js';
import * as engine from '../src/services/lessonEngine.js';
import * as praise from '../src/services/praise.js';
import { buildLessonSteps } from '../src/services/stepPlan.js';

const only = process.argv[2];
const languages = Object.keys(CURRICULUM).filter(l => !only || l === only);
if (!languages.length) { console.log(`no curriculum for ${only}`); process.exit(1); }

/* What a learner types when they have no idea. Deliberately unlike anything in
   the course, so `explainMiss` gets no free wins. */
const NONSENSE = 'qqq wibble';

let screens = 0;
const problems = [];

for (const lang of languages) {
    const lessons = CURRICULUM[lang] || [];
    const lexicon = engine.buildLexicon(lessons);

    lessons.forEach((lesson, li) => {
        const where = `${lang} L${li + 1}`;
        /* Stand in a review triplet so the review screens are exercised too —
           offline that is exactly what `ensureReviewSet` falls back to. */
        const reviewSet = (lesson.vocabulary || []).slice(0, 3)
            .map(w => ({ word: w.word, meaning: w.meaning || '', source: 'lesson' }));
        const steps = buildLessonSteps(lesson, reviewSet, lessons);

        if (steps.length < 6) problems.push(`${where}: only ${steps.length} screens`);

        let previous = '';
        steps.forEach((step, si) => {
            screens++;
            const at = `${where} step ${si + 1} (${step.phase})`;

            // 1. The verdict, and no two the same in a row.
            const verdict = praise.verdictFor({ misses: 0, cleared: si });
            if (!verdict) problems.push(`${at}: no verdict`);
            if (verdict && verdict === previous) problems.push(`${at}: verdict repeats "${verdict}"`);
            previous = verdict;

            // 2. What they just did.
            const did = praise.achievementFor({ step, lang, combo: 1 });
            if (!did) problems.push(`${at}: nothing to say about "${step.expected}"`);

            // 3. A miss leaves them something to work with.
            const diagnosis = engine.explainMiss(NONSENSE, step.expected, step.variants, lexicon);
            const hint = step.kind === 'drill' ? step.drill?.hint : null;
            const scaffold = praise.scaffoldFor(step.expected);
            if (!diagnosis && !hint && !scaffold) problems.push(`${at}: a miss says nothing`);

            // 4. A scaffold must not simply be the answer.
            if (scaffold && step.expected && scaffold.includes(step.expected)) {
                problems.push(`${at}: the scaffold gives the answer away`);
            }
        });
    });
}

/* The points arithmetic, which is small enough to state exactly. */
const cases = [
    [{ correct: true, misses: 0, combo: 1 }, praise.CLEAN_POINTS],
    [{ correct: true, misses: 1, combo: 0 }, praise.RECOVERED_POINTS],
    [{ correct: true, misses: 0, combo: 3 }, praise.CLEAN_POINTS + praise.STREAK_BONUS],
    [{ correct: false, misses: 2, combo: 0 }, 0],
];
cases.forEach(([input, want]) => {
    const got = praise.pointsFor(input).total;
    if (got !== want) problems.push(`points ${JSON.stringify(input)} = ${got}, expected ${want}`);
});

console.log(`${screens} screens across ${languages.join(', ')}`);
if (!problems.length) {
    console.log('every screen has a verdict, an achievement and something to say on a miss');
    process.exit(0);
}
problems.slice(0, 40).forEach(p => console.log(`  ✗ ${p}`));
if (problems.length > 40) console.log(`  … and ${problems.length - 40} more`);
process.exit(1);
