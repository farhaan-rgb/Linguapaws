/* Adaptive selection (phase 2): practice and the Memory check aim at weak skills.
   Run: node --test tests/*.test.mjs */
import test from 'node:test';
import assert from 'node:assert';
import { CURRICULUM } from '../src/services/curriculum.js';
import { buildPracticeSteps, buildLessonSteps, PRACTICE_SIZE } from '../src/services/stepPlan.js';
import { selectAdaptive, modelMap, pickReviewItems, whyCaption, RETENTION_SHARE } from '../src/services/adaptive.js';
import { tagStep, skillEvidence } from '../src/services/skills.js';

const NOW = Date.parse('2026-10-16T00:00:00Z');
const weak = (skillId) => ({ skillId, mastery: 0.2, evidence: 3, level: 'weak', lastSeen: '2026-10-15' });
const strong = (skillId, lastSeen = '2026-10-14') => ({ skillId, mastery: 0.9, evidence: 5, level: 'strong', lastSeen });
const K = CURRICULUM.Kannada;
const STRONG = ['w:mane', 'w:hoovu', 'w:neeru', 'w:naanu', 'w:avaru', 'w:beku', 'w:illa', 'w:haudu'].map(id => strong(id));
const model = [weak('c:nanage-like'), weak('e:ge'), ...STRONG];
const plan = (seed = 7, extra = {}) => buildPracticeSteps({
    lessons: K, finishedIdx: K.length - 1, skills: model, seed, now: NOW, lang: 'Kannada', ...extra,
});

test('practice: weak skills (c:nanage-like, e:ge) are aimed at before strong ones', () => {
    const steps = plan();
    assert.strictEqual(steps.length, PRACTICE_SIZE);
    const hits = (id) => steps.filter(s => tagStep(s, { lang: 'Kannada', lessonNo: K.length }).skills.includes(id)).length;
    assert.ok(hits('c:nanage-like') >= 2, `nanage-like screens: ${hits('c:nanage-like')}`);
    assert.ok(hits('e:ge') >= 2, `-ge screens: ${hits('e:ge')}`);
    const weakPicks = steps.filter(s => s.adaptive?.level === 'weak').length;
    const strongPicks = steps.filter(s => s.adaptive?.level === 'strong').length;
    assert.ok(weakPicks > strongPicks, `${weakPicks} weak vs ${strongPicks} strong`);
});

test('practice: about a fifth of the session keeps strong skills warm', () => {
    const steps = plan();
    const strongPicks = steps.filter(s => s.adaptive?.level === 'strong').length;
    assert.ok(strongPicks >= Math.round(PRACTICE_SIZE * RETENTION_SHARE), `${strongPicks} retention screens`);
    assert.ok(strongPicks <= Math.ceil(PRACTICE_SIZE * 0.4), `${strongPicks} is more than retention`);
});

test('practice: no skill twice in a row where the plan has a choice', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
        const steps = plan(seed);
        steps.forEach((s, i) => {
            if (!i) return;
            const a = steps[i - 1].adaptive?.skill, b = s.adaptive?.skill;
            /* Allowed only where the next phase holds nothing else. */
            if (a && a === b) {
                const rest = steps.slice(i).filter(x => x.phase === s.phase);
                assert.ok(rest.every(x => x.adaptive?.skill === a), `seed ${seed}: ${a} back to back at ${i}`);
            }
        });
    }
});

test('practice: deterministic for a seed, grouped by phase, at most one caption per round', () => {
    assert.deepStrictEqual(plan(11).map(s => s.expected), plan(11).map(s => s.expected));
    const steps = plan(11);
    const order = ['review', 'phrase', 'conversation'];
    steps.forEach((s, i) => { if (i) assert.ok(order.indexOf(s.phase) >= order.indexOf(steps[i - 1].phase)); });
    for (const ph of order) assert.ok(steps.filter(s => s.phase === ph && s.why).length <= 1, ph);
    assert.ok(steps.some(s => s.why), 'a weak pick says why');
    assert.ok(steps.filter(s => s.why).every(s => s.adaptive.level === 'weak'), 'only weak picks say why');
});

test('practice: no model is the old plan, exactly', () => {
    const base = { lessons: K, finishedIdx: 5, seed: 3 };
    const a = buildPracticeSteps(base).map(s => s.expected);
    assert.deepStrictEqual(buildPracticeSteps({ ...base, skills: [] }).map(s => s.expected), a);
    assert.deepStrictEqual(buildPracticeSteps({ ...base, skills: null }).map(s => s.expected), a);
    assert.ok(buildPracticeSteps(base).every(s => !s.why));
});

test('practice: confused pairs always come, due words keep a share', () => {
    const due = ['Hoovu', 'Mane', 'Neeru', 'Illa'].map(word => ({ word }));
    const steps = plan(2, { due, confusions: [{ said: 'Naanu', needed: 'Nanage' }] });
    assert.strictEqual(steps.filter(s => s.practice === 'confusion').length, 1);
    assert.ok(steps.filter(s => s.practice === 'due').length >= 4, 'due words kept their 40%');
});

test('selectAdaptive: weak > learning > new > strong, retention share held', () => {
    const cands = [
        { key: 's1', skills: ['a'] }, { key: 's2', skills: ['a'] }, { key: 'n', skills: ['b'] },
        { key: 'l', skills: ['c'] }, { key: 'w', skills: ['d'] },
    ];
    const m = modelMap([strong('a'), { skillId: 'c', level: 'learning', mastery: 0.6, evidence: 2 }, weak('d')]);
    const got = selectAdaptive({ candidates: cands, model: m, size: 4, seed: 1, now: NOW });
    assert.deepStrictEqual(got.map(g => g.key).slice(0, 3), ['w', 'l', 'n']);
    assert.strictEqual(got.filter(g => g.adaptive.level === 'strong').length, 1);
    /* A strong skill not seen for weeks is decaying: treated as learning. */
    const stale = modelMap([strong('a', '2026-08-01')]);
    assert.strictEqual(selectAdaptive({ candidates: cands.slice(0, 1), model: stale, size: 1, now: NOW })[0].adaptive.level, 'learning');
});

test('memory check: same slot count, weak earlier words first, due honoured, no model = null', () => {
    const lesson = K[15];
    const stats = [weak('c:nanage-like'), weak('w:ishta'), ...STRONG];
    const due = [{ word: 'Hoovu', meaning: 'flower' }];
    const items = pickReviewItems({ lang: 'Kannada', scenarioIdx: 15, due, stats, size: 3, now: NOW });
    assert.strictEqual(items.length, 3);
    assert.ok(items.some(i => i.word === 'Hoovu'), 'the due word is kept');
    assert.ok(items.some(i => /ishta|nanage/i.test(i.word)), items.map(i => i.word).join());
    assert.strictEqual(items.filter(i => i.why).length, 1);
    assert.strictEqual(pickReviewItems({ lang: 'Kannada', scenarioIdx: 15, due, stats: [], size: 3 }), null);
    /* The plan length does not move: three review slots either way. */
    const withSet = buildLessonSteps(lesson, items, K.slice(0, 16));
    const plain = buildLessonSteps(lesson, [{ word: 'Hoovu' }, { word: 'Mane' }, { word: 'Neeru' }], K.slice(0, 16));
    assert.strictEqual(withSet.length, plain.length);
});

test('captions: word, ending, construction, and the confused partner', () => {
    assert.strictEqual(whyCaption('Kannada', 'w:nanage'), 'Because *Nanage* tripped you up before');
    assert.strictEqual(whyCaption('Kannada', 'w:nanage', { confusions: [{ said: 'Naanu', needed: 'Nanage' }] }),
        'Because *Nanage* and *Naanu* got mixed up before');
    assert.strictEqual(whyCaption('Kannada', 'e:ge'), 'Because the *-ge* ending tripped you up before');
    assert.match(whyCaption('Kannada', 'c:nanage-like'), /^Because saying “I like” with nanage/);
});

test('Telugu c:naaku-want: tagged from accepted forms, credited only when used', () => {
    const T = CURRICULUM.Telugu;
    const step = buildLessonSteps(T[3], null, T.slice(0, 4)).find(s => s.expected === 'Neeru kaavali');
    assert.ok(tagStep(step, { lang: 'Telugu', lessonNo: 4 }).skills.includes('c:naaku-want'));
    const ev = (finalSaid) => skillEvidence({ step, lang: 'Telugu', lessonNo: 4, outcome: 'first', finalSaid }).map(e => e.skillId);
    assert.ok(!ev('Neeru kaavali').includes('c:naaku-want'));
    assert.ok(ev('naaku neeru kaavali').includes('c:naaku-want'));
});
