#!/usr/bin/env node
/**
 * matcher-check — does the answer matcher accept the answers the curriculum
 * itself declares correct?
 *
 *   node tools/matcher-check.mjs Telugu
 *
 * Every drill carries a `correct` answer and a list of `acceptable` variants.
 * Those are a promise: say any of them and you pass. The matcher is a similarity
 * score with a coverage floor, not a lookup, so the promise can be broken — and
 * a learner who gives a listed-correct answer and is told "Not quite" has no way
 * to know the course is wrong rather than them.
 *
 * Also flags the reverse: variants so loose that a DIFFERENT drill's answer
 * would pass, and answers that differ from `correct` only by a person ending,
 * which the matcher deliberately refuses to forgive.
 */

import { CURRICULUM } from '../src/services/curriculum.js';
import * as E from '../src/services/lessonEngine.js';

const lang = process.argv[2] || 'Telugu';
const lessons = CURRICULUM[lang] || [];
if (!lessons.length) { console.log(`no curriculum for ${lang}`); process.exit(1); }

const syn = E.buildLexicon(lessons);
const rejected = [];
const personTraps = [];

lessons.forEach((lesson, i) => {
    const drills = [
        ...(lesson.phrases || []).map(p => ({ ...p, kind: 'phrase' })),
        ...(lesson.conversations || []).map(p => ({ ...p, kind: 'conversation' })),
    ];
    for (const d of drills) {
        if (!d.correct) continue;
        const variants = d.acceptable || [];
        for (const answer of [d.correct, ...variants]) {
            const r = E.scoreAnswer(answer, d.correct, variants, syn);
            if (!r.accepted) {
                rejected.push({
                    lesson: i + 1, kind: d.kind, prompt: d.prompt,
                    answer, correct: d.correct,
                    ratio: r.ratio.toFixed(3), coverage: r.coverage.toFixed(3),
                    why: r.ratio < E.THRESHOLD ? 'similarity below 0.5' : 'token coverage below 0.7',
                });
            }
        }
        // A variant that only swaps the person ending is teaching the wrong thing:
        // the matcher is built to treat that as a different meaning, not a typo.
        for (const v of variants) {
            const a = E.normalizeLatin(v).split(' ');
            const b = E.normalizeLatin(d.correct).split(' ');
            if (a.length !== b.length) continue;
            for (let k = 0; k < a.length; k++) {
                if (a[k] !== b[k] && E.differsOnlyByPersonEnding(a[k], b[k])) {
                    personTraps.push({ lesson: i + 1, prompt: d.prompt, correct: d.correct, variant: v, pair: `${b[k]} vs ${a[k]}` });
                }
            }
        }
    }
});

console.log(`# ${lang} — answer-matcher self-consistency\n`);
console.log(`## Declared-correct answers the matcher REJECTS (${rejected.length})\n`);
if (!rejected.length) console.log('_None — every listed answer passes._\n');
for (const r of rejected) {
    console.log(`- L${r.lesson} (${r.kind}) "${r.prompt}"`);
    console.log(`    learner says: \`${r.answer}\``);
    console.log(`    target:       \`${r.correct}\``);
    console.log(`    ${r.why} (ratio ${r.ratio}, coverage ${r.coverage})`);
}

console.log(`\n## Variants that differ only by a person ending (${personTraps.length})\n`);
console.log('These accept a form that means a different PERSON — the one distinction\nthe lessons exist to teach and the matcher explicitly refuses to blur.\n');
if (!personTraps.length) console.log('_None._\n');
for (const p of personTraps) {
    console.log(`- L${p.lesson} "${p.prompt}" — \`${p.correct}\` also accepts \`${p.variant}\` (${p.pair})`);
}

/* The other direction: is the matcher so forgiving that a DIFFERENT drill's
   answer passes? Most hits are supersets — a learner who says everything asked
   for plus more — which is fair. A short answer passing for a long target is
   not, so the two are counted separately. */
let supersets = 0;
const overlaps = [];
lessons.forEach((lesson, i) => {
    const drills = [...(lesson.phrases || []), ...(lesson.conversations || [])].filter(d => d.correct);
    for (const d of drills) for (const other of drills) {
        if (other === d) continue;
        if (E.normalizeLatin(other.correct) === E.normalizeLatin(d.correct)) continue;
        if (!E.scoreAnswer(other.correct, d.correct, d.acceptable || [], syn).accepted) continue;
        const said = E.normalizeLatin(other.correct).split(' ').length;
        const need = E.normalizeLatin(d.correct).split(' ').length;
        if (said >= need) supersets++;
        else overlaps.push({ lesson: i + 1, said: other.correct, target: d.correct });
    }
});

console.log(`\n## Another drill's answer accepted for this one\n`);
console.log(`${supersets} where the learner said at least as much as the target asked for — they produced the whole answer plus extra, which is fair.\n`);
console.log(`### Shorter answer accepted for a longer target (${overlaps.length})\n`);
if (!overlaps.length) console.log('_None._\n');
for (const o of overlaps) console.log(`- L${o.lesson}: \`${o.said}\` accepted for \`${o.target}\``);

/* Can plain English pass a drill?
   A tester wrote "I can't do this one. I've never been taught a word for 'price'
   or for 'how much' in Telugu. All I have is the numbers and 'rupayalu'." and was
   graded "Exactly!" — because tokenising "I've" left a "ve" that the vowel-length
   forgiveness accepted as the target word *veyi*. An honest admission scored as a
   correct answer, which is the worst thing a grader can do: it teaches the
   learner that saying so is how you pass.
   Every drill is now checked against a set of things a stuck learner actually
   writes. None of them may ever be accepted. */
const REFUSALS = [
    "I don't know that one",
    "I have no idea, sorry",
    "You haven't taught me that yet",
    "I can't do this one. I've never been taught a word for that. Can you teach me?",
    "no idea what you want here",
    "I don't think you've taught me an 'am' for a person yet",
    "sorry, I'm stuck on this one and would like a hint please",
    "what does that mean again?",
    "ok",
    "I give up on this one",
];

/* Questions that NAME the word being asked for. "Is santhosham a noun or an
   adjective?" was graded "Great job!" and passed a review, because the word it
   asks about is also the answer it was checked against. Built per drill below. */
const questionShapes = (answer) => {
    const word = String(answer || '').split(/[\s,?]+/)[0] || 'that';
    return [
        `Is ${word} a noun or an adjective?`,
        `What does ${word} actually mean?`,
        `Does ${word} go before the noun?`,
    ];
};

const falsePasses = [];
lessons.forEach((lesson, i) => {
    for (const d of [...(lesson.phrases || []), ...(lesson.conversations || [])]) {
        if (!d.correct) continue;
        for (const said of [...REFUSALS, ...questionShapes(d.correct)]) {
            // Same two-part test the lesson engine applies: an utterance that
            // opens as a question is never an answer, whatever it contains.
            if (E.opensAsQuestion(said)) continue;
            if (E.scoreAnswer(said, d.correct, d.acceptable || [], syn).accepted) {
                falsePasses.push({ lesson: i + 1, prompt: d.prompt, correct: d.correct, said });
            }
        }
    }
});

console.log(`\n## Plain-English non-answers accepted as correct (${falsePasses.length})\n`);
console.log('A learner who says they do not know must never be graded correct.\n');
if (!falsePasses.length) console.log('_None._\n');
for (const f of falsePasses) {
    console.log(`- L${f.lesson} "${f.prompt}" (\`${f.correct}\`) accepted: "${f.said}"`);
}

/* The engine allots fifteen steps: five vocabulary, three review, three
   sentences, four conversations. A lesson carrying two sentence drills gives the
   learner a content-free "Let's move on." turn, and one carrying four hides the
   extra from everybody. Both are invisible without this check — lesson 8 shipped
   with two for as long as the course has existed. */
const misshapen = lessons
    .map((l, i) => ({ n: i + 1, scenario: l.scenario, p: (l.phrases || []).length, c: (l.conversations || []).length }))
    .filter(l => l.p !== 3 || l.c !== 4);

console.log(`\n## Lessons whose drill count does not match the engine's layout (${misshapen.length})\n`);
console.log('The fifteen steps allot 3 sentence drills and 4 conversation drills.\n');
if (!misshapen.length) console.log('_None._\n');
for (const l of misshapen) {
    console.log(`- L${l.n} ${l.scenario} — ${l.p} sentence drill(s), ${l.c} conversation drill(s)`);
}

/* Spoken feedback.
   The app is voice-first and it speaks a note's OPENING SENTENCE, keeping the
   full text on screen. So that sentence has to be a complete rule on its own and
   short enough to hold — three notes opened with a 170-260 character sentence,
   which is eleven to seventeen seconds of dense audio before the first full
   stop, and a tester said of one of them: "I nodded and moved on."
   Roughly 15 characters a second at normal speech. */
const CPS = 15;
const MAX_SPOKEN = 300;   // ~20 seconds

const longSpoken = [];
lessons.forEach((lesson, i) => {
    const notes = [
        ...(lesson.vocabulary || []).filter(v => v.teach)
            .map(v => ({ label: `teach ${v.word}`, text: v.teach.replaceAll('{w}', v.word) })),
        ...[...(lesson.phrases || []), ...(lesson.conversations || [])]
            .filter(d => d.grammarNote).map(d => ({ label: d.prompt, text: d.grammarNote })),
    ];
    for (const n of notes) {
        /* The WHOLE note is spoken, so the whole note is what has to be
           hearable. Truncating instead was worse: the cut landed on the caveat,
           and one lesson-26 note became actively false when its qualifier stayed
           on screen. The limit belongs on the writing. */
        const spoken = E.spokenFormOfNote(n.text);
        if (spoken.length > MAX_SPOKEN) {
            longSpoken.push({ lesson: i + 1, label: n.label, len: spoken.length, spoken });
        }
    }
});

console.log(`\n## Feedback too long to hear in one breath (${longSpoken.length})\n`);
console.log(`The voice says a note's first sentence. Over ${MAX_SPOKEN} characters (~${(MAX_SPOKEN / CPS).toFixed(0)}s) it stops being a rule and becomes a paragraph.\n`);
if (!longSpoken.length) console.log('_None._\n');
for (const n of longSpoken) {
    console.log(`- L${n.lesson} "${n.label}" — ${n.len} chars (~${(n.len / CPS).toFixed(0)}s)`);
    console.log(`    ${n.spoken.slice(0, 120)}...`);
}

process.exit(rejected.length || misshapen.length || falsePasses.length || longSpoken.length ? 1 : 0);
