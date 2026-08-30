#!/usr/bin/env node
/**
 * gap-check — which drills demand a word the course has not taught YET?
 *
 *   node tools/gap-check.mjs Telugu
 *
 * Cumulative and order-aware: at lesson N a learner knows every word from
 * lessons 1..N, including that lesson's own vocabulary and every `alt` spelling.
 * A drill answer is only a gap if it needs a token none of those supply.
 *
 * This replaces the per-lesson check behind CURRICULUM-GAPS.md, which reported
 * words as untaught when an earlier lesson had in fact taught them (`illu` is
 * taught in L3 and was flagged as missing in L7).
 *
 * A token counts as supplied if a known word matches it exactly, or if it is a
 * known stem plus an inflection — reported separately, because "taught the stem"
 * and "taught this form" are different decisions for a curriculum author.
 */

import { CURRICULUM } from '../src/services/curriculum.js';

const norm = (v) => String(v || '').toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);

/* Loanwords and names a learner reads straight off the page. */
const FREE = new Set([
    'miko', 'coffee', 'tea', 'chai', 'bus', 'auto', 'hotel', 'film', 'cinema',
    'phone', 'school', 'college', 'office', 'doctor', 'hospital', 'final',
    'ravi', 'hyderabad', 'bangalore', 'chennai', 'mumbai', 'delhi', 'telugu',
    'kannada', 'hindi', 'odia', 'odisha', 'india', 'roti', 'rupees', 'ok',
    'place', 'name', 'x', 'y',
]);

const lang = process.argv[2] || 'Telugu';
const lessons = CURRICULUM[lang] || [];
if (!lessons.length) { console.log(`no curriculum for ${lang}`); process.exit(1); }

/* Where every word is FIRST taught, over the whole course. A word demanded in
   L3 and taught in L28 is a sequencing problem — move the lesson or the word —
   and that is a different, much cheaper fix than a word taught nowhere at all,
   which has to be written. Reporting them together hides that. */
const firstTaught = new Map();
lessons.forEach((lesson, i) => {
    for (const v of lesson.vocabulary || []) {
        const w = norm(v.word).join('');
        if (w && !firstTaught.has(w)) firstTaught.set(w, i + 1);
        for (const a of v.alt || []) for (const t of norm(a)) {
            if (!firstTaught.has(t)) firstTaught.set(t, i + 1);
        }
    }
});

const known = new Set();           // exact spellings a learner has been given
const missing = [];                 // needs a word with no known stem at all
const inflected = [];               // known stem, unseen ending

const isStemOf = (token) => {
    for (const k of known) {
        if (k.length < 3) continue;
        if (token.startsWith(k) || k.startsWith(token)) {
            const diff = Math.abs(token.length - k.length);
            if (diff > 0 && diff <= 5) return k;
        }
    }
    return null;
};

lessons.forEach((lesson, i) => {
    for (const v of lesson.vocabulary || []) {
        if (v.word) known.add(norm(v.word).join(''));
        for (const a of v.alt || []) norm(a).forEach(t => known.add(t));
    }

    const drills = [
        ...(lesson.phrases || []).map(p => ({ ...p, kind: 'phrase' })),
        ...(lesson.conversations || []).map(p => ({ ...p, kind: 'conversation' })),
    ];

    for (const d of drills) {
        // The learner only has to produce ONE accepted form. Score the easiest.
        const forms = [d.correct, ...(d.acceptable || [])].filter(Boolean);
        let best = null;
        for (const f of forms) {
            const need = norm(f);
            const gaps = [], infl = [];
            for (const t of need) {
                if (known.has(t) || FREE.has(t)) continue;
                const stem = isStemOf(t);
                if (stem) infl.push(`${t} (stem: ${stem})`);
                else gaps.push(t);
            }
            const score = gaps.length * 10 + infl.length;
            if (!best || score < best.score) best = { score, gaps, infl, form: f };
            if (score === 0) break;
        }
        if (!best) continue;
        const row = { lesson: i + 1, scenario: lesson.scenario, kind: d.kind, prompt: d.prompt, form: best.form };
        if (best.gaps.length) missing.push({ ...row, words: best.gaps });
        else if (best.infl.length) inflected.push({ ...row, words: best.infl });
    }
});

console.log(`# ${lang} — ${lessons.length} lessons, cumulative gap check\n`);

const tag = (w, atLesson) => {
    const at = firstTaught.get(w);
    return at ? `${w} (taught later, L${at})` : `${w} (taught nowhere)`;
};

const late = missing.filter(m => m.words.every(w => firstTaught.has(w)));
const absent = missing.filter(m => m.words.some(w => !firstTaught.has(w)));

console.log(`## Blocked drills (${missing.length})\n`);
console.log(`Split by what the fix is. **Out of order** (${late.length}) — every missing word IS taught, just in a later lesson; reorder or move the word earlier. **Never taught** (${absent.length}) — at least one word appears in no lesson's vocabulary and has to be written.\n`);

console.log(`### Out of order — word exists, taught too late (${late.length})\n`);
if (!late.length) console.log('_None._\n');
for (const m of late) {
    console.log(`- L${m.lesson} (${m.kind}) "${m.prompt}" → \`${m.form}\` — ${m.words.map(w => tag(w, m.lesson)).join(', ')}`);
}

console.log(`\n### Never taught anywhere in the course (${absent.length})\n`);
if (!absent.length) console.log('_None._\n');
for (const m of absent) {
    console.log(`- L${m.lesson} (${m.kind}) "${m.prompt}" → \`${m.form}\` — ${m.words.map(w => tag(w, m.lesson)).join(', ')}`);
}

console.log(`\n## Needs an unseen ending on a taught stem (${inflected.length})\n`);
if (!inflected.length) console.log('_None._\n');
for (const m of inflected) {
    console.log(`- L${m.lesson} (${m.kind}) "${m.prompt}" → \`${m.form}\` — ${m.words.join(', ')}`);
}

const byWord = new Map();
for (const m of missing) for (const w of m.words) byWord.set(w, (byWord.get(w) || 0) + 1);
console.log(`\n## Missing words ranked by how many drills they block\n`);
for (const [w, n] of [...byWord].sort((a, b) => b[1] - a[1])) {
    const at = firstTaught.get(w);
    console.log(`- \`${w}\` — ${n} drill(s) — ${at ? `taught in L${at}` : '**taught nowhere**'}`);
}
