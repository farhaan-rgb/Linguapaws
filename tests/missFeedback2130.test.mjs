import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/services/lessonEngine.js';
import { CURRICULUM, WORD_ENDINGS } from '../src/services/curriculum.js';

/* Step-mode miss lines from the Telugu L21-30 playtest (t2130-s-*). Run
   against the real course, the way Steps.jsx calls missHelp. */
const lessons = CURRICULUM.Telugu;
const lexicon = E.buildLexicon(lessons);
const help = (said, expected, lessonNo, extra = {}) => E.missHelp(said, expected, {
    lexicon, taughtLessons: lessons.slice(0, lessonNo), language: 'Telugu',
    endings: WORD_ENDINGS.Telugu, reveal: false, ...extra,
}).line || '';

test('a different taught word, written exactly, is explained by meaning, not as a typo', () => {
    const line = help('idhi ledu adhi', 'Idhi leda adhi?', 24, { meaning: 'This or that?', hint: 'This + or + that?' });
    assert.match(line, /^\*Ledu\* means “no or not”\. This asks for “or”: L___\.$/);
    assert.doesNotMatch(line, /idhi|spelling/i);
});

test('a word the hint asks for is never called extra', () => {
    const line = help('i dont know coffee, you havent taught me it. coffee mariyu neeru kaavali',
        'Coffee, neeru kaavali', 24, { variants: ['naaku coffee, neeru kaavali'], meaning: 'Coffee and water want', hint: 'Coffee + and + water + want' });
    assert.doesNotMatch(line, /leaves it out/);
    assert.match(line, /\*coffee mariyu neeru kaavali\*/);
});

test('okati before a noun names the rule; the line uses the word the learner wrote', () => {
    assert.equal(help('adhi okati laksha', 'Adhi oka laksha', 27, { meaning: 'That is 1 lakh' }),
        'Before a noun, “one” is o__; *okati* is for counting.');
    const l30 = help('oka vanda rupayalu', 'Vanda rupayalu', 30, { meaning: 'One hundred rupees', hint: 'Hundred + rupees' });
    assert.doesNotMatch(l30, /okati/i);
});

test('a one-word answer is not handed over by its other meaning on a first miss', () => {
    assert.doesNotMatch(E.explainMiss('kada', 'Adhi', [], lexicon), /That/);
    assert.match(help('kada', 'Adhi', 29), /A___/);
});

test('no spelling note between the course\'s own t/th spellings; pye-nuh spellings are a slip', () => {
    assert.equal(E.spellingNote('neeru unte nenu thintanu', 'Neeru unte nenu tintanu', [], lexicon), '');
    assert.equal(E.spellingNote('tinte', 'Thinte', [], lexicon), '');
    assert.ok(E.scoreAnswer('pyna', 'Paina', [], lexicon).accepted);
});

test('accepted extra words are echoed back, and "like you did here" only when true', () => {
    const d = E.answerDiff('naaku neeru mariyu annam kaavali', 'Neeru, annam kaavali', ['naaku neeru, annam kaavali'], lexicon);
    assert.deepEqual(d.words.map(w => w.text), ['naaku', 'neeru', 'mariyu', 'annam', 'kaavali']);
    assert.equal(E.answerDiff('neeru annam kaavali', 'Neeru, annam kaavali', [], lexicon), null);
    const note = '*Mariyu* is formal. In everyday speech people just list things with no “and”, like you did here.';
    assert.doesNotMatch(E.noteForAnswer(note, 'naaku neeru mariyu annam kaavali', 'Neeru, annam kaavali'), /like you did/);
    assert.match(E.noteForAnswer(note, 'neeru annam kaavali', 'Neeru, annam kaavali'), /like you did here/);
});

test('a miss is explained against the nearest accepted form, so a right word is not listed as wrong', () => {
    const line = help('eeroju chala vedi undi', 'Eeroju chala enda', 28,
        { variants: ['eeroju chala enda undi'], meaning: 'Today very hot', hint: 'Today + very + heat' });
    assert.doesNotMatch(line, /Undi/);
    assert.match(line, /^\*Vedi\* means “hot”/);
});
