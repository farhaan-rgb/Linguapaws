#!/usr/bin/env node
/**
 * trap-check — the wrong answers a FAITHFUL learner gives.
 *
 *   node tools/trap-check.mjs Kannada            per screen, then the top 10
 *   node tools/trap-check.mjs Kannada --summary  only the totals and the top list
 *   node tools/trap-check.mjs Kannada --top 25
 *
 * Kannada L11 asks for "I am going (right now)", *hoguttiddene*. A learner
 * answered *hoguttene* — because L3 drilled *hoguttene* as "I am going home"
 * and "I am going there". That is not carelessness; it is the course working.
 * These answers are predictable from the course alone, so each one can have an
 * authored "why not X" (`traps: [{ said, why }]` in curriculum.js) that
 * `missHelp` and `answerFromFacts` prefer over anything generic.
 *
 * For every recall screen `stepPlan.buildLessonSteps` builds (teach screens and
 * drills; review screens re-ask teach words), and every taught word in its
 * answer, a candidate is a word the learner already had that:
 *   meaning  — its gloss overlaps the needed word's English    (I go ~ I am going)
 *   used     — an earlier drill used it for that English       (L3 "I am going home")
 *   distinct — DISTINCT_WORDS teaches the two against each other
 *   family   — same WORD_FAMILIES group
 *   ending   — same stem, different ending                     (iddene / iddeera)
 * A candidate the grader accepts in that slot (scoreAnswer) is not listed.
 * Ranked by a weighted sum. `✓` marks a candidate that already has an authored
 * trap. Nothing here grades anything.
 */
import { CURRICULUM, WORD_FAMILIES } from '../src/services/curriculum.js';
import { buildLessonSteps } from '../src/services/stepPlan.js';
import { DISTINCT_WORDS, normalizeLatin, trapsFor, differsOnlyByPersonEnding, scoreAnswer, buildLexicon } from '../src/services/lessonEngine.js';

const args = process.argv.slice(2);
const lang = args.find(a => !a.startsWith('--')) || 'Kannada';
const summaryOnly = args.includes('--summary');
const topN = Number(args[args.indexOf('--top') + 1]) || 10;
const lessons = CURRICULUM[lang] || [];
if (!lessons.length) { console.log(`no curriculum for ${lang}`); process.exit(1); }

const lexicon = buildLexicon(lessons);
const WEIGHT = { used: 4, meaning: 3, distinct: 3, ending: 2, family: 1 };

/* English, as content words: auxiliaries, articles and pronouns carry no
   meaning a wrong word could be chosen for, and "going" is "go". */
const STOP = new Set(('i me my you your he she it its we they them a an the to of is am are be was '
    + 'do does did this that please not no and or will').split(' '));
const stem = (w) => w.replace(/(ing|ed|es|s)$/, '').replace(/(.)\1$/, '$1');
/* Bracketed notes are dropped: "(right now)" is a qualifier, and matching it
   made *eega* ("now") and *sari* ("right") look like traps for hoguttiddene. */
const content = (s) => new Set(String(s || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z' ]/g, ' ')
    .split(/\s+/).filter(w => w && !STOP.has(w)).map(stem).filter(w => w.length > 1));
const overlap = (a, b) => [...a].filter(x => b.has(x));

/* Every taught word in order: lesson, position, entry, and its spellings. */
const order = [];
const byForm = new Map();
lessons.forEach((l, li) => (l.vocabulary || []).forEach((v, vi) => {
    if (!v.word) return;
    const e = { ...v, lesson: li + 1, pos: li * 100 + vi, forms: [v.word, ...(v.alt || [])].map(normalizeLatin) };
    order.push(e);
    for (const f of e.forms) if (!byForm.has(f)) byForm.set(f, e);
}));
const familyOf = (a, b) => (WORD_FAMILIES[lang] || []).find(f => {
    const m = f.members.map(normalizeLatin);
    return a.forms.some(x => m.includes(x)) && b.forms.some(x => m.includes(x));
});
const distinct = (a, b) => DISTINCT_WORDS.some(g => a.forms.some(x => g.includes(x)) && b.forms.some(x => g.includes(x)));
const sameStem = (a, b) => {
    const x = normalizeLatin(a.word); const y = normalizeLatin(b.word);
    if (differsOnlyByPersonEnding(x, y)) return true;
    let p = 0; while (p < x.length && x[p] === y[p]) p++;
    return p >= 4 && p >= Math.max(x.length, y.length) - 4 && x !== y;
};

/* What each word was used to say in the drills up to `pos`: the drill's
   English minus the glosses of the other taught words in it. */
const drillsUpTo = (lessonNo) => lessons.slice(0, lessonNo).flatMap((l, li) =>
    [...(l.phrases || []), ...(l.conversations || [])].map(d => ({ ...d, lesson: li + 1 })));
const usesOf = (word, drills) => drills.flatMap(d => {
    const toks = normalizeLatin(d.correct).split(' ').filter(Boolean);
    if (!toks.some(t => word.forms.includes(t))) return [];
    const others = toks.map(t => byForm.get(t)).filter(e => e && e.word !== word.word);
    const rest = content(d.meaning);
    for (const o of others) for (const w of content(o.meaning)) rest.delete(w);
    return rest.size ? [{ english: d.meaning, words: rest, lesson: d.lesson }] : [];
});

const screens = [];
const slipped = [];
lessons.forEach((lesson, li) => {
    const lessonNo = li + 1;
    const steps = buildLessonSteps(lesson, null, lessons);
    const upTo = lessons.slice(0, lessonNo);
    for (const step of steps) {
        if (step.kind !== 'teach' && step.kind !== 'drill') continue;
        const english = step.kind === 'teach' ? step.slice[0].meaning : step.drill.meaning;
        const need = normalizeLatin(step.expected).split(' ').filter(Boolean);
        const needWords = need.map(t => byForm.get(t)).filter(Boolean);
        const authored = trapsFor(step.expected, upTo);
        const drills = drillsUpTo(lessonNo);
        const traps = [];
        for (const T of needWords) {
            /* A teach screen's own word is new: only what came before it counts. */
            const limit = step.kind === 'teach' ? T.pos : li * 100 + 99;
            const tEnglish = content(T.meaning);
            for (const C of order) {
                if (C.pos >= limit || C.word === T.word || needWords.some(n => n.word === C.word)) continue;
                const why = [];
                let score = 0;
                const m = overlap(content(C.meaning), tEnglish);
                if (m.length) { why.push(`meaning “${C.meaning}”`); score += WEIGHT.meaning; }
                const used = usesOf(C, drills.filter(d => d.lesson < lessonNo || step.kind === 'drill'))
                    .filter(u => overlap(u.words, tEnglish).length);
                if (used.length) {
                    why.push(`used for “${used[0].english}” (L${used[0].lesson})${used.length > 1 ? ` +${used.length - 1}` : ''}`);
                    score += WEIGHT.used + Math.min(used.length - 1, 3);
                }
                if (distinct(C, T)) { why.push('taught against it'); score += WEIGHT.distinct; }
                if (sameStem(C, T)) { why.push('same stem'); score += WEIGHT.ending; }
                const fam = familyOf(C, T);
                if (fam) { why.push(`family “${fam.name}”`); score += WEIGHT.family; }
                if (!score || (why.length === 1 && fam)) continue; // a family alone is too weak to list
                /* Not a trap if the grader takes it: L11's "I am going now"
                   accepts *hoguttene*. Asked of scoreAnswer, never decided here. */
                const swapped = need.map(t => (T.forms.includes(t) ? normalizeLatin(C.word) : t)).join(' ');
                const graded = scoreAnswer(swapped, step.expected, step.variants || [], lexicon);
                if (graded.accepted) {
                    /* Accepted only by tolerance (a long sentence forgives one
                       word): the learner is never told. Listed apart. */
                    if (graded.coverage < 1) slipped.push({ said: C.word, for: T.word, lessonNo, english, swapped });
                    continue;
                }
                /* Recency: a word from the lesson before is likelier than one from L1. */
                score += C.lesson >= lessonNo - 2 ? 1 : 0;
                const has = authored.some(a => normalizeLatin(a.said) === normalizeLatin(C.word)
                    || C.forms.includes(normalizeLatin(a.said)));
                traps.push({ said: C.word, for: T.word, score, why, authored: has });
            }
        }
        traps.sort((a, b) => b.score - a.score);
        screens.push({ lessonNo, kind: step.kind, english, expected: step.expected, traps });
    }
});

const all = screens.flatMap(s => s.traps.map(t => ({ ...t, screen: s })));
if (!summaryOnly) {
    for (const s of screens) {
        if (!s.traps.length) continue;
        console.log(`L${s.lessonNo} ${s.kind.padEnd(5)} “${s.english}” → ${s.expected}`);
        for (const t of s.traps.slice(0, 5)) {
            console.log(`   ${t.authored ? '✓' : ' '} ${String(t.score).padStart(2)}  ${t.said} for ${t.for}: ${t.why.join('; ')}`);
        }
        if (s.traps.length > 5) console.log(`        … ${s.traps.length - 5} more`);
    }
    console.log('');
}
const strong = all.filter(t => t.score >= 5);
console.log(`${lang}: ${screens.length} recall screens, ${screens.filter(s => s.traps.length).length} with a likely trap; `
    + `${all.length} traps (${strong.length} scoring 5+), ${all.filter(t => t.authored).length} with an authored why.`);
console.log(`\nTop ${topN}:`);
/* One line per (said, for) pair: the same confusion on five screens is one
   thing to author, on the word. */
const seen = new Set();
const top = [...all].sort((a, b) => b.score - a.score || a.screen.lessonNo - b.screen.lessonNo)
    .filter(t => { const k = `${t.said}>${t.for}`; if (seen.has(k)) return false; seen.add(k); return true; });
top.slice(0, topN).forEach((t, i) => console.log(`${String(i + 1).padStart(3)}. ${t.authored ? '✓' : ' '} ${t.said} for ${t.for} `
    + `(L${t.screen.lessonNo} “${t.screen.english}”, ${t.score}): ${t.why.join('; ')}`));

if (slipped.length) {
    const seenS = new Set();
    const uniq = slipped.filter(t => { const k = `${t.said}>${t.for}`; if (seenS.has(k)) return false; seenS.add(k); return true; });
    console.log(`\nAccepted by tolerance, never corrected (${slipped.length} screen-swaps, ${uniq.length} pairs) — a grading question, not a trap:`);
    for (const t of uniq.slice(0, topN)) console.log(`   ${t.said} for ${t.for} (L${t.lessonNo} “${t.english}”): “${t.swapped}”`);
}
