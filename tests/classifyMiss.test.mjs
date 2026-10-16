/**
 * `engine.classifyMiss` and `missHelp.missKind` — which KIND of mistake a
 * rejected answer was (MISS-TAXONOMY.md).
 *
 * Nothing here is on the grading path. Every case below is an answer
 * `scoreAnswer` has already rejected, and the first test asserts that, so a
 * future change that quietly turned one of these into an acceptance would be
 * caught rather than hidden behind a kind.
 *
 * The cases are real: all but two were harvested from the 306 lesson-sim
 * transcripts in `.lesson-sim/` and classified there.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/services/lessonEngine.js';
import { CURRICULUM, WORD_FAMILIES, KNOWN_WORDS, WORD_ENDINGS } from '../src/services/curriculum.js';
import { MISS_KINDS } from '../shared/missKinds.js';

const lexFor = (lang) => E.buildLexicon(CURRICULUM[lang] || []);
const LEX = { Kannada: lexFor('Kannada'), Telugu: lexFor('Telugu') };

/** The context a surface has: the lessons taught so far, and the rest. */
const optsFor = (lang, lessonNo, variants = [], meaning = '') => ({
    variants,
    lexicon: LEX[lang],
    taughtLessons: (CURRICULUM[lang] || []).slice(0, lessonNo),
    families: WORD_FAMILIES[lang] || [],
    knownWords: KNOWN_WORDS[lang] || [],
    endings: WORD_ENDINGS[lang] || null,
    language: lang,
    meaning,
});

const kind = (lang, lessonNo, said, expected, variants = [], meaning = '') =>
    E.classifyMiss(said, expected, optsFor(lang, lessonNo, variants, meaning));

/* Farhaan's answer, the case the whole taxonomy exists for. */
const KN12 = 'Naanu eega tinnuttiddene, aamele hoguttene';
const KN12_SAID = 'naanu eega tinnuttiddene, hoguttene aamele';

test('every case here is an answer the grader rejects', () => {
    const cases = [
        ['Kannada', KN12_SAID, KN12],
        ['Telugu', 'Unnaru meeru ela', 'Meeru ela unnaru'],
        ['Kannada', 'Snehitagalu', 'Snehitaru'],
        ['Kannada', 'Idu', 'Adu'],
        ['Telugu', 'Innam', 'Annam'],
        ['Kannada', 'Hesaru yenu?', 'Nimma hesaru yenu?'],
        ['Telugu', 'nenu adhi tvaraga chestunnanu', 'Nenu tvaraga chestunnanu'],
    ];
    for (const [lang, said, expected] of cases) {
        assert.equal(E.scoreAnswer(said, expected, [], LEX[lang]).accepted, false,
            `"${said}" should not be accepted for "${expected}"`);
    }
});

test("Farhaan's Kannada L12 answer is an order miss, not a forgotten word", () => {
    /* The engine always knew: orderMiss found the swap and the line said so
       out loud. It was `missHelp.kind: 'other'` that threw it away. */
    const help = E.missHelp(KN12_SAID, KN12, optsFor('Kannada', 12));
    assert.ok(E.orderMiss(KN12_SAID, KN12, [], LEX.Kannada), 'orderMiss still finds the swap');
    assert.equal(help.kind, 'other', 'the explanation template is unchanged');
    assert.equal(help.missKind, 'order');
    assert.equal(kind('Kannada', 12, KN12_SAID, KN12), 'order');
});

test('classifyMiss agrees with itself with and without a missHelp result', () => {
    /* Steps.jsx passes the help object it already has; Chat.jsx has none and
       the engine recomputes. The two surfaces must not disagree. */
    const opts = optsFor('Kannada', 12);
    const help = E.missHelp(KN12_SAID, KN12, opts);
    assert.equal(E.classifyMiss(KN12_SAID, KN12, { ...opts, help }),
        E.classifyMiss(KN12_SAID, KN12, opts));
});

test('a kind is always one of the eleven, and never null', () => {
    for (const k of [
        kind('Kannada', 12, KN12_SAID, KN12),
        kind('Telugu', 2, 'blorptastic zzz', 'Ee'),
        E.classifyMiss('', 'Namaskara', {}),
        E.classifyMiss('anything', '', {}),
    ]) assert.ok(MISS_KINDS.includes(k), `${k} is not a miss kind`);
});

test('nothing offered is blank', () => {
    assert.equal(E.classifyMiss('', KN12, optsFor('Kannada', 12)), 'blank');
    assert.equal(E.classifyMiss('   ', KN12, optsFor('Kannada', 12)), 'blank');
});

test('the other kinds fire on real transcript answers', () => {
    const cases = [
        /* order */
        ['Telugu', 1, 'Unnaru meeru ela', 'Meeru ela unnaru', 'order'],
        ['Telugu', 13, 'Nenu chusanu adhi', 'Nenu adhi chusanu', 'order'],
        /* ending: the right stem, the wrong ending */
        ['Kannada', 8, 'Snehitagalu', 'Snehitaru', 'ending'],
        ['Telugu', 26, 'Unnanu', 'Unnara', 'ending'],
        /* confusion: two taught words one edit apart, not a typo */
        ['Kannada', 2, 'Idu', 'Adu', 'confusion'],
        ['Telugu', 13, 'Chesanu', 'Chusanu', 'confusion'],
        /* spelling: a form the course does not teach at all */
        ['Telugu', 4, 'Innam', 'Annam', 'spelling'],
        /* missing-word: a word simply absent, nothing standing in for it */
        ['Kannada', 2, 'Hesaru yenu?', 'Nimma hesaru yenu?', 'missing-word'],
        /* extra-word: the whole answer and one word more */
        ['Telugu', 16, 'nenu adhi tvaraga chestunnanu', 'Nenu tvaraga chestunnanu', 'extra-word'],
    ];
    const got = cases.map(([lang, n, said, expected]) => kind(lang, n, said, expected));
    assert.deepEqual(got, cases.map((c) => c[4]),
        cases.map((c, i) => `${c[2]} -> ${c[3]}: ${got[i]} (wanted ${c[4]})`).join('\n'));
});

test('an answer with no context at all still classifies what it can', () => {
    /* A caller with only a lexicon — the worst case Chat can hit — must still
       get `order` and `blank`, which need no vocabulary knowledge. The lexical
       kinds degrade to `wrong-word`/`unknown`, which is honest. */
    assert.equal(E.classifyMiss(KN12_SAID, KN12, { lexicon: LEX.Kannada }), 'order');
    assert.equal(E.classifyMiss('', KN12, { lexicon: LEX.Kannada }), 'blank');
});
