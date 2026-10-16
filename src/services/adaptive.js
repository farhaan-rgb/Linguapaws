/**
 * Adaptive selection — phase 2 of adaptive learning (ADAPTIVE.md).
 *
 * One rule decides which screens a practice session and an in-lesson Memory
 * check ask, given the learner's skill model (GET /api/progress/skills). It
 * only CHOOSES among screens the course already has, from lessons the learner
 * has been taught; it never changes what a screen asks or what is accepted —
 * grading stays in lessonEngine.scoreAnswer.
 *
 * A candidate is scored by the neediest skill it tests:
 *     weak 1.0 > learning 0.6 > new-but-taught 0.35 > strong 0.1
 * (a strong skill not seen for STALE_DAYS counts as learning: it is decaying),
 * plus a bonus for the sources that already had priority — an open confused
 * pair, an SRS-due word, a screen missed before. Then:
 *   - confused pairs are always taken (they are few, and retire themselves);
 *   - DUE_SHARE of the slots are held for due words, so the SRS still moves;
 *   - RETENTION_SHARE come from strong skills, oldest-seen first, so what is
 *     known stays known;
 *   - the rest go to the highest score;
 *   - and the chosen screens are ordered so one skill is not tested twice in
 *     a row (best effort — a plan that is all one skill cannot avoid it).
 *
 * Deterministic for a given seed. With no model the callers do not call this
 * at all and keep their old behaviour.
 */

import { CURRICULUM } from './curriculum.js';
import { tagStep, skillsFor, CONSTRUCTIONS, ORDER_ID } from './skills.js';
import * as engine from './lessonEngine.js';

export const NEED = { weak: 1, learning: 0.6, new: 0.35, strong: 0.1 };
export const SOURCE_BONUS = { confusion: 0.6, due: 0.4, missed: 0.3 };
export const STALE_DAYS = 21;
export const RETENTION_SHARE = 0.2;
export const DUE_SHARE = 0.4;
/* In practice, no more than this share of one kind (word reviews vs drills). */
export const KIND_SHARE = 0.6;

const DAY = 86400000;
const norm = (t) => engine.normalizeLatin(t);

/** True when there is a model worth adapting to. */
export const hasModel = (stats) => Array.isArray(stats) && stats.some(s => s?.skillId);

/** skillId -> stat, or an empty map. */
export function modelMap(stats) {
    const m = new Map();
    for (const s of stats || []) if (s?.skillId) m.set(s.skillId, s);
    return m;
}

/** A skill's level for selection: the server's, with stale strong as learning. */
export function levelOf(stat, now = Date.now()) {
    if (!stat) return 'new';
    let level = stat.level;
    if (!level) {
        if ((stat.evidence || 0) < 1) level = 'new';
        else level = stat.mastery < 0.5 ? 'weak' : stat.mastery >= 0.8 ? 'strong' : 'learning';
    }
    if (level === 'strong' && stat.lastSeen && now - new Date(stat.lastSeen).getTime() > STALE_DAYS * DAY) return 'learning';
    return level;
}

/* A stable 0..1 from a seed and a key, for tie-breaks a test can pin. */
function jitter(seed, key) {
    let h = (seed * 2654435761) >>> 0;
    for (const ch of String(key)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    return (h >>> 8) / 16777216;
}

/* Which kind wins a tie for "the skill this screen is for": the specific
   pattern over the word, the word over the catch-all order skill. */
const TYPE_RANK = { c: 3, e: 2, w: 1, order: 0 };
const typeRank = (id) => (id === ORDER_ID ? 0 : TYPE_RANK[id.split(':')[0]] ?? 0);

/**
 * The skills a candidate screen exercises. A one-word Memory check also
 * exercises every construction that word is a key of (*nanage* is half of
 * "I want" with nanage … beku), once that construction has been taught.
 */
export function skillsOfStep(step, { lang, lessonNo }) {
    const ids = [...tagStep(step, { lang, lessonNo }).skills];
    if (step?.kind === 'review' && !step.item?.contrast) {
        const tok = norm(step.expected);
        const tax = skillsFor(lang);
        for (const c of CONSTRUCTIONS[lang] || []) {
            const taught = (tax.get(c.id)?.lesson || Infinity) <= lessonNo;
            if (taught && !ids.includes(c.id) && c.parts.some(re => re.test(tok))) ids.push(c.id);
        }
    }
    return ids;
}

/** How much a set of skills needs practice: { need, skill, level }. */
export function needOf(skillIds, model, now = Date.now()) {
    let best = null;
    let sum = 0;
    for (const id of skillIds || []) {
        const level = levelOf(model.get(id), now);
        const n = NEED[level];
        sum += n;
        const better = !best || n > best.n
            || (n === best.n && (model.get(id)?.mastery ?? 0.5) < (model.get(best.skill)?.mastery ?? 0.5))
            || (n === best.n && (model.get(id)?.mastery ?? 0.5) === (model.get(best.skill)?.mastery ?? 0.5)
                && typeRank(id) > typeRank(best.skill));
        if (better) best = { n, skill: id, level };
    }
    if (!best) return { need: NEED.new, skill: null, level: 'new' };
    return { need: best.n + 0.25 * (sum / skillIds.length), skill: best.skill, level: best.level };
}

/**
 * Choose `size` of `candidates` for a learner.
 *   candidates — [{ key, skills: [id], source: 'confusion'|'due'|'missed'|..., kind? }]
 *                in the caller's priority order; duplicates by key are dropped
 *   model      — modelMap(stats)
 *   kindShare  — cap on one `kind`, or null for none
 * Returns the picks in play order, each with `adaptive: { skill, level, reason }`
 * where reason is 'confusion' | 'due' | 'retention' | 'weak' | 'score'.
 */
export function selectAdaptive({
    candidates = [], model = new Map(), size = 10, seed = 0, now = Date.now(),
    dueShare = DUE_SHARE, retentionShare = RETENTION_SHARE, kindShare = null,
} = {}) {
    const seen = new Set();
    const pool = [];
    for (const c of candidates) {
        if (!c?.key || seen.has(c.key)) continue;
        seen.add(c.key);
        const n = needOf(c.skills, model, now);
        const score = n.need + (SOURCE_BONUS[c.source] || 0) + 0.05 * jitter(seed, c.key);
        pool.push({ c, ...n, score });
    }
    const picked = [];
    const taken = new Set();
    const kindCap = kindShare ? Math.ceil(size * kindShare) : Infinity;
    const kindCount = (k) => picked.filter(p => p.c.kind === k).length;
    const take = (p, reason) => {
        if (picked.length >= size || taken.has(p.c.key)) return false;
        taken.add(p.c.key);
        picked.push({ ...p, reason });
        return true;
    };
    const byScore = (a, b) => b.score - a.score;
    const reasonOf = (p) => (p.level === 'weak' ? 'weak' : 'score');

    /* 1. Confused pairs. */
    pool.filter(p => p.c.source === 'confusion').forEach(p => take(p, 'confusion'));
    /* 2. A share held for due words, neediest first. */
    const dueSlots = Math.ceil(size * dueShare);
    pool.filter(p => p.c.source === 'due').sort(byScore).slice(0, dueSlots).forEach(p => take(p, 'due'));
    /* 3. Retention: strong skills, held back until the end so the needy ones
          come first, but reserved now. */
    const strong = pool.filter(p => p.level === 'strong' && !taken.has(p.c.key));
    const wantStrong = strong.length || picked.some(p => p.level === 'strong')
        ? Math.max(1, Math.round(size * retentionShare)) : 0;
    const strongHeld = () => picked.filter(p => p.level === 'strong').length;
    const reserve = () => Math.min(Math.max(wantStrong - strongHeld(), 0), strong.filter(p => !taken.has(p.c.key)).length);
    /* 4. The rest by score, minding the kind cap. */
    const rest = pool.filter(p => p.level !== 'strong').sort(byScore);
    for (const p of rest) {
        if (picked.length >= size - reserve()) break;
        if (taken.has(p.c.key) || (p.c.kind && kindCount(p.c.kind) >= kindCap)) continue;
        take(p, reasonOf(p));
    }
    /* 5. Retention picks: the longest unseen first. */
    const seenAt = (p) => { const t = model.get(p.skill)?.lastSeen; return t ? new Date(t).getTime() : 0; };
    strong.sort((a, b) => (seenAt(a) - seenAt(b)) || (jitter(seed, a.c.key) - jitter(seed, b.c.key)));
    for (const p of strong) {
        if (strongHeld() >= wantStrong) break;
        if (p.c.kind && kindCount(p.c.kind) >= kindCap) continue;
        take(p, 'retention');
    }
    /* 6. Anything still empty: best score, then without the kind cap. */
    for (const p of [...pool].sort(byScore)) {
        if (picked.length >= size) break;
        if (p.c.kind && kindCount(p.c.kind) >= kindCap) continue;
        take(p, p.level === 'strong' ? 'retention' : reasonOf(p));
    }
    for (const p of [...pool].sort(byScore)) take(p, p.level === 'strong' ? 'retention' : reasonOf(p));

    return spreadBySkill(picked.map(p => ({ ...p.c, adaptive: { skill: p.skill, level: p.level, reason: p.reason } })));
}

/** Reorder so no two neighbours are for the same skill, where that is possible.
 *  `prev` is the skill of the screen before the list. Greedy, stable. */
export function spreadBySkill(list, prev = null) {
    const left = [...list];
    const out = [];
    let last = prev;
    while (left.length) {
        let i = left.findIndex(x => !x.adaptive?.skill || x.adaptive.skill !== last);
        if (i < 0) i = 0;
        const [x] = left.splice(i, 1);
        out.push(x);
        last = x.adaptive?.skill || null;
    }
    return out;
}

/* ── Saying why ────────────────────────────────────────────────────────────
   A screen picked because of a weak skill carries one quiet line saying so.
   `*…*` marks the course word, for the screen to set in italics. */
const cap = (w) => String(w || '').charAt(0).toUpperCase() + String(w || '').slice(1);
const lcFirst = (s) => String(s || '').charAt(0).toLowerCase() + String(s || '').slice(1);

/** The caption for a weak skill, or '' when there is nothing honest to say. */
export function whyCaption(lang, skillId, { confusions = [] } = {}) {
    if (!skillId) return '';
    const s = skillsFor(lang).get(skillId);
    if (skillId === ORDER_ID) return 'Because word order tripped you up before';
    if (!s) return '';
    if (s.type === 'word') {
        const word = (CURRICULUM[lang] || []).flatMap(l => l.vocabulary || [])
            .find(v => `w:${norm(v.word).replace(/ /g, '-')}` === skillId)?.word || skillId.slice(2);
        const k = norm(word);
        const pair = (confusions || []).find(c => norm(c?.needed) === k || norm(c?.said) === k);
        if (pair) {
            const other = norm(pair.needed) === k ? pair.said : pair.needed;
            return `Because *${cap(word)}* and *${cap(other)}* got mixed up before`;
        }
        return `Because *${cap(word)}* tripped you up before`;
    }
    if (s.type === 'ending') return `Because the *-${skillId.slice(2)}* ending tripped you up before`;
    if (s.type === 'construction') return `Because ${lcFirst(s.label)} tripped you up before`;
    return '';
}

/** Give at most one screen per round (phase) a `why`, and only a weak pick. */
export function withCaptions(steps, lang, { confusions = [] } = {}) {
    const done = new Set();
    return steps.map(s => {
        const a = s.adaptive;
        if (!a || a.level !== 'weak' || done.has(s.phase)) return s;
        const why = whyCaption(lang, a.skill, { confusions });
        if (!why) return s;
        done.add(s.phase);
        return { ...s, why };
    });
}

/* ── The in-lesson Memory check ────────────────────────────────────────────
   Its slots are word reviews (Chat asks the same three words), so candidates
   are the due words and every word of the lessons BEFORE this one. Returns
   review items `{ word, meaning, native, source, adaptive, why? }`, or null
   with no model — the caller then does what it always did. Fewer than `size`
   is fine: the caller tops up from the current lesson as before. */
export function pickReviewItems({
    lang, scenarioIdx, due = [], stats = null, confusions = [], size = 3, now = Date.now(),
} = {}) {
    if (!hasModel(stats)) return null;
    const lessons = CURRICULUM[lang] || [];
    const lessonNo = scenarioIdx + 1;
    const earlier = lessons.slice(0, scenarioIdx);
    const vocab = new Map();
    earlier.forEach(l => (l.vocabulary || []).forEach(v => {
        const k = norm(v.word);
        if (k && !vocab.has(k)) vocab.set(k, v);
    }));
    const current = new Set((lessons[scenarioIdx]?.vocabulary || []).map(v => norm(v.word)));
    const asStep = (word) => ({ kind: 'review', phase: 'review', expected: word, item: { word } });
    const cands = [];
    for (const d of due || []) {
        if (!d?.word) continue;
        const k = norm(d.word);
        /* A word met minutes ago in this lesson's teach round is not a memory check. */
        if (current.has(k) && !vocab.has(k)) continue;
        const v = vocab.get(k);
        cands.push({ key: k, kind: 'word', source: 'due', skills: skillsOfStep(asStep(d.word), { lang, lessonNo }),
            item: { word: d.word, meaning: d.meaning || v?.meaning || '', native: v?.native || '', source: 'due' } });
    }
    for (const [k, v] of vocab) {
        cands.push({ key: k, kind: 'word', source: 'earlier', skills: skillsOfStep(asStep(v.word), { lang, lessonNo }),
            item: { word: v.word, meaning: v.meaning || '', native: v.native || '', source: 'earlier' } });
    }
    if (!cands.length) return null;
    const picks = selectAdaptive({ candidates: cands, model: modelMap(stats), size, seed: scenarioIdx, now });
    const captioned = withCaptions(picks.map(p => ({ ...p, phase: 'review' })), lang, { confusions });
    return captioned.map(p => ({
        ...p.item,
        adaptive: p.adaptive,
        ...(p.why ? { why: p.why } : {}),
    }));
}
