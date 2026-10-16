/* Listen screens: only words already taught, one right answer among the
   options, never the written form standing in for the sound. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM } from '../src/services/curriculum.js';
import { buildLessonSteps, listenStep, resumeStepFor, railIndexFor, missedKeyFor } from '../src/services/stepPlan.js';

const norm = (t) => String(t || '').toLowerCase().trim();

test('every listen screen plays a word taught by then, in course order', () => {
    for (const [lang, lessons] of Object.entries(CURRICULUM)) {
        lessons.forEach((lesson, li) => {
            const steps = buildLessonSteps(lesson, null, lessons);
            const firstListen = steps.findIndex(s => s.kind === 'listen');
            if (firstListen < 0) return;
            /* All of this lesson's teach screens come first. */
            assert.ok(steps.slice(firstListen).every(s => s.kind !== 'teach'), `${lang} L${li + 1}: teach after listen`);
            const taught = new Set(lessons.slice(0, li + 1).flatMap(l => l.vocabulary || []).map(v => norm(v.word)));
            for (const s of steps.filter(x => x.kind === 'listen')) {
                assert.ok(taught.has(norm(s.word)), `${lang} L${li + 1}: ${s.word} not taught yet`);
                assert.ok(s.options.includes(s.answer), `${lang} L${li + 1}: answer missing`);
                assert.equal(new Set(s.options).size, s.options.length, `${lang} L${li + 1}: duplicate option`);
                assert.ok(s.options.length >= 3, `${lang} L${li + 1}: too few options`);
                assert.ok(!s.prompt.includes(s.word), `${lang} L${li + 1}: prompt shows the word`);
            }
        });
    }
});

test('every lesson with vocabulary gets listen screens', () => {
    for (const [lang, lessons] of Object.entries(CURRICULUM)) {
        lessons.forEach((lesson, li) => {
            if ((lesson.vocabulary || []).length < 3) return;
            const n = buildLessonSteps(lesson, null, lessons).filter(s => s.kind === 'listen').length;
            assert.ok(n >= 1 && n <= 2, `${lang} L${li + 1}: ${n} listen screens`);
        });
    }
});

test('a distractor sharing a sense with the answer is never offered', () => {
    const s = listenStep({ word: 'Aatana', meaning: 'His' },
        [[{ word: 'Avara', meaning: 'Her (respectful) / His' }, { word: 'A', meaning: 'Food' },
          { word: 'B', meaning: 'Water' }, { word: 'C', meaning: 'his' }, { word: 'D', meaning: 'Yes' }]]);
    assert.deepEqual(s.options.filter(o => /his/i.test(o)), ['His']);
});

test('listen screens slot into the plan like any other round', () => {
    const lessons = CURRICULUM.Telugu;
    const steps = buildLessonSteps(lessons[2], null, lessons);
    const li = steps.findIndex(s => s.kind === 'listen');
    steps.forEach((s, i) => assert.equal(s.index, i));
    assert.equal(resumeStepFor(steps, steps[li]), li);
    assert.equal(railIndexFor(steps, { ...steps[li], retry: 1 }), li + 1);
    assert.equal(missedKeyFor(steps[li], 2), null);
});
