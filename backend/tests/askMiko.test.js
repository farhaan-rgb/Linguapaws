/* Ask Miko: the route with auth stubbed and the model swapped for a canned
   reply, so nothing touches a database or the network.
   Run from backend/: node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const express = require('express');

const stub = (rel, exports) => {
    const file = require.resolve(path.join(__dirname, '..', rel));
    require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub('models/User', {});
stub('middleware/auth', (req, res, next) => { req.user = { _id: req.headers['x-user'] || 'u1' }; next(); });
const router = require('../routes/ai');
const askMiko = require('../services/askMiko');

let lastMessages = null;
let canned = '';
router.generate = async (messages) => { lastMessages = messages; return canned; };

async function withServer(fn) {
    const app = express();
    app.use(express.json());
    app.use('/api/ai', router);
    const server = app.listen(0);
    try { await fn(`http://127.0.0.1:${server.address().port}/api/ai/ask`); } finally { server.close(); }
}
const post = (url, body, user = 'u1') => fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user': user }, body: JSON.stringify(body),
}).then(async r => ({ status: r.status, body: await r.json() }));

const IDE = {
    question: "Why isn't it just Mane ide if ide means there is?",
    lang: 'Kannada', lessonIdx: 2, prompt: 'Ide', expected: 'Ide', answerShown: true,
    examples: [{ correct: 'Mane alli ide', meaning: 'The house is there' }],
};

test('the screen, its example and the course facts for its words reach the model', async () => {
    askMiko.resetRateLimit();
    canned = 'English uses "there" two ways.';
    await withServer(async (url) => {
        const r = await post(url, IDE);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.answer, canned);
        const sys = lastMessages[0].content;
        assert.match(sys, /"Mane alli ide" = "The house is there"/);
        assert.match(sys, /Alli \(lesson 3\) means "There"/);
        assert.match(sys, /The answer on this screen is "Ide"/);
        assert.strictEqual(lastMessages[1].content, IDE.question);
    });
});

test('an unsettled screen never sends its answer, and a reply that names it is cut to the outline', async () => {
    askMiko.resetRateLimit();
    canned = 'To say want, use *Beku*. For example, neeru beku. ಬೇಕು is the script.';
    await withServer(async (url) => {
        const r = await post(url, {
            question: 'how do you say Want?', lang: 'Kannada', lessonIdx: 3,
            prompt: 'Want', expected: 'Beku', answerShown: false,
        });
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.redacted, true);
        assert.doesNotMatch(r.body.answer, /beku|ಬೇಕು/i);
        assert.match(r.body.answer, /\*B___\*/);
        assert.match(lastMessages[0].content, /has NOT answered this screen yet/);
        assert.doesNotMatch(lastMessages[0].content, /The answer on this screen/);
    });
});

test('a settled screen is answered as written', async () => {
    askMiko.resetRateLimit();
    canned = '*Beku* means want.';
    await withServer(async (url) => {
        const r = await post(url, { question: 'what is beku', lang: 'Kannada', lessonIdx: 3, expected: 'Beku', answerShown: true });
        assert.strictEqual(r.body.answer, canned);
        assert.strictEqual(r.body.redacted, false);
    });
});

test('over 300 characters is refused, and so is the seventh question in a minute', async () => {
    askMiko.resetRateLimit();
    canned = 'ok';
    await withServer(async (url) => {
        const long = await post(url, { ...IDE, question: 'a'.repeat(301) });
        assert.strictEqual(long.status, 400);
        const codes = [];
        for (let i = 0; i < 7; i++) codes.push((await post(url, IDE, 'u2')).status);
        assert.deepStrictEqual(codes, [200, 200, 200, 200, 200, 200, 429]);
        assert.strictEqual((await post(url, IDE, 'u3')).status, 200);
    });
});
