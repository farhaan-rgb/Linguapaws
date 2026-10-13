/* Confused pairs: the routes, with the Confusion model and auth mocked so
   nothing touches a database. Run: node --test backend/tests */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const express = require('express');
require('express-async-errors');

/* An in-memory Confusion collection applying $inc/$set the way Mongo does. */
const rows = [];
const match = (d, f) => Object.entries(f).every(([k, v]) => d[k] === v);
const withSave = (d) => Object.assign(d, { save: async () => d });
const FakeConfusion = {
    findOneAndUpdate: (filter, update) => {
        let d = rows.find(r => match(r, filter));
        if (!d) { d = withSave({ ...filter, count: 0, wins: 0, retired: false }); rows.push(d); }
        for (const [k, v] of Object.entries(update.$inc || {})) d[k] = (d[k] || 0) + v;
        Object.assign(d, update.$set || {});
        return { lean: async () => d };
    },
    find: (filter) => ({ limit: () => ({ lean: async () => rows.filter(r => match(r, filter)) }) }),
    findOne: async (filter) => rows.find(r => match(r, filter)) || null,
};

const stub = (rel, exports) => {
    const file = require.resolve(path.join(__dirname, '..', rel));
    require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub('models/User', {});
stub('models/LearnedWord', {});
stub('models/Confusion', FakeConfusion);
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

test('a recorded nimma->avara pair is due in the next lesson, not this one, and retires after two clean checks', async () => {
    await withServer(async (base) => {
        const pair = { lang: 'Kannada', said: 'Nimma', needed: 'Avara',
            saidMeaning: 'Your (respectful)', neededMeaning: 'His / her (respectful)' };
        let r = await post(`${base}/confusion`, { ...pair, scenario: 5 });
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.count, 1);
        await post(`${base}/confusion`, { ...pair, scenario: 5 });
        assert.strictEqual(rows.length, 1, 'one record per pair');
        assert.strictEqual(rows[0].count, 2);

        assert.strictEqual(await get(`${base}/confusions/due?lang=Kannada&scenario=5`), null, 'not in the same lesson');
        assert.strictEqual(await get(`${base}/confusions/due?lang=Telugu&scenario=6`), null, 'not another language');
        const due = await get(`${base}/confusions/due?lang=Kannada&scenario=6`);
        assert.strictEqual(due.said, 'Nimma');
        assert.strictEqual(due.needed, 'Avara');

        r = await post(`${base}/confusion/check`, { lang: 'Kannada', said: 'Nimma', needed: 'Avara', correct: true, scenario: 6 });
        assert.deepStrictEqual([r.body.wins, r.body.retired], [1, false]);
        r = await post(`${base}/confusion/check`, { lang: 'Kannada', said: 'Nimma', needed: 'Avara', correct: false, scenario: 7 });
        assert.deepStrictEqual([r.body.wins, r.body.retired], [0, false], 'a miss starts the count over');
        await post(`${base}/confusion/check`, { lang: 'Kannada', said: 'Nimma', needed: 'Avara', correct: true, scenario: 8 });
        r = await post(`${base}/confusion/check`, { lang: 'Kannada', said: 'Nimma', needed: 'Avara', correct: true, scenario: 9 });
        assert.deepStrictEqual([r.body.wins, r.body.retired], [2, true]);
        assert.strictEqual(await get(`${base}/confusions/due?lang=Kannada&scenario=10`), null, 'retired');

        r = await post(`${base}/confusion`, { ...pair, scenario: 10 });
        assert.deepStrictEqual([r.body.retired, r.body.wins, r.body.count], [false, 0, 3], 'a fresh mix-up reopens it');
    });
});

test('bodies that could become Mongo operators are refused', async () => {
    await withServer(async (base) => {
        for (const bad of [{ lang: '$where', said: 'a', needed: 'b' }, { lang: 'Kannada', said: { $gt: '' }, needed: 'b' },
            { lang: 'Kannada', said: 'Avara', needed: 'avara' }, { lang: 'Kannada', said: 'a' }]) {
            assert.strictEqual((await post(`${base}/confusion`, bad)).status, 400, JSON.stringify(bad));
        }
        assert.strictEqual((await post(`${base}/confusion/check`, { lang: 'Kannada', said: 'a', needed: 'b', correct: 'yes' })).status, 400);
    });
});

test('mongoose casts the confusion update against the real schema', () => {
    delete require.cache[require.resolve('../models/Confusion')];
    const castUpdate = require('mongoose/lib/helpers/query/castUpdate');
    const { confusionUpdate, validatePair } = require('../services/confusions');
    const schema = require('../models/Confusion').schema;
    const p = validatePair({ lang: 'Kannada', said: 'Nimma', needed: 'Avara', scenario: 4 });
    const cast = castUpdate(schema, confusionUpdate(p), {}, null, {});
    assert.strictEqual(cast.$inc.count, 1);
    assert.strictEqual(cast.$set.lastScenario, '4');
});
