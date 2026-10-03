/* Per-language lesson completion, kept apart from the route so it can be
   tested without a database. */

/* The language name becomes a key in a Mongo document (`lessonProgress.Telugu`),
   so anything that could turn into a path operator — a dot, a dollar — is
   refused rather than escaped. Course names are plain words. */
const LANG_RE = /^[A-Za-z][A-Za-z ]{0,39}$/;
const MAX_LESSON_IDX = 999;

function validateCompletion(body = {}) {
    const { lang } = body;
    const lessonIdx = Number(body.lessonIdx);
    if (typeof lang !== 'string' || !LANG_RE.test(lang)) {
        return { error: 'lang must be a plain language name' };
    }
    if (!Number.isInteger(lessonIdx) || lessonIdx < 0 || lessonIdx > MAX_LESSON_IDX) {
        return { error: 'lessonIdx must be a non-negative integer' };
    }
    return { lang, lessonIdx };
}

/* `$max` makes the write idempotent and forward-only in one atomic step:
   replaying lesson 2 after finishing lesson 5 leaves 5 in place, and two tabs
   finishing at once cannot race each other backwards. */
function completionUpdate(lang, lessonIdx) {
    return { $max: { [`lessonProgress.${lang}`]: lessonIdx } };
}

/* Mongoose hands back a Map; `.lean()` and tests hand back a plain object. */
function lessonProgressOf(user) {
    const raw = user && user.lessonProgress;
    if (!raw) return {};
    if (raw instanceof Map) return Object.fromEntries(raw);
    return { ...raw };
}

function progressPayload(user) {
    return {
        successfulRepeats: (user && user.successfulRepeats) || 0,
        learnedWords: (user && user.learnedWords) || [],
        lessonProgress: lessonProgressOf(user),
    };
}

module.exports = { validateCompletion, completionUpdate, lessonProgressOf, progressPayload };
