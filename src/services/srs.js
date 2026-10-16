import { api } from './api';
import { pickReviewItems } from './adaptive.js';

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

    /* Due words, and — for adaptive phase 2 — the learner's skill model and
       open confused pairs. The model is fetched with a short timeout and any
       failure is an empty model, which is today's behaviour exactly. A wider
       due list only gives the adaptive pick a choice; without a model it is
       cut back to the three most overdue, as before. */
    const q = encodeURIComponent(lang);
    const [dueRaw, stats, confusions] = await Promise.all([
        api.get(`/api/progress/due?lang=${q}&limit=10`).catch(() => []),
        fetchSkillModel(lang),
        withTimeout(getOr(`/api/progress/confusions/open?lang=${q}&limit=10`, []), SKILLS_TIMEOUT_MS, []),
    ]);
    const due = (Array.isArray(dueRaw) ? dueRaw : []).filter((w) => w && w.word);

    let set = null;
    try {
        set = pickReviewItems({ lang, scenarioIdx, due, stats, confusions, size: REVIEW_SLOTS });
    } catch (err) {
        console.warn('[srs] adaptive review pick failed', err);
    }
    set = set || due
        .slice(0, REVIEW_SLOTS)
        .map((w) => ({ word: w.word, meaning: w.meaning || '', source: 'due' }));

    // Top up from the current lesson. Not a workaround: in lesson 1 there is
    // genuinely nothing else the learner could be reviewing.
    if (set.length < REVIEW_SLOTS && vocabulary.length) {
        const taken = new Set(set.map((w) => w.word.toLowerCase()));
        /* Rank by WHEN the drills first need a word, not merely whether they do.
           A well-built lesson uses all of its vocabulary, so a membership test
           is a no-op on exactly the lessons it was meant to help — and where it
           did bite it went the wrong way, handing Kannada L4's three slots to
           `sari`/`illa`/`haudu` while skipping `beku` and `beda`, the words the
           lesson is actually about. First-needed keeps the slots on whatever the
           learner has to produce soonest. */
        const rank = new Map();
        priority.forEach((w, i) => {
            const k = String(w).toLowerCase();
            if (!rank.has(k)) rank.set(k, i);
        });
        const rankOf = (idx) => {
            const k = (vocabulary[idx]?.word || '').toLowerCase();
            return rank.has(k) ? rank.get(k) : Number.MAX_SAFE_INTEGER;
        };
        const order = seededIndices(scenarioIdx, vocabulary.length, vocabulary.length)
            .sort((a, b) => rankOf(a) - rankOf(b));
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
            .filter((k) => k.startsWith('linguapaws_reviewset_') || k.startsWith('linguapaws_contrast_'))
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

/* ── Confused pairs ─────────────────────────────────────────────────────────
   When a miss used one taught word in place of another (missHelp's `pairs`),
   the pair is recorded and comes back in a LATER lesson as one contrast screen
   in the review round. The pair chosen for a lesson is cached like the review
   set, so a reload mid-lesson asks the same screen it would have. */
const contrastKey = (lang, scenarioIdx) => `linguapaws_contrast_${lang}_${scenarioIdx}`;

/** Fire-and-forget: the learner said `said` where `needed` was wanted. */
export async function recordConfusion({ lang, said, needed, saidMeaning, neededMeaning, scenario }) {
    if (!lang || !said || !needed) return null;
    try {
        return await api.post('/api/progress/confusion', {
            lang, said, needed, saidMeaning, neededMeaning, scenario,
        });
    } catch (err) {
        console.warn('[srs] failed to record confusion', said, needed, err.message);
        return null;
    }
}

/** The pair to contrast in this lesson, or null. One per lesson at most. */
export async function ensureContrast(lang, scenarioIdx) {
    if (!lang) return null;
    try {
        const raw = localStorage.getItem(contrastKey(lang, scenarioIdx));
        if (raw) return JSON.parse(raw)?.pair || null;
    } catch { /* fall through */ }
    let pair = null;
    try {
        const due = await api.get(
            `/api/progress/confusions/due?lang=${encodeURIComponent(lang)}&scenario=${encodeURIComponent(scenarioIdx)}`
        );
        pair = due && due.said && due.needed ? due : null;
    } catch {
        return null; // offline — not cached, so the next entry asks again
    }
    try {
        localStorage.setItem(contrastKey(lang, scenarioIdx), JSON.stringify({ pair }));
    } catch { /* quota */ }
    return pair;
}

/** Fire-and-forget: how the contrast screen went. Two clean wins retire a pair. */
export async function recordContrastCheck({ lang, said, needed, correct, scenario }) {
    if (!lang || !said || !needed) return null;
    try {
        return await api.post('/api/progress/confusion/check', { lang, said, needed, correct, scenario });
    } catch (err) {
        console.warn('[srs] failed to record contrast check', said, needed, err.message);
        return null;
    }
}

/* ── Practice ───────────────────────────────────────────────────────────────
   What a practice session draws from, besides the curriculum: the SRS due
   queue, open confused pairs, and lesson screens whose answer had to be
   revealed. Each source fails independently — offline, practice is a top-up
   from the finished lessons alone. */

const getOr = (path, fallback) => api.get(path).then(r => (Array.isArray(r) ? r : fallback)).catch(() => fallback);

export async function fetchPracticeSources(lang, size = 10) {
    if (!lang) return { due: [], confusions: [], missed: [] };
    const q = encodeURIComponent(lang);
    const [due, confusions, missed, skills] = await Promise.all([
        getOr(`/api/progress/due?lang=${q}&limit=${size}`, []),
        getOr(`/api/progress/confusions/open?lang=${q}&limit=3`, []),
        getOr(`/api/progress/missed?lang=${q}&limit=${size}`, []),
        fetchSkillModel(lang),
    ]);
    return { due, confusions, missed, skills };
}

/** Fire-and-forget: a lesson screen whose answer had to be revealed. */
export async function recordMissedScreen({ lang, lessonIdx, kind, key }) {
    if (!lang || !key) return null;
    try {
        return await api.post('/api/progress/missed', { lang, lessonIdx, kind, key });
    } catch (err) {
        console.warn('[srs] failed to record missed screen', key, err.message);
        return null;
    }
}

/** Fire-and-forget: how a missed screen went when practice brought it back. */
export async function recordMissedCheck({ lang, lessonIdx, kind, key, correct }) {
    if (!lang || !key) return null;
    try {
        return await api.post('/api/progress/missed/check', { lang, lessonIdx, kind, key, correct });
    } catch (err) {
        console.warn('[srs] failed to record missed check', key, err.message);
        return null;
    }
}

/* ── Skills (adaptive phase 1: measure only) ───────────────────────────────
   What one settled screen said about each skill it tested — computed by
   skills.skillEvidence, folded into the learner's SkillStat on the server. */

/** Fire-and-forget: one screen's per-skill evidence. */
export async function recordSkillEvidence({ lang, items }) {
    if (!lang || !items?.length) return null;
    try {
        return await api.post('/api/progress/skills/evidence', { lang, items: items.slice(0, 40) });
    } catch (err) {
        console.warn('[srs] failed to record skill evidence', err.message);
        return null;
    }
}

/* ── The skill model, for adaptive selection (phase 2) ──────────────────────
   Prefetched when a lesson loads and memoised briefly, so the review round
   and practice never wait on it: SKILLS_TIMEOUT_MS and it is an empty model,
   which every caller treats as "no model" — the non-adaptive plan. */
export const SKILLS_TIMEOUT_MS = 1500;
const SKILLS_TTL_MS = 60000;
const skillMemo = new Map();   // lang -> { at, promise }
const withTimeout = (p, ms, fallback) => Promise.race([
    p, new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
]).catch(() => fallback);

/** The learner's skill model ([] offline, signed out, or slow). Never rejects. */
export function fetchSkillModel(lang) {
    if (!lang) return Promise.resolve([]);
    const hit = skillMemo.get(lang);
    if (hit && Date.now() - hit.at < SKILLS_TTL_MS) return hit.promise;
    const promise = withTimeout(fetchSkills(lang), SKILLS_TIMEOUT_MS, []);
    skillMemo.set(lang, { at: Date.now(), promise });
    /* A miss is not remembered: the next lesson asks again. */
    promise.then((r) => { if (!r?.length) skillMemo.delete(lang); });
    return promise;
}

/** Mastery per skill, weakest first ([] offline). */
export const fetchSkills = (lang, { weak = false } = {}) => (lang
    ? getOr(`/api/progress/skills?lang=${encodeURIComponent(lang)}${weak ? '&weak=1' : ''}`, [])
    : Promise.resolve([]));
