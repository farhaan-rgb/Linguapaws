/* Where does each surface resume? Checks src/services/lessonResume.js, the one
   rule Chat.jsx and Steps.jsx both read.   node tools/resume-check.mjs */
import assert from 'node:assert';
import { resumeIndex, scenarioIndexFor, mergeProgress, withLessonCompleted, completedLessonFor } from '../src/services/lessonResume.js';

const cases = [];
const check = (name, fn) => { try { fn(); cases.push(['ok  ', name]); } catch (e) { cases.push(['FAIL', `${name}: ${e.message}`]); } };

check('nothing recorded, no repeats -> lesson 0', () => assert.strictEqual(resumeIndex({}, 'Telugu', 30), 0));
check('offline / null progress -> lesson 0', () => assert.strictEqual(resumeIndex(null, 'Telugu', 30), 0));
check('no record falls back to old formula (47 repeats -> 3)', () =>
    assert.strictEqual(resumeIndex({ successfulRepeats: 47 }, 'Telugu', 30), 3));
check('fallback clamps to the language (Kannada, 10 lessons, 200 repeats -> 9)', () =>
    assert.strictEqual(resumeIndex({ successfulRepeats: 200 }, 'Kannada', 10), 9));
check('recorded lesson 4 -> resume 5, regardless of the counter', () =>
    assert.strictEqual(resumeIndex({ successfulRepeats: 3, lessonProgress: { Telugu: 4 } }, 'Telugu', 30), 5));
check('a short lesson (< 15 correct) still advances', () =>
    assert.strictEqual(resumeIndex({ successfulRepeats: 9, lessonProgress: { Telugu: 0 } }, 'Telugu', 30), 1));
check('languages are independent: Telugu record does not move Kannada', () => {
    const p = { successfulRepeats: 0, lessonProgress: { Telugu: 7 } };
    assert.strictEqual(resumeIndex(p, 'Telugu', 30), 8);
    assert.strictEqual(resumeIndex(p, 'Kannada', 10), 0);
});
check('recorded lesson 0 counts (not treated as missing)', () =>
    assert.strictEqual(completedLessonFor({ lessonProgress: { Hindi: 0 } }, 'Hindi'), 0));
check('last lesson completed -> clamped to last', () =>
    assert.strictEqual(resumeIndex({ lessonProgress: { Hindi: 4 } }, 'Hindi', 5), 4));
check('?scenario= override wins', () =>
    assert.strictEqual(scenarioIndexFor({ lessonProgress: { Telugu: 9 } }, 'Telugu', '2', 30), 2));
check('empty override falls through to resume', () =>
    assert.strictEqual(scenarioIndexFor({ lessonProgress: { Telugu: 9 } }, 'Telugu', '', 30), 10));
check('stale /increment payload cannot move lesson progress back', () => {
    const local = withLessonCompleted({ successfulRepeats: 14, lessonProgress: { Telugu: 2 } }, 'Telugu', 3);
    const merged = mergeProgress(local, { successfulRepeats: 15, lessonProgress: { Telugu: 2 } });
    assert.strictEqual(merged.successfulRepeats, 15);
    assert.deepStrictEqual(merged.lessonProgress, { Telugu: 3 });
});
check('payload without lessonProgress (older server) keeps the local one', () =>
    assert.deepStrictEqual(mergeProgress({ lessonProgress: { Odiya: 1 } }, { successfulRepeats: 5 }).lessonProgress, { Odiya: 1 }));

for (const [s, n] of cases) console.log(`${s} ${n}`);
const failed = cases.filter(([s]) => s === 'FAIL').length;
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
