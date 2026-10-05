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

const MAX_STEP_IDX = 99;

function validatePosition(body = {}) {
    const base = validateCompletion(body);
    if (base.error) return base;
    const stepIdx = Number(body.stepIdx);
    if (!Number.isInteger(stepIdx) || stepIdx < 0 || stepIdx > MAX_STEP_IDX) {
        return { error: 'stepIdx must be a non-negative integer' };
    }
    return { ...base, stepIdx };
}

/* Last write wins: the position is wherever the learner most recently was,
   including partway through a lesson they are replaying. */
function positionUpdate(lang, lessonIdx, stepIdx, now = new Date()) {
    return { $set: { [`lessonPosition.${lang}`]: { lessonIdx, stepIdx, updatedAt: now } } };
}

/* Finishing a lesson clears the position only if it points into that lesson,
   so completing lesson 2 in one tab does not wipe lesson 3 in progress. */
function positionClearFilter(userId, lang, lessonIdx) {
    return { _id: userId, [`lessonPosition.${lang}.lessonIdx`]: lessonIdx };
}
function positionClearUpdate(lang) {
    return { $unset: { [`lessonPosition.${lang}`]: '' } };
}

function lessonPositionOf(user) {
    const raw = user && user.lessonPosition;
    if (!raw) return {};
    const entries = raw instanceof Map ? [...raw.entries()] : Object.entries(raw);
    const out = {};
    for (const [lang, v] of entries) {
        if (!v) continue;
        out[lang] = { lessonIdx: v.lessonIdx, stepIdx: v.stepIdx, updatedAt: v.updatedAt };
    }
    return out;
}

function progressPayload(user) {
    return {
        successfulRepeats: (user && user.successfulRepeats) || 0,
        learnedWords: (user && user.learnedWords) || [],
        lessonProgress: lessonProgressOf(user),
        lessonPosition: lessonPositionOf(user),
    };
}

module.exports = {
    validateCompletion, completionUpdate, lessonProgressOf, progressPayload,
    validatePosition, positionUpdate, positionClearFilter, positionClearUpdate, lessonPositionOf,
};
