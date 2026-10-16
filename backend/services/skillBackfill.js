/* Skill backfill: seed the per-learner skill model (SkillStat) from what a
   learner did BEFORE skill evidence existed (633f4a8, 2026-10-16) — the SRS
   history in LearnedWord, mixed-up pairs in Confusion, revealed screens in
   MissedScreen, and the lessons they finished.

   Pure functions, no database: scripts/backfill-skills.js does the I/O. The
   evidence goes through skillStats.applyEvidence, the same rule the live route
   uses, so mastery and level come out as if the items had been posted.

   ADAPTIVE.md "Backfill" documents the mapping; change both. */

const path = require('node:path');
const { applyEvidence, PRIOR, RATE } = require('./skillStats');

const SRC = path.resolve(__dirname, '../../src/services');
const { CURRICULUM } = require(path.join(SRC, 'curriculum.js'));
const skills = require(path.join(SRC, 'skills.js'));
const { buildLessonSteps, missedKeyFor } = require(path.join(SRC, 'stepPlan.js'));
const engine = require(path.join(SRC, 'lessonEngine.js'));

/* Bump when the mapping changes; a learner already backfilled at an older
   version is still skipped (re-running never adds evidence twice). */
const BACKFILL_VERSION = 1;

/* Weights. All indirect and older than live evidence, so all below what a
   live screen of the same kind carries (WEIGHTS in skills.js: a first-try
   review answer is 1.0, a wrong word 1.0, a confused partner 0.5). */
const BACKFILL_WEIGHTS = {
    /* LearnedWord: one item per word, score from its SRS history, weight
       growing with how many times it was reviewed. Never-reviewed words
       (taught, not yet tested) say nothing and are skipped. */
    srsPerReview: 0.15,
    srsMax: 0.45,
    srsPhrase: 0.5,         // multiplier: a phrase's SRS record is spread over every skill it tags
    /* score = srsRateShare * (right reviews / reviews) + (1 - share) * box / srsTopBox */
    srsRateShare: 0.6,
    srsTopBox: 4,
    /* Confusion said/needed (live: wrongWord 1.0 / confusedWith 0.5). */
    confusedNeeded: 0.6,    // the word that was needed, and the endings/constructions it keys
    confusedSaid: 0.3,      // the taught word said in its place
    confusedRepeat: 0.15,   // added per extra occurrence (count > 1), item weight capped at 1
    contrastWin: 0.15,      // per clean contrast answer later (wins), both words, score 1, at most 2
    /* MissedScreen: the screen rebuilt and tagged, score 0 per core skill. */
    missed: 0.4,
    missedRepeat: 0.2,      // per extra miss, capped at 0.8
    missedRetired: 0.2,     // retired = one clean first-try answer in practice: score 1
    /* Finished lessons: skills first tested in a lesson the learner completed,
       score 1. Small: a lesson can be finished with reveals. It keeps "taught
       and passed" from reading as untouched PRIOR (0.5) while never on its own
       reaching WEAK_MIN_EVIDENCE, so it cannot make a skill strong. */
    completedLesson: 0.15,
};
const W = BACKFILL_WEIGHTS;

const SKILL_ID = /^(order|[wec]:[a-z0-9-]{1,48})$/;
const r3 = (x) => Math.round(x * 1000) / 1000;
const t = (d) => (d ? new Date(d).getTime() : 0);
const lessonsOf = (lang) => CURRICULUM[lang] || [];

/* A word's skills as tagging sees it: the headword (alt forms map to it),
   plus any ending or one-token construction it carries. */
function wordSkills(word, lang, lessonNo) {
    const n = lessonNo || lessonsOf(lang).length;
    return skills.tagAnswer(word, { lang, lessonNo: n, order: false }).skills.filter(id => SKILL_ID.test(id));
}

function fromLearnedWord(lw, lang) {
    const reviews = lw.reviews || 0;
    if (reviews <= 0) return { items: [], skipped: 'untested' };
    const right = Math.max(0, reviews - (lw.lapses || 0));
    const box = Math.min(Math.max(lw.box || 0, 0), W.srsTopBox);
    const score = r3(W.srsRateShare * (right / reviews) + (1 - W.srsRateShare) * (box / W.srsTopBox));
    let weight = Math.min(W.srsMax, W.srsPerReview * reviews);
    let ids;
    if (lw.kind === 'phrase') {
        const lessonNo = Number.isInteger(lw.lessonIdx) ? lw.lessonIdx + 1 : undefined;
        ids = skills.tagAnswer(lw.word, { lang, lessonNo: lessonNo || lessonsOf(lang).length, order: true }).skills
            .filter(id => SKILL_ID.test(id));
        weight *= W.srsPhrase;
    } else {
        ids = wordSkills(lw.word, lang).filter(id => id.startsWith('w:'));
    }
    if (!ids.length) return { items: [], skipped: 'unmapped' };
    const at = t(lw.lastReviewedAt || lw.updatedAt);
    return { items: ids.map(skillId => ({ skillId, score, weight: r3(weight), at, source: 'srs' })) };
}

function fromConfusion(c, lang) {
    const needed = wordSkills(c.needed, lang);
    const said = wordSkills(c.said, lang).filter(id => id.startsWith('w:') && !needed.includes(id));
    if (!needed.length && !said.length) return { items: [], skipped: 'unmapped' };
    const extra = Math.max(0, (c.count || 1) - 1);
    const at = t(c.createdAt || c.lastSeen);
    const items = [
        ...needed.map(skillId => ({ skillId, score: 0, weight: r3(Math.min(1, W.confusedNeeded + extra * W.confusedRepeat)), at, source: 'confusion' })),
        ...said.map(skillId => ({ skillId, score: 0, weight: r3(Math.min(1, W.confusedSaid + extra * W.confusedRepeat)), at, source: 'confusion' })),
    ];
    const wins = Math.min(2, c.wins || 0);
    if (wins) {
        const later = Math.max(at + 1, t(c.updatedAt));
        for (const skillId of [...needed.filter(id => id.startsWith('w:')), ...said]) {
            items.push({ skillId, score: 1, weight: r3(wins * W.contrastWin), at: later, source: 'contrast-win' });
        }
    }
    return { items };
}

/* Rebuild a missed screen: the lesson's own plan, matched by the key the app
   stored it under (missedKeyFor), then tagged exactly as the live screen was. */
const planCache = new Map();
function screenFor(m, lang) {
    const lessons = lessonsOf(lang);
    const lesson = lessons[m.lessonIdx];
    if (!lesson) return null;
    const ck = `${lang}|${m.lessonIdx}`;
    if (!planCache.has(ck)) {
        let steps = [];
        try { steps = buildLessonSteps(lesson, null, lessons); } catch { steps = []; }
        planCache.set(ck, steps);
    }
    const norm = (k) => String(k || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const step = planCache.get(ck).find(s => {
        const k = missedKeyFor(s, m.lessonIdx);
        return k && k.kind === m.kind && norm(k.key) === m.keyNorm;
    });
    if (step) return step;
    /* Not in the default plan (an adaptive or pool screen): a word is still a
       word; a drill is found in the lesson's own phrases/conversations. */
    if (m.kind === 'word') return { kind: 'teach', phase: 'teach', expected: m.key, slice: [{ word: m.key }] };
    const d = [...(lesson.phrases || []), ...(lesson.conversations || [])].find(x => norm(x.correct) === m.keyNorm);
    return d ? { kind: 'drill', phase: 'phrase', expected: d.correct, variants: d.acceptable || [] } : null;
}

function fromMissedScreen(m, lang) {
    const step = screenFor(m, lang);
    if (!step) return { items: [], skipped: 'unresolved' };
    const tag = skills.tagStep(step, { lang, lessonNo: m.lessonIdx + 1 });
    const ids = (tag.core || tag.skills).filter(id => SKILL_ID.test(id));
    if (!ids.length) return { items: [], skipped: 'untagged' };
    const at = t(m.createdAt || m.lastMissed);
    const weight = r3(Math.min(0.8, W.missed + Math.max(0, (m.count || 1) - 1) * W.missedRepeat));
    const items = ids.map(skillId => ({ skillId, score: 0, weight, at, source: 'missed' }));
    if (m.retired) {
        const later = Math.max(at + 1, t(m.updatedAt));
        ids.forEach(skillId => items.push({ skillId, score: 1, weight: W.missedRetired, at: later, source: 'missed-retired' }));
    }
    return { items };
}

/* lessonProgress[lang] is the highest finished lesson index (0-based). */
function fromCompletedLessons(lastIdx, lang) {
    if (!Number.isInteger(lastIdx) || lastIdx < 0) return [];
    const items = [];
    for (const s of skills.skillsFor(lang).values()) {
        if (s.lesson && s.lesson - 1 <= lastIdx && SKILL_ID.test(s.id)) {
            items.push({ skillId: s.id, score: 1, weight: W.completedLesson, at: s.lesson, source: 'completed' });
        }
    }
    return items;
}

/**
 * Every backfill item for one learner in one language, oldest first.
 * `cutoff` (ms) — when this learner's live evidence began; source rows created
 * at or after it are left out, since live evidence already covers them.
 * Returns { items, counts } where counts says what was used and skipped.
 */
function evidenceFor({ lang, learnedWords = [], confusions = [], missedScreens = [], lastLessonIdx = null, cutoff = null }) {
    const counts = {};
    const bump = (k) => { counts[k] = (counts[k] || 0) + 1; };
    const before = (row) => !cutoff || t(row.createdAt) < cutoff;
    const items = [...fromCompletedLessons(lastLessonIdx, lang)];
    if (items.length) counts.completedSkills = items.length;
    const run = (rows, fn, name) => rows.forEach(row => {
        if (!before(row)) return bump(`${name}:afterCutoff`);
        const r = fn(row, lang);
        if (r.skipped) return bump(`${name}:${r.skipped}`);
        bump(`${name}:used`);
        items.push(...r.items);
    });
    run(learnedWords, fromLearnedWord, 'learnedWord');
    run(confusions, fromConfusion, 'confusion');
    run(missedScreens, fromMissedScreen, 'missedScreen');
    items.sort((a, b) => a.at - b.at);
    return { items, counts };
}

/** Fold items into one fresh stat per skill, from PRIOR, by the live rule. */
function foldBackfill(items) {
    const by = new Map();
    for (const it of items) {
        if (!(it.weight > 0)) continue;
        const prev = by.get(it.skillId) || null;
        by.set(it.skillId, applyEvidence(prev, it, new Date(it.at || 0)));
    }
    return by;
}

/**
 * Put backfilled evidence UNDER a stat that already has live evidence, as if
 * the backfill had arrived first. Each live item is m <- (1-a)m + a*s with
 * 1-a = (1-RATE)^w, so changing the starting point by d changes the end by
 * d * (1-RATE)^(sum of live weights) = d * (1-RATE)^evidence. Live evidence
 * keeps its full effect; nothing it set is overwritten.
 */
function rebase(live, bf) {
    if (!live) return { ...bf };
    const carry = (1 - RATE) ** (live.evidence || 0);
    const mastery = Math.min(1, Math.max(0, (live.mastery ?? PRIOR) + carry * (bf.mastery - PRIOR)));
    return {
        mastery: Math.round(mastery * 10000) / 10000,
        attempts: (live.attempts || 0) + bf.attempts,
        evidence: r3((live.evidence || 0) + bf.evidence),
        lastSeen: live.lastSeen,
        lastOutcome: live.lastOutcome,
        recent: [...(bf.recent || []), ...(live.recent || [])].slice(-8),
    };
}

/**
 * The writes for one learner in one language. `existing` is their SkillStat
 * docs. A language already backfilled (any doc carrying `backfill`) yields
 * nothing — the idempotency rule.
 */
function planFor({ existing = [], ...src }, now = new Date()) {
    if (existing.some(d => d.backfill)) return { already: true, writes: [], counts: {} };
    const { items, counts } = evidenceFor(src);
    const folded = foldBackfill(items);
    const byId = new Map(existing.map(d => [d.skillId, d]));
    const writes = [];
    for (const [skillId, bf] of folded) {
        const live = byId.get(skillId) || null;
        const next = rebase(live, bf);
        writes.push({
            skillId,
            live: !!live,
            liveUpdatedAt: live?.updatedAt || null,
            set: {
                ...next,
                backfill: { v: BACKFILL_VERSION, at: now, attempts: bf.attempts, evidence: bf.evidence, mastery: bf.mastery },
            },
        });
    }
    return { already: false, writes, counts, items: items.length };
}

module.exports = {
    BACKFILL_VERSION, BACKFILL_WEIGHTS,
    evidenceFor, foldBackfill, rebase, planFor,
    fromLearnedWord, fromConfusion, fromMissedScreen, fromCompletedLessons,
    _engine: engine,
};
