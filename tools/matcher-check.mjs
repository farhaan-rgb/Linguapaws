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
        ...(lesson.pool || []).map(p => ({ ...p, kind: `pool ${p.id}` })),
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
    const drills = [...(lesson.phrases || []), ...(lesson.conversations || []), ...(lesson.pool || [])].filter(d => d.correct);
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

/* A word the course teaches AGAINST another (E.DISTINCT_WORDS) may never stand
   in for it. Round K4: `naanu tumba kushi` passed for *Nanage tumba kushi* and
   `naanu gottilla` for *Nanage gottilla*, each straight after a note saying
   "not naanu". Every drill whose answer uses one member of a pair is tried with
   the other member swapped in, in every listed form; unless the course lists
   the swapped sentence itself, it must be rejected. */
const swapPasses = [];
let swapNoted = 0;
lessons.forEach((lesson, i) => {
    for (const d of [...(lesson.phrases || []), ...(lesson.conversations || []), ...(lesson.pool || [])]) {
        if (!d.correct) continue;
        const listed = new Set([d.correct, ...(d.acceptable || [])].map(E.normalizeLatin));
        for (const form of [d.correct, ...(d.acceptable || [])]) {
            const toks = E.normalizeLatin(form).split(' ');
            toks.forEach((t, k) => {
                for (const group of E.DISTINCT_WORDS) {
                    if (!group.includes(t)) continue;
                    for (const other of group.filter(w => w !== t)) {
                        const said = toks.map((x, j) => (j === k ? other : x)).join(' ');
                        if (listed.has(said)) continue;
                        if (E.scoreAnswer(said, d.correct, d.acceptable || [], syn).accepted) {
                            /* By design since round 17: *nenu* for *naaku* before a
                               want-word passes WITH a note naming *naaku*. */
                            if (E.wantNote(said, d.correct, d.acceptable || [])) { swapNoted++; continue; }
                            swapPasses.push({ lesson: i + 1, correct: d.correct, said });
                        }
                    }
                }
            });
        }
    }
});
console.log(`\n## A taught-against word accepted in its partner's place (${swapPasses.length})\n`);
if (swapNoted) console.log(`(${swapNoted} more are *nenu* for *naaku* before a want-word: accepted with a note naming *naaku*, by design.)\n`);
if (!swapPasses.length) console.log('_None._\n');
for (const f of swapPasses) console.log(`- L${f.lesson} \`${f.said}\` accepted for \`${f.correct}\``);

/* Pinned verdicts from real tester turns: [language, said, target, variants-from-
   drill?, must-accept]. A regression here is a learner told the wrong thing. */
const PINNED = {
    Kannada: [
        ['naanu tumba kushi', 'Nanage tumba kushi', false],   // K4 L16
        ['naanu gottilla', 'Nanage gottilla', false],         // K4 L20
        ['mattu', 'Matte', false],                            // K4 L20, teach step
        ['maaduttiddene kelasa', 'Naanu kelasa maaduttiddene', false], // K4 L11, verb first
        ['naanu maaduttiddene kelasa', 'Naanu kelasa maaduttiddene', false],
        ['kelasa maaduttiddene', 'Naanu kelasa maaduttiddene', true],
        ['tinnuttene aamele', 'Naanu aamele tinnuttene', false], // K4 L14
        ['aamele tinnuttene', 'Naanu aamele tinnuttene', true],
        ['hogu baruttene', 'Hogi baruttene', false],          // K4 L14
        ['raatrige nidde maaduttene', 'Naanu raatri nidde maaduttene', true], // K4 L18
        ['ivaru nanna kutumba', 'Idu nanna kutumba', true],   // K4 L17
        ['naanu nodide mane', 'Naanu mane nodide', false],    // K4 L13
        // r17: subject, time, place, adverb and question word move freely; the verb stays last
        ['ivattu naanu kelasa maaduttiddene', 'Naanu kelasa maaduttiddene', true],
        ['naanu ivattu hoguttiddene', 'Ivattu naanu hoguttiddene', true],
        ['eega naanu tinnuttene', 'Naanu eega tinnuttene', true],
        ['yaake idu', 'Idu yaake?', true],
        ['kushi tumba nanage', 'Nanage tumba kushi', false],  // predicate not last
    ],
    Telugu: [
        ['naaku annam vaddu', 'Annam vaddu', true],
        ['annam oddu', 'Annam vaddu', true],                 // the spoken spelling, taught as an alt of vaddu
        ['vedi neeru oddu', 'Vedi neeru kaavali', false],   // polarity flip in either spelling             // rt16 L4, after "to say I: naaku neeru kaavali"
        ['naaku rendu kaavali', 'Rendu kaavali', true],       // rt16 L7
        /* r17 L18: was false (rt16). Farhaan's round-17 call: nenu-for-naaku before
           a want-word is understood, so it passes with a note (wantNote), not a miss. */
        ['nenu rendu kaavali', 'Rendu kaavali', true],
        ['nenu snanam kaavali', 'Snanam kaavali', true],     // r17 L18
        ['nenu gurthundi', 'Naaku gurthundi', false],        // r17 L20: not a want-word
        ['illu ekkada undi', 'Illu ekkada?', true],           // rt16 L3
        ['okati pusthakam', 'Oka pusthakam', false],          // rt16 L7
        ['idhi evaru', 'Evaru?', false],                      // rt16 L6, after "idhi for a person is rude"
        ['miko, meeru ela', 'Miko, meeru ela unnaru?', false], // rt16 L1, Farhaan: unnaru required
        ['miko, ela unnaru', 'Miko, meeru ela unnaru?', true],
        ['meeru ela', 'Meeru ela unnaru', false],
        ['nenu ippudu vellu', 'Nenu ippudu velthunnanu', false],
        // r17 word order: free before the verb, verb last, modifier before noun
        ['nenu eeroju velthunnanu', 'Eeroju nenu velthunnanu', true],   // L12
        ['ippudu nenu tintanu', 'Nenu ippudu tintanu', true],           // L14
        ['nenu eeroju santhoshamga unnanu', 'Eeroju nenu santhoshamga unnanu', true], // L20
        ['enduku idhi', 'Idhi enduku?', true],                          // L15
        ['nenu intiki ippudu velthunnanu', 'Nenu ippudu intiki velthunnanu', true], // L11
        ['nenu chestunnanu pani', 'Nenu pani chestunnanu', false],      // verb not last
        ['naaku ledu ishtam', 'Naaku ishtam ledu', false],
        ['illu mee ekkada', 'Mee illu ekkada?', false],                 // modifier after noun
        ['peru naa', 'Naa peru', false],
        // r17 optional words that are correct
        ['mee illu ekkada undi', 'Mee illu ekkada?', true],             // L17
        ['meeru enduku ikkada unnaru', 'Meeru enduku ikkada?', true],   // L15
        ['nenu bagunnanu', 'Bagunnanu', true],                          // r16
        ['nenu illu lo unnaru', 'Nenu illu lo', false],                 // wrong-person copula
        // r17 spelling tolerance
        ['tinunnanu', 'Tintunnanu', false],                             // L11 memory: a lost syllable
        ['chestunanu', 'Chestunnanu', true],
        ['sare danyavadalu', 'Sare, dhanyavaadaalu', true],             // L20
    ],
};
const drillFor = (target) => {
    for (const lesson of lessons) {
        for (const d of [...(lesson.phrases || []), ...(lesson.conversations || []), ...(lesson.pool || [])]) {
            if (E.normalizeLatin(d.correct) === E.normalizeLatin(target)) return d;
        }
        for (const v of lesson.vocabulary || []) {
            if (E.normalizeLatin(v.word) === E.normalizeLatin(target)) return { correct: v.word, acceptable: v.alt || [] };
        }
    }
    return { correct: target, acceptable: [] };
};
const pinnedWrong = [];
for (const [said, target, want] of PINNED[lang] || []) {
    const d = drillFor(target);
    const got = E.scoreAnswer(said, d.correct, d.acceptable || [], syn).accepted;
    if (got !== want) pinnedWrong.push({ said, target, want });
}
console.log(`\n## Pinned tester verdicts that changed (${pinnedWrong.length} of ${(PINNED[lang] || []).length})\n`);
if (!pinnedWrong.length) console.log('_None._\n');
for (const f of pinnedWrong) console.log(`- \`${f.said}\` for \`${f.target}\`: should be ${f.want ? 'accepted' : 'rejected'}`);

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
    for (const d of [...(lesson.phrases || []), ...(lesson.conversations || []), ...(lesson.pool || [])]) {
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
        ...[...(lesson.phrases || []), ...(lesson.conversations || []), ...(lesson.pool || [])]
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

/* Vowel length. Learners double a vowel to mark it long — `unnaanu`,
   `elaa unnaaru`, `chennagiddiini` — and gen-pool's script round-trip writes
   చేశాను as `cheshaanu`; all were rejected while the course spells *unnanu*.
   Length is forgiven, so the other half is pinned too: no word the course
   teaches AGAINST another (DISTINCT_WORDS, and the deictic i-/a- pairs) may
   pass for its partner under any lengthening or shortening of its vowels. */
const LENGTH_PINS = {
    Telugu: [
        ['unnaanu', 'Unnanu', true],
        ['Nenu inti daggara unnaanu', 'Nenu inti daggara unnanu', true],
        ['nenu bhojanam cheshaanu', 'Nenu bhojanam chesanu', true],
        ['elaa unnaaru', 'Ela unnaru?', true],
        ['meeru elaa unnaaru', 'Meeru ela unnaru?', true],
        /* An extra subject pronoun: fine where the verb carries its person,
           a different sentence where it does not (`meeru` "you" for `mee` "your"). */
        ['meeru ela unnaru', 'Ela unnaru?', true],
        ['meeru peru emiti?', 'Peru emiti?', false],
        ['nuvvu peru emiti', 'Peru emiti?', false],
        ['meeru bagunnanu', 'Bagunnanu', false],
    ],
    Kannada: [
        ['chennagiddiini', 'Chennagiddeeni', true],
        ['naanu chennaagiddeeni', 'Naanu chennagiddeeni', true],
        ['neevu hesaru enu', 'Hesaru enu?', false],
    ],
};
const lengthWrong = [];
for (const [said, target, want] of LENGTH_PINS[lang] || []) {
    const d = drillFor(target);
    const got = E.scoreAnswer(said, d.correct, d.acceptable || [], syn).accepted;
    if (got !== want) lengthWrong.push(`\`${said}\` for \`${d.correct}\`: should be ${want ? 'accepted' : 'rejected'}`);
}
/* Every spelling of `w` one vowel-length step away: each single vowel doubled,
   each doubled vowel singled, and the course's ee written ii. */
const lengthVariants = (w) => {
    const out = new Set();
    for (let i = 0; i < w.length; i++) {
        if (!'aeiou'.includes(w[i])) continue;
        if (w[i + 1] === w[i]) out.add(w.slice(0, i) + w.slice(i + 1));
        else if (w[i - 1] !== w[i]) out.add(w.slice(0, i + 1) + w[i] + w.slice(i + 1));
    }
    out.add(w.replace(/ee/g, 'ii'));
    out.delete(w);
    return [...out];
};
const CONTRASTS = [...E.DISTINCT_WORDS,
    ['illi', 'alli'], ['idu', 'adu'], ['ivaru', 'avaru'], ['ikkada', 'akkada'], ['idhi', 'adhi']];
let contrastCases = 0;
for (const group of CONTRASTS) {
    for (const a of group) {
        for (const b of group) {
            if (a === b) continue;
            for (const v of [a, ...lengthVariants(a)]) {
                contrastCases++;
                if (E.scoreAnswer(v, b, [], syn).accepted) lengthWrong.push(`\`${v}\` accepted for \`${b}\``);
            }
        }
    }
}
console.log(`\n## Vowel-length and extra-pronoun verdicts wrong (${lengthWrong.length} of ${(LENGTH_PINS[lang] || []).length} pins + ${contrastCases} contrast spellings)\n`);
if (!lengthWrong.length) console.log('_None._\n');
for (const f of lengthWrong) console.log(`- ${f}`);

/* A question is answered and re-asked, not graded — so an ANSWER misread as a
   question is never graded either. Every answer the course lists must read as an
   attempt, and the round-K4 questions (and their answer-shaped look-alikes) must
   land on the right side. */
const asQuestion = [];
lessons.forEach((lesson, i) => {
    for (const d of [...(lesson.phrases || []), ...(lesson.conversations || []), ...(lesson.pool || [])]) {
        for (const form of [d.correct, ...(d.acceptable || [])].filter(Boolean)) {
            if (E.isLearnerQuestion(form, { lexicon: syn })) asQuestion.push({ lesson: i + 1, form });
        }
    }
});
const QUESTION_PINS = [
    ['wait, I thought the -ene ending already means I? why do I need naanu?', true],
    ["what's the word for early?", true],
    ['how do I say late?', true],
    ['Yaake beda?', false],
    ['Nimma hesaru yenu?', false],
    ['Meeru ela unnaru?', false],
    ['Emiti?', false],
    ['Nenu bagunnanu, meeru?', false],
    ['Is ka naam kya hai?', false],
];
for (const [said, want] of QUESTION_PINS) {
    if (E.isLearnerQuestion(said, { lexicon: syn }) !== want) asQuestion.push({ lesson: '-', form: `${said} (pinned ${want ? 'question' : 'answer'})` });
}
console.log(`\n## Answers read as questions, or pinned questions misread (${asQuestion.length})\n`);
if (!asQuestion.length) console.log('_None._\n');
for (const q of asQuestion) console.log(`- L${q.lesson} \`${q.form}\``);

/* Forms the linguists replaced (2667628, f774225; telugu-second-opinion.md).
   The WRONG ones are a near miss: rejected, and the miss line is the authored
   trap naming the form that was needed, not a generic "not quite". The
   ACCEPTABLE ones (regional, bookish, the spoken spelling) still pass. Each is
   graded the way the app grades it: the lexicon of the lessons up to that drill. */
const SUPERSEDED_PINS = {
    Telugu: [
        // wrong: motion takes the dative -ki
        ['akkada vellandi', 'Akkadiki vellandi', 'trap'],
        ['nenu akkada vellanu', 'Nenu akkadiki vellanu', 'trap'],
        ['illu vellandi', 'Intiki vellandi', 'trap'],
        ['inti vellandi', 'Intiki vellandi', 'trap'],
        ['nenu repu illu velthanu', 'Nenu repu intiki velthanu', 'trap'],
        // wrong: the noun form of a colour directly before a noun
        ['erupu batta kaavali', 'Erra batta kaavali', 'trap'],
        ['naaku erupu batta kaavali', 'Erra batta kaavali', 'trap'],
        ['telupu batta', 'Tella batta', 'trap'],
        // the other direction is untouched, and the listed fuller forms pass
        ['akkada chudu', 'Akkada chudu!', true],
        ['illu akkada undi', 'Illu akkada undi', true],
        ['erupu rangu batta kaavali', 'Erra batta kaavali', true],
        ['telupu rangu batta', 'Tella batta', true],
        ['naaku erupu ishtam', 'Naaku erupu ishtam', true],
        // acceptable variants stay accepted
        ['adhi chedu', 'Adhi baaledu', true],
        ['melukonu', 'Lev', true],
        ['vana paduthundi', 'Vana padutondi', true],
        ['annam oddu', 'Annam vaddu', true],
        ['annam voddu', 'Annam vaddu', true],
    ],
};
const supersededWrong = [];
for (const [said, target, want] of SUPERSEDED_PINS[lang] || []) {
    const at = lessons.findIndex(l => [...(l.phrases || []), ...(l.conversations || []), ...(l.pool || [])]
        .some(d => E.normalizeLatin(d.correct) === E.normalizeLatin(target)));
    if (at < 0) { supersededWrong.push(`\`${target}\`: no drill has this answer`); continue; }
    const upTo = lessons.slice(0, at + 1);
    const d = drillFor(target);
    const lex = E.buildLexicon(upTo);
    const ok = E.scoreAnswer(said, d.correct, d.acceptable || [], lex).accepted;
    if (want === true) {
        if (!ok) supersededWrong.push(`\`${said}\` for \`${d.correct}\`: should be accepted`);
        continue;
    }
    if (ok) { supersededWrong.push(`\`${said}\` for \`${d.correct}\`: should be a near miss, was accepted`); continue; }
    const help = E.missHelp(said, d.correct, { variants: d.acceptable || [], lexicon: lex, taughtLessons: upTo });
    if (help.kind !== want) supersededWrong.push(`\`${said}\` for \`${d.correct}\`: rejected, but the line is \`${help.kind}\`, not the authored ${want}: ${help.line}`);
}
console.log(`\n## Superseded forms graded wrong (${supersededWrong.length} of ${(SUPERSEDED_PINS[lang] || []).length} pins)\n`);
if (!supersededWrong.length) console.log('_None._\n');
for (const f of supersededWrong) console.log(`- ${f}`);

process.exit(rejected.length || misshapen.length || falsePasses.length || longSpoken.length
    || swapPasses.length || pinnedWrong.length || asQuestion.length || lengthWrong.length
    || supersededWrong.length ? 1 : 0);
