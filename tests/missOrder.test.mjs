/**
 * The word-order miss line, and the gate on showing a grammar note while a
 * retry is still live.
 *
 * Both are message-only: nothing here touches a verdict. The cases are the
 * ones that have actually been got wrong — a two-clause sentence told "the
 * verb goes last" when it is only last in its own clause, and a note that
 * quotes the answer it is explaining.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/services/lessonEngine.js';

const KN = 'Naanu eega tinnuttiddene, aamele hoguttene';
const miss = (said, expected, variants = []) =>
    E.explainMiss(said, expected, variants, new Map(), { hideAnswer: true, clean: true });
const reveal = (said, expected, variants = []) =>
    E.explainMiss(said, expected, variants, new Map(), { hideAnswer: false, clean: true });

test('a verb out of place is named against its own clause, not the sentence', () => {
    const line = miss('naanu eega tinnuttiddene, hoguttene aamele', KN);
    assert.match(line, /hoguttene goes last in the second half/);
    assert.doesNotMatch(line, /goes last\./);
});

test('the same slip in the first clause says the first half', () => {
    // *Hoguttene* last in its clause, *tinnuttiddene* pushed off the end of its own.
    const line = miss('naanu tinnuttiddene eega, aamele hoguttene', KN);
    assert.match(line, /tinnuttiddene goes last in the first half/);
});

test('the clause rule holds when the clauses are the other way round', () => {
    // The mirror sentence: the same verb is NOT last, and "goes last" would be false.
    const flip = 'Aamele hoguttene, naanu eega tinnuttiddene';
    const line = miss('aamele hoguttene, naanu tinnuttiddene eega', flip);
    assert.match(line, /tinnuttiddene goes last in the second half/);
});

test('a one-clause answer is unchanged', () => {
    assert.equal(miss('ivvandi billu', 'Billu ivvandi'),
        'All the right words — the order is not. ivvandi goes last.');
});

test('a clause of one word has no internal order to talk about', () => {
    // *Okati, rendu, moodu* is three clauses of one word each.
    const line = miss('rendu okati moodu', 'Okati, rendu, moodu');
    assert.doesNotMatch(line, /half|part/);
});

test('the twin clause is named when the learner got the same shape right there', () => {
    assert.match(miss('naanu eega tinnuttiddene, hoguttene aamele', KN),
        /You did that with \*tinnuttiddene\* in the first half\./);
});

test('...and not when the other clause is out of order too', () => {
    const line = miss('eega naanu tinnuttiddene, hoguttene aamele', KN);
    assert.doesNotMatch(line, /You did that/);
});

test('...and not when both clauses end on the same word', () => {
    const same = 'Naanu eega hoguttene, aamele hoguttene';
    assert.doesNotMatch(miss('naanu eega hoguttene, hoguttene aamele', same) || '', /You did that/);
});

test('the revealed line keeps the comma the course writes', () => {
    assert.match(reveal('naanu eega tinnuttiddene, hoguttene aamele', KN),
        /: naanu eega tinnuttiddene, aamele hoguttene\./);
});

test('naanu nodide mane is still not told that naanu comes first', () => {
    const line = miss('naanu nodide mane', 'Naanu mane nodide');
    assert.doesNotMatch(line, /naanu comes first/);
});

test('a note that states the rule is shown on a miss', () => {
    assert.equal(E.noteGivesAnswer(
        '*Eega* is now, *aamele* is later. Each goes just before its own action word.',
        KN), false);
});

test('a note that quotes the answer is not', () => {
    assert.equal(E.noteGivesAnswer(
        'Question words usually come near the end in Telugu. So *idhi* or *adhi* starts the sentence and *emiti* (“what”) follows it.',
        'Idhi emiti?'), true);
    assert.equal(E.noteGivesAnswer(
        '*Ee pusthakam* is just “this book”, not a full sentence.',
        'Ee pusthakam'), true);
});
