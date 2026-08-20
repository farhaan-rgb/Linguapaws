/**
 * Spaced-repetition scheduler — a Leitner ladder.
 *
 * Each learned word sits in a "box". A correct recall promotes it one box and
 * pushes the next review further out; a miss drops it to box 0. This
 * operationalises the two findings the review slots were previously ignoring:
 * the spacing effect (Cepeda et al. 2006) and the testing effect
 * (Roediger & Karpicke 2006).
 *
 * Box 0 is deliberately sub-day. Without a sub-day rung, a first-session
 * learner would have nothing due until tomorrow, the review slots would fall
 * back to current-lesson words every time, and we'd be right back to the massed
 * practice this replaces.
 *
 * A miss leaves the word due *now* rather than pushing it out, so the review
 * loop re-asks the same word immediately — this preserves the existing retry UX
 * (`Not quite! What's the word for X?`) instead of silently swapping in a
 * different word mid-retry.
 */

// 10 min · 1 d · 3 d · 7 d · 16 d · 35 d · 90 d
const LADDER_MINUTES = [10, 1440, 4320, 10080, 23040, 50400, 129600];

const MAX_BOX = LADDER_MINUTES.length - 1;

const clampBox = (box) => Math.max(0, Math.min(Number(box) || 0, MAX_BOX));

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

/** Minutes until the next review for a word sitting in `box`. */
function intervalMinutes(box) {
    return LADDER_MINUTES[clampBox(box)];
}

/**
 * Where a word goes after being tested.
 *
 * @param {number}  box        the box it was in
 * @param {boolean} wasCorrect whether the learner recalled it
 * @param {Date}    now
 * @returns {{ box: number, dueAt: Date }}
 */
function nextSchedule(box, wasCorrect, now = new Date()) {
    if (!wasCorrect) return { box: 0, dueAt: now };

    const promoted = Math.min(clampBox(box) + 1, MAX_BOX);
    return { box: promoted, dueAt: addMinutes(now, LADDER_MINUTES[promoted]) };
}

/** Where a word starts the first time it is taught. */
function initialSchedule(now = new Date()) {
    return { box: 0, dueAt: addMinutes(now, LADDER_MINUTES[0]) };
}

module.exports = {
    LADDER_MINUTES,
    MAX_BOX,
    intervalMinutes,
    nextSchedule,
    initialSchedule,
};
