/**
 * Chat's 15-turn cycle, seen as screens — so chat can feed the learning loop
 * step mode feeds: skill evidence, missed screens, confused pairs, and the
 * engine's own miss feedback.
 *
 * Chat walks a lesson one turn at a time and has no `step` object; Steps.jsx
 * has one per screen, built by stepPlan.js. Every learning-loop function
 * (skills.skillEvidence, stepPlan.missedKeyFor, engine.missHelp) takes that
 * object. So this module builds the stepPlan-shaped screen for a chat
 * position and runs the same functions on it, with the same options Steps.jsx
 * passes. Nothing here grades: the accept/reject decision is still
 * lessonEngine.scoreAnswer, made by the caller.
 *
 * Pure (no api, no storage) so lesson-sim and node tests run it unchanged —
 * the sim and the app cannot drift apart on what a miss says.
 */

import * as engine from './lessonEngine.js';
import { CURRICULUM, WORD_FAMILIES, KNOWN_WORDS, WORD_ENDINGS } from './curriculum.js';
import { reviewStep, missedKeyFor } from './stepPlan.js';
import { skillEvidence, outcomeOf } from './skills.js';
import { scaffoldFor } from './praise.js';

/** Which stage chat position `pos` (0-14) is: teach · review · phrase · conversation. */
export const chatStageOf = (pos) => (pos < 5 ? 'teach' : pos < 8 ? 'review' : pos < 11 ? 'phrase' : 'conversation');

/* Chat's teach variants, exactly as Chat.jsx grades them: a one-word slice
   also accepts the word's alt spellings. */
function teachVariants(slice, lessons) {
    return [
        ...engine.teachStepVariants(slice),
        ...(engine.wordsOfferedBy(slice).length > 1
            ? []
            : engine.wordsOfferedBy(slice).flatMap(w => engine.altsFor(lessons, w))),
    ].filter(Boolean);
}

/**
 * The stepPlan-shaped screen chat is on.
 *   lang, lessonIdx — the lesson
 *   pos             — chat position 0-14
 *   reviewItem      — the review-set item for positions 5-7 (srs.getReviewSet)
 * Null when the position asks nothing (no such drill in this lesson).
 */
export function chatStepFor({ lang, lessonIdx, pos, reviewItem = null }) {
    const lessons = CURRICULUM[lang] || [];
    const lesson = lessons[lessonIdx];
    if (!lesson || !Number.isInteger(pos)) return null;
    const stage = chatStageOf(pos);
    if (stage === 'teach') {
        const slice = engine.teachSliceFor(lesson.vocabulary || [], pos);
        const expected = engine.expectedForTeachStep(slice);
        if (!expected) return null;
        return { kind: 'teach', phase: 'teach', slice, expected, variants: teachVariants(slice, lessons),
            native: slice.length === 1 ? (slice[0].native || '') : '', chatPos: pos };
    }
    if (stage === 'review') {
        if (!reviewItem?.word) return null;
        return { ...reviewStep(reviewItem, lessons), chatPos: pos };
    }
    const list = stage === 'phrase' ? lesson.phrases : lesson.conversations;
    const idx = pos - (stage === 'phrase' ? 8 : 11);
    const item = list?.[idx];
    if (!item?.correct) return null;
    const drill = { ...item, phase: stage };
    return {
        kind: 'drill', phase: stage, drill,
        prompt: engine.drillPrompt(list, idx) || item.prompt,
        expected: item.correct, variants: item.acceptable || [], native: item.native || '', chatPos: pos,
    };
}

/** engine.missHelp with the options Steps.jsx passes it — one analysis per attempt. */
export function chatMissHelp(said, step, { lang, lessonIdx, lexicon, reveal = false }) {
    const lessons = CURRICULUM[lang] || [];
    const drill = step?.kind === 'drill' ? step.drill : null;
    return engine.missHelp(said, step.expected, {
        variants: step.variants, lexicon: lexicon || engine.buildLexicon(lessons),
        taughtLessons: lessons.slice(0, lessonIdx + 1), families: WORD_FAMILIES[lang] || [],
        meaning: drill?.meaning || '', hint: drill?.hint || '', reveal, language: lang,
        knownWords: KNOWN_WORDS[lang] || [], endings: WORD_ENDINGS[lang] || null,
    });
}

/** The family card as one compact line: needed and said marked, as the card marks them. */
export function familyLine(family) {
    if (!family?.members?.length) return '';
    const parts = family.members.map(m => `**${m.word}** ${m.meaning}${m.needed ? ' (needed here)' : m.said ? ' (you said)' : ''}`);
    return `🧩 ${family.name ? `${family.name}: ` : ''}${parts.join(' · ')}`;
}

/**
 * What chat says about a rejected attempt, from missHelp — the source of
 * truth for what was wrong, as in step mode:
 *   line     — the engine's diagnosis, or the answer's shape when it has none
 *              and the drill has no hint (praise.scaffoldFor, as Steps)
 *   scaffold — first letters for the next try ("N____ beku"); never on a reveal
 *   family   — the family-card line, on a reveal
 *   help     — the raw missHelp result, kept for skill evidence
 */
export function chatMissFeedback(said, step, { lang, lessonIdx, lexicon, reveal = false }) {
    const help = chatMissHelp(said, step, { lang, lessonIdx, lexicon, reveal });
    const hint = step?.drill?.hint || '';
    const line = help.line || (hint || help.scaffold ? '' : scaffoldFor(step.expected));
    /* On a teach screen the word is printed right under the line, so first
       letters would be a puzzle about something in plain view. */
    /* ...and a line that already ends on the outline ("This asks for “how”:
       H___") has said it once. */
    const scaffold = !reveal && step.kind !== 'teach' && help.scaffold && !/_{2,}/.test(line) ? help.scaffold : '';
    return { help, line, scaffold, family: reveal ? familyLine(help.family) : '' };
}

/** "Not quite. <line> Starts: N____ beku." — the lead of a chat miss. */
export function missLead(fb) {
    const shape = fb.scaffold ? ` Starts: *${fb.scaffold.replace(/^It's one word: /, '')}*.` : '';
    return `${engine.MISS_MARKER}.${fb.line ? ` ${fb.line}` : ''}${shape}`;
}

/** Keys Practice draws a revealed chat screen back by. A two-word teach turn
 *  is two words, each recorded the way its own step-mode teach screen is. */
export function chatMissedKeys(step, lessonIdx) {
    if (!step) return [];
    if (step.kind === 'teach') {
        return (step.slice || []).map(w => missedKeyFor({ kind: 'teach', slice: [w] }, lessonIdx)).filter(Boolean);
    }
    const k = missedKeyFor(step, lessonIdx);
    return k ? [k] : [];
}

/**
 * One settled chat screen in, everything step mode would record out:
 *   evidence — skills.skillEvidence items, same weights (typed vs spoken,
 *              after-miss, helped, revealed)
 *   missed   — MissedScreen keys, when the answer had to be shown or the
 *              learner was helped (first attempt — chat has no re-asks)
 * `attempts` are the rejected tries, each `{ said, spoken, help }`.
 */
export function settleChatScreen({ step, lang, lessonIdx, correct, revealed = false, helped = false,
    attempts = [], spoken = false, said = '', lexicon = null }) {
    if (!step) return { evidence: [], missed: [] };
    const misses = attempts.length;
    const help = Boolean(correct && helped && misses === 0);
    let evidence = [];
    try {
        evidence = skillEvidence({
            step, lang, lessonNo: lessonIdx + 1,
            lexicon: lexicon || engine.buildLexicon(CURRICULUM[lang] || []),
            outcome: outcomeOf({ correct, misses, revealed, helped: help, attempts: misses }),
            attempts, finalSpoken: Boolean(correct && spoken), finalSaid: correct ? said : '',
        }).slice(0, 40);
    } catch { evidence = []; }
    const missed = !correct || help ? chatMissedKeys(step, lessonIdx) : [];
    return { evidence, missed };
}
