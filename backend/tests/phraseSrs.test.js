/* Phrases share LearnedWord with words. Their keys must never collide with a
   word's, and every "words" reader must exclude them. Run: node --test backend/tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert');
const { reviewKey, kindFilter } = require('../services/srs');

test('a word keeps its old key; a phrase is prefixed and punctuation-free', () => {
    assert.strictEqual(reviewKey('Namaskaram', 'word'), 'namaskaram');
    assert.strictEqual(reviewKey('Namaskaram'), 'namaskaram');
    assert.strictEqual(reviewKey('Meeru ela unnaru?', 'phrase'), 'phrase:meeru ela unnaru');
    assert.strictEqual(reviewKey('Namaskaram, nenu bagunnanu', 'phrase'), 'phrase:namaskaram nenu bagunnanu');
    // a one-word drill answer never lands on the word's row
    assert.notStrictEqual(reviewKey('Yaavaga?', 'phrase'), reviewKey('Yaavaga?', 'word'));
    assert.strictEqual(reviewKey('  ?! ', 'phrase'), '');
});

test('due/vocab default to words; kind=phrase asks for phrases only', () => {
    assert.deepStrictEqual(kindFilter(undefined), { kind: { $ne: 'phrase' } });
    assert.deepStrictEqual(kindFilter('word'), { kind: { $ne: 'phrase' } });
    assert.deepStrictEqual(kindFilter('phrase'), { kind: 'phrase' });
});
