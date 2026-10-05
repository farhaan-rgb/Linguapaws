/* Per-language lesson progress: the route, with the User model and auth
   mocked so nothing touches a database. Run: node --test backend/tests */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const express = require('express');
require('express-async-errors');

const { validateCompletion, completionUpdate, progressPayload } = require('../services/lessonProgress');

/* An in-memory stand-in for the one user, applying `$max` the way Mongo does. */
const store = { _id: 'u1', successfulRepeats: 47, learnedWords: [], lessonProgress: new Map(), lessonPosition: new Map() };
const calls = [];
const FakeUser = {
    findById: async () => store,
    findByIdAndUpdate: async (id, update, opts) => {
        calls.push({ id, update, opts });
        for (const [k, v] of Object.entries(update.$max || {})) {
            const lang = k.replace(/^lessonProgress\./, '');
            const cur = store.lessonProgress.get(lang);
            if (cur === undefined || v > cur) store.lessonProgress.set(lang, v);
        }
        for (const [k, v] of Object.entries(update.$set || {})) {
            store.lessonPosition.set(k.replace(/^lessonPosition\./, ''), v);
        }
        return store;
    },
    updateOne: async (filter, update) => {
        for (const k of Object.keys(update.$unset || {})) {
            const lang = k.replace(/^lessonPosition\./, '');
            const want = filter[`lessonPosition.${lang}.lessonIdx`];
            if (store.lessonPosition.get(lang)?.lessonIdx === want) store.lessonPosition.delete(lang);
        }
    },
};
store.save = async () => store;

const stub = (rel, exports) => {
    const file = require.resolve(path.join(__dirname, '..', rel));
    require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub('models/User', FakeUser);
stub('models/LearnedWord', {});
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
});

test('validation refuses keys that could become Mongo operators', () => {
    assert.ok(validateCompletion({ lang: 'Telugu', lessonIdx: 3 }).lang);
    assert.ok(validateCompletion({ lang: 'Telugu', lessonIdx: '3' }).lang);
    for (const bad of [{ lang: 'a.b', lessonIdx: 1 }, { lang: '$set', lessonIdx: 1 },
        { lang: 'Telugu', lessonIdx: -1 }, { lang: 'Telugu', lessonIdx: 1.5 }, { lang: 'Telugu' }, {}]) {
        assert.ok(validateCompletion(bad).error, JSON.stringify(bad));
    }
});

test('the update is a $max on the language key', () => {
    assert.deepStrictEqual(completionUpdate('Kannada', 2), { $max: { 'lessonProgress.Kannada': 2 } });
});

test('mongoose casts the $max update against the real schema', () => {
    // castUpdate needs no connection; this is the step that would reject a bad path.
    delete require.cache[require.resolve('../models/User')];
    const castUpdate = require('mongoose/lib/helpers/query/castUpdate');
    const RealUser = require('../models/User');
    const schema = RealUser.schema;
    assert.ok(schema.path('lessonProgress'), 'User schema has lessonProgress');
    const cast = castUpdate(schema, { $max: { 'lessonProgress.Telugu': '4' } }, {}, null, {});
    assert.deepStrictEqual(cast, { $max: { 'lessonProgress.Telugu': 4 } });
    stub('models/User', FakeUser);
});

test('payload flattens the Map and survives a user with no record', () => {
    assert.deepStrictEqual(progressPayload({ successfulRepeats: 3, lessonProgress: new Map([['Telugu', 1]]) }).lessonProgress, { Telugu: 1 });
    assert.deepStrictEqual(progressPayload({}).lessonProgress, {});
});

test('route: records, is idempotent, only moves forward, keeps languages apart', async () => {
    await withServer(async (base) => {
        let r = await (await fetch(base)).json();
        assert.deepStrictEqual(r.lessonProgress, {});
        assert.strictEqual(r.successfulRepeats, 47);

        r = await (await post(`${base}/lesson-complete`, { lang: 'Telugu', lessonIdx: 4 })).json();
        assert.deepStrictEqual(r.lessonProgress, { Telugu: 4 });

        r = await (await post(`${base}/lesson-complete`, { lang: 'Telugu', lessonIdx: 4 })).json();
        assert.deepStrictEqual(r.lessonProgress, { Telugu: 4 }, 'idempotent');

        r = await (await post(`${base}/lesson-complete`, { lang: 'Telugu', lessonIdx: 1 })).json();
        assert.deepStrictEqual(r.lessonProgress, { Telugu: 4 }, 'replaying an earlier lesson does not move back');

        r = await (await post(`${base}/lesson-complete`, { lang: 'Kannada', lessonIdx: 0 })).json();
        assert.deepStrictEqual(r.lessonProgress, { Telugu: 4, Kannada: 0 });

        const bad = await post(`${base}/lesson-complete`, { lang: 'x.y', lessonIdx: 0 });
        assert.strictEqual(bad.status, 400);

        r = await (await post(`${base}/increment`, {})).json();
        assert.strictEqual(r.successfulRepeats, 48, 'counter still increments');
        assert.deepStrictEqual(r.lessonProgress, { Telugu: 4, Kannada: 0 }, 'increment carries lesson progress');

        r = await (await fetch(base)).json();
        assert.deepStrictEqual(r.lessonProgress, { Telugu: 4, Kannada: 0 });
        assert.deepStrictEqual(calls[0].opts, { returnDocument: 'after' });
    });
});

test('route: position is saved per language and cleared only by its own lesson completing', async () => {
    await withServer(async (base) => {
        let r = await (await post(`${base}/position`, { lang: 'Kannada', lessonIdx: 0, stepIdx: 3 })).json();
        assert.strictEqual(r.lessonPosition.Kannada.stepIdx, 3);
        await post(`${base}/position`, { lang: 'Telugu', lessonIdx: 5, stepIdx: 9 });

        r = await (await fetch(base)).json();
        assert.deepStrictEqual({ ...r.lessonPosition.Kannada, updatedAt: undefined }, { lessonIdx: 0, stepIdx: 3, updatedAt: undefined });
        assert.strictEqual(r.lessonPosition.Telugu.stepIdx, 9);

        assert.strictEqual((await post(`${base}/position`, { lang: 'Kannada', lessonIdx: 0, stepIdx: -1 })).status, 400);
        assert.strictEqual((await post(`${base}/position`, { lang: 'a.b', lessonIdx: 0, stepIdx: 1 })).status, 400);

        r = await (await post(`${base}/lesson-complete`, { lang: 'Telugu', lessonIdx: 2 })).json();
        assert.ok(r.lessonPosition.Telugu, 'finishing a different lesson leaves the position');
        r = await (await post(`${base}/lesson-complete`, { lang: 'Kannada', lessonIdx: 0 })).json();
        assert.strictEqual(r.lessonPosition.Kannada, undefined, 'finishing the lesson clears it');
        assert.ok(r.lessonPosition.Telugu, 'other languages untouched');
    });
});

test('mongoose casts the position $set against the real schema', () => {
    const castUpdate = require('mongoose/lib/helpers/query/castUpdate');
    const RealUser = require('mongoose').model('User');
    const cast = castUpdate(RealUser.schema, { $set: { 'lessonPosition.Kannada': { lessonIdx: '0', stepIdx: '3', updatedAt: new Date(0) } } }, {}, null, {});
    assert.strictEqual(cast.$set['lessonPosition.Kannada'].stepIdx, 3);
});
