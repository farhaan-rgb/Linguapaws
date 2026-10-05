/* Where a learner picks up a course. Pure — no fetch, no storage — so both
   lesson surfaces read the same answer and it can be checked under plain node.

   The source of truth is `lessonProgress[lang]` on the server: the highest
   lesson index completed in that language. Resume is the one after it.

   `successfulRepeats / CYCLE_SIZE` is the old rule and survives only as a
   fallback for a language with no record, so a learner from before per-language
   progress existed is not thrown back to lesson 1. It is one counter shared by
   every language and counts correct answers rather than finished lessons, which
   is why it is not trusted once a real record exists. */

/** Steps per lesson: 5 teach · 3 review · 3 phrase-building · 4 conversation. */
export const CYCLE_SIZE = 15;

/** The highest completed lesson index for `lang`, or null if none recorded. */
export function completedLessonFor(progress, lang) {
    const v = progress?.lessonProgress?.[lang];
    return Number.isInteger(v) && v >= 0 ? v : null;
}

const clamp = (n, lessonCount) => Math.min(Math.max(n, 0), Math.max(0, lessonCount - 1));

/** The lesson to open when no `?scenario=` is given. */
export function resumeIndex(progress, lang, lessonCount) {
    const done = completedLessonFor(progress, lang);
    if (done !== null) return clamp(done + 1, lessonCount);
    return clamp(Math.floor((progress?.successfulRepeats || 0) / CYCLE_SIZE), lessonCount);
}

/** Resume index, unless the URL names a lesson — that always wins. */
export function scenarioIndexFor(progress, lang, override, lessonCount) {
    if (override !== null && override !== undefined && override !== '') {
        const parsed = parseInt(override, 10);
        if (!Number.isNaN(parsed)) return clamp(parsed, lessonCount);
    }
    return resumeIndex(progress, lang, lessonCount);
}

/* Fold a server progress payload into what the page already holds. Every
   /increment response replaces the chat's progress wholesale, and one that was
   read before a /lesson-complete write landed would otherwise wipe the lesson
   just recorded — moving the learner back a lesson mid-conversation. Lesson
   progress is forward-only on the server, so it is forward-only here too. */
export function mergeProgress(prev, next) {
    if (!next) return prev;
    const merged = { ...(prev?.lessonProgress || {}) };
    for (const [lang, idx] of Object.entries(next.lessonProgress || {})) {
        if (!Number.isInteger(merged[lang]) || idx > merged[lang]) merged[lang] = idx;
    }
    return { ...prev, ...next, lessonProgress: merged };
}

/** The same forward-only rule, applied locally the moment a lesson ends. */
export function withLessonCompleted(progress, lang, lessonIdx) {
    return mergeProgress(progress, { lessonProgress: { [lang]: lessonIdx } });
}

/* Where to start INSIDE a lesson. `lessonPosition[lang]` is the next screen to
   show, written after every answered step and cleared on completion. It only
   applies to the lesson it was saved in, and a step index past the end (the
   plan came out shorter this time, e.g. no review slots offline) means start
   over rather than open onto nothing. */
export function savedStepFor(progress, lang, lessonIdx, stepCount) {
    const pos = progress?.lessonPosition?.[lang];
    if (!pos || pos.lessonIdx !== lessonIdx) return 0;
    const s = pos.stepIdx;
    return Number.isInteger(s) && s > 0 && s < stepCount ? s : 0;
}
