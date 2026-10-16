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
import { skillsFor } from './skills.js';

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

/* ── The "My skills" page ─────────────────────────────────────────────────
   Every skill the learner has reached, in three groups by the same lines the
   rest of the app uses — and none of them called "weak". Under
   SHOW_MIN_EVIDENCE a skill is "still getting to know": counted, never judged. */
export const STRONG_FROM = 0.8;
export const TYPE_ORDER = ['word', 'ending', 'construction', 'order'];

/** Which way the last few answers lean: `up`, `steady` or `wobbly`. Needs four. */
export function trendOf(recent = []) {
    const r = (recent || []).filter(x => typeof x === 'number');
    if (r.length < 4) return 'steady';
    const tail = r.slice(-3), head = r.slice(0, -3);
    const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
    const d = mean(tail) - mean(head);
    /* One slip after a run of right answers is not "wobbly": that takes
       most of the last three going wrong. */
    if (d >= 0.25 && mean(tail) >= 0.66) return 'up';
    if (d <= -0.25 && mean(tail) < 0.5) return 'wobbly';
    return 'steady';
}

/**
 * `reached` is the last lesson (1-based) the learner has opened; a skill from
 * a later lesson never appears, whatever the model says. Returns
 * `{ strong, learning, tricky, unknown }`, each a list of
 * `{ skillId, label, type, lesson, recent, trend }` — tricky weakest first,
 * the others by type then lesson.
 */
export function skillBoard({ lang, model, reached = Infinity }) {
    const tax = skillsFor(lang);
    const out = { strong: [], learning: [], tricky: [], unknown: [] };
    for (const s of model || []) {
        const t = s?.skillId && tax.get(s.skillId);
        if (!t || (t.lesson ?? 1) > reached) continue;
        const row = { skillId: s.skillId, label: t.label, type: t.type, lesson: t.lesson ?? 1,
                      recent: (s.recent || []).slice(-8), trend: trendOf(s.recent), mastery: s.mastery };
        if ((s.evidence || 0) < SHOW_MIN_EVIDENCE) out.unknown.push(row);
        else if (s.mastery < TRICKY_BELOW) out.tricky.push(row);
        else if (s.mastery >= STRONG_FROM) out.strong.push(row);
        else out.learning.push(row);
    }
    const byType = (a, b) => (TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)) || (a.lesson - b.lesson);
    out.strong.sort(byType); out.learning.sort(byType); out.unknown.sort(byType);
    out.tricky.sort((a, b) => (a.mastery - b.mastery) || (typeRank(b.skillId) - typeRank(a.skillId)));
    for (const k of Object.keys(out)) out[k].forEach(r => { delete r.mastery; });  // no numbers leave here
    return out;
}

/* ── The miss profile, read for a learner ─────────────────────────────────
   srs.fetchMissProfile returns `[{ kind, label, count, share, lastSeen,
   recentWords }]`, most frequent first. Two rules stand between that list and
   anything the page is allowed to claim, and both are MISS-TAXONOMY.md's, not
   new ones:

   - a kind is a STANDING WEAKNESS at `count >= 3 && share >= 0.25`. Below
     that it is one of the things that happened, not a thing about the learner.
   - so the smallest profile in which a share can mean anything at all is
     3 / 0.25 = 12 misses. Under twelve the count half of the rule is the only
     half doing work, and a percentage drawn from it is noise with a bar
     around it. PATTERN_MIN is that number, derived rather than chosen.

   And the asymmetry the whole card has to respect: nothing ever records that
   the learner did NOT make a spelling mistake. A kind with no misses against
   it is no evidence, never a strength — so nothing here may be read as the
   good end of an axis. */
export const STANDING_MIN_COUNT = 3;
export const STANDING_MIN_SHARE = 0.25;
export const PATTERN_MIN = Math.ceil(STANDING_MIN_COUNT / STANDING_MIN_SHARE);

export const isStandingWeakness = (row) => !!row
    && (row.count || 0) >= STANDING_MIN_COUNT && (row.share || 0) >= STANDING_MIN_SHARE;

/**
 * What the page may say about how this learner gets things wrong.
 *
 * `rows` are the diagnosed kinds only — `unknown` is the engine's floor and a
 * bar for "we could not say" tells the learner nothing about themselves — with
 * `share` recomputed over that same denominator, so the bars and the
 * "N misses" caption cannot disagree. `total` is that denominator.
 *
 * @returns {{ total:number, rows:Array, top:Object|null, standing:Object|null,
 *             enough:boolean }}
 */
export function missBoard(profile) {
    const rows = (Array.isArray(profile) ? profile : [])
        .filter(r => r && r.kind && r.kind !== 'unknown' && (r.count || 0) > 0)
        .map(r => ({ kind: r.kind, label: r.label || r.kind, count: r.count || 0,
                     lastSeen: r.lastSeen || null, recentWords: (r.recentWords || []).slice(0, 3) }))
        .sort((a, b) => b.count - a.count);
    const total = rows.reduce((s, r) => s + r.count, 0);
    for (const r of rows) r.share = total ? r.count / total : 0;
    const top = rows[0] || null;
    const enough = total >= PATTERN_MIN;
    return { total, rows, top, standing: enough && isStandingWeakness(top) ? top : null, enough };
}
