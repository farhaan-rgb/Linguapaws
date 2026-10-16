/* The ladder reads WHY a word was missed (MISS-TAXONOMY.md §4).
 *
 * An `order`, `extra-word` or `spelling` miss is an answer whose words were
 * all there, so the word drops one rung instead of to the bottom. Everything
 * else resets exactly as it always has. The whole behaviour is behind
 * `SCHEDULE_DEMOTE_KINDS`; emptying that set restores the old ladder, and the
 * last test here is the one that proves it.
 *
 * Run: node --test backend/tests/*.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const { nextSchedule, SCHEDULE_DEMOTE_KINDS, MAX_BOX, LADDER_MINUTES } = require('../services/srs');

const NOW = new Date('2026-10-16T12:00:00Z');

test('the set is the switch, and it holds the three kinds that prove recall', () => {
    assert.deepStrictEqual([...SCHEDULE_DEMOTE_KINDS].sort(), ['extra-word', 'order', 'spelling']);
});

test('an order miss drops one rung; every other kind still resets', () => {
    assert.strictEqual(nextSchedule(5, 'missed', NOW, { missKind: 'order' }).box, 4);
    assert.strictEqual(nextSchedule(5, 'missed', NOW, { missKind: 'extra-word' }).box, 4);
    assert.strictEqual(nextSchedule(5, 'missed', NOW, { missKind: 'spelling' }).box, 4);
    for (const k of ['confusion', 'wrong-word', 'missing-word', 'english', 'reasoned', 'blank', 'unknown']) {
        assert.strictEqual(nextSchedule(5, 'missed', NOW, { missKind: k }).box, 0, k);
    }
});

test('no kind at all is exactly the old behaviour — an old client is safe', () => {
    for (const box of [0, 1, 3, MAX_BOX]) {
        assert.strictEqual(nextSchedule(box, 'missed', NOW).box, 0);
        assert.strictEqual(nextSchedule(box, 'missed', NOW, {}).box, 0);
        assert.strictEqual(nextSchedule(box, 'missed', NOW, { missKind: null }).box, 0);
        assert.strictEqual(nextSchedule(box, 'revealed', NOW).box, 0);
    }
});

test('the demotion is floored at box 0 and never goes negative', () => {
    assert.strictEqual(nextSchedule(0, 'missed', NOW, { missKind: 'order' }).box, 0);
    assert.strictEqual(nextSchedule(undefined, 'missed', NOW, { missKind: 'order' }).box, 0);
    assert.strictEqual(nextSchedule(-3, 'missed', NOW, { missKind: 'order' }).box, 0);
});

test('the word is still due now, demoted or not — the retry loop is untouched', () => {
    /* srs.js's header: a miss leaves the word due now so the review loop
       re-asks the same word instead of swapping in a different one mid-retry.
       The demotion moves the box, not the moment. */
    assert.strictEqual(nextSchedule(5, 'missed', NOW, { missKind: 'order' }).dueAt.getTime(), NOW.getTime());
    assert.strictEqual(nextSchedule(5, 'missed', NOW, { missKind: 'confusion' }).dueAt.getTime(), NOW.getTime());
});

test('a demoted miss is not a lapse; everything else is', () => {
    assert.strictEqual(nextSchedule(4, 'missed', NOW, { missKind: 'order' }).lapse, false);
    assert.strictEqual(nextSchedule(4, 'missed', NOW, { missKind: 'confusion' }).lapse, true);
    assert.strictEqual(nextSchedule(4, 'missed', NOW).lapse, true);
    assert.strictEqual(nextSchedule(4, 'revealed', NOW).lapse, true);
    assert.strictEqual(nextSchedule(4, 'unaided', NOW).lapse, false);
});

test('a kind changes nothing on an answer that was not missed', () => {
    for (const outcome of ['unaided', 'hinted']) {
        const plain = nextSchedule(2, outcome, NOW);
        const withKind = nextSchedule(2, outcome, NOW, { missKind: 'order' });
        assert.deepStrictEqual(withKind, plain, outcome);
    }
});

test('what one order miss at the top of the ladder costs', () => {
    /* The case Farhaan hit: a word he had been reviewing on a long interval,
       missed only for where the verb went. Under the old rule it took three
       more screens and 19 days of short-interval drilling to get back; now it
       takes one. */
    const climb = (startBox, missKind) => {
        let box = nextSchedule(startBox, 'missed', NOW, { missKind }).box;
        let screens = 0; let minutes = 0;
        while (box < startBox && screens < 20) {
            screens += 1;
            box = nextSchedule(box, 'unaided', NOW).box;
            if (box < startBox) minutes += LADDER_MINUTES[box];
        }
        return { screens, days: minutes / 1440 };
    };
    assert.deepStrictEqual(climb(6, null), { screens: 3, days: 19 });
    assert.deepStrictEqual(climb(6, 'order'), { screens: 1, days: 0 });
});

test('emptying the set turns the whole behaviour off', () => {
    const saved = [...SCHEDULE_DEMOTE_KINDS];
    SCHEDULE_DEMOTE_KINDS.clear();
    try {
        assert.strictEqual(nextSchedule(5, 'missed', NOW, { missKind: 'order' }).box, 0);
        assert.strictEqual(nextSchedule(5, 'missed', NOW, { missKind: 'order' }).lapse, true);
    } finally {
        saved.forEach((k) => SCHEDULE_DEMOTE_KINDS.add(k));
    }
});
