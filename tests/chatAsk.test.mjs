/* Chat's question path, round t2130 (Telugu L21-30). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { asksForTheAnswer, notTaughtAnswer, stemAnswer, lastMissOf, wordsAskedAbout } from '../src/services/courseFacts.js';
import { tipSegments, speechTextFor } from '../src/services/speechScript.js';

const askMiko = createRequire(import.meta.url)('../backend/services/askMiko.js');
const ask = (body) => askMiko.readAsk({ lang: 'Telugu', question: 'why?', ...body });

test('a long "I don\'t know" asks for the answer; a why question does not', () => {
    assert.equal(asksForTheAnswer("i really don't remember, can you tell me?"), true);
    assert.equal(asksForTheAnswer('can you tell me why?'), false);
    assert.deepEqual(wordsAskedAbout("i really don't remember, can you tell me?", 'Telugu', 25)
        .filter(e => e.word === 'Telupu'), []);
});

test('"what is the word for agree?" is answered, not refused', () => {
    assert.match(notTaughtAnswer('what is the word for agree?', 'Telugu', 28, { prompt: "Say 'Okay, I agree'" }),
        /hasn't taught a word for “agree”/);
    assert.equal(notTaughtAnswer('what is the word for fear?', 'Telugu', 28), '');
});

test('"is it thin or tin?" is answered from the spelling', () => {
    assert.match(stemAnswer('so is it thin or tin?', 'Telugu', 22, { expected: 'Thinali', reveal: true }), /^\*Thinali\* starts \*thin-\*/);
    assert.equal(stemAnswer('so is it thin or tin?', 'Telugu', 22, { expected: 'Thinali', reveal: false }), '');
});

test('the last miss is read off the transcript', () => {
    const m = lastMissOf([{ role: 'user', content: 'bagundi kada' },
        { role: 'assistant', content: 'Not quite. bagundi means "It is good" — here you want the word for "Good".' }]);
    assert.equal(m.attempt, 'bagundi kada');
    assert.match(m.reason, /^bagundi means/);
});

test('redaction masks only what the learner has not got', () => {
    // L29: kada was in the rejected attempt — never masked; the grader's verdict is in the prompt.
    const a = ask({ lessonIdx: 28, expected: 'Manchi, kada?', attempt: 'bagundi kada', missReason: 'bagundi means "It is good"' });
    assert.equal(askMiko.redactAnswer('*Kada* means right?', a).text, '*Kada* means right?');
    assert.match(askMiko.buildAskMessages(a)[0].content, /REJECTED/);
    // L23: nenu is a lesson-1 word inside a sentence answer.
    const b = ask({ lessonIdx: 22, expected: 'Nenu Telugu matladali' });
    assert.match(askMiko.redactAnswer('Use *nenu* here.', b).text, /\*nenu\*/);
    // A one-word review answer stays masked, even one the tutor said lately.
    const c = ask({ lessonIdx: 25, expected: 'Bhayam', known: ['bhayam'] });
    assert.match(askMiko.redactAnswer('It is *bhayam*.', c).text, /B_____/);
});

test('read-aloud: masks, slots and English emphasis', () => {
    const v = (l) => tipSegments('Telugu', l).map(g => (g.target ? `‹${g.text}›` : g.text)).join(' | ');
    assert.match(v('*K___* means “right?”'), /^a word starting with K means/);
    assert.match(v('A trip is something you *do*, not somewhere you go: *prayanam chestunnanu*.'), /^A trip is something you do,/);
    assert.match(v("Miko is late. Phone and ask 'Are you on the bus?'"), /^Miko is late\./);
    assert.doesNotMatch(speechTextFor('Telugu', 'Namaskaram, naa peru [name]'), /\[name\]/);
});
