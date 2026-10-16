/* Adaptive phase 3: the lesson after "New words" adapts to the learner.
   Run: node --test tests/*.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM } from '../src/services/curriculum.js';
import { DRILL_POOLS } from '../src/services/drillPools.js';
import { buildLessonSteps } from '../src/services/stepPlan.js';
import { planLessonAdaptation, coreFlags, POOL_ADD_MAX, SKIP_MAX } from '../src/services/adaptive.js';
import { tagStep, skillEvidence, skillsFor } from '../src/services/skills.js';
import { savedStepFor } from '../src/services/lessonResume.js';

const NOW = Date.parse('2026-10-16T00:00:00Z');
const weak = (skillId) => ({ skillId, mastery: 0.2, evidence: 3, level: 'weak', lastSeen: '2026-10-15' });
const strong = (skillId) => ({ skillId, mastery: 0.95, evidence: 6, level: 'strong', lastSeen: '2026-10-15' });
const K = CURRICULUM.Kannada;
const T = CURRICULUM.Telugu;
const drillKeys = (steps) => steps.filter(s => s.kind === 'drill').map(s => `${s.phase}:${s.expected}`);
const plan = (lang, idx, stats) => planLessonAdaptation({ lang, lessonIdx: idx, stats, now: NOW });
/* Every skill a language has, strong — the most a learner can skip. */
const allStrong = (lang) => [...skillsFor(lang).keys()].map(strong);

test('pools: every seed drill sits on a lesson, has a stable unique id and a phase', () => {
    const ids = new Set();
    for (const [lang, byLesson] of Object.entries(DRILL_POOLS)) {
        for (const [n, pool] of Object.entries(byLesson)) {
            assert.equal(CURRICULUM[lang][n - 1].pool, pool, `${lang} L${n} pool attached`);
            for (const d of pool) {
                assert.ok(d.id && !ids.has(d.id), `${d.id} unique`);
                ids.add(d.id);
                assert.ok(['phrase', 'conversation'].includes(d.phase), d.id);
                for (const k of ['prompt', 'correct', 'native', 'meaning', 'hint']) assert.ok(d[k], `${d.id}.${k}`);
                assert.ok(tagStep({ kind: 'drill', expected: d.correct, variants: d.acceptable }, { lang, lessonNo: Number(n) }).skills.length, d.id);
            }
        }
    }
});

test('a learner weak on a skill gets pool drills for it, with one caption per round', () => {
    const stats = [weak('e:galu'), strong('w:nanna'), strong('order')];
    const a = plan('Kannada', 7, stats);
    assert.ok(a.add.length >= 1 && a.add.length <= POOL_ADD_MAX);
    const steps = buildLessonSteps(K[7], null, K, null, a);
    const added = steps.filter(s => s.adaptive?.pool);
    assert.equal(added.length, a.add.length);
    for (const s of added) {
        assert.ok(tagStep(s, { lang: 'Kannada', lessonNo: 8 }).skills.includes('e:galu'), s.expected);
    }
    for (const ph of ['listen', 'phrase', 'conversation']) {
        assert.ok(steps.filter(s => s.phase === ph && s.why).length <= 1, ph);
    }
    assert.match(added.find(s => s.why)?.why || '', /-galu/);
    /* Weak skill: the hint is up front. */
    assert.ok(added.every(s => s.assist === 'more'));
});

test('Telugu: a weak naaku construction draws its pool drills, from this lesson or earlier', () => {
    const a = plan('Telugu', 8, [weak('c:naaku-want')]);
    const ids = a.add.map(x => x.id);
    assert.ok(ids.length, 'something added');
    for (const id of ids) assert.ok(Number(id.slice(1).split('-')[0]) <= 9, `${id} is from a lesson taught by L9`);
});

test('a strong learner skips at most one drill, never a core one, never emptying a round', () => {
    for (const [lang, lessons] of [['Kannada', K], ['Telugu', T]]) {
        const stats = allStrong(lang);
        lessons.forEach((lesson, i) => {
            const a = plan(lang, i, stats);
            const base = buildLessonSteps(lesson, null, lessons);
            const got = buildLessonSteps(lesson, null, lessons, null, a);
            assert.ok(a.skip.length <= SKIP_MAX);
            assert.equal(a.add.length, 0, `${lang} L${i + 1}: nothing weak, nothing added`);
            const flags = coreFlags(lesson, lessons, lang);
            const own = [...(lesson.phrases || []).map(d => ({ ...d, phase: 'phrase' })),
                ...(lesson.conversations || []).map(d => ({ ...d, phase: 'conversation' }))];
            const kept = drillKeys(got);
            own.forEach((d, j) => {
                if (flags[j]) assert.ok(kept.includes(`${d.phase}:${d.correct}`), `${lang} L${i + 1}: core "${d.correct}" kept`);
            });
            assert.ok(base.length - got.length <= SKIP_MAX, `${lang} L${i + 1}`);
            for (const ph of ['phrase', 'conversation']) {
                if (base.some(s => s.phase === ph)) assert.ok(got.some(s => s.phase === ph), `${lang} L${i + 1} ${ph}`);
            }
            /* Strong everywhere: hints wait for a miss. */
            assert.ok(got.filter(s => s.kind === 'drill').every(s => s.assist !== 'more'));
        });
    }
    assert.ok(plan('Kannada', 7, allStrong('Kannada')).skip.length === 1, 'Kannada L8 has a drill to skip');
});

test('core: every lesson keeps the drills that introduce its new skills, whatever the model', () => {
    for (const [lang, lessons] of [['Kannada', K], ['Telugu', T]]) {
        const skills = [...skillsFor(lang).keys()];
        lessons.forEach((lesson, i) => {
            const flags = coreFlags(lesson, lessons, lang);
            assert.ok(flags.some(Boolean), `${lang} L${i + 1} has a core drill`);
            /* Mixed model: half weak, half strong, alternating. */
            const stats = skills.map((id, k) => (k % 2 ? strong(id) : weak(id)));
            const got = drillKeys(buildLessonSteps(lesson, null, lessons, null, plan(lang, i, stats)));
            const own = [...(lesson.phrases || []).map(d => ({ ...d, phase: 'phrase' })),
                ...(lesson.conversations || []).map(d => ({ ...d, phase: 'conversation' }))];
            own.forEach((d, j) => { if (flags[j]) assert.ok(got.includes(`${d.phase}:${d.correct}`), `${lang} L${i + 1}`); });
        });
    }
});

test('length stays within -1/+2 of today for every lesson and model shape', () => {
    for (const [lang, lessons] of [['Kannada', K], ['Telugu', T]]) {
        const skills = [...skillsFor(lang).keys()];
        const models = [skills.map(weak), skills.map(strong), skills.map((id, k) => (k % 3 ? strong(id) : weak(id)))];
        lessons.forEach((lesson, i) => {
            const base = buildLessonSteps(lesson, null, lessons).length;
            for (const m of models) {
                const n = buildLessonSteps(lesson, null, lessons, null, plan(lang, i, m)).length;
                assert.ok(n >= base - SKIP_MAX && n <= base + POOL_ADD_MAX, `${lang} L${i + 1}: ${base} -> ${n}`);
            }
        });
    }
});

test('resume: the cached adaptation rebuilds the same plan, however the model moved', () => {
    const a = plan('Kannada', 7, [weak('e:galu'), weak('w:hoovu'), ...allStrong('Kannada').slice(0, 40)]);
    const cached = JSON.parse(JSON.stringify(a));
    const first = buildLessonSteps(K[7], null, K, null, a);
    const again = buildLessonSteps(K[7], null, K, null, cached);
    assert.deepEqual(again.map(s => [s.index, s.kind, s.expected, s.why || '', s.assist || '']),
        first.map(s => [s.index, s.kind, s.expected, s.why || '', s.assist || '']));
    /* The saved position lands on the same screen. */
    const at = first.findIndex(s => s.adaptive?.pool);
    const progress = { lessonPosition: { Kannada: { lessonIdx: 7, stepIdx: at } } };
    assert.equal(savedStepFor(progress, 'Kannada', 7, again.length), at);
    assert.equal(again[at].expected, first[at].expected);
    /* A pool id the course no longer has is dropped, not guessed at. */
    const gone = { ...cached, add: [{ id: 'k99-9', phase: 'phrase' }] };
    assert.equal(buildLessonSteps(K[7], null, K, null, gone).filter(s => s.adaptive?.pool).length, 0);
});

test('no model, or a new learner: today\'s lesson exactly', () => {
    for (const [lang, lessons] of [['Kannada', K], ['Telugu', T]]) {
        lessons.forEach((lesson, i) => {
            assert.equal(plan(lang, i, []), null);
            assert.equal(plan(lang, i, null), null);
            assert.deepEqual(buildLessonSteps(lesson, null, lessons, null, null), buildLessonSteps(lesson, null, lessons));
        });
    }
    /* A model with nothing weak or strong yet (all "new"): nothing moves. */
    const fresh = [{ skillId: 'w:naanu', mastery: 0.5, evidence: 0.4, level: 'new' }];
    const a = plan('Kannada', 7, fresh);
    assert.deepEqual([a.add, a.skip, a.assist], [[], [], {}]);
    assert.deepEqual(drillKeys(buildLessonSteps(K[7], null, K, null, a)), drillKeys(buildLessonSteps(K[7], null, K)));
});

test('listen: weak word skills are picked, placement rules kept, evidence at reduced weight', () => {
    const a = plan('Kannada', 7, [weak('w:nimma'), weak('w:hoovu')]);
    const steps = buildLessonSteps(K[7], null, K, null, a);
    const listen = steps.filter(s => s.kind === 'listen');
    assert.deepEqual(listen.map(s => s.word), ['Hoovu', 'Nimma']);
    const taught = new Set(K.slice(0, 8).flatMap(l => l.vocabulary).map(v => v.word));
    for (const s of listen) {
        assert.ok(taught.has(s.word));
        assert.ok(s.options.includes(s.answer));
        assert.equal(new Set(s.options).size, s.options.length);
    }
    assert.ok(steps.slice(steps.indexOf(listen[0])).every(s => s.kind !== 'teach'));
    assert.ok(listen.filter(s => s.why).length <= 1);

    const step = listen[1];
    assert.deepEqual(tagStep(step, { lang: 'Kannada', lessonNo: 8 }).skills, ['w:nimma']);
    const ev = (outcome) => skillEvidence({ step, lang: 'Kannada', lessonNo: 8, outcome });
    assert.deepEqual(ev('first'), [{ skillId: 'w:nimma', score: 1, weight: 0.4 }]);
    assert.equal(ev('after-miss')[0].weight, 0.15);
    assert.deepEqual(ev('dont-know'), [{ skillId: 'w:nimma', score: 0, weight: 0.25 }]);
    assert.ok(ev('first')[0].weight < 1, 'a tap is worth less than a produced answer');
});
