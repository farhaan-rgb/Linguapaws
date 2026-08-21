import { api } from './api';

/**
 * Client side of the spaced-repetition system.
 *
 * The three review slots in each lesson (steps 5–7 of the 15-step cycle) used to
 * be filled by `seededReviewIndices` — three of the *current* lesson's five
 * words, tested about four turns after being taught. That is massed practice:
 * the arrangement that reliably produces the worst long-term retention.
 *
 * They are now filled from the learner's due queue across every lesson they have
 * seen in this language, falling back to current-lesson vocabulary only when
 * there genuinely isn't anything else to review yet (lessons 1–2).
 *
 * The chosen triplet is cached per (language, scenario) so it survives a page
 * reload mid-review, and so the answer the matcher expects is always the word
 * the learner was actually asked.
 */

export const REVIEW_SLOTS = 3;

const cacheKey = (lang, scenarioIdx) => `linguapaws_reviewset_${lang}_${scenarioIdx}`;

/* ── Deterministic shuffle ──────────────────────────────────────────────
   Carried over from the original seededReviewIndices so the current-lesson
   fallback still varies from scenario to scenario.                        */
const seededIndices = (seed, size, count) => {
    let s = ((seed + 1) * 1664525 + 1013904223) & 0x7fffffff;
    // was hardcoded to [0..4], so a lesson carrying six or seven words could
    // never have its later ones sampled for review
    const all = Array.from({ length: Math.max(size, 0) }, (_, i) => i);
    for (let i = all.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) & 0x7fffffff;
        const j = s % (i + 1);
        [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, count);
};

/**
 * The review triplet for this lesson, if one has already been built.
 * Synchronous so the answer matcher can read it without awaiting.
 *
 * @returns {Array<{word: string, meaning: string, source: 'due'|'lesson'}>|null}
 */
export function getReviewSet(lang, scenarioIdx) {
    if (!lang) return null;
    try {
        const raw = localStorage.getItem(cacheKey(lang, scenarioIdx));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * Build (or return the cached) review triplet for this lesson.
 * Safe to call repeatedly — one network round-trip per lesson.
 */
export async function ensureReviewSet(lang, scenarioIdx, vocabulary = [], priority = []) {
    if (!lang) return null;

    const cached = getReviewSet(lang, scenarioIdx);
    if (cached) return cached;

    let due = [];
    try {
        due = await api.get(
            `/api/progress/due?lang=${encodeURIComponent(lang)}&limit=${REVIEW_SLOTS}`
        );
    } catch {
        due = []; // offline or unauthenticated — fall through to lesson vocabulary
    }

    const set = (Array.isArray(due) ? due : [])
        .filter((w) => w && w.word)
        .slice(0, REVIEW_SLOTS)
        .map((w) => ({ word: w.word, meaning: w.meaning || '', source: 'due' }));

    // Top up from the current lesson. Not a workaround: in lesson 1 there is
    // genuinely nothing else the learner could be reviewing.
    if (set.length < REVIEW_SLOTS && vocabulary.length) {
        const taken = new Set(set.map((w) => w.word.toLowerCase()));
        const wanted = new Set(priority.map((w) => String(w).toLowerCase()));
        // Words the lesson's own drills are about to require come first. A real
        // session quizzed three of five words and skipped the exact two the next
        // task needed, which is a bad way to spend the only review slots there are.
        const order = seededIndices(scenarioIdx, vocabulary.length, vocabulary.length)
            .sort((a, b) => {
                const pa = wanted.has((vocabulary[a]?.word || '').toLowerCase()) ? 0 : 1;
                const pb = wanted.has((vocabulary[b]?.word || '').toLowerCase()) ? 0 : 1;
                return pa - pb;
            });
        for (const idx of order) {
            if (set.length >= REVIEW_SLOTS) break;
            const item = vocabulary[idx];
            if (!item || !item.word) continue;
            if (taken.has(item.word.toLowerCase())) continue;
            set.push({ word: item.word, meaning: item.meaning || '', source: 'lesson' });
            taken.add(item.word.toLowerCase());
        }
    }

    if (!set.length) return null;

    try {
        localStorage.setItem(cacheKey(lang, scenarioIdx), JSON.stringify(set));
    } catch {
        /* quota — the set just gets rebuilt next time */
    }
    return set;
}

/** Drop a cached triplet so the next lesson entry rebuilds it from the queue. */
export function clearReviewSet(lang, scenarioIdx) {
    if (!lang) return;
    try {
        localStorage.removeItem(cacheKey(lang, scenarioIdx));
    } catch {
        /* ignore */
    }
}

/** Clear every cached triplet — used when the learner switches target language. */
export function clearAllReviewSets() {
    try {
        Object.keys(localStorage)
            .filter((k) => k.startsWith('linguapaws_reviewset_'))
            .forEach((k) => localStorage.removeItem(k));
    } catch {
        /* ignore */
    }
}

/** Record a word as taught, putting it on the bottom rung of the ladder. */
export async function recordTaughtWord({ lang, word, meaning, scenario }) {
    if (!lang || !word) return null;
    try {
        return await api.post('/api/progress/learn-word', { lang, word, meaning, scenario });
    } catch (err) {
        console.warn('[srs] failed to record taught word', word, err.message);
        return null;
    }
}

/**
 * Record a review outcome and let the server reschedule the word.
 * `outcome` is how much help was needed: 'unaided' | 'hinted' | 'revealed' |
 * 'missed'. A bare boolean still works but cannot distinguish a cold recall
 * from one dragged out of a hint, which is the signal worth having.
 */
export async function recordReview({ lang, word, outcome, wasCorrect, meaning, scenario }) {
    if (!lang || !word) return null;
    try {
        return await api.post('/api/progress/review', {
            lang,
            word,
            ...(outcome ? { outcome } : { wasCorrect }),
            meaning,
            scenario,
        });
    } catch (err) {
        console.warn('[srs] failed to record review for', word, err.message);
        return null;
    }
}
