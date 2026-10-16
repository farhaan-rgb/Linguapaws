/* Skill stats: the update rule, the weak flag, and the two routes with every
   model and auth mocked so nothing touches a database.
   Run from backend/: node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const express = require('express');
require('express-async-errors');
const S = require('../services/skillStats');

const rows = [];
const match = (d, f) => Object.entries(f).every(([k, v]) => (v && typeof v === 'object' && v.$in ? v.$in.includes(d[k]) : d[k] === v));
const fakeSkillStat = {
    find: (filter) => {
        const res = () => rows.filter(r => match(r, filter)).map(r => ({ ...r }));
        return { lean: async () => res(), limit: () => ({ lean: async () => res() }) };
    },
    bulkWrite: async (ops) => {
        for (const { updateOne: { filter, update, upsert } } of ops) {
            let d = rows.find(r => match(r, filter));
            if (!d && upsert) { d = { ...filter }; rows.push(d); }
            if (d) Object.assign(d, update.$set);
        }
        return { ok: 1 };
    },
};
const stub = (rel, exports) => {
    const file = require.resolve(path.join(__dirname, '..', rel));
    require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub('models/User', {});
stub('models/LearnedWord', {});
stub('models/Confusion', {});
stub('models/MissedScreen', {});
stub('models/SkillStat', fakeSkillStat);
stub('middleware/auth', (req, res, next) => { req.user = { _id: 'u1' }; next(); });
const router = require('../routes/progress');

async function withServer(fn) {
    const app = express();
    app.use(express.json());
    app.use('/api/progress', router);
    const server = app.listen(0);
    const base = `http://127.0.0.1:${server.address().port}/api/progress`;
    try { await fn(base); } finally { server.close(); }
}
const post = (url, body) => fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}).then(async r => ({ status: r.status, body: await r.json() }));
const get = (url) => fetch(url).then(r => r.json());

test('mastery: a full success moves 30% of the way to 1, two half-weights equal one full', () => {
    assert.strictEqual(S.nextMastery(undefined, 1, 1), 0.65);
    const half = S.nextMastery(S.nextMastery(0.5, 1, 0.5), 1, 0.5);
    assert.ok(Math.abs(half - 0.65) < 1e-9);
    assert.strictEqual(S.nextMastery(0.5, 0, 0), 0.5, 'zero weight changes nothing');
    const s = S.applyEvidence(null, { score: 0, weight: 1 });
    assert.strictEqual(s.mastery, 0.35);
    assert.strictEqual(s.attempts, 1);
    assert.deepStrictEqual(s.recent, [0]);
});

test('weak: at least one unit of evidence and mastery under 0.5', () => {
    assert.strictEqual(S.levelOf({ mastery: 0.35, evidence: 0.6 }), 'new', 'too little evidence to call it');
    assert.strictEqual(S.levelOf({ mastery: 0.35, evidence: 1 }), 'weak');
    assert.strictEqual(S.levelOf({ mastery: 0.6, evidence: 3 }), 'learning');
    assert.strictEqual(S.levelOf({ mastery: 0.85, evidence: 3 }), 'strong');
});

test('evidence is posted, folded into one stat per skill, and listed weakest first', async () => {
    await withServer(async (base) => {
        let r = await post(`${base}/skills/evidence`, { lang: 'Kannada', items: [
            { skillId: 'w:nanage', score: 0, weight: 1 },
            { skillId: 'c:nanage-want', score: 0, weight: 1 },
            { skillId: 'w:neeru', score: 1, weight: 1 },
        ] });
        assert.strictEqual(r.status, 200);
        r = await post(`${base}/skills/evidence`, { lang: 'Kannada', items: [{ skillId: 'w:nanage', score: 0, weight: 0.8 }] });
        assert.strictEqual(rows.filter(x => x.skillId === 'w:nanage').length, 1);
        await post(`${base}/skills/evidence`, { lang: 'Telugu', items: [{ skillId: 'w:naaku', score: 0, weight: 1 }] });

        const all = await get(`${base}/skills?lang=Kannada`);
        assert.deepStrictEqual(all.map(s => s.skillId), ['w:nanage', 'c:nanage-want', 'w:neeru']);
        const nanage = all[0];
        assert.strictEqual(nanage.attempts, 2);
        assert.strictEqual(nanage.weak, true);
        assert.ok(nanage.mastery < 0.35);
        assert.strictEqual(all[2].level, 'learning');
        const weak = await get(`${base}/skills?lang=Kannada&weak=1`);
        assert.deepStrictEqual(weak.map(s => s.skillId), ['w:nanage', 'c:nanage-want']);
        assert.strictEqual((await get(`${base}/skills?lang=Telugu`)).length, 1, 'languages kept apart');
    });
});

test('bodies that could become operators or nonsense are refused', async () => {
    await withServer(async (base) => {
        for (const body of [
            { lang: '$where', items: [{ skillId: 'w:x', score: 1, weight: 1 }] },
            { lang: 'Kannada', items: [] },
            { lang: 'Kannada', items: [{ skillId: { $ne: '' }, score: 1, weight: 1 }] },
            { lang: 'Kannada', items: [{ skillId: 'w:x', score: 2, weight: 1 }] },
            { lang: 'Kannada', items: [{ skillId: 'w:x', score: 1, weight: '1' }] },
            { lang: 'Kannada', items: [{ skillId: 'x:bad', score: 1, weight: 1 }] },
            { lang: 'Kannada', items: Array.from({ length: 41 }, (_, i) => ({ skillId: `w:a${i}`, score: 1, weight: 1 })) },
        ]) {
            const r = await post(`${base}/skills/evidence`, body);
            assert.strictEqual(r.status, 400, JSON.stringify(body).slice(0, 80));
        }
        const r = await fetch(`${base}/skills`);
        assert.strictEqual(r.status, 400, 'lang is required');
    });
});
