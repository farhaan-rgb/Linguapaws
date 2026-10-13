/**
 * The 15-step lesson cycle, expressed as a list of screens.
 *
 * Chat.jsx walks the same cycle one conversational turn at a time. This module
 * lays it out declaratively so a step-by-step UI can render it, and — more to
 * the point — so both surfaces agree on what a step is, what it asks for, and
 * what counts as a right answer. Every accepted-answer decision here defers to
 * lessonEngine; nothing about the grading is reimplemented.
 *
 * Cycle: 5 teach · 3 review · 3 phrase · 4 conversation in Chat. Step mode
 * gives teach one screen per vocabulary word, so its plan length varies.
 */

import * as engine from '../services/lessonEngine.js';

export const PHASES = {
    teach:        { label: 'New words',   blurb: 'Meet it, then say it back' },
    review:       { label: 'Memory check', blurb: 'From what you have learned' },
    phrase:       { label: 'Build a phrase', blurb: 'Put the words together' },
    conversation: { label: 'Real conversation', blurb: 'Use it for real' },
};

/** Every `alt` spelling the course lists for a word. */
const altsOf = (wordObj) => (wordObj?.alt || []);

/**
 * Build the screens for one lesson.
 *
 * `reviewSet` comes from srs.ensureReviewSet and may be null — offline, or a
 * first lesson with nothing due yet. Missing review slots are dropped rather
 * than back-filled with the current lesson's own words a second time, which
 * would quiz a word the learner met ninety seconds ago.
 */
/* The step's answer in the course's own script, so a spoken answer can be
   matched on what the recogniser heard rather than how it romanised it. */
const nativeOf = (lessons, word) => {
    for (const l of lessons || []) for (const v of l.vocabulary || []) {
        if (v.word === word && v.native) return v.native;
    }
    return '';
};

/* ── Confused pairs, brought back ──
   A pair the learner mixed up earlier (said Nimma "your" where Avara "her,
   respectful" was needed) comes back as one review screen asking for both, in
   that order. It takes the LAST review slot rather than adding one, so the plan
   length — which the lesson map and mid-lesson resume both count — is the same
   with or without it, and a lesson with no review slots gets no contrast. */
const capWord = (w) => String(w || '').charAt(0).toUpperCase() + String(w || '').slice(1);
export function contrastItem(pair) {
    if (!pair?.said || !pair?.needed) return null;
    return {
        word: `${capWord(pair.said)} ${capWord(pair.needed)}`,
        meaning: '',
        source: 'confusion',
        contrast: { said: pair.said, needed: pair.needed,
            saidMeaning: pair.saidMeaning || '', neededMeaning: pair.neededMeaning || '' },
    };
}
const contrastPrompt = (c) => {
    const a = engine.glossFor(c.saidMeaning) || `“${c.said}”`;
    const b = engine.glossFor(c.neededMeaning) || `“${c.needed}”`;
    return `These two got mixed up before. Say ${a}, then ${b}.`;
};
/* Every spelling of "said needed" the course accepts, alt by alt. */
const contrastVariants = (lessons, c) => {
    const as = [c.said, ...engine.altsFor(lessons, c.said)];
    const bs = [c.needed, ...engine.altsFor(lessons, c.needed)];
    const out = [];
    for (const a of as) for (const b of bs) out.push(`${a} ${b}`);
    return out.slice(1, 12);
};

export function buildLessonSteps(lesson, reviewSet = null, allLessons = [], contrast = null) {
    if (!lesson) return [];
    const steps = [];

    /* ── 1. Teach ──
       One screen per word, however many the lesson holds. The engine's
       teachSliceFor folds a lesson onto five slots for Chat's fixed 15-turn
       cycle, which on a 6- or 7-word lesson put two words on one screen and
       asked for them together ("Hoguttene Hogu") as if they were one word.
       Step mode has no fixed turn count to honour, so it does not borrow that
       folding: a 7-word lesson gets 7 teach screens. Chat is unchanged. */
    (lesson.vocabulary || []).forEach(wordObj => {
        const slice = [wordObj];
        const expected = engine.expectedForTeachStep(slice);
        if (!expected) return;
        steps.push({
            kind: 'teach',
            phase: 'teach',
            slice,
            expected,
            variants: altsOf(wordObj),
            native: wordObj.native || '',
        });
    });

    /* ── 2. Review ── */
    const slots = (reviewSet || []).filter(item => item?.word);
    const pairItem = slots.length ? contrastItem(contrast) : null;
    if (pairItem) slots[slots.length - 1] = pairItem;
    slots.forEach(item => {
        if (item.contrast) {
            steps.push({
                kind: 'review',
                phase: 'review',
                item,
                prompt: contrastPrompt(item.contrast),
                expected: item.word,
                variants: contrastVariants(allLessons, item.contrast),
                native: [nativeOf(allLessons, item.contrast.said), nativeOf(allLessons, item.contrast.needed)]
                    .every(Boolean)
                    ? `${nativeOf(allLessons, item.contrast.said)} ${nativeOf(allLessons, item.contrast.needed)}` : '',
            });
            return;
        }
        steps.push({
            kind: 'review',
            phase: 'review',
            item,
            prompt: item.meaning
                ? `How do you say "${item.meaning}"?`
                : `Say ${item.word} again`,
            expected: item.word,
            variants: engine.altsFor(allLessons, item.word),
            native: item.native || nativeOf(allLessons, item.word),
        });
    });

    /* ── 3 & 4. Drills, exactly as the curriculum orders them ── */
    const drills = [
        ...(lesson.phrases || []).map(d => ({ ...d, phase: 'phrase' })),
        ...(lesson.conversations || []).map(d => ({ ...d, phase: 'conversation' })),
    ];
    drills.forEach((drill, idx) => {
        if (!drill?.correct) return;
        steps.push({
            kind: 'drill',
            phase: drill.phase,
            drill,
            prompt: engine.drillPrompt(drills, idx) || drill.prompt,
            expected: drill.correct,
            variants: drill.acceptable || [],
            native: drill.native || '',
        });
    });

    return steps.map((s, i) => ({ ...s, index: i }));
}

/** Words a teach step puts on screen — banked once the learner clears it. */
export const wordsTaughtBy = (step) =>
    step?.kind === 'teach' ? (step.slice || []).filter(w => w?.word) : [];

/** Human label for the progress header, e.g. "New words · 2 of 5". */
export function stepCaption(steps, index) {
    const step = steps[index];
    if (!step) return '';
    const sameKind = steps.filter(s => s.phase === step.phase);
    const position = sameKind.indexOf(step) + 1;
    return `${PHASES[step.phase].label} · ${position} of ${sameKind.length}`;
}

/* ── Re-asking what was missed ──────────────────────────────────────────────
   A screen the learner did not get (the answer had to be shown) comes back once
   more at the end of its own round — a round being one phase of the cycle —
   before the next round starts. A re-ask gets ONE try before the answer is
   shown again, and a screen is re-asked at most RETRY_CAP times, so "two more
   misses on a re-asked question and it moves on for good". Every path ends:
   the run only grows by re-asks, and re-asks stop at the cap.

   The run is the plan plus appended copies. A copy keeps its plan `index` (so
   resume, the rail and the lesson map keep counting plan screens) and carries
   `retry` = how many times it has been re-asked. */

export const RETRY_CAP = 2;

/** Tries before the reveal: the plan's own limit first time, one on a re-ask. */
export const triesFor = (step) => (step?.retry ? 1 : engine.REVIEW_RETRY_LIMIT);

/** Whether a screen whose answer was just revealed should come back again. */
export const shouldRequeue = (step) => (step?.retry || 0) < RETRY_CAP;

/** True when run[i] is the last screen of its round. */
export const isRoundEnd = (run, i) => !run[i + 1] || run[i + 1].phase !== run[i]?.phase;

/** Insert re-asks of `missed` straight after run[i]. Returns a new run. */
export const withRetries = (run, i, missed) => (missed.length
    ? [...run.slice(0, i + 1), ...missed.map(s => ({ ...s, retry: (s.retry || 0) + 1 })), ...run.slice(i + 1)]
    : run);

/** The plan index a killed app should reopen at, given the run entry it is
 *  about to show. Mid-requeue there is nowhere honest to resume except the
 *  start of the round, so the round is played again from the top. */
export function resumeStepFor(steps, next, pendingMisses = 0) {
    if (!next) return null;
    if (!next.retry && !pendingMisses) return next.index;
    const start = steps.findIndex(s => s.phase === next.phase);
    return start < 0 ? next.index : start;
}

/** The plan index the progress rail should show for a run entry: a re-ask sits
 *  on the last segment of its round, since every plan screen before it is done. */
export function railIndexFor(steps, entry) {
    if (!entry) return 0;
    if (!entry.retry) return entry.index;
    let last = entry.index;
    steps.forEach((s, i) => { if (s.phase === entry.phase) last = i; });
    return last;
}
