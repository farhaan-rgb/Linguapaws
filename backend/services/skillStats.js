/* Skill stats: validation, the mastery update and the weak flag, apart from
   the route so they can be tested without a database. Same pattern as
   missedScreens.js. The rules are documented in ADAPTIVE.md — change both. */

/* Mastery starts at PRIOR (nothing known either way). One item of evidence
   (score s in 0..1, weight w in 0..1) moves it toward s by
       a = 1 - (1 - RATE)^w,   m <- m + a * (s - m)
   so a full-weight item moves it RATE of the way, and two half-weight items
   move it exactly as far as one full one. */
const PRIOR = 0.5;
const RATE = 0.3;
const RECENT = 8;
/* Weak: enough evidence to say so, and mastery under the line. */
const WEAK_BELOW = 0.5;
const WEAK_MIN_EVIDENCE = 1;
const STRONG_FROM = 0.8;

const SKILL_ID = /^(order|[wec]:[a-z0-9-]{1,48})$/;
const MAX_ITEMS = 40;

const str = (v, max = 40) => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);
const num01 = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : null);

/* Strings and bounded numbers only, so nothing in the body becomes an operator. */
function validateEvidence(body = {}) {
    const lang = str(body.lang);
    if (!lang || lang.startsWith('$') || lang.includes('.')) return { error: 'lang is required' };
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > MAX_ITEMS) {
        return { error: `items must be 1-${MAX_ITEMS} entries of { skillId, score, weight }` };
    }
    const seen = new Set();
    const items = [];
    for (const it of body.items) {
        const skillId = typeof it?.skillId === 'string' && SKILL_ID.test(it.skillId) ? it.skillId : null;
        const score = num01(it?.score);
        const weight = num01(it?.weight);
        if (!skillId || score === null || weight === null) return { error: 'bad item' };
        if (weight === 0 || seen.has(skillId)) continue;
        seen.add(skillId);
        items.push({ skillId, score, weight });
    }
    if (!items.length) return { error: 'no evidence' };
    return { lang, items };
}

const nextMastery = (m, score, weight) => {
    const a = 1 - (1 - RATE) ** weight;
    const base = typeof m === 'number' ? m : PRIOR;
    return Math.min(1, Math.max(0, base + a * (score - base)));
};

/** The new state of one stat after one item. `prev` may be null (first time). */
function applyEvidence(prev, item, now = new Date()) {
    const p = prev || {};
    return {
        mastery: Math.round(nextMastery(p.mastery, item.score, item.weight) * 10000) / 10000,
        attempts: (p.attempts || 0) + 1,
        evidence: Math.round(((p.evidence || 0) + item.weight) * 1000) / 1000,
        lastSeen: now,
        lastOutcome: item.score,
        recent: [...(p.recent || []), Math.round(item.score * 100) / 100].slice(-RECENT),
    };
}

const levelOf = (s) => {
    if ((s.evidence || 0) < WEAK_MIN_EVIDENCE) return 'new';
    if (s.mastery < WEAK_BELOW) return 'weak';
    return s.mastery >= STRONG_FROM ? 'strong' : 'learning';
};

const skillPayload = (d) => ({
    skillId: d.skillId,
    mastery: d.mastery,
    attempts: d.attempts,
    evidence: d.evidence,
    lastSeen: d.lastSeen,
    lastOutcome: d.lastOutcome,
    recent: d.recent || [],
    level: levelOf(d),
    weak: levelOf(d) === 'weak',
});

/** Weakest first: weak ones, then by mastery, then most evidence. */
const byWeakness = (a, b) => (Number(b.weak) - Number(a.weak)) || (a.mastery - b.mastery) || (b.evidence - a.evidence);

module.exports = {
    PRIOR, RATE, WEAK_BELOW, WEAK_MIN_EVIDENCE, STRONG_FROM,
    validateEvidence, nextMastery, applyEvidence, levelOf, skillPayload, byWeakness,
};
