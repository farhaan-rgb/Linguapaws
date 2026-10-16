/* Skill tagging and attribution, on the real misses of the week of 2026-10-12.
   Run: node --test tests/*.test.mjs */
import test from 'node:test';
import assert from 'node:assert';
import { CURRICULUM, WORD_FAMILIES, KNOWN_WORDS, WORD_ENDINGS } from '../src/services/curriculum.js';
import * as engine from '../src/services/lessonEngine.js';
import { buildLessonSteps, contrastItem } from '../src/services/stepPlan.js';
import { tagStep, skillEvidence, skillsFor, outcomeOf, WEIGHTS } from '../src/services/skills.js';

const lang = 'Kannada';
function screen(n, expected) {
    const lessons = CURRICULUM[lang].slice(0, n);
    const step = buildLessonSteps(lessons[n - 1], null, lessons).find(s => s.expected === expected);
    assert.ok(step, `L${n} has a screen for ${expected}`);
    const lexicon = engine.buildLexicon(lessons);
    const help = (said) => engine.missHelp(said, expected, {
        variants: step.variants, lexicon, taughtLessons: lessons, families: WORD_FAMILIES[lang],
        meaning: step.drill?.meaning || '', knownWords: KNOWN_WORDS[lang], endings: WORD_ENDINGS[lang], language: lang,
    });
    const evidence = (outcome, saids = [], opts = {}) => {
        const attempts = saids.map(said => ({ said, spoken: !!opts.spoken, help: help(said) }));
        const out = skillEvidence({ step, lang, lessonNo: n, outcome, attempts, lexicon, finalSpoken: !!opts.finalSpoken });
        return Object.fromEntries(out.map(e => [e.skillId, e]));
    };
    return { step, evidence };
}

test('tags: words, endings, constructions and order come from the answer', () => {
    const { step } = screen(15, 'Nanage neeru beku');
    assert.deepStrictEqual(tagStep(step, { lang, lessonNo: 15 }).skills.sort(),
        ['c:nanage-want', 'order', 'w:beku', 'w:nanage', 'w:neeru'].sort());
    const t = tagStep(screen(13, 'Naanu manege hode').step, { lang, lessonNo: 13 });
    assert.ok(t.skills.includes('e:ge') && t.skills.includes('w:mane') && t.skills.includes('c:past'));
    /* A teach screen asks for one word: no order skill. */
    assert.ok(!tagStep(screen(8, 'Hoovu').step, { lang, lessonNo: 8 }).skills.includes('order'));
    /* A contrast screen tags both words. */
    const lessons = CURRICULUM[lang].slice(0, 5);
    const [c] = buildLessonSteps({ vocabulary: [] }, [contrastItem({ said: 'Nimma', needed: 'Avara' })], lessons);
    assert.deepStrictEqual(tagStep(c, { lang, lessonNo: 5 }).skills, ['w:nimma', 'w:avara']);
});

test('taxonomy: every word, ending and construction, each with the lesson that first tests it', () => {
    const k = skillsFor(lang);
    assert.strictEqual(k.get('e:galu').lesson, 8);
    assert.strictEqual(k.get('w:hoovu').type, 'word');
    assert.strictEqual(k.get('c:nanage-want').lesson, 15);
    assert.strictEqual(k.get('c:continuous').lesson, 11);
    for (const s of k.values()) assert.ok(s.label && s.lesson >= 1, `${s.id} has a label and a lesson`);
});

test('Hoovegalu for Hoovu: the -galu ending is charged, not the word', () => {
    const e = screen(8, 'Hoovu').evidence('revealed', ['Hoovegalu']);
    assert.strictEqual(e['e:galu'].score, 0);
    assert.ok(e['w:hoovu'].score > 0.3, 'the word itself is not marked as failed outright');
});

test('Snehitagalu for Snehitaru: -aru needed (full), -galu misused (half), the stem known', () => {
    const e = screen(8, 'Snehitaru').evidence('revealed', ['Snehitagalu']);
    assert.strictEqual(e['e:aru'].score, 0);
    assert.strictEqual(e['e:galu'].score, 0);
    assert.ok(e['e:aru'].weight > e['e:galu'].weight);
    assert.strictEqual(e['w:snehita'].score, 1);
});

test('Nanna beda bad oota for Ketta oota beda: ketta left in English, order off, oota and beda right', () => {
    const e = screen(9, 'Ketta oota beda').evidence('revealed', ['Nanna beda bad oota']);
    assert.strictEqual(e['w:ketta'].score, 0);
    assert.ok(e.order.score < 0.5, 'beda before oota is an order miss among the words that are there');
    assert.strictEqual(e['w:oota'].score, 1);
    assert.strictEqual(e['w:beda'].score, 1);
});

test('Ivatte naanu kesala hogittene: maaduttiddene (and its construction) charged, hoguttene the partner, spelling small', () => {
    const e = screen(12, 'Ivattu naanu kelasa maaduttiddene').evidence('revealed', ['Ivatte naanu kesala hogittene']);
    assert.strictEqual(e['w:maaduttiddene'].score, 0);
    assert.strictEqual(e['c:continuous'].score, 0);
    assert.strictEqual(e['w:hoguttene'].score, 0);
    assert.ok(e['w:hoguttene'].weight < e['w:maaduttiddene'].weight);
    /* Spelling: ivatte / kesala are the words, misspelt — less than a wrong word. */
    assert.ok(e['w:ivattu'].score < 1 && e['w:kelasa'].score < 1);
    assert.strictEqual(e['w:naanu'].score, 1);
});

test('Naanu for Nanage: nanage and the nanage-want construction charged, naanu the partner', () => {
    const e = screen(15, 'Nanage neeru beku').evidence('revealed', ['Naanu neeru beku']);
    assert.strictEqual(e['w:nanage'].score, 0);
    assert.strictEqual(e['c:nanage-want'].score, 0);
    assert.strictEqual(e['w:naanu'].score, 0);
    assert.strictEqual(e['w:neeru'].score, 1);
    assert.ok(!e.order || e.order.score === 1, 'the order was right');
});

test('a word-order miss charges the order skill and no word', () => {
    const e = screen(13, 'Naanu manege hode').evidence('revealed', ['Naanu hode manege']);
    assert.strictEqual(e.order.score, 0);
    for (const id of ['w:naanu', 'w:mane', 'w:hode', 'c:past']) assert.strictEqual(e[id].score, 1, id);
});

test('outcomes: first try credits every tag; helped, after-miss and don\'t-know as stated', () => {
    const s = screen(15, 'Nanage neeru beku');
    const first = s.evidence('first');
    assert.ok(Object.values(first).every(x => x.score === 1 && x.weight === WEIGHTS.firstTry * WEIGHTS.phase.phrase));
    assert.ok(Object.values(s.evidence('helped')).every(x => x.score === 0.5));
    assert.ok(Object.values(s.evidence('dont-know')).every(x => x.score === 0));
    assert.strictEqual(outcomeOf({ correct: false, attempts: 0 }), 'dont-know');
    assert.strictEqual(outcomeOf({ correct: true, misses: 1 }), 'after-miss');
    assert.strictEqual(outcomeOf({ correct: true, helped: true }), 'helped');
});

test('spoken answers count less, and a spoken miss nowhere near the answer counts ~nothing', () => {
    const s = screen(15, 'Nanage neeru beku');
    const typed = s.evidence('revealed', ['Naanu neeru beku']);
    const spoken = s.evidence('revealed', ['Naanu neeru beku'], { spoken: true });
    assert.ok(spoken['w:nanage'].weight < typed['w:nanage'].weight);
    const far = s.evidence('revealed', ['the weather is lovely today isnt it'], { spoken: true });
    const farTyped = s.evidence('revealed', ['the weather is lovely today isnt it']);
    assert.ok(far['w:nanage'].weight < farTyped['w:nanage'].weight);
    const firstSpoken = s.evidence('first', [], { finalSpoken: true });
    assert.strictEqual(firstSpoken['w:nanage'].weight, WEIGHTS.spoken * WEIGHTS.phase.phrase);
});

test('teach screens and re-asks weigh less', () => {
    const teach = screen(8, 'Hoovu').evidence('first');
    assert.strictEqual(teach['w:hoovu'].weight, WEIGHTS.phase.teach);
    const { step } = screen(15, 'Nanage neeru beku');
    const lessons = CURRICULUM[lang].slice(0, 15);
    const out = skillEvidence({ step: { ...step, retry: 1 }, lang, lessonNo: 15, outcome: 'first', lexicon: engine.buildLexicon(lessons) });
    assert.ok(out.every(e => e.weight === WEIGHTS.phase.phrase * WEIGHTS.reask));
});
