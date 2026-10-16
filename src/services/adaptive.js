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
import { tagStep, skillsFor, CONSTRUCTIONS, ORDER_ID, wordSkillId } from './skills.js';
import * as engine from './lessonEngine.js';
import { genDrillsEnabled, isGenerated } from './drillPools.js';

export const NEED = { weak: 1, learning: 0.6, new: 0.35, strong: 0.1 };
export const SOURCE_BONUS = { confusion: 0.6, due: 0.4, missed: 0.3 };
export const STALE_DAYS = 21;
export const RETENTION_SHARE = 0.2;
export const DUE_SHARE = 0.4;
/* In practice, no more than this share of one kind (word reviews vs drills). */
export const KIND_SHARE = 0.6;
/* How much each earlier pick for the same skill lowers the next one. */
export const REPEAT_PENALTY = 0.3;

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
    /* 4. The rest by score, minding the kind cap. Each pick for a skill
          lowers the next one for the same skill by REPEAT_PENALTY, so one
          weak skill gets several screens but not the whole session. */
    const rest = pool.filter(p => p.level !== 'strong');
    const sameSkill = (p) => picked.filter(q => q.skill && q.skill === p.skill).length;
    while (picked.length < size - reserve()) {
        let best = null, bestScore = -Infinity;
        for (const p of rest) {
            if (taken.has(p.c.key) || (p.c.kind && kindCount(p.c.kind) >= kindCap)) continue;
            const sc = p.score - REPEAT_PENALTY * sameSkill(p);
            if (sc > bestScore) { best = p; bestScore = sc; }
        }
        if (!best) break;
        take(best, reasonOf(best));
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

/** Give at most one screen per round (phase) a `why`, and only a weak pick.
 *  `done` — skills already explained this session (by an earlier round). */
export function withCaptions(steps, lang, { confusions = [], done: already = [] } = {}) {
    const done = new Set(already);
    return steps.map(s => {
        const a = s.adaptive;
        if (!a || a.level !== 'weak' || done.has(s.phase) || done.has(a.skill)) return s;
        const why = whyCaption(lang, a.skill, { confusions });
        if (!why) return s;
        done.add(s.phase);
        done.add(a.skill);   // one skill is explained once a session
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

/* ── The lesson after "New words" (phase 3) ────────────────────────────────
   A lesson's own phrases and conversations always run in the order written;
   adaptation may only
     (a) add up to POOL_ADD_MAX drills from the drill pools of this lesson or
         an earlier one (drillPools.js), each aimed at a weak skill,
     (b) skip at most SKIP_MAX of the lesson's own drills that is not core and
         whose skills are all strong,
     (c) set how much help a drill offers before a miss (`assist`), and
     (d) pick the Listen round's words from weak word skills, within its
         placement rules (one from this lesson, one from an earlier one).
   So the plan is within -1/+2 screens of the plain one. Nothing here changes
   what a screen accepts: grading stays in lessonEngine.scoreAnswer.

   The result is a small JSON object, cached per lesson by srs.ensureAdaptation
   so a resumed lesson (and the lesson map) rebuild exactly the same plan from
   it, however the model has moved since. No model: null, and the plan is
   today's, exactly. */

export const POOL_ADD_MAX = 2;
/* Phase 4 serving policy: a generated drill (source 'gen') is eligible like a
   seed, but a hand-written or speaker-reviewed one wins when the skill fits
   equally — this bonus is larger than the jitter, smaller than any step of
   need. Generated drills are refused outright when the kill switch is off. */
export const TRUSTED_POOL_BONUS = 0.06;
export const SKIP_MAX = 1;
export const ADAPTATION_VERSION = 1;

const drillsOfLesson = (lesson) => [
    ...(lesson?.phrases || []).map(d => ({ ...d, phase: 'phrase' })),
    ...(lesson?.conversations || []).map(d => ({ ...d, phase: 'conversation' })),
];
const asDrillStep = (d) => ({ kind: 'drill', phase: d.phase || 'phrase', drill: d, expected: d.correct, variants: d.acceptable || [] });

/* Every skill any drill of lessons 1..n tests, per language — for "core". */
const testedCache = new Map();
function testedBefore(lang, lessons, n) {
    const key = `${lang}|${n}`;
    if (testedCache.has(key)) return testedCache.get(key);
    const prev = n > 0 ? testedBefore(lang, lessons, n - 1) : new Set();
    const out = new Set(prev);
    if (n > 0) {
        for (const d of drillsOfLesson(lessons[n - 1])) {
            if (d?.correct) tagStep(asDrillStep(d), { lang, lessonNo: n }).core.forEach(id => out.add(id));
        }
    }
    testedCache.set(key, out);
    return out;
}

/**
 * Which of a lesson's own drills are core: `core: true` on the drill, or the
 * first drill of the course to test one of its skills (a construction, an
 * ending, a word this lesson introduces). Core drills are never skipped.
 * Returns a boolean per drill, in drillsOf order.
 */
export function coreFlags(lesson, lessons, lang) {
    const li = lessons.indexOf(lesson);
    const lessonNo = li + 1;
    const seen = new Set(li >= 0 ? testedBefore(lang, lessons, li) : []);
    return drillsOfLesson(lesson).map(d => {
        if (!d?.correct) return false;
        const ids = tagStep(asDrillStep(d), { lang, lessonNo }).core;
        const fresh = ids.some(id => !seen.has(id));
        ids.forEach(id => seen.add(id));
        return Boolean(d.core) || fresh;
    });
}

/**
 * The adaptation for one lesson, or null with no model.
 *   { v, add: [{ id, phase, skill, why? }], skip: [{ key, phase }], assist: { key: 'more'|'less' },
 *     listen: [word|null, word|null], listenWhy }
 * `key` is a drill's normalised answer.
 */
export function planLessonAdaptation({
    lang, lessonIdx, lessons = CURRICULUM[lang] || [], stats = null, reviewSet = null,
    confusions = [], now = Date.now(),
} = {}) {
    if (!hasModel(stats)) return null;
    const lesson = lessons[lessonIdx];
    if (!lesson) return null;
    const model = modelMap(stats);
    const lessonNo = lessonIdx + 1;
    const seed = lessonIdx;
    const own = drillsOfLesson(lesson).filter(d => d?.correct);
    const ownKeys = new Set(own.map(d => norm(d.correct)));
    const levelOfId = (id) => levelOf(model.get(id), now);

    /* (a) Pool drills for weak skills. */
    const genOn = genDrillsEnabled();
    const cands = [];
    lessons.slice(0, lessonIdx + 1).forEach((l, li) => (l.pool || []).forEach(d => {
        const key = norm(d.correct);
        if (!d?.id || !key || ownKeys.has(key)) return;
        if (isGenerated(d) && !genOn) return;
        const skills = tagStep(asDrillStep(d), { lang, lessonNo }).skills;
        const n = needOf(skills, model, now);
        if (n.level !== 'weak') return;
        const trusted = !isGenerated(d) || d.reviewed === true;
        const score = n.need + (li === lessonIdx ? 0.1 : 0) + (trusted ? TRUSTED_POOL_BONUS : 0) + 0.05 * jitter(seed, d.id);
        cands.push({ d, key, skill: n.skill, score, phase: d.phase === 'conversation' ? 'conversation' : 'phrase' });
    }));
    const add = [];
    while (add.length < POOL_ADD_MAX) {
        let best = null, bestScore = -Infinity;
        for (const c of cands) {
            if (add.some(a => a.c === c || a.c.key === c.key)) continue;
            const sc = c.score - REPEAT_PENALTY * add.filter(a => a.c.skill === c.skill).length;
            if (sc > bestScore) { best = c; bestScore = sc; }
        }
        if (!best) break;
        add.push({ c: best });
    }

    /* (b) One non-core drill whose skills are all strong may go. Never one
       that would leave its round empty. */
    const flags = coreFlags(lesson, lessons, lang);
    const all = drillsOfLesson(lesson);
    const skippable = all.map((d, i) => ({ d, i })).filter(({ d, i }) => {
        if (!d?.correct || flags[i]) return false;
        if (all.filter(x => x.phase === d.phase).length < 2) return false;
        const ids = tagStep(asDrillStep(d), { lang, lessonNo }).core;
        return ids.length && ids.every(id => levelOfId(id) === 'strong');
    });
    const meanMastery = (d) => {
        const ids = tagStep(asDrillStep(d), { lang, lessonNo }).core;
        return ids.reduce((s, id) => s + (model.get(id)?.mastery ?? 0.5), 0) / ids.length;
    };
    skippable.sort((a, b) => (meanMastery(b.d) - meanMastery(a.d)) || (jitter(seed, a.d.correct) - jitter(seed, b.d.correct)));
    /* By round and answer: one answer can sit in both rounds (Kannada L8
       asks *Nanna snehitaru* twice), and only the one picked may go. */
    const skip = skippable.slice(0, SKIP_MAX).map(({ d }) => ({ key: norm(d.correct), phase: d.phase }));

    /* (c) Help before a miss: up front for a weak skill, held back when every
       skill is strong. Anything else keeps today's "Show a hint". */
    const assist = {};
    const planned = [...own.filter(d => !skip.some(k => k.key === norm(d.correct) && k.phase === d.phase)), ...add.map(a => a.c.d)];
    for (const d of planned) {
        const tag = tagStep(asDrillStep(d), { lang, lessonNo });
        if (tag.skills.some(id => levelOfId(id) === 'weak')) assist[norm(d.correct)] = 'more';
        else if (tag.core.length && tag.core.every(id => levelOfId(id) === 'strong')) assist[norm(d.correct)] = 'less';
    }

    /* (d) Listen words: the weakest word skill in each slot's own pool. */
    const asked = new Set((reviewSet || []).map(r => norm(r?.word)));
    const weakestWord = (vocab) => {
        let best = null;
        for (const v of vocab) {
            const id = wordSkillId(v?.word);
            if (!id || !v.meaning || asked.has(norm(v.word)) || levelOfId(id) !== 'weak') continue;
            const m = model.get(id)?.mastery ?? 0.5;
            if (!best || m < best.m) best = { v, m, id };
        }
        return best;
    };
    const curWeak = weakestWord(lesson.vocabulary || []);
    const oldWeak = weakestWord(lessons.slice(0, lessonIdx).flatMap(l => l.vocabulary || []));
    const listen = [curWeak?.v.word || null, oldWeak?.v.word || null];

    /* Captions: one per round, never for a skill the Memory check explained. */
    const explained = (reviewSet || []).filter(r => r?.why && r.adaptive?.skill).map(r => r.adaptive.skill);
    const captioned = withCaptions(add.map(a => ({
        phase: a.c.phase, id: a.c.d.id, adaptive: { skill: a.c.skill, level: 'weak' },
    })), lang, { confusions, done: explained });
    const listenPick = oldWeak || curWeak;
    const listenWhy = listenPick && !explained.includes(listenPick.id)
        && !captioned.some(c => c.why && c.adaptive.skill === listenPick.id)
        ? whyCaption(lang, listenPick.id, { confusions }) : '';

    return {
        v: ADAPTATION_VERSION,
        add: captioned.map(c => ({ id: c.id, phase: c.phase, skill: c.adaptive.skill, ...(c.why ? { why: c.why } : {}) })),
        skip,
        assist,
        listen,
        ...(listenWhy ? { listenWhy, listenWhyWord: listenPick.v.word } : {}),
    };
}
