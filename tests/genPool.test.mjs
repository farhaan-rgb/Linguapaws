/* Adaptive phase 4: generated drill pools — serving policy and kill switch.
   Run: node --test tests/*.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM } from '../src/services/curriculum.js';
import { GENERATED_POOLS, SEED_POOLS, DRILL_POOLS, genDrillsEnabled, GEN_DRILLS_KEY } from '../src/services/drillPools.js';
import { planLessonAdaptation } from '../src/services/adaptive.js';

const NOW = Date.parse('2026-10-16T00:00:00Z');
const weak = (skillId) => ({ skillId, mastery: 0.2, evidence: 3, level: 'weak', lastSeen: '2026-10-15' });
const K = CURRICULUM.Kannada;

/* Kannada L8 with a pool we control: the seed *Nanna manegalu* and a
   generated copy of it under another id. */
const seed = SEED_POOLS.Kannada[8].find(d => d.id === 'k8-1');
const genCopy = { ...seed, id: 'k8-gtest', source: 'gen', reviewed: false };
const withPool = (pool) => K.map((l, i) => (i === 7 ? { ...l, pool } : l));
const plan = (lessons) => planLessonAdaptation({ lang: 'Kannada', lessonIdx: 7, lessons, stats: [weak('e:galu')], now: NOW });

const switchOff = (fn) => {
    globalThis.window = { localStorage: { getItem: (k) => (k === GEN_DRILLS_KEY ? 'off' : null) } };
    try { return fn(); } finally { delete globalThis.window; }
};

test('generated drills are served like seeds', () => {
    const a = plan(withPool([genCopy]));
    assert.deepEqual(a.add.map(x => x.id), ['k8-gtest']);
});

test('a seed (or reviewed) drill wins over an unreviewed generated one for the same skill', () => {
    const a = plan(withPool([genCopy, seed]));
    assert.equal(a.add[0].id, 'k8-1');
    const b = plan(withPool([{ ...genCopy, reviewed: true }, seed]));
    assert.ok(['k8-1', 'k8-gtest'].includes(b.add[0].id));
});

test('kill switch: localStorage off removes generated drills from plans', () => {
    assert.equal(genDrillsEnabled(), true);
    switchOff(() => {
        assert.equal(genDrillsEnabled(), false);
        const a = plan(withPool([genCopy]));
        assert.deepEqual(a.add, []);
        const b = plan(withPool([genCopy, seed]));
        assert.deepEqual(b.add.map(x => x.id), ['k8-1']);
    });
});

test('kill switch: with real pools, a switched-off plan names no generated drill', () => {
    let servedOn = 0;
    for (const [lang, lessons] of [['Kannada', K], ['Telugu', CURRICULUM.Telugu]]) {
        lessons.forEach((l, i) => {
            const gen = (l.pool || []).filter(d => d.source === 'gen');
            if (!gen.length) return;
            const stats = gen.map(d => weak(d.gen?.skill)).filter(s => s.skillId);
            const on = planLessonAdaptation({ lang, lessonIdx: i, stats, now: NOW });
            const off = switchOff(() => planLessonAdaptation({ lang, lessonIdx: i, stats, now: NOW }));
            const genIds = new Set(lessons.flatMap(x => x.pool || []).filter(d => d.source === 'gen').map(d => d.id));
            assert.ok(on, `${lang} L${i + 1}`);
            servedOn += on.add.filter(x => genIds.has(x.id)).length;
            assert.ok(off.add.every(x => !genIds.has(x.id)), `${lang} L${i + 1}: ${off.add.map(x => x.id)}`);
        });
    }
    /* Only reviewed generated drills are attached, so "on" serves some only
       once a speaker has approved some. */
    const anyReviewed = Object.values(GENERATED_POOLS).some(b => Object.values(b).some(l => l.some(d => d.reviewed)));
    if (anyReviewed) assert.ok(servedOn > 0, 'switched on, some plan uses a reviewed generated drill');
});

test('generated drills carry their provenance and sit in the attached pools', () => {
    for (const [lang, byLesson] of Object.entries(GENERATED_POOLS)) {
        for (const [n, list] of Object.entries(byLesson)) {
            for (const d of list) {
                assert.equal(d.source, 'gen', d.id);
                assert.equal(typeof d.reviewed, 'boolean', d.id);
                assert.ok(d.gen?.model && d.gen?.judge && d.gen?.date && d.gen?.skill && d.gen.score >= 4, d.id);
                assert.match(d.id, /^[a-z]\d+-g\d+$/, d.id);
                /* Attached only once a speaker has approved it. */
                assert.equal(DRILL_POOLS[lang][n].includes(d), d.reviewed === true, `${d.id} attached iff reviewed`);
            }
        }
    }
});
