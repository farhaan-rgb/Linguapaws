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
    /* The shared counter is only a guess for a learner from before
       per-language records. Once any language has a record, a language with
       none is a new course: lesson 1. Otherwise ninety Kannada answers opened
       a first Telugu session on lesson 7. */
    const hasAnyRecord = Object.values(progress?.lessonProgress || {})
        .some(v => Number.isInteger(v) && v >= 0);
    if (hasAnyRecord) return 0;
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
    /* Chat's position moves on the client first (the turn is graded here) and
       the server hears it fire-and-forget, so an /increment payload read
       before that write landed would put the learner a step back. A language
       this page has already placed keeps its local entry. */
    const chatPosition = { ...(next.chatPosition || {}), ...(prev?.chatPosition || {}) };
    return { ...prev, ...next, lessonProgress: merged, chatPosition };
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

/* Where chat resumes INSIDE a lesson: `chatPosition[lang]`, the next of its 15
   turns, written after every turn that advances and cleared on completion.
   Chat's own record, beside step mode's `lessonPosition` rather than in it,
   because the two count differently: a step plan has one screen per word plus
   listen and pattern screens, chat folds a lesson onto 5 + 3 + 3 + 4 turns.

   It used to be `successfulRepeats % 15` — one counter for every language, so
   leaving Kannada at step 7 opened Telugu at step 7 too. That counter is now
   only the fallback for a learner with no per-language record of any kind,
   the same rule `resumeIndex` applies to lessons. */
export function chatPositionFor(progress, lang, lessonIdx) {
    const pos = progress?.chatPosition?.[lang];
    if (pos) {
        const s = pos.stepIdx;
        return pos.lessonIdx === lessonIdx && Number.isInteger(s) && s >= 0 && s < CYCLE_SIZE ? s : 0;
    }
    const recorded = (m) => Object.values(m || {}).some(v => v !== null && v !== undefined);
    if (recorded(progress?.chatPosition) || recorded(progress?.lessonPosition)
        || Object.values(progress?.lessonProgress || {}).some(v => Number.isInteger(v) && v >= 0)) return 0;
    return (progress?.successfulRepeats || 0) % CYCLE_SIZE;
}

/** Chat moved to turn `stepIdx` of `lessonIdx`, applied locally. */
export function withChatPosition(progress, lang, lessonIdx, stepIdx) {
    return { ...progress, chatPosition: { ...(progress?.chatPosition || {}), [lang]: { lessonIdx, stepIdx } } };
}
