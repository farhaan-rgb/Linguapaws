/* The home page summary: counts from LearnedWord, lessonProgress and SkillStat,
   with every model and auth mocked so nothing touches a database.
   Run from backend/: node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const express = require('express');
require('express-async-errors');
const { summaryPayload } = require('../services/progressSummary');

const past = new Date(Date.now() - 60000);
const future = new Date(Date.now() + 86400000);
const words = [
    { userId: 'u1', lang: 'Kannada', kind: 'word', dueAt: past },
    { userId: 'u1', lang: 'Kannada', dueAt: future },               // older row: no kind = word
    { userId: 'u1', lang: 'Kannada', kind: 'phrase', dueAt: past },
    { userId: 'u1', lang: 'Telugu', kind: 'word', dueAt: past },
    { userId: 'u2', lang: 'Kannada', kind: 'word', dueAt: past },
];
const skills = [
    { userId: 'u1', lang: 'Kannada', mastery: 0.9, evidence: 3 },  // strong
    { userId: 'u1', lang: 'Kannada', mastery: 0.6, evidence: 3 },  // learning
    { userId: 'u1', lang: 'Kannada', mastery: 0.3, evidence: 2 },  // weak
    { userId: 'u1', lang: 'Kannada', mastery: 0.9, evidence: 0.5 },// new: too little evidence
];
const chain = (rows) => (filter) => {
    const res = async () => rows.filter(r => Object.entries(filter).every(([k, v]) => r[k] === v));
    const q = { select: () => q, limit: () => q, lean: res };
    return q;
};
const stub = (rel, exports) => {
    const file = require.resolve(path.join(__dirname, '..', rel));
    require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub('models/User', { findById: () => ({ select: () => ({ lean: async () => ({ lessonProgress: { Kannada: 12 } }) }) }) });
stub('models/LearnedWord', { find: chain(words) });
stub('models/Confusion', {});
stub('models/MissedScreen', {});
stub('models/SkillStat', { find: chain(skills) });
stub('middleware/auth', (req, res, next) => { req.user = { _id: 'u1' }; next(); });
const router = require('../routes/progress');

async function withServer(fn) {
    const app = express();
    app.use('/api/progress', router);
    const server = app.listen(0);
    try { await fn(`http://127.0.0.1:${server.address().port}/api/progress`); } finally { server.close(); }
}

test('summary: lessonProgress is an index, so 12 means 13 lessons done', () => {
    assert.strictEqual(summaryPayload({ lang: 'Kannada', user: { lessonProgress: { Kannada: 12 } } }).lessonsCompleted, 13);
    assert.strictEqual(summaryPayload({ lang: 'Telugu', user: { lessonProgress: new Map([['Kannada', 3]]) } }).lessonsCompleted, 0);
    assert.strictEqual(summaryPayload({ lang: 'Kannada', user: null }).lessonsCompleted, 0);
});

test('GET /summary counts only this learner in this language, words apart from phrases', async () => {
    await withServer(async (base) => {
        const body = await fetch(`${base}/summary?lang=Kannada`).then(r => r.json());
        assert.deepStrictEqual(body, {
            lang: 'Kannada', lessonsCompleted: 13, words: 2, wordsDue: 1, phrases: 1,
            skills: { strong: 1, learning: 1, weak: 1, new: 1, total: 4 },
        });
        const bad = await fetch(`${base}/summary`);
        assert.strictEqual(bad.status, 400);
    });
});
