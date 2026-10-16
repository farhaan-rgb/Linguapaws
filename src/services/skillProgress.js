/* What the learner gets told about their own skill model — the end-of-lesson
   "This lesson worked on…" block and the lesson map's "Miko's focus for you".
   Pure, so the rules can be tested and reused by a full "My skills" page.

   Three promises, all enforced here rather than in the components:
   - at most MAX_SHOWN skills anywhere, and never a mastery number;
   - a skill is shown only with SHOW_MIN_EVIDENCE behind it — the model does
     not record how much of that came from speech, but spoken attempts already
     enter at half weight or less (ADAPTIVE.md), so evidence is the measure;
   - a results line names only a skill this session posted evidence for, and
     its direction is the server's own rule replayed on exactly that evidence. */
import { skillsFor } from './skills';

export const SHOW_MIN_EVIDENCE = 1.5;
export const MAX_SHOWN = 3;
/* The lesson's own evidence for a skill must be worth more than a teach screen
   (×0.3) seen in passing before the lesson can claim to have worked on it. */
export const SESSION_MIN_WEIGHT = 0.6;
/* Smallest rise worth calling "getting stronger": one right answer at full
   weight moves a 0.9 skill by 0.03. */
export const UP_MIN = 0.03;
/* Under this mastery a skill is one Miko would bring back (the server's weak line). */
export const TRICKY_BELOW = 0.5;

/* Mirrors backend/services/skillStats.js — change both. */
const PRIOR = 0.5;
const RATE = 0.3;
export const nextMastery = (m, score, weight) => {
    const a = 1 - (1 - RATE) ** weight;
    const base = typeof m === 'number' ? m : PRIOR;
    return Math.min(1, Math.max(0, base + a * (score - base)));
};

const TYPE_RANK = { c: 3, e: 2, w: 1, order: 0 };
const typeRank = (id) => (id === 'order' ? 0 : TYPE_RANK[String(id).split(':')[0]] ?? 0);

/** The plain-English label of a skill, or null if the taxonomy has none. */
export function skillLabel(lang, skillId) {
    return skillsFor(lang).get(skillId)?.label || null;
}

/**
 * What one lesson or practice round did to the skills it touched.
 *
 * `before`: the model fetched when the lesson opened (null = unknown).
 * `posts`: every evidence post this session, in order — each an array of
 * `{ skillId, score, weight }` exactly as sent. Each post is replayed the way
 * the server applies it (first item per skill, zero weight skipped), so
 * `after` is what the server now holds as long as the posts landed.
 *
 * Returns up to MAX_SHOWN `{ skillId, label, mark }`, mark one of
 * `up` (mastery rose), `new` (no real evidence before this session and it
 * went well), `tricky` (still under the weak line after this session; at most
 * one). Empty when the model is unknown or nothing has enough evidence.
 */
export function sessionProgress({ lang, before, posts = [] }) {
    if (!lang || !Array.isArray(before)) return [];
    const prev = new Map(before.filter(s => s?.skillId).map(s => [s.skillId, s]));
    const now = new Map();     // skillId -> { mastery, evidence }
    const own = new Map();     // skillId -> { weight, scored }
    for (const items of posts) {
        const seen = new Set();
        for (const it of items || []) {
            if (!it?.skillId || seen.has(it.skillId) || !(it.weight > 0)) continue;
            seen.add(it.skillId);
            const p = now.get(it.skillId) || prev.get(it.skillId) || {};
            now.set(it.skillId, {
                mastery: nextMastery(p.mastery, it.score, it.weight),
                evidence: (p.evidence || 0) + it.weight,
            });
            const o = own.get(it.skillId) || { weight: 0, scored: 0 };
            own.set(it.skillId, { weight: o.weight + it.weight, scored: o.scored + it.score * it.weight });
        }
    }
    const rows = [];
    for (const [skillId, after] of now) {
        const label = skillLabel(lang, skillId);
        const o = own.get(skillId);
        if (!label || after.evidence < SHOW_MIN_EVIDENCE || o.weight < SESSION_MIN_WEIGHT) continue;
        const b = prev.get(skillId);
        const from = typeof b?.mastery === 'number' ? b.mastery : PRIOR;
        const fresh = !b || (b.evidence || 0) < 1;
        const delta = after.mastery - from;
        const mean = o.scored / o.weight;
        let mark = null;
        if (after.mastery < TRICKY_BELOW && mean < 0.6) mark = 'tricky';
        else if (fresh && mean >= 0.6 && after.mastery >= PRIOR) mark = 'new';
        else if (delta >= UP_MIN) mark = 'up';
        if (mark) rows.push({ skillId, label, mark, delta, mastery: after.mastery, rank: typeRank(skillId) });
    }
    /* Patterns before single words: "I want with nanage … beku" says more
       about the learner than "Beku". Then the biggest move. */
    const good = rows.filter(r => r.mark !== 'tricky')
        .sort((a, b) => b.rank - a.rank || b.delta - a.delta);
    const tricky = rows.filter(r => r.mark === 'tricky')
        .sort((a, b) => b.rank - a.rank || a.mastery - b.mastery).slice(0, 1);
    const shown = [...good.slice(0, MAX_SHOWN - tricky.length), ...tricky];
    return shown.map(({ skillId, label, mark }) => ({ skillId, label, mark }));
}

/**
 * The lesson map's focus: up to MAX_SHOWN weak skills with enough evidence,
 * weakest first, patterns before words on a tie. `state` says which card to
 * draw: `focus` (there are some), `clear` (enough evidence, nothing weak),
 * `thin` (too little to say anything), `none` (no model — draw nothing).
 */
export function focusSkills({ lang, model, finished = Infinity }) {
    if (!lang || !Array.isArray(model)) return { state: 'none', items: [] };
    const tax = skillsFor(lang);
    const known = model.filter(s => s?.skillId && tax.has(s.skillId)
        && (tax.get(s.skillId).lesson ?? 1) <= finished
        && (s.evidence || 0) >= SHOW_MIN_EVIDENCE);
    const weak = known.filter(s => s.mastery < TRICKY_BELOW)
        .sort((a, b) => (a.mastery - b.mastery) || (typeRank(b.skillId) - typeRank(a.skillId)))
        .slice(0, MAX_SHOWN)
        .map(s => ({ skillId: s.skillId, label: tax.get(s.skillId).label }));
    if (weak.length) return { state: 'focus', items: weak };
    return { state: known.length ? 'clear' : 'thin', items: [] };
}

/**
 * The model a practice round aimed at `ids` is built from: every other weak
 * skill is read as `learning`, so adaptive selection spends its weak-skill
 * screens on the focus and not on the rest of a long weak list.
 */
export function focusModel(model, ids) {
    const want = new Set(ids || []);
    if (!want.size || !Array.isArray(model)) return model;
    return model.map(s => (want.has(s?.skillId) || s?.level !== 'weak' ? s
        : { ...s, level: 'learning', weak: false, mastery: Math.max(s.mastery ?? 0, 0.6) }));
}
