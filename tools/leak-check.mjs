#!/usr/bin/env node
/**
 * leak-check — did a simulated learner produce course vocabulary it had not
 * been given yet?
 *
 *   node tools/leak-check.mjs .lesson-sim/pt-a1.json
 *   node tools/leak-check.mjs --chain .lesson-sim/pt-c7.json .lesson-sim/pt-c8.json
 *
 * A playtest is only worth reading if the tester genuinely did not know the
 * language. A model playing a beginner knows Telugu perfectly well, so its
 * ignorance has to be verified rather than trusted.
 *
 * The question is deliberately narrow: did the learner say a word THIS COURSE
 * teaches, before the course had shown it to them? Asking "is this token
 * English?" instead does not work — the system wordlist is missing words as
 * ordinary as "hang" and "using", so honest English prose reads as a leak. The
 * course's own vocabulary is a closed set, and it is the only set that matters.
 *
 * A token is legitimate if the tutor had already shown it, an earlier lesson
 * taught it (the notebook `lesson-sim --notes` hands the tester), a chained
 * earlier session showed it, or it is within a typo's distance of one of those —
 * testers are asked to make realistic typos.
 *
 * `--chain` treats the files as one learner in order, so lesson 8 inherits what
 * lesson 7's transcript showed them. Without it each file is judged alone.
 *
 * Surviving flags still need reading rather than trusting: a tester who says
 * "copying the -ali from cheyali, is it thinali? pure guess" has reasoned to a
 * real form from taught parts, which is what a learner does. That shows up here
 * and should — but it is a finding about the course, not misconduct.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { CURRICULUM } = await import(join(ROOT, 'src/services/curriculum.js'));
const { levenshtein } = await import(join(ROOT, 'src/services/lessonEngine.js'));

const argv = process.argv.slice(2);
const CHAIN = argv.includes('--chain');
const files = argv.filter(a => !a.startsWith('--'));

const tokens = (text) => String(text || '')
    .toLowerCase()
    .replace(/<phonetic>[\s\S]*?<\/phonetic>/g, ' ')  // a sound hint is not a spelling
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** Every word this course ever puts in the target language, anywhere.
 *
 *  Proper nouns are excluded. A name that only ever appears inside a drill answer,
 *  capitalised, and never as a vocabulary item — Hyderabad, Miko, Ravi, the
 *  language's own name — is English as much as it is Telugu, and a tester writing
 *  "my neighbour is from Hyderabad" is not leaking anything.
 */
function courseVocabulary(lang) {
    const taught = new Set();
    const inAnswers = new Set();
    const properNouns = new Set();

    for (const lesson of CURRICULUM[lang] || []) {
        for (const v of lesson.vocabulary || []) {
            tokens(v.word).forEach(t => taught.add(t));
            for (const a of v.alt || []) tokens(a).forEach(t => taught.add(t));
        }
        for (const d of [...(lesson.phrases || []), ...(lesson.conversations || [])]) {
            for (const form of [d.correct, ...(d.acceptable || [])]) {
                tokens(form).forEach(t => inAnswers.add(t));
                // capitalised mid-string is a name, not vocabulary
                for (const w of String(form || '').split(/[\s,.!?]+/)) {
                    if (/^[A-Z][a-z]+$/.test(w)) properNouns.add(w.toLowerCase());
                }
            }
        }
    }

    const set = new Set([...taught, ...inAnswers]);
    for (const n of properNouns) if (!taught.has(n)) set.delete(n);
    return set;
}

/** What earlier lessons taught — the notebook the tester carries in. */
function notebook(lang, lessonNo) {
    const set = new Set();
    for (const lesson of (CURRICULUM[lang] || []).slice(0, lessonNo - 1)) {
        for (const v of lesson.vocabulary || []) {
            tokens(v.word).forEach(t => set.add(t));
            for (const a of v.alt || []) tokens(a).forEach(t => set.add(t));
        }
    }
    return set;
}

/** A typo of a word they know is not outside knowledge. */
const nearKnown = (t, known) => {
    const budget = t.length >= 6 ? 2 : 1;
    for (const k of known) {
        if (Math.abs(k.length - t.length) > budget) continue;
        if (levenshtein(t, k) <= budget) return k;
    }
    return null;
};

let bad = 0;
const carried = new Set();   // survives across files when --chain

for (const file of files) {
    if (!existsSync(file)) { console.log(`missing: ${file}`); bad = 1; continue; }
    const state = JSON.parse(readFileSync(file, 'utf8'));
    const lessonNo = (state.scenarioIdx ?? 0) + 1;
    const course = courseVocabulary(state.lang);

    const known = new Set([...notebook(state.lang, lessonNo), ...(CHAIN ? carried : [])]);
    /* The language's own name is English too. A tester asking "is that the English
       word 'bill' borrowed into Telugu?" was flagged for saying "Telugu". */
    tokens(state.lang).forEach(t => known.add(t));
    const leaks = [];
    let turn = 0;

    for (const m of state.messages || []) {
        if (m.role === 'user') {
            turn++;
            for (const t of tokens(m.content)) {
                if (t.length < 2) continue;
                if (!course.has(t)) continue;            // not this course's Telugu at all
                if (known.has(t) || nearKnown(t, known)) continue;
                leaks.push({ turn, token: t, said: m.content });
            }
        } else {
            tokens(m.content).forEach(t => { known.add(t); if (CHAIN) carried.add(t); });
        }
    }
    if (CHAIN) for (const t of known) carried.add(t);

    const label = `${state.lang} L${lessonNo}`;
    if (!leaks.length) {
        console.log(`✅ ${label.padEnd(12)} clean — ${turn} learner turns, no course word used before it was given`);
    } else {
        bad = 1;
        console.log(`⚠️  ${label.padEnd(12)} ${leaks.length} course word(s) used before being given — read these, they may be honest reasoning:`);
        for (const l of leaks) console.log(`     turn ${l.turn}: "${l.token}"  in: ${l.said}`);
    }
}

process.exit(bad);
