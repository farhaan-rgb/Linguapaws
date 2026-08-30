/**
 * The 15-step lesson cycle, expressed as a list of screens.
 *
 * Chat.jsx walks the same cycle one conversational turn at a time. This module
 * lays it out declaratively so a step-by-step UI can render it, and — more to
 * the point — so both surfaces agree on what a step is, what it asks for, and
 * what counts as a right answer. Every accepted-answer decision here defers to
 * lessonEngine; nothing about the grading is reimplemented.
 *
 * Cycle: 5 teach · 3 review · 3 phrase · 4 conversation.
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
export function buildLessonSteps(lesson, reviewSet = null, allLessons = []) {
    if (!lesson) return [];
    const steps = [];

    /* ── 1. Teach ── */
    for (let i = 0; i < engine.TEACH_STEPS; i++) {
        const slice = engine.teachSliceFor(lesson.vocabulary || [], i);
        if (!slice.length) continue;
        const expected = engine.expectedForTeachStep(slice);
        if (!expected) continue;
        steps.push({
            kind: 'teach',
            phase: 'teach',
            slice,
            expected,
            // Orderings and fused forms, plus each word's own alt spellings —
            // a single-word step gets nothing from teachStepVariants.
            variants: [
                ...engine.teachStepVariants(slice),
                ...(slice.length === 1 ? altsOf(slice[0]) : []),
            ],
        });
    }

    /* ── 2. Review ── */
    (reviewSet || []).forEach(item => {
        if (!item?.word) return;
        steps.push({
            kind: 'review',
            phase: 'review',
            item,
            prompt: item.meaning
                ? `How do you say "${item.meaning}"?`
                : `Say ${item.word} again`,
            expected: item.word,
            variants: engine.altsFor(allLessons, item.word),
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
