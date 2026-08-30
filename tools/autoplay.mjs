#!/usr/bin/env node
/**
 * autoplay — drive every lesson to completion automatically and report where a
 * lesson cannot be finished.
 *
 *   node tools/autoplay.mjs Telugu            # ideal learner
 *   node tools/autoplay.mjs Telugu --strict   # learner who only knows taught words
 *   node tools/autoplay.mjs Telugu --lesson 12 --verbose
 *
 * Two modes, because "the lesson is broken" and "the lesson is unteachable" are
 * different problems:
 *
 *   ideal   — always gives the curriculum's own answer. Any failure here is a
 *             FLOW bug: a stage that will not advance, a review question with no
 *             answer, a drill index off the end. Nothing to do with vocabulary.
 *   strict  — refuses to say any word the course has not taught by that point,
 *             and says "I don't know" instead, like a real learner. Failures here
 *             are CONTENT gaps, and they are the ones a learner actually hits.
 *
 * Runs the real engine against the real curriculum, and reuses lesson-sim's
 * session state so it is stepping through the same machine a tester plays.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SIM = join(HERE, 'lesson-sim.mjs');

const E = await import(join(ROOT, 'src/services/lessonEngine.js'));
const { CURRICULUM } = await import(join(ROOT, 'src/services/curriculum.js'));

const argv = process.argv.slice(2);
const lang = argv.find(a => !a.startsWith('--')) || 'Telugu';
const has = (n) => argv.includes(`--${n}`);
const arg = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const STRICT = has('strict');
const VERBOSE = has('verbose');

const lessons = CURRICULUM[lang] || [];
if (!lessons.length) { console.log(`no curriculum for ${lang}`); process.exit(1); }

const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
const FREE = new Set(['miko', 'coffee', 'roti', 'final', 'cinema', 'film', 'hyderabad', 'telugu', 'kannada', 'hindi', 'odia', 'ravi', 'x']);

/** Words taught up to and including lesson n (1-based). */
function taughtUpTo(n) {
    const set = new Set();
    for (let i = 0; i < n && i < lessons.length; i++) {
        for (const v of lessons[i].vocabulary || []) {
            norm(v.word).forEach(t => set.add(t));
            for (const a of v.alt || []) norm(a).forEach(t => set.add(t));
        }
    }
    return set;
}

const sim = (...args) => execFileSync('node', [SIM, ...args], { cwd: ROOT, encoding: 'utf8' });
const stateFile = (session) => join(ROOT, '.lesson-sim', `${session}.json`);
const readState = (session) => JSON.parse(readFileSync(stateFile(session), 'utf8'));

/** What is the tutor asking for right now? Read from the session state, which is
 *  the same state the app's step counter holds. */
function nextAnswer(state, lesson, known) {
    const stage = E.stageOf(state.step);
    const lastTutor = [...state.messages].reverse().find(m => m.role === 'assistant')?.content || '';

    if (stage === 'teach') {
        /* A doubled step asks for both of its words, so the last bold span alone
           is not the task — ask the engine what the step wants. */
        const slice = E.teachSliceFor(lesson.vocabulary || [], state.step);
        return {
            want: E.expectedForTeachStep(slice) || E.extractPromptedPhrase(lastTutor),
            alts: E.teachStepVariants(slice),
            what: `vocab step ${state.step + 1}`,
        };
    }
    if (stage === 'review') {
        const item = (state.reviewSet || [])[state.step - 5] || (state.reviewSet || [])[0];
        return { want: item?.word || null, what: `review "${item?.meaning}"` };
    }
    if (stage === 'phrase') {
        const d = lesson.phrases?.[state.step - 8];
        return { want: d?.correct || null, alts: d?.acceptable || [], what: `phrase: ${d?.prompt}` };
    }
    const d = lesson.conversations?.[state.step - 11];
    return { want: d?.correct || null, alts: d?.acceptable || [], what: `conversation: ${d?.prompt}` };
}

/* A [bracketed] slot is the learner's own information — their name, their city —
   which the engine treats as a wildcard. A simulated learner has to fill it with
   something or it reports the drill as unanswerable, which is not what a real
   person would do. */
const fillSlots = (form) => String(form || '').replace(/\[[^\]]*\]/g, 'Ravi');

/** In strict mode the learner picks the accepted form they can actually say. */
function sayable(want, alts, known) {
    const ok = (s) => norm(s).every(t => known.has(t) || FREE.has(t));
    for (const raw of [want, ...(alts || [])]) {
        if (!raw) continue;
        const form = fillSlots(raw);
        // The slot itself is free; only the words around it must be known.
        if (ok(String(raw).replace(/\[[^\]]*\]/g, ''))) return form;
    }
    return null;
}

const results = [];
const only = arg('lesson') ? Number(arg('lesson')) : null;

for (let n = 1; n <= lessons.length; n++) {
    if (only && n !== only) continue;
    const lesson = lessons[n - 1];
    const session = `auto-${STRICT ? 'strict' : 'ideal'}-${n}`;
    if (existsSync(stateFile(session))) rmSync(stateFile(session));
    sim('--session', session, '--reset', '--lang', lang, '--scenario', String(n));

    const known = taughtUpTo(n);
    let turns = 0, lastStep = -1, stall = 0, jam = null, dunno = 0;

    while (turns < 80) {
        const state = readState(session);
        if (state.step >= 15) break;
        if (state.step === lastStep) { stall++; } else { stall = 0; lastStep = state.step; }
        if (stall >= 4) { jam = `stuck at step ${state.step + 1} (${E.stageOf(state.step)}) for ${stall} turns`; break; }

        const { want, alts, what } = nextAnswer(state, lesson, known);
        if (!want) { jam = `nothing to answer at step ${state.step + 1} (${E.stageOf(state.step)}) — ${what}`; break; }

        let say = fillSlots(want);
        if (STRICT) {
            const can = sayable(want, alts, known);
            if (!can) { say = "I don't know that one, you haven't taught me it"; dunno++; }
            else say = can;
        }
        if (VERBOSE) console.log(`  L${n} step ${state.step + 1} ${what} → "${say}"`);
        sim('--session', session, '--say', say);
        turns++;
    }

    const final = readState(session);
    results.push({ n, scenario: lesson.scenario, done: final.step >= 15, turns, jam, dunno });
}

const label = STRICT ? 'strict (only says what it was taught)' : 'ideal (says the curriculum answer)';
console.log(`# ${lang} autoplay — ${label}\n`);
const broken = results.filter(r => !r.done);
console.log(`${results.length - broken.length} of ${results.length} lessons completed.\n`);

if (broken.length) {
    console.log(`## Lessons that could not be completed (${broken.length})\n`);
    for (const r of broken) console.log(`- **L${r.n} ${r.scenario}** — ${r.jam || `ran out of turns at ${r.turns}`}`);
    console.log('');
}

if (STRICT) {
    const stuckWords = results.filter(r => r.dunno > 0);
    console.log(`## Lessons where the learner had to say "I don't know" (${stuckWords.length})\n`);
    for (const r of stuckWords) {
        console.log(`- L${r.n} ${r.scenario} — ${r.dunno} drill${r.dunno > 1 ? 's' : ''} unanswerable${r.done ? '' : ' (lesson not completed)'}`);
    }
}

process.exit(broken.length ? 1 : 0);
