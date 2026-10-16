import test from 'node:test';
import assert from 'node:assert/strict';
import { missBoard, PATTERN_MIN, STANDING_MIN_COUNT, STANDING_MIN_SHARE } from '../src/services/skillProgress.js';

/* What "My skills" is allowed to claim from a miss profile. The thresholds are
   MISS-TAXONOMY.md's — a standing weakness is count >= 3 && share >= 0.25 —
   and PATTERN_MIN is the smallest total at which both halves of that rule can
   bind at once. Guarded here because the page draws a confident chart on one
   side of the line and says "not enough yet" on the other. */

const rows = (o) => Object.entries(o).map(([kind, count]) => ({ kind, count, label: kind }));

test('PATTERN_MIN is derived from the standing rule, not chosen', () => {
    assert.equal(PATTERN_MIN, Math.ceil(STANDING_MIN_COUNT / STANDING_MIN_SHARE));
    assert.equal(PATTERN_MIN, 12);
});

test('the floor kind never reaches the page', () => {
    const b = missBoard(rows({ order: 10, unknown: 30 }));
    assert.deepEqual(b.rows.map(r => r.kind), ['order']);
    assert.equal(b.total, 10, 'and it is not in the denominator either');
});

test('share is recomputed over the diagnosed total', () => {
    const b = missBoard([{ kind: 'order', count: 5, share: 0.9 }, { kind: 'ending', count: 5 }]);
    assert.equal(b.rows[0].share, 0.5);
});

test('a thin profile has no standing weakness however lopsided', () => {
    const b = missBoard(rows({ order: 4, ending: 1 }));          // 80%, but 5 misses
    assert.equal(b.total, 5);
    assert.equal(b.enough, false);
    assert.equal(b.standing, null);
    assert.equal(b.top.kind, 'order', 'still the biggest — just not a claim');
});

test('enough misses but no leader is not a standing weakness', () => {
    const b = missBoard(rows({ confusion: 3, order: 3, ending: 3, 'missing-word': 3, 'wrong-word': 3 }));
    assert.equal(b.enough, true);
    assert.equal(b.standing, null, '20% each clears the count rule and fails the share rule');
});

test('a real order-led profile is one', () => {
    const b = missBoard(rows({ order: 9, confusion: 5, ending: 4, 'missing-word': 3, english: 1 }));
    assert.equal(b.standing.kind, 'order');
    assert.equal(b.standing.count, 9);
    assert.ok(b.standing.share >= STANDING_MIN_SHARE);
});

test('no profile says nothing', () => {
    for (const empty of [null, undefined, [], [{ kind: 'order', count: 0 }]]) {
        const b = missBoard(empty);
        assert.equal(b.total, 0);
        assert.equal(b.standing, null);
        assert.equal(b.rows.length, 0);
    }
});
