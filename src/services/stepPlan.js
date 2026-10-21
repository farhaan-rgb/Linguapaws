/**
 * The 15-step lesson cycle, expressed as a list of screens.
 *
 * Chat.jsx walks the same cycle one conversational turn at a time. This module
 * lays it out declaratively so a step-by-step UI can render it, and — more to
 * the point — so both surfaces agree on what a step is, what it asks for, and
 * what counts as a right answer. Every accepted-answer decision here defers to
 * lessonEngine; nothing about the grading is reimplemented.
 *
 * Cycle: 5 teach · 3 review · 3 phrase · 4 conversation in Chat. Step mode
 * gives teach one screen per vocabulary word, so its plan length varies.
 */

import * as engine from '../services/lessonEngine.js';
import { CURRICULUM } from './curriculum.js';
import { phraseDrill } from './phraseReview.js';
import { patternFor } from './endings.js';
import { hasModel, modelMap, selectAdaptive, skillsOfStep, spreadBySkill, withCaptions, KIND_SHARE, POOL_ADD_MAX, SKIP_MAX } from './adaptive.js';

export const PHASES = {
    teach:        { label: 'New words',   blurb: 'Meet it, then say it back' },
    review:       { label: 'Memory check', blurb: 'From what you have learned' },
    phrase:       { label: 'Build a phrase', blurb: 'Put the words together' },
    conversation: { label: 'Real conversation', blurb: 'Use it for real' },
    listen:       { label: 'Listen', blurb: 'Hear it, pick what it means' },
    pattern:      { label: 'Spot the pattern', blurb: 'One ending, many sentences' },
};

/** Every `alt` spelling the course lists for a word. */
const altsOf = (wordObj) => (wordObj?.alt || []);

/**
 * Build the screens for one lesson.
 *
 * `reviewSet` comes from srs.ensureReviewSet and may be null — offline, or a
 * first lesson with nothing due yet. Missing review slots are dropped rather
 * than back-filled with the current lesson's own words a second time, which
 * would quiz a word the learner met ninety seconds ago.
 */
/* The step's answer in the course's own script, so a spoken answer can be
   matched on what the recogniser heard rather than how it romanised it. */
const nativeOf = (lessons, word) => {
    for (const l of lessons || []) for (const v of l.vocabulary || []) {
        if (v.word === word && v.native) return v.native;
    }
    return '';
};

/* ── Confused pairs, brought back ──
   A pair the learner mixed up earlier (said Nimma "your" where Avara "her,
   respectful" was needed) comes back as one review screen asking for both, in
   that order. It takes the LAST review slot rather than adding one, so the plan
   length — which the lesson map and mid-lesson resume both count — is the same
   with or without it, and a lesson with no review slots gets no contrast. */
const capWord = (w) => String(w || '').charAt(0).toUpperCase() + String(w || '').slice(1);
export function contrastItem(pair) {
    if (!pair?.said || !pair?.needed) return null;
    return {
        word: `${capWord(pair.said)} ${capWord(pair.needed)}`,
        meaning: '',
        source: 'confusion',
        contrast: { said: pair.said, needed: pair.needed,
            saidMeaning: pair.saidMeaning || '', neededMeaning: pair.neededMeaning || '' },
    };
}
const contrastPrompt = (c) => {
    const a = engine.glossFor(c.saidMeaning) || `“${c.said}”`;
    const b = engine.glossFor(c.neededMeaning) || `“${c.needed}”`;
    return `These two got mixed up before. Say ${a}, then ${b}.`;
};
/* Every spelling of "said needed" the course accepts, alt by alt. */
const contrastVariants = (lessons, c) => {
    const as = [c.said, ...engine.altsFor(lessons, c.said)];
    const bs = [c.needed, ...engine.altsFor(lessons, c.needed)];
    const out = [];
    for (const a of as) for (const b of bs) out.push(`${a} ${b}`);
    return out.slice(1, 12);
};

/* One review screen: a word from the SRS queue, or a confused pair. Shared by
   the lesson plan and the practice plan so both ask a review the same way. */
export function reviewStep(item, allLessons) {
    if (item.contrast) {
        const a = nativeOf(allLessons, item.contrast.said);
        const b = nativeOf(allLessons, item.contrast.needed);
        return {
            kind: 'review',
            phase: 'review',
            item,
            prompt: contrastPrompt(item.contrast),
            expected: item.word,
            variants: contrastVariants(allLessons, item.contrast),
            native: a && b ? `${a} ${b}` : '',
        };
    }
    if (item.phrase) {
        /* A phrase on the ladder: asked like a word ("How do you say …?"),
           graded on the drill's own accepted forms — looked up in the course
           now, not cached, so a fixed `acceptable` list reaches it. */
        const drill = phraseDrill(allLessons, item.phrase.lessonIdx, item.word);
        const meaning = (drill?.meaning || item.meaning || '').trim();
        return {
            kind: 'review',
            phase: 'review',
            item,
            prompt: meaning
                ? (/[?!]$/.test(meaning) ? `How do you say "${meaning}"` : `How do you say "${meaning}"?`)
                : (drill?.prompt || `Say ${item.word} again`),
            expected: drill?.correct || item.word,
            variants: drill?.acceptable || [],
            native: drill?.native || item.native || '',
        };
    }
    return {
        kind: 'review',
        phase: 'review',
        item,
        prompt: item.meaning
            /* A meaning that is itself a question ("Really?") would print '"Really?"?'. */
            ? (/[?!]$/.test(item.meaning.trim())
                ? `How do you say "${item.meaning.trim()}"`
                : `How do you say "${item.meaning}"?`)
            : `Say ${item.word} again`,
        expected: item.word,
        variants: engine.altsFor(allLessons, item.word),
        native: item.native || nativeOf(allLessons, item.word),
    };
}

/* One phrase or conversation screen; `drills[idx]` carries its phase. */
function drillStep(drills, idx) {
    const drill = drills[idx];
    return {
        kind: 'drill',
        phase: drill.phase,
        drill,
        prompt: engine.drillPrompt(drills, idx) || drill.prompt,
        expected: drill.correct,
        variants: drill.acceptable || [],
        native: drill.native || '',
    };
}

/* A lesson's drills with an adaptation applied: at most SKIP_MAX of its own
   skipped, then each added pool drill at the end of its round. A pool id the
   course no longer has is dropped rather than guessed at. */
function adaptedDrills(lesson, allLessons, adaptation) {
    const li = Math.max((allLessons || []).indexOf(lesson), 0);
    const skip = (adaptation.skip || []).slice(0, SKIP_MAX);
    const own = drillsOf(lesson);
    for (const k of skip) {
        const at = own.findIndex(d => d.phase === k?.phase && norm(d.correct) === k?.key);
        if (at >= 0 && own.filter(d => d.phase === k.phase).length > 1) own.splice(at, 1);
    }
    const pool = new Map();
    (allLessons || []).slice(0, li + 1).forEach(l => (l.pool || []).forEach(d => pool.set(d.id, d)));
    const added = (adaptation.add || []).slice(0, POOL_ADD_MAX).map(a => {
        const d = pool.get(a.id);
        return d ? { ...d, phase: a.phase === 'conversation' ? 'conversation' : 'phrase',
            poolId: d.id, poolSkill: a.skill || null, poolWhy: a.why || '' } : null;
    }).filter(Boolean);
    return ['phrase', 'conversation'].flatMap(ph => [
        ...own.filter(d => d.phase === ph), ...added.filter(d => d.phase === ph)]);
}

/** A lesson's phrases then conversations, each tagged with its phase. */
const drillsOf = (lesson) => [
    ...(lesson?.phrases || []).map(d => ({ ...d, phase: 'phrase' })),
    ...(lesson?.conversations || []).map(d => ({ ...d, phase: 'conversation' })),
];

/* ── Listening ──────────────────────────────────────────────────────────────
   Every other screen goes English → target. This one goes the other way: the
   app SAYS a word the learner has already been taught, the written form stays
   hidden, and the learner taps which of four English meanings it was. Without
   it nothing in a lesson ever asks the learner to understand the language,
   only to produce it.

   Order-aware by construction: the plan puts listen screens after every teach
   screen of the lesson, and draws only from this lesson's vocabulary and from
   lessons before it in course order. Distractors come from the same pool,
   same lesson first, so the wrong options are words the learner has met too
   rather than giveaways. The tap is graded by equality against `answer` —
   it is an English choice, not a target-language answer, so lessonEngine has
   nothing to say about it. */

export const LISTEN_SLOTS = 2;
export const LISTEN_OPTIONS = 4;

/* "You (polite)" and "you" are one meaning as far as a tap is concerned. */
const meaningCore = (m) => String(m || '').replace(/\([^)]*\)/g, ' ').toLowerCase()
    .replace(/[^\p{L}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();

/* "Her (respectful) / His" and "His" overlap — both would be right. Each
   slash- or comma-separated part is a sense; two meanings sharing one clash. */
const sensesOf = (m) => String(m || '').split(/[/,;]|\bor\b/).map(meaningCore).filter(Boolean);

/* A word whose meaning contains the word itself (Bus = "bus") is a reading
   test in disguise — the sound gives it away to any English speaker. */
const listenable = (v) => v?.word && v?.meaning && meaningCore(v.meaning)
    && !meaningCore(v.meaning).split(' ').includes(norm(v.word));

/* Deterministic per lesson, so a resumed lesson rebuilds the same screens. */
const seedOf = (text) => [...String(text || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0x7fffffff, 7);

export function listenStep(target, pools, seed = 0) {
    if (!listenable(target)) return null;
    const seen = new Set(sensesOf(target.meaning));
    const distractors = [];
    for (const pool of pools) {
        for (const v of shuffled(pool, seed)) {
            if (distractors.length >= LISTEN_OPTIONS - 1) break;
            const senses = sensesOf(v?.meaning);
            if (!senses.length || senses.some(x => seen.has(x)) || norm(v.word) === norm(target.word)) continue;
            senses.forEach(x => seen.add(x));
            distractors.push(v.meaning);
        }
    }
    if (distractors.length < 2) return null;
    return {
        kind: 'listen',
        phase: 'listen',
        word: target.word,
        native: target.native || '',
        phonetic: target.phonetic || '',
        prompt: 'What did you hear?',
        /* `expected` is what the learner produces — here, the English meaning. */
        expected: target.meaning,
        answer: target.meaning,
        options: shuffled([target.meaning, ...distractors], seed + 3),
        variants: [],
    };
}

/** Listen screens for a lesson: one word from this lesson, one from an
 *  earlier lesson (or a second from this one, in lesson 1). Words the review
 *  slots already ask for are skipped where something else is available. */
export function listenStepsFor(lesson, allLessons = [], reviewSet = null, chosen = null) {
    const li = Math.max((allLessons || []).indexOf(lesson), 0);
    const earlier = (allLessons || []).slice(0, li);
    const current = (lesson?.vocabulary || []).filter(listenable);
    const before = earlier.flatMap(l => l.vocabulary || []).filter(listenable);
    const asked = new Set((reviewSet || []).map(r => norm(r?.word)));
    const prefer = (list) => {
        const fresh = list.filter(v => !asked.has(norm(v.word)));
        return fresh.length ? fresh : list;
    };
    const seed = seedOf(`${li}:${(lesson?.vocabulary || []).map(v => v.word).join(',')}`);
    const picks = [];
    /* Adaptive phase 3: a weak word, when one was chosen for a slot, goes
       first in that slot's own pool — same pool, same placement rules. */
    const first = (list, word) => {
        const k = norm(word);
        const hit = k ? list.find(v => norm(v.word) === k) : null;
        return hit ? [hit, ...list.filter(v => v !== hit)] : list;
    };
    const curPick = first(shuffled(prefer(current), seed), chosen?.[0]);
    if (curPick[0]) picks.push({ v: curPick[0], home: lesson?.vocabulary || [] });
    /* The previous lesson first: recent enough to be heard back, old enough
       that hearing it is a test. */
    const prevVocab = allLessons?.[li - 1]?.vocabulary || [];
    const prev = prefer(prevVocab.filter(listenable));
    const chosenOld = chosen?.[1] && before.find(v => norm(v.word) === norm(chosen[1]));
    const oldHome = chosenOld ? (earlier.find(l => (l.vocabulary || []).includes(chosenOld))?.vocabulary || before)
        : prev.length ? prevVocab : before;
    const oldPick = (chosenOld ? [chosenOld] : shuffled(prev.length ? prev : prefer(before), seed + 1))
        .find(v => !picks.some(p => norm(p.v.word) === norm(v.word)));
    if (oldPick) picks.push({ v: oldPick, home: oldHome });
    else if (curPick[1]) picks.push({ v: curPick[1], home: lesson?.vocabulary || [] });

    /* Distractors from the target's own lesson first, then anything taught. */
    const taught = [...(lesson?.vocabulary || []), ...before];
    return picks.slice(0, LISTEN_SLOTS)
        .map(({ v, home }, i) => listenStep(v, [home, taught], seed + 11 * (i + 1)))
        .filter(Boolean);
}

/**
 * `adaptation` (adaptive phase 3) is adaptive.planLessonAdaptation's result,
 * as cached for this lesson: pool drills to add, at most one drill to skip,
 * per-drill `assist`, and the Listen round's words. Null — no model, a new
 * learner, offline — is today's plan exactly.
 */
export function buildLessonSteps(lesson, reviewSet = null, allLessons = [], contrast = null, adaptation = null) {
    if (!lesson) return [];
    const steps = [];

    /* ── 1. Teach ──
       One screen per word, however many the lesson holds. The engine's
       teachSliceFor folds a lesson onto five slots for Chat's fixed 15-turn
       cycle, which on a 6- or 7-word lesson put two words on one screen and
       asked for them together ("Hoguttene Hogu") as if they were one word.
       Step mode has no fixed turn count to honour, so it does not borrow that
       folding: a 7-word lesson gets 7 teach screens. Chat is unchanged. */
    (lesson.vocabulary || []).forEach(wordObj => {
        const slice = [wordObj];
        const expected = engine.expectedForTeachStep(slice);
        if (!expected) return;
        steps.push({
            kind: 'teach',
            phase: 'teach',
            slice,
            expected,
            variants: altsOf(wordObj),
            native: wordObj.native || '',
        });
    });

    /* ── 2. Review ── */
    const slots = (reviewSet || []).filter(item => item?.word);
    const pairItem = slots.length ? contrastItem(contrast) : null;
    if (pairItem) slots[slots.length - 1] = pairItem;
    slots.forEach(item => steps.push(reviewStep(item, allLessons)));

    /* ── Listen ── after every teach screen, so every word it can play has
       been taught. Its own short round, before the drills. */
    listenStepsFor(lesson, allLessons, reviewSet, adaptation?.listen).forEach(s => steps.push(
        adaptation?.listenWhy && norm(s.word) === norm(adaptation.listenWhyWord) ? { ...s, why: adaptation.listenWhy } : s));

    /* ── Pattern ── every few lessons, one screen that lines up phrases the
       learner already knows around the ending they share (endings.js). Read,
       not answered: nothing is graded, so it never settles, scores or
       requeues. Placed before the drills, which use the same endings. */
    const pattern = patternFor(langOf(allLessons || []), allLessons, (allLessons || []).indexOf(lesson));
    if (pattern) steps.push({ kind: 'pattern', phase: 'pattern', pattern, expected: '', variants: [] });

    /* ── 3 & 4. Drills, exactly as the curriculum orders them ── */
    const drills = adaptation ? adaptedDrills(lesson, allLessons, adaptation) : drillsOf(lesson);
    drills.forEach((drill, idx) => {
        if (!drill?.correct) return;
        const step = drillStep(drills, idx);
        const assist = adaptation?.assist?.[norm(drill.correct)];
        steps.push({
            ...step,
            ...(assist ? { assist } : {}),
            ...(drill.poolId ? { adaptive: { pool: drill.poolId, skill: drill.poolSkill || null, level: 'weak' } } : {}),
            ...(drill.poolWhy ? { why: drill.poolWhy } : {}),
        });
    });

    return steps.map((s, i) => ({ ...s, index: i }));
}

/* ── Practice ────────────────────────────────────────────────────────────────
   A short session drawn ONLY from lessons the learner has finished in this
   language (`finishedIdx` = lessonProgress[lang]). Nothing new is taught, so
   there are no teach screens; it reuses the review and drill screens above.

   Slots fill in priority order, then the chosen screens are grouped by phase
   (review, phrase, conversation) so the end-of-round re-asks work as in a
   lesson:
     1. SRS words that are due
     2. recorded confusion pairs, as contrast screens
     3. screens missed or revealed in past lessons
     4. a top-up mixing words and drills from the finished lessons

   Every screen carries `practice` (which of the four filled it) and
   `lessonIdx` (the finished lesson it came from); a screen from the missed
   record also carries `missedRef`, the record to retire.

   With a skill model (`skills`, GET /api/progress/skills) the same four
   sources become candidates for adaptive.selectAdaptive instead: weak skills
   first, a share for due words and for retention, pairs always, no skill
   twice in a row — and at most one screen per round says why it was chosen
   (`why`). No model, or an empty one, is the plan above unchanged. */

export const PRACTICE_SIZE = 10;

const norm = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();

/* Deterministic shuffle, so one seed gives one plan (and a test can pin it). */
function shuffled(list, seed) {
    const out = [...list];
    let s = ((seed + 1) * 1664525 + 1013904223) & 0x7fffffff;
    for (let i = out.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) & 0x7fffffff;
        const j = s % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

export function buildPracticeSteps({
    lessons = [], finishedIdx = null, due = [], confusions = [], missed = [],
    size = PRACTICE_SIZE, seed = 0, skills = null, now = Date.now(), lang = null,
} = {}) {
    if (!Number.isInteger(finishedIdx) || finishedIdx < 0) return [];
    if (hasModel(skills)) {
        return adaptivePractice({ lessons, finishedIdx, due, confusions, missed, size, seed, skills, now, lang: lang || langOf(lessons) });
    }
    const scope = lessons.slice(0, finishedIdx + 1);
    if (!scope.length) return [];

    /* Every word the finished lessons taught, first lesson that taught it. */
    const words = new Map();
    scope.forEach((l, li) => (l.vocabulary || []).forEach(v => {
        const k = norm(v.word);
        if (k && !words.has(k)) words.set(k, { ...v, lessonIdx: li });
    }));
    const drillsByLesson = scope.map(drillsOf);

    const picked = [];
    const used = new Set();
    const take = (step, source, lessonIdx, extra = {}) => {
        const k = norm(step.expected);
        if (picked.length >= size || !k || used.has(k)) return;
        used.add(k);
        picked.push({ ...step, ...extra, practice: source, lessonIdx });
    };
    const wordStep = (w) => reviewStep(
        { word: w.word, meaning: w.meaning || '', source: 'due', native: w.native || '' }, scope);
    const drillAt = (li, di) => drillStep(drillsByLesson[li], di);

    /* 1. Due words — only ones a finished lesson taught. */
    for (const d of due || []) {
        const w = words.get(norm(d?.word));
        if (w) take(wordStep(w), 'due', w.lessonIdx);
    }

    /* 2. Confused pairs, both halves taught by a finished lesson. */
    for (const c of confusions || []) {
        const a = words.get(norm(c?.said)), b = words.get(norm(c?.needed));
        const item = a && b ? contrastItem(c) : null;
        if (item) take(reviewStep(item, scope), 'confusion', Math.max(a.lessonIdx, b.lessonIdx));
    }

    /* 3. Screens missed or revealed before, in a finished lesson. */
    for (const m of missed || []) {
        const li = Number(m?.lessonIdx);
        if (!Number.isInteger(li) || li < 0 || li > finishedIdx) continue;
        if (m.kind === 'word') {
            const w = words.get(norm(m.key));
            if (w) take(wordStep(w), 'missed', w.lessonIdx, { missedRef: { kind: 'word', key: m.key, lessonIdx: li } });
        } else if (m.kind === 'drill') {
            const di = drillsByLesson[li].findIndex(d => norm(d.correct) === norm(m.key));
            if (di >= 0) take(drillAt(li, di), 'missed', li, { missedRef: { kind: 'drill', key: m.key, lessonIdx: li } });
        }
    }

    /* 4. Top up: alternate words and drills, whichever is behind. */
    const poolWords = shuffled([...words.values()], seed);
    const poolDrills = shuffled(drillsByLesson.flatMap((ds, li) =>
        ds.map((d, di) => (d?.correct ? [li, di] : null)).filter(Boolean)), seed + 1);
    while (picked.length < size && (poolWords.length || poolDrills.length)) {
        const nWords = picked.filter(s => s.kind === 'review').length;
        const wantDrill = poolDrills.length && (!poolWords.length || nWords > picked.length - nWords);
        if (wantDrill) {
            const [li, di] = poolDrills.shift();
            take(drillAt(li, di), 'mix', li);
        } else {
            const w = poolWords.shift();
            take(wordStep(w), 'mix', w.lessonIdx);
        }
    }

    const order = ['review', 'phrase', 'conversation'];
    return order.flatMap(ph => picked.filter(s => s.phase === ph))
        .map((s, i) => ({ ...s, index: i }));
}

/* The adaptive practice plan: every screen practice could ask, scored. */
function adaptivePractice({ lessons, finishedIdx, due, confusions, missed, size, seed, skills, now, lang }) {
    const scope = lessons.slice(0, finishedIdx + 1);
    const lessonNo = finishedIdx + 1;
    const words = new Map();
    scope.forEach((l, li) => (l.vocabulary || []).forEach(v => {
        const k = norm(v.word);
        if (k && !words.has(k)) words.set(k, { ...v, lessonIdx: li });
    }));
    const drillsByLesson = scope.map(drillsOf);
    const wordStep = (w) => reviewStep(
        { word: w.word, meaning: w.meaning || '', source: 'due', native: w.native || '' }, scope);

    const cands = [];
    const add = (step, source, lessonIdx, extra = {}) => {
        const key = norm(step.expected);
        if (!key) return;
        const full = { ...step, ...extra, practice: source, lessonIdx };
        cands.push({ key, source, kind: step.kind, skills: skillsOfStep(full, { lang, lessonNo }), step: full });
    };
    for (const c of confusions || []) {
        const a = words.get(norm(c?.said)), b = words.get(norm(c?.needed));
        const item = a && b ? contrastItem(c) : null;
        if (item) add(reviewStep(item, scope), 'confusion', Math.max(a.lessonIdx, b.lessonIdx));
    }
    for (const d of due || []) {
        const w = words.get(norm(d?.word));
        if (w) add(wordStep(w), 'due', w.lessonIdx);
    }
    for (const m of missed || []) {
        const li = Number(m?.lessonIdx);
        if (!Number.isInteger(li) || li < 0 || li > finishedIdx) continue;
        if (m.kind === 'word') {
            const w = words.get(norm(m.key));
            if (w) add(wordStep(w), 'missed', w.lessonIdx, { missedRef: { kind: 'word', key: m.key, lessonIdx: li } });
        } else if (m.kind === 'drill') {
            const di = drillsByLesson[li].findIndex(d => norm(d.correct) === norm(m.key));
            if (di >= 0) add(drillStep(drillsByLesson[li], di), 'missed', li, { missedRef: { kind: 'drill', key: m.key, lessonIdx: li } });
        }
    }
    for (const w of words.values()) add(wordStep(w), 'mix', w.lessonIdx);
    drillsByLesson.forEach((ds, li) => ds.forEach((d, di) => { if (d?.correct) add(drillStep(ds, di), 'mix', li); }));

    const picks = selectAdaptive({
        candidates: cands, model: modelMap(skills), size, seed, now, kindShare: KIND_SHARE,
    });
    /* Grouped by phase for the end-of-round re-asks, spread within each. */
    const order = ['review', 'phrase', 'conversation'];
    let prev = null;
    const grouped = order.flatMap(ph => {
        const g = spreadBySkill(picks.filter(p => p.step.phase === ph), prev);
        if (g.length) prev = g[g.length - 1].adaptive?.skill || null;
        return g;
    }).map(p => ({ ...p.step, adaptive: p.adaptive }));
    return withCaptions(grouped, lang, { confusions }).map((s, i) => ({ ...s, index: i }));
}
/* The language a lesson list belongs to, for the skill taxonomy. */
const langOf = (lessons) => {
    for (const [name, list] of Object.entries(CURRICULUM)) if (list === lessons || (lessons.length && list[0] === lessons[0])) return name;
    return null;
};

/** What a revealed screen is remembered as, for practice to bring back:
 *  a teach screen is its word, a drill its answer. Reviews are left to the SRS
 *  and contrast screens to the confusion record. Null = not recorded. */
export function missedKeyFor(step, lessonIdx) {
    if (!step || !Number.isInteger(lessonIdx)) return null;
    if (step.kind === 'teach' && step.slice?.length === 1) {
        return { kind: 'word', key: step.slice[0].word, lessonIdx };
    }
    if (step.kind === 'drill' && step.expected) return { kind: 'drill', key: step.expected, lessonIdx };
    if (step.kind === 'review' && step.practice && !step.item?.contrast) {
        return { kind: 'word', key: step.expected, lessonIdx };
    }
    return null;
}

/** Words a teach step puts on screen — banked once the learner clears it. */
export const wordsTaughtBy = (step) =>
    step?.kind === 'teach' ? (step.slice || []).filter(w => w?.word) : [];

/** Human label for the progress header, e.g. "New words · 2 of 5". */
export function stepCaption(steps, index) {
    const step = steps[index];
    if (!step) return '';
    const sameKind = steps.filter(s => s.phase === step.phase);
    const position = sameKind.indexOf(step) + 1;
    return `${PHASES[step.phase].label} · ${position} of ${sameKind.length}`;
}

/* ── Re-asking what was missed ──────────────────────────────────────────────
   A screen the learner did not get (the answer had to be shown) comes back once
   more at the end of its own round — a round being one phase of the cycle —
   before the next round starts. A re-ask gets ONE try before the answer is
   shown again, and a screen is re-asked at most RETRY_CAP times, so "two more
   misses on a re-asked question and it moves on for good". Every path ends:
   the run only grows by re-asks, and re-asks stop at the cap.

   The run is the plan plus appended copies. A copy keeps its plan `index` (so
   resume, the rail and the lesson map keep counting plan screens) and carries
   `retry` = how many times it has been re-asked. */

export const RETRY_CAP = 2;

/** Tries before the reveal: the plan's own limit first time, one on a re-ask. */
export const triesFor = (step) => (step?.retry ? 1 : engine.REVIEW_RETRY_LIMIT);

/** Whether a screen whose answer was just revealed should come back again. */
export const shouldRequeue = (step) => (step?.retry || 0) < RETRY_CAP;

/** True when run[i] is the last screen of its round. */
export const isRoundEnd = (run, i) => !run[i + 1] || run[i + 1].phase !== run[i]?.phase;

/** Insert re-asks of `missed` straight after run[i]. Returns a new run. */
export const withRetries = (run, i, missed) => (missed.length
    ? [...run.slice(0, i + 1), ...missed.map(s => ({ ...s, retry: (s.retry || 0) + 1 })), ...run.slice(i + 1)]
    : run);

/** The plan index a killed app should reopen at, given the run entry it is
 *  about to show. Mid-requeue there is nowhere honest to resume except the
 *  start of the round, so the round is played again from the top. */
export function resumeStepFor(steps, next, pendingMisses = 0) {
    if (!next) return null;
    if (!next.retry && !pendingMisses) return next.index;
    const start = steps.findIndex(s => s.phase === next.phase);
    return start < 0 ? next.index : start;
}

/** The plan index the progress rail should show for a run entry: a re-ask sits
 *  on the last segment of its round, since every plan screen before it is done. */
export function railIndexFor(steps, entry) {
    if (!entry) return 0;
    if (!entry.retry) return entry.index;
    let last = entry.index;
    steps.forEach((s, i) => { if (s.phase === entry.phase) last = i; });
    return last;
}
