/* Phrases on the SRS ladder: a due phrase takes at most one Memory-check slot,
   only from a finished earlier lesson, never the contrast's slot, and is graded
   by lessonEngine.scoreAnswer on the drill's own accepted forms. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM } from '../src/services/curriculum.js';
import { placeDuePhrases, phraseDrill, PHRASE_SLOTS_MAX } from '../src/services/phraseReview.js';
import { buildLessonSteps, missedKeyFor } from '../src/services/stepPlan.js';
import * as engine from '../src/services/lessonEngine.js';
const LEXICON = engine.buildLexicon(CURRICULUM.Telugu);

const lessons = CURRICULUM.Telugu;
const words = (li) => lessons[li].vocabulary.slice(0, 3).map(v => ({ word: v.word, meaning: v.meaning, source: 'due' }));
const row = (li, d) => ({ kind: 'phrase', word: d.correct, lessonIdx: li, phase: 'phrase' });
const l1Phrase = lessons[0].phrases[1];   // Meeru ela unnaru

test('a due phrase from a finished lesson takes the middle slot; the count stays three', () => {
    const set = placeDuePhrases(words(1), [row(0, l1Phrase)], { lang: 'Telugu', scenarioIdx: 2, completedIdx: 1 });
    assert.equal(set.length, 3);
    assert.equal(set[1].word, l1Phrase.correct);
    assert.deepEqual(set[1].phrase, { lessonIdx: 0, phase: 'phrase' });
    assert.equal(set.filter(i => i.phrase).length, 1);
});

test('at most one phrase, however many are due', () => {
    const due = lessons[0].phrases.map(d => row(0, d));
    const set = placeDuePhrases(words(1), due, { lang: 'Telugu', scenarioIdx: 2, completedIdx: 1 });
    assert.equal(set.filter(i => i.phrase).length, PHRASE_SLOTS_MAX);
});

test('never from this lesson, a later one, or an unfinished one', () => {
    const base = words(1);
    const own = lessons[2].phrases[0];
    assert.deepEqual(placeDuePhrases(base, [row(2, own)], { lang: 'Telugu', scenarioIdx: 2, completedIdx: 1 }), base);
    assert.deepEqual(placeDuePhrases(base, [row(5, lessons[5].phrases[0])], { lang: 'Telugu', scenarioIdx: 2, completedIdx: 1 }), base);
    // lesson 2 opened from the map with nothing finished
    assert.deepEqual(placeDuePhrases(base, [row(0, l1Phrase)], { lang: 'Telugu', scenarioIdx: 2, completedIdx: -1 }), base);
});

test('rows that are not phrases (an old server ignoring kind) are ignored', () => {
    const base = words(1);
    const set = placeDuePhrases(base, [{ word: l1Phrase.correct, lessonIdx: 0 }], { lang: 'Telugu', scenarioIdx: 2 });
    assert.deepEqual(set, base);
});

test('a lesson-top-up word gives way before a due word, and the last slot is never taken', () => {
    const base = [
        { word: 'Nenu', meaning: 'I', source: 'due' },
        { word: 'Meeru', meaning: 'You', source: 'due' },
        { word: 'Idhi', meaning: 'This', source: 'lesson' },
    ];
    const set = placeDuePhrases(base, [row(0, l1Phrase)], { lang: 'Telugu', scenarioIdx: 2, completedIdx: 1 });
    // only the middle is open; with the last protected, the middle due word goes
    assert.equal(set[1].word, l1Phrase.correct);
    assert.equal(set[2].word, 'Idhi');
});

test('the phrase review screen asks the meaning and grades on the drill\'s accepted forms', () => {
    const set = placeDuePhrases(words(1), [row(0, l1Phrase)], { lang: 'Telugu', scenarioIdx: 2, completedIdx: 1 });
    const steps = buildLessonSteps(lessons[2], set, lessons);
    const s = steps.find(x => x.kind === 'review' && x.item.phrase);
    assert.ok(s);
    assert.equal(s.expected, l1Phrase.correct);
    assert.deepEqual(s.variants, l1Phrase.acceptable);
    assert.match(s.prompt, /How are you/);
    for (const said of [l1Phrase.correct, ...l1Phrase.acceptable]) {
        assert.ok(engine.scoreAnswer(said, s.expected, s.variants, LEXICON).accepted, said);
    }
    assert.ok(!engine.scoreAnswer('nenu bagunnanu', s.expected, s.variants, LEXICON).accepted);
    assert.equal(missedKeyFor(s, 2), null, 'a lesson review is left to the SRS');
    // a contrast still takes the last slot and leaves the phrase alone
    const withPair = buildLessonSteps(lessons[2], set, lessons, { said: 'Nenu', needed: 'Meeru' });
    assert.equal(withPair.filter(x => x.kind === 'review').length, 3);
    assert.ok(withPair.some(x => x.item?.phrase));
});

test('every phrase and conversation line in the course resolves back to its drill', () => {
    for (const [lang, ls] of Object.entries(CURRICULUM)) {
        ls.forEach((l, li) => [...(l.phrases || []), ...(l.conversations || [])].forEach(d => {
            if (!d?.correct) return;
            assert.ok(phraseDrill(ls, li, d.correct), `${lang} L${li + 1} ${d.correct}`);
        }));
    }
});
