import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/services/lessonEngine.js';

/* A vocab entry's `inflected` alts are forms, not spellings: the base may not
   stand in for them (2667628 / telugu-second-opinion.md), the other way round
   is untouched, and the miss is explained as the wrong form. */
const lessons = [{
    vocabulary: [
        { word: 'Akkada', meaning: 'There', alt: ['akkadiki'], inflected: ['akkadiki'],
          traps: [{ said: 'Akkada', form: 'akkadiki', why: 'Going TO a place takes -ki: {answer}.' }] },
        { word: 'Vellandi', meaning: 'Please go' },
        { word: 'Chudu', meaning: 'Look' },
    ],
    phrases: [{ correct: 'Akkadiki vellandi' }, { correct: 'Akkada chudu' }],
}];
const lex = E.buildLexicon(lessons);

test('the base form does not pass for an inflected one', () => {
    assert.equal(E.scoreAnswer('akkada vellandi', 'Akkadiki vellandi', [], lex).accepted, false);
    assert.equal(E.scoreAnswer('akkadiki vellandi', 'Akkadiki vellandi', [], lex).accepted, true);
});

test('the inflected form said for the base is left as it was', () => {
    assert.equal(E.scoreAnswer('akkadiki chudu', 'Akkada chudu', [], lex).accepted, true);
    assert.equal(E.scoreAnswer('akkada chudu', 'Akkada chudu', [], lex).accepted, true);
});

test('the miss is the authored trap, outlined before the reveal', () => {
    const help = E.missHelp('akkada vellandi', 'Akkadiki vellandi', { lexicon: lex, taughtLessons: lessons });
    assert.equal(help.kind, 'trap');
    assert.match(help.line, /takes -ki: A_______\./);
    assert.equal(help.scaffold, 'A_______ vellandi');
});

test('a trap with a `form` stays off answers that use the other form', () => {
    assert.deepEqual(E.trapsFor('Akkada chudu', lessons), []);
    assert.equal(E.trapsFor('Akkadiki vellandi', lessons).length, 1);
});

test('explainMiss (chat) names the wrong form instead of "leaves it out"', () => {
    assert.equal(E.explainMiss('akkada vellandi', 'Akkadiki vellandi', [], lex, { hideAnswer: true }),
        'Right word, wrong form: akkada does not fit here. This needs A_______.');
});
