/* Skill backfill: the mapping from pre-evidence history to skill items, the
   fold through the live update rule, the rebase under live evidence, and
   idempotency. In-memory rows only — no database, no network.
   Run from backend/: node --test tests/*.test.js */
const test = require('node:test');
const assert = require('node:assert');
const S = require('../services/skillStats');
const B = require('../services/skillBackfill');

const W = B.BACKFILL_WEIGHTS;
const T0 = new Date('2026-10-10T10:00:00Z');

test('LearnedWord: never reviewed says nothing; SRS history sets score and weight', () => {
    assert.deepStrictEqual(B.fromLearnedWord({ word: 'Naanu', reviews: 0, box: 0 }, 'Kannada').items, []);
    const good = B.fromLearnedWord({ word: 'Naanu', reviews: 3, lapses: 0, box: 4, lastReviewedAt: T0 }, 'Kannada').items;
    assert.deepStrictEqual(good.map(i => i.skillId), ['w:naanu']);
    assert.strictEqual(good[0].score, 1);
    assert.strictEqual(good[0].weight, W.srsMax);
    const bad = B.fromLearnedWord({ word: 'Naanu', reviews: 1, lapses: 1, box: 0 }, 'Kannada').items[0];
    assert.strictEqual(bad.score, 0);
    assert.strictEqual(bad.weight, W.srsPerReview);
    assert.ok(bad.weight < 1, 'reduced weight: older, indirect evidence');
});

test('Confusion: needed and said charged, wins credit both later', () => {
    const { items } = B.fromConfusion({ said: 'Nimma', needed: 'Nanna', count: 1, wins: 0, createdAt: T0 }, 'Kannada');
    const by = Object.fromEntries(items.map(i => [i.skillId, i]));
    assert.strictEqual(by['w:nanna'].score, 0);
    assert.strictEqual(by['w:nanna'].weight, W.confusedNeeded);
    assert.strictEqual(by['w:nimma'].weight, W.confusedSaid);
    const won = B.fromConfusion({ said: 'Nimma', needed: 'Nanna', count: 1, wins: 2, createdAt: T0 }, 'Kannada').items;
    assert.ok(won.some(i => i.skillId === 'w:nanna' && i.score === 1 && i.at > T0.getTime()));
});

test('MissedScreen: rebuilt from the lesson plan and tagged; unknown ones skipped', () => {
    const drill = B.fromMissedScreen({ lessonIdx: 11, kind: 'drill', key: 'Naale ondu gantege', keyNorm: 'naale ondu gantege', count: 1 }, 'Kannada');
    const ids = drill.items.map(i => i.skillId);
    assert.ok(ids.includes('w:naale') && ids.includes('order'), ids.join());
    assert.ok(drill.items.every(i => i.score === 0 && i.weight === W.missed));
    assert.strictEqual(B.fromMissedScreen({ lessonIdx: 0, kind: 'drill', key: 'zz qq', keyNorm: 'zz qq' }, 'Kannada').skipped, 'unresolved');
    assert.strictEqual(B.fromMissedScreen({ lessonIdx: 999, kind: 'word', key: 'x', keyNorm: 'x' }, 'Kannada').skipped, 'unresolved');
});

test('fold uses the live rule: same result as posting the items one by one', () => {
    const items = [{ skillId: 'w:a', score: 0, weight: 0.6, at: 1 }, { skillId: 'w:a', score: 1, weight: 0.3, at: 2 }];
    let s = null;
    for (const it of items) s = S.applyEvidence(s, it);
    assert.strictEqual(B.foldBackfill(items).get('w:a').mastery, s.mastery);
});

test('rebase puts backfill under live evidence exactly as if it had come first', () => {
    const bfItems = [{ skillId: 'w:a', score: 0, weight: 0.6 }, { skillId: 'w:a', score: 0, weight: 0.45 }];
    const liveItems = [{ skillId: 'w:a', score: 1, weight: 1 }, { skillId: 'w:a', score: 0.5, weight: 0.4 }];
    let seq = null;
    for (const it of [...bfItems, ...liveItems]) seq = S.applyEvidence(seq, it);
    let live = null;
    for (const it of liveItems) live = S.applyEvidence(live, it);
    const bf = B.foldBackfill(bfItems.map((x, i) => ({ ...x, at: i }))).get('w:a');
    const merged = B.rebase(live, bf);
    assert.ok(Math.abs(merged.mastery - seq.mastery) < 1e-3, `${merged.mastery} vs ${seq.mastery}`);
    assert.strictEqual(merged.evidence, seq.evidence);
    assert.strictEqual(merged.attempts, 4);
    assert.strictEqual(merged.lastOutcome, live.lastOutcome, 'the live outcome is kept');
    assert.deepStrictEqual(merged.recent, seq.recent);
});

test('planFor: rows after the live cutoff are left out, and a re-run is a no-op', () => {
    const cutoff = new Date('2026-10-16T09:20:00Z').getTime();
    const src = {
        lang: 'Kannada', lastLessonIdx: 1, cutoff,
        learnedWords: [
            { word: 'Naanu', reviews: 2, lapses: 2, box: 0, createdAt: T0 },
            { word: 'Neevu', reviews: 2, lapses: 0, box: 3, createdAt: new Date(cutoff + 1000) },
        ],
        confusions: [{ said: 'Nimma', needed: 'Nanna', count: 1, createdAt: T0 }],
        missedScreens: [],
    };
    const live = { skillId: 'w:nanna', mastery: 0.8, attempts: 1, evidence: 1, recent: [1], lastOutcome: 1, createdAt: new Date(cutoff), updatedAt: new Date(cutoff) };
    const plan = B.planFor({ ...src, existing: [live] });
    assert.strictEqual(plan.counts['learnedWord:afterCutoff'], 1);
    const nanna = plan.writes.find(w => w.skillId === 'w:nanna');
    assert.ok(nanna.live && nanna.set.mastery < 0.8 && nanna.set.lastOutcome === 1);
    assert.ok(plan.writes.every(w => w.set.backfill?.v === B.BACKFILL_VERSION));
    /* Apply in memory, then plan again: nothing to do. */
    const after = new Map([[live.skillId, live]]);
    plan.writes.forEach(w => after.set(w.skillId, { skillId: w.skillId, ...w.set }));
    const again = B.planFor({ ...src, existing: [...after.values()] });
    assert.strictEqual(again.already, true);
    assert.strictEqual(again.writes.length, 0);
});

test('completed lessons give a light prior that cannot reach weak or strong alone', () => {
    const items = B.fromCompletedLessons(0, 'Kannada');
    assert.ok(items.length > 0 && items.every(i => i.score === 1 && i.weight === W.completedLesson));
    const st = B.foldBackfill(items);
    for (const s of st.values()) assert.strictEqual(S.levelOf(s), 'new');
});
