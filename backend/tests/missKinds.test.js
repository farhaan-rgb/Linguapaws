/* Why a miss happened, stored beside the schedule: POST /api/progress/review
   carrying `missKind`, and GET /api/progress/miss-kinds reading it back. Every
   model and the auth middleware are mocked, so nothing here touches a database.
   Run: node --test backend/tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const express = require('express');
require('express-async-errors');

const {
    readMissKind, applyTally, missHistory, profilePayload,
} = require('../services/missKinds');

/* ── The service, on its own ─────────────────────────────────────────────── */

test('a kind is read from one value or reduced from a list of attempts', () => {
    assert.strictEqual(readMissKind({ missKind: 'order' }), 'order');
    assert.strictEqual(readMissKind({ missKind: 'ORDER' }), null, 'exact strings only');
    assert.strictEqual(readMissKind({ missKind: 'word-order' }), null, 'not a kind');
    assert.strictEqual(readMissKind({ missKind: { $ne: '' } }), null, 'never an operator');
    assert.strictEqual(readMissKind({}), null);
    assert.strictEqual(readMissKind({ missKinds: ['order', 'ending'] }), 'order', 'the first attempt');
    assert.strictEqual(readMissKind({ missKinds: ['unknown', 'ending'] }), 'ending', 'undiagnosed is skipped');
    assert.strictEqual(readMissKind({ missKinds: [] }), null);
});

test('the tally is written on a miss, never on a clean answer', () => {
    const doc = {};
    assert.strictEqual(applyTally(doc, 'order', 'missed'), 'order');
    applyTally(doc, 'order', 'revealed');
    applyTally(doc, 'ending', 'hinted');
    assert.strictEqual(doc.lastMissKind, 'ending');
    assert.strictEqual(doc.missKinds.get('order'), 2);
    assert.strictEqual(doc.missKinds.get('ending'), 1);

    const clean = {};
    assert.strictEqual(applyTally(clean, 'order', 'unaided'), null, 'unaided means there was no miss');
    assert.deepStrictEqual(clean, {});
    assert.strictEqual(applyTally({}, 'nonsense', 'missed'), null);
});

test('a row with no history reports none — "not classified" is not "no mistakes"', () => {
    assert.deepStrictEqual(missHistory({ word: 'Hoguttene' }), {});
    assert.deepStrictEqual(missHistory({ missKinds: {} }), {});
    assert.deepStrictEqual(
        missHistory({ lastMissKind: 'order', missKinds: { order: 3 } }),
        { lastMissKind: 'order', missKinds: { order: 3 } }
    );
    assert.deepStrictEqual(
        missHistory({ lastMissKind: 'ending', missKinds: new Map([['ending', 2]]) }),
        { lastMissKind: 'ending', missKinds: { ending: 2 } },
        'a Mongoose Map and a lean POJO read the same'
    );
    assert.deepStrictEqual(missHistory({ lastMissKind: 'made-up' }), {}, 'unknown names are dropped');
});

test('the profile is most frequent first, with each kind\'s share of all misses', () => {
    const out = profilePayload([
        { kind: 'ending', count: 3, lastSeen: new Date(2), recentWords: ['Manege'] },
        { kind: 'order', count: 6, lastSeen: new Date(1), recentWords: ['a', 'b', 'c', 'd', 'e', 'f'] },
        { kind: 'nope', count: 99 },
    ]);
    assert.deepStrictEqual(out.map(o => o.kind), ['order', 'ending']);
    assert.strictEqual(out[0].share, 0.667);
    assert.strictEqual(out[1].share, 0.333);
    assert.strictEqual(out[0].label, 'Word order');
    assert.strictEqual(out[0].recentWords.length, 5, 'the last five only');
    assert.deepStrictEqual(profilePayload([]), []);
});

/* ── The route, with the models faked ────────────────────────────────────── */

/* Enough of a Mongo filter for these routes: equality, plus the `$ne` the
   words/phrases split uses and the `$lte` the due queue uses. */
const match = (d, f) => Object.entries(f).every(([k, v]) => {
    if (v && typeof v === 'object' && !(v instanceof Date)) {
        if ('$ne' in v) return String(d[k]) !== String(v.$ne);
        if ('$lte' in v) return d[k] !== undefined && new Date(d[k]) <= new Date(v.$lte);
        return true;
    }
    return String(d[k]) === String(v);
});
const wordRows = [];
const kindRows = [];

function LearnedWord(doc) {
    Object.assign(this, { reviews: 0, lapses: 0, box: 0, ...doc });
    this.save = async () => { if (!wordRows.includes(this)) wordRows.push(this); return this; };
}
LearnedWord.findOne = async (filter) => wordRows.find(r => match(r, filter)) || null;
LearnedWord.find = (filter) => ({
    sort: () => ({
        limit: () => ({ lean: async () => wordRows.filter(r => match(r, filter)) }),
        lean: async () => wordRows.filter(r => match(r, filter)),
    }),
});

const MissKindStat = {
    updateOne: async (filter, update) => {
        let d = kindRows.find(r => match(r, filter));
        if (!d) { d = { ...filter, count: 0, recentWords: [] }; kindRows.push(d); }
        for (const [k, v] of Object.entries(update.$inc || {})) d[k] = (d[k] || 0) + v;
        Object.assign(d, update.$set || {});
        for (const [k, p] of Object.entries(update.$push || {})) {
            d[k] = [...(d[k] || []), ...p.$each].slice(p.$slice);
        }
        return { acknowledged: true };
    },
    find: (filter) => ({ limit: () => ({ lean: async () => kindRows.filter(r => match(r, filter)) }) }),
};

const stub = (rel, exports) => {
    const file = require.resolve(path.join(__dirname, '..', rel));
    require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub('models/User', {});
stub('models/LearnedWord', LearnedWord);
stub('models/Confusion', {});
stub('models/MissedScreen', {});
stub('models/SkillStat', {});
stub('models/MissKindStat', MissKindStat);
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

const review = (base, body) => post(`${base}/review`, { lang: 'Kannada', ...body });

test('a review carrying a miss kind schedules as before and records why', async () => {
    await withServer(async (base) => {
        /* Farhaan's answer: every word right, the last two swapped. */
        const r = await review(base, { word: 'Hoguttene', outcome: 'missed', missKind: 'order' });
        assert.strictEqual(r.status, 200);
        /* Box 0 because the row is new, not because the kind was ignored:
           the demotion is floored at 0. srsMissKind.test.js has the case
           where it matters. */
        assert.strictEqual(r.body.box, 0);
        assert.strictEqual(r.body.missKind, 'order');
        assert.strictEqual(wordRows[0].lastMissKind, 'order');
        assert.strictEqual(wordRows[0].missKinds.get('order'), 1);
        assert.strictEqual(kindRows.length, 1);
        assert.deepStrictEqual(
            { kind: kindRows[0].kind, count: kindRows[0].count, recentWords: kindRows[0].recentWords },
            { kind: 'order', count: 1, recentWords: ['Hoguttene'] }
        );
    });
});

test('an old client sends no kind, and the review is identical to today\'s', async () => {
    await withServer(async (base) => {
        const before = kindRows.length;
        const r = await review(base, { word: 'Nanage', outcome: 'hinted' });
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.missKind, undefined);
        assert.strictEqual(kindRows.length, before, 'nothing written without a kind');
        const row = wordRows.find(w => w.word === 'Nanage');
        assert.strictEqual(row.lastMissKind, undefined);
        assert.strictEqual(row.missKinds, undefined, 'no empty tally on a row that never had one');
    });
});

test('a kind this server has never heard of does not fail the review', async () => {
    await withServer(async (base) => {
        const r = await review(base, { word: 'Beku', outcome: 'missed', missKind: 'tone-sandhi' });
        assert.strictEqual(r.status, 200, 'the schedule is the contract; an unknown kind is dropped');
        assert.strictEqual(r.body.missKind, undefined);
        assert.strictEqual(wordRows.find(w => w.word === 'Beku').lastMissKind, undefined);
    });
});

test('a clean answer never records a kind, even if one is sent', async () => {
    await withServer(async (base) => {
        const before = kindRows.reduce((n, d) => n + d.count, 0);
        const r = await review(base, { word: 'Illa', outcome: 'unaided', missKind: 'order' });
        assert.strictEqual(r.body.box > 0, true);
        assert.strictEqual(r.body.missKind, undefined);
        assert.strictEqual(kindRows.reduce((n, d) => n + d.count, 0), before);
    });
});

test('the profile reads back per language, most frequent first', async () => {
    await withServer(async (base) => {
        await review(base, { word: 'Hoguttene', outcome: 'missed', missKind: 'order' });
        await review(base, { word: 'Manege', outcome: 'missed', missKind: 'ending' });
        await review(base, { word: 'Oota', outcome: 'missed', missKinds: ['unknown', 'order'] });
        await post(`${base}/review`, { lang: 'Telugu', word: 'Naaku', outcome: 'missed', missKind: 'confusion' });

        const kn = await get(`${base}/miss-kinds?lang=Kannada`);
        assert.deepStrictEqual(kn.map(k => [k.kind, k.count]), [['order', 3], ['ending', 1]]);
        assert.strictEqual(kn[0].share, 0.75);
        assert.deepStrictEqual(kn[0].recentWords, ['Hoguttene', 'Hoguttene', 'Oota']);

        const te = await get(`${base}/miss-kinds?lang=Telugu`);
        assert.deepStrictEqual(te.map(k => k.kind), ['confusion'], 'one language at a time');
        const bad = await fetch(`${base}/miss-kinds`);
        assert.strictEqual(bad.status, 400);
    });
});

test('the word row carries its own history into /due and /vocab', async () => {
    await withServer(async (base) => {
        const row = wordRows.find(w => w.word === 'Hoguttene');
        row.dueAt = new Date(0);
        row.lang = 'Kannada';
        const due = await get(`${base}/due?lang=Kannada&limit=10`);
        const hit = due.find(w => w.word === 'Hoguttene');
        assert.strictEqual(hit.lastMissKind, 'order');
        assert.strictEqual(hit.missKinds.order, 2, 'this row\'s own two order misses, not the profile\'s three');
        const vocab = await get(`${base}/vocab?lang=Kannada`);
        assert.strictEqual(vocab.words.find(w => w.word === 'Nanage').lastMissKind, undefined);
    });
});

test('the route feeds the kind to the ladder: an order miss drops one rung', async () => {
    await withServer(async (base) => {
        /* Climb first — a new row sits in box 0, where the demotion is
           invisible. Two clean answers put it in box 4. */
        await review(base, { word: 'Aamele', outcome: 'unaided' });
        const up = await review(base, { word: 'Aamele', outcome: 'unaided' });
        assert.strictEqual(up.body.box, 4);
        assert.strictEqual(up.body.lapses || 0, 0);

        /* Farhaan's miss: every word right, the last two swapped. */
        const r = await review(base, { word: 'Aamele', outcome: 'missed', missKind: 'order' });
        assert.strictEqual(r.body.box, 3, 'one rung down, not back to the bottom');
        assert.strictEqual(r.body.lapses || 0, 0, 'a word that was recalled did not lapse');
        assert.strictEqual(r.body.missKind, 'order');

        /* The same word, forgotten outright, still resets. */
        const r2 = await review(base, { word: 'Aamele', outcome: 'missed', missKind: 'missing-word' });
        assert.strictEqual(r2.body.box, 0);
        assert.strictEqual(r2.body.lapses, 1);
    });
});
