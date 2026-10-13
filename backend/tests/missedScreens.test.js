/* Missed screens and practice's open-pair list: the routes, with every model
   and auth mocked so nothing touches a database. Run: node --test backend/tests */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const express = require('express');
require('express-async-errors');

const match = (d, f) => Object.entries(f).every(([k, v]) => d[k] === v);
const withSave = (d) => Object.assign(d, { save: async () => d });
function fakeModel(rows) {
    return {
        findOneAndUpdate: (filter, update) => {
            let d = rows.find(r => match(r, filter));
            if (!d) { d = withSave({ ...filter, count: 0, retired: false }); rows.push(d); }
            for (const [k, v] of Object.entries(update.$inc || {})) d[k] = (d[k] || 0) + v;
            Object.assign(d, update.$set || {});
            return { lean: async () => d };
        },
        find: (filter) => ({ limit: () => ({ lean: async () => rows.filter(r => match(r, filter)) }) }),
        findOne: async (filter) => rows.find(r => match(r, filter)) || null,
    };
}
const missedRows = [];
const pairRows = [
    { userId: 'u1', lang: 'Kannada', said: 'Nimma', needed: 'Avara', count: 1, lastSeen: new Date(1), retired: false },
    { userId: 'u1', lang: 'Kannada', said: 'Idu', needed: 'Adu', count: 4, lastSeen: new Date(2), retired: false },
    { userId: 'u1', lang: 'Kannada', said: 'Beku', needed: 'Beda', count: 9, lastSeen: new Date(3), retired: true },
    { userId: 'u1', lang: 'Telugu', said: 'Idi', needed: 'Adi', count: 2, lastSeen: new Date(4), retired: false },
];

const stub = (rel, exports) => {
    const file = require.resolve(path.join(__dirname, '..', rel));
    require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub('models/User', {});
stub('models/LearnedWord', {});
stub('models/Confusion', fakeModel(pairRows));
stub('models/MissedScreen', fakeModel(missedRows));
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

test('a revealed screen is recorded once, listed for practice, and retired by one clean answer', async () => {
    await withServer(async (base) => {
        const s = { lang: 'Kannada', lessonIdx: 3, kind: 'drill', key: 'Nanage neeru beku' };
        let r = await post(`${base}/missed`, s);
        assert.strictEqual(r.status, 200);
        await post(`${base}/missed`, { ...s, key: 'nanage  neeru beku' });
        assert.strictEqual(missedRows.length, 1, 'one record per screen, case and spacing aside');
        assert.strictEqual(missedRows[0].count, 2);
        await post(`${base}/missed`, { lang: 'Kannada', lessonIdx: 1, kind: 'word', key: 'Idu' });

        let open = await get(`${base}/missed?lang=Kannada`);
        assert.deepStrictEqual(open.map(o => o.key), ['nanage  neeru beku', 'Idu'], 'most-missed first');
        assert.deepStrictEqual(await get(`${base}/missed?lang=Telugu`), [], 'not another language');

        r = await post(`${base}/missed/check`, { ...s, correct: false });
        assert.strictEqual(r.body.retired, false, 'a miss in practice keeps it open');
        r = await post(`${base}/missed/check`, { ...s, correct: true });
        assert.strictEqual(r.body.retired, true);
        open = await get(`${base}/missed?lang=Kannada`);
        assert.deepStrictEqual(open.map(o => o.key), ['Idu']);

        await post(`${base}/missed`, s);
        open = await get(`${base}/missed?lang=Kannada`);
        assert.strictEqual(open.length, 2, 'a fresh miss reopens it');
    });
});

test('missed bodies that could become operators or nonsense are refused', async () => {
    await withServer(async (base) => {
        for (const body of [
            { lang: '$where', lessonIdx: 0, kind: 'word', key: 'x' },
            { lang: 'Kannada', lessonIdx: { $gt: 0 }, kind: 'word', key: 'x' },
            { lang: 'Kannada', lessonIdx: 0, kind: 'teach', key: 'x' },
            { lang: 'Kannada', lessonIdx: 0, kind: 'word', key: { $ne: '' } },
            { lang: 'Kannada', lessonIdx: -1, kind: 'word', key: 'x' },
        ]) {
            const r = await post(`${base}/missed`, body);
            assert.strictEqual(r.status, 400, JSON.stringify(body));
        }
        const r = await post(`${base}/missed/check`, { lang: 'Kannada', lessonIdx: 9, kind: 'word', key: 'nope', correct: true });
        assert.strictEqual(r.status, 404);
    });
});

test('practice gets open pairs in this language, most frequent first, retired ones left out', async () => {
    await withServer(async (base) => {
        const open = await get(`${base}/confusions/open?lang=Kannada&limit=3`);
        assert.deepStrictEqual(open.map(p => p.said), ['Idu', 'Nimma']);
        const one = await get(`${base}/confusions/open?lang=Kannada&limit=1`);
        assert.strictEqual(one.length, 1);
    });
});
