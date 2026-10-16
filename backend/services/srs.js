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
 * How much help the learner needed. A bare "correct" throws away the most
 * informative signal there is: recalling a word cold and dragging it out after
 * a hint are not the same thing, and scheduling them identically means revision
 * time keeps going to words the learner already knows.
 *
 *   unaided   recalled with no help          -> climbs two rungs
 *   hinted    recalled after a hint or miss  -> climbs one rung
 *   revealed  answered after being shown it  -> back to the bottom (a parrot,
 *                                               not a recall)
 *   missed    not recalled                   -> back to the bottom
 */
const OUTCOMES = ['unaided', 'hinted', 'revealed', 'missed'];

const STEP = { unaided: 2, hinted: 1 };

/** Accepts the old boolean too; true maps to the conservative 'hinted'. */
function normaliseOutcome(outcome) {
    if (typeof outcome === 'boolean') return outcome ? 'hinted' : 'missed';
    return OUTCOMES.includes(outcome) ? outcome : 'missed';
}

/* ── Not every miss is a forgotten word ──
   THE constant for the miss-kind demotion (MISS-TAXONOMY.md §4). Farhaan,
   learning Kannada, wrote *naanu eega tinnuttiddene, hoguttene aamele* for
   *Naanu eega tinnuttiddene, aamele hoguttene*: every word right, the last
   two swapped. That reached this function as "missed" and dropped the word to
   box 0, where it came back as a vocabulary question — a drill for something
   he had just demonstrated he knows.

   An `order`, `extra-word` or `spelling` miss is an answer whose words were
   all there. The item WAS recalled; something else was wrong with it, and
   that something is recorded on the learner's miss profile where a later
   lesson can aim at it. So the ladder drops one rung instead of to the
   bottom, floor 0, and the miss is not counted as a lapse.

   This is the whole of what a learner feels from the taxonomy, so it is on by
   default. **Emptying this set turns the behaviour off entirely** and every
   miss resets to box 0 again, exactly as before — that is the switch.

   The three kinds are the ones where the engine can prove the item was
   produced. `confusion`, `wrong-word`, `missing-word`, `english`, `reasoned`,
   `blank` and `unknown` are ordinary vocabulary gaps and keep resetting,
   which is what the SRS has always been for.

   Measured on 110 real rejected answers harvested from the 306 lesson-sim
   transcripts in `.lesson-sim/`: 18.2% of misses fall in this set, 15.5% of
   them `order`. See the commit message for the review-load numbers. */
const SCHEDULE_DEMOTE_KINDS = new Set(['order', 'extra-word', 'spelling']);

/**
 * Where a word goes after being tested.
 *
 * `dueAt` on a miss is still `now`, demoted or not: the review loop re-asks
 * the same word immediately and must keep doing so (the retry UX this file's
 * header describes). The demotion moves the BOX — where the word lands once
 * the learner gets it — and nothing about when it is asked next.
 *
 * @param {number} box                   the box it was in
 * @param {string|boolean} outcome       see OUTCOMES above
 * @param {Date}   now
 * @param {{missKind?: string}} opts     why it was missed (shared/missKinds.js)
 * @returns {{ box: number, dueAt: Date, outcome: string, lapse: boolean }}
 */
function nextSchedule(box, outcome, now = new Date(), { missKind = null } = {}) {
    const kind = normaliseOutcome(outcome);
    if (kind === 'missed' || kind === 'revealed') {
        const demote = SCHEDULE_DEMOTE_KINDS.has(missKind);
        return {
            box: demote ? Math.max(clampBox(box) - 1, 0) : 0,
            dueAt: now,
            outcome: kind,
            /* A miss that only moved a word around is not a lapse: `lapses` is
               read as "times this was forgotten", and it would stop being true. */
            lapse: !demote,
        };
    }

    const promoted = Math.min(clampBox(box) + STEP[kind], MAX_BOX);
    return { box: promoted, dueAt: addMinutes(now, LADDER_MINUTES[promoted]), outcome: kind, lapse: false };
}

/** Where a word starts the first time it is taught. */
function initialSchedule(now = new Date()) {
    return { box: 0, dueAt: addMinutes(now, LADDER_MINUTES[0]) };
}

/* ── Phrases on the same ladder ──
   A phrase row lives beside the words in LearnedWord, told apart by `kind`.
   Every reader that means "words" — the due queue Chat and practice ask for,
   the vocabulary count — must exclude phrases, so the filter lives here. */
const PHRASE_PREFIX = 'phrase:';

/** The unique key for a review item: words lowercased, phrases prefixed. */
function reviewKey(word, kind) {
    const base = String(word || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (kind === 'phrase') return base ? PHRASE_PREFIX + base : '';
    return String(word || '').toLowerCase().trim();
}

/** Mongo filter on `kind`: 'phrase' → phrases only; anything else → words only. */
function kindFilter(kind) {
    return kind === 'phrase' ? { kind: 'phrase' } : { kind: { $ne: 'phrase' } };
}

module.exports = {
    reviewKey,
    kindFilter,
    LADDER_MINUTES,
    OUTCOMES,
    MAX_BOX,
    SCHEDULE_DEMOTE_KINDS,
    intervalMinutes,
    nextSchedule,
    initialSchedule,
};
