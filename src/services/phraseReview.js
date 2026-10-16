/**
 * Phrases and conversation lines on the spaced-repetition ladder.
 *
 * The SRS used to schedule single words only. A lesson's phrases ("Meeru ela
 * unnaru?") were drilled once, in their own lesson, and never asked again on a
 * schedule — practice could stumble on them, phase 3 could add a *pool* drill
 * for a weak skill, but nothing brought the chunk itself back when it was due.
 * Formulaic chunks are learned as wholes and are forgotten like words, so they
 * now sit on the same ladder (backend LearnedWord, `kind: 'phrase'`).
 *
 * This module is pure (no api, no storage) so node can test it:
 *   - which drill a scheduled phrase is, resolved from the curriculum every
 *     time, so a fixed `acceptable` list reaches the learner and grading stays
 *     with lessonEngine.scoreAnswer on the course's own variants;
 *   - where a due phrase goes in the Memory check: at most PHRASE_SLOTS_MAX of
 *     the three slots, never the last (a confused pair takes that one), only
 *     from a lesson before this one that the learner has finished.
 */

import { CURRICULUM } from './curriculum.js';

export const PHRASE_SLOTS_MAX = 1;

const norm = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();

/** The ladder key for a phrase: its course answer, normalised. */
export const phraseKey = norm;

/** The phrase or conversation drill of lessons[lessonIdx] whose answer is `text`. */
export function phraseDrill(lessons, lessonIdx, text) {
    const lesson = (lessons || [])[lessonIdx];
    const k = norm(text);
    if (!lesson || !k) return null;
    const all = [
        ...(lesson.phrases || []).map(d => ({ ...d, phase: 'phrase' })),
        ...(lesson.conversations || []).map(d => ({ ...d, phase: 'conversation' })),
    ];
    return all.find(d => norm(d.correct) === k) || null;
}

/** The review-set item for a drill: same shape as a word, plus `phrase`. */
export const phraseItem = (drill, lessonIdx) => ({
    word: drill.correct,
    meaning: drill.meaning || '',
    native: drill.native || '',
    source: 'phrase',
    phrase: { lessonIdx, phase: drill.phase || 'phrase' },
});

/**
 * Put at most `max` due phrases into a built review set (words only), as
 * replacements so the slot count — which resume and the lesson map count —
 * does not move. `due` is GET /api/progress/due?kind=phrase: rows carrying
 * `kind: 'phrase'` and `lessonIdx`; anything else (an old server that ignores
 * `kind` and sends words) is ignored.
 *
 * Which word gives way: a current-lesson top-up first, then an adaptive
 * "earlier" pick, then the latest due word — never the first slot and never
 * the last while there are two or more, since a confused pair overwrites the
 * last slot at build time.
 */
export function placeDuePhrases(set, due, {
    lang, scenarioIdx, completedIdx = null, size = 3, max = PHRASE_SLOTS_MAX,
} = {}) {
    const out = [...(set || [])];
    const lessons = CURRICULUM[lang] || [];
    const lastDone = Math.min(scenarioIdx - 1, Number.isInteger(completedIdx) ? completedIdx : scenarioIdx - 1);
    if (lastDone < 0 || !max) return out;
    /* A phrase this lesson drills anyway is not a memory check. */
    const ownAnswers = new Set([
        ...(lessons[scenarioIdx]?.phrases || []), ...(lessons[scenarioIdx]?.conversations || []),
    ].map(d => norm(d.correct)));
    const taken = new Set(out.map(i => norm(i?.word)));

    const picks = [];
    for (const row of due || []) {
        if (picks.length >= max) break;
        if (row?.kind !== 'phrase') continue;
        const li = Number(row.lessonIdx);
        if (!Number.isInteger(li) || li < 0 || li > lastDone) continue;
        const drill = phraseDrill(lessons, li, row.word);
        const k = norm(drill?.correct);
        if (!drill || taken.has(k) || ownAnswers.has(k)) continue;
        taken.add(k);
        picks.push(phraseItem(drill, li));
    }

    for (const item of picks) {
        if (out.length < size) {
            out.splice(Math.min(1, out.length), 0, item);
            continue;
        }
        const last = out.length - 1;
        const open = out.map((x, i) => i).filter(i => i > 0 && i < last && !out[i]?.phrase);
        const rank = (i) => ({ lesson: 0, earlier: 1 }[out[i]?.source] ?? 2);
        const victim = open.sort((a, b) => rank(a) - rank(b) || b - a)[0];
        if (victim === undefined) break;
        out.splice(victim, 1);
        out.splice(1, 0, item);
    }
    return out;
}
