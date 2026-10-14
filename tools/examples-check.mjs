#!/usr/bin/env node
/**
 * examples-check — are the written "See it in a sentence" examples fair?
 *
 *   node tools/examples-check.mjs            Kannada and Telugu (every language with written examples)
 *   node tools/examples-check.mjs Telugu     one language
 *
 * A vocabulary entry may carry `examples: [{ text, native, meaning }]`, written
 * for words the course has no sentence for. `src/services/examples.js` shows
 * them on the step surface. They are display-only, so nothing else would ever
 * notice one that is wrong. This does:
 *
 *  1. every token is a word taught by the end of that word's lesson — the same
 *     whole-word-or-short-ending rule `examples.js` uses, written out again here
 *     so a bug in one is not silently a bug in both;
 *  2. `native` is in the language's script and, word by word, either
 *     romanises back to its Latin word through `shared/transliterate.js` and
 *     `scoreAnswer` (script-check's round trip), or is exactly the native the
 *     course itself already pairs with that Latin word. The second arm is
 *     there because the course romanises some words as said, not as written
 *     (*Unnanu* for ఉన్నాను), and script-check lists those as notes rather than
 *     failures — an example reusing the course's own spelling is not wrong;
 *  3. `meaning` is present.
 *
 * Then it prints coverage: how many words have at least one example at the end
 * of their own lesson, and on their own teach screen, after the change.
 * Exit code 1 on any issue.
 */
import { CURRICULUM } from '../src/services/curriculum.js';
import * as E from '../src/services/lessonEngine.js';
import { examplesFor } from '../src/services/examples.js';
import { toLatin, detectScript, SCRIPT_BY_LANGUAGE } from '../shared/transliterate.js';
import { LANGUAGES } from '../shared/languages.js';

const only = process.argv.slice(2).find(a => !a.startsWith('--'));
const idOf = (name) => (LANGUAGES.find(l => l.name === name) || {}).id;
const norm = (t) => E.normalizeLatin(t);
const tokens = (t) => norm(t).split(' ').filter(Boolean);
const nativeTokens = (t) => String(t).replace(/[^\p{L}\p{M}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
const inflects = (tok, f) => tok === f || (f.length >= 3 && tok.startsWith(f) && tok.length - f.length <= 3);

let issues = 0;
const issue = (line) => { issues++; console.log(`  ISSUE  ${line}`); };

const languages = Object.keys(CURRICULUM)
    .filter(l => !only || l === only)
    .filter(l => only || CURRICULUM[l].some(ls => (ls.vocabulary || []).some(v => v.examples)));

for (const name of languages) {
    const ls = CURRICULUM[name];
    const lex = E.buildLexicon(ls);
    const script = SCRIPT_BY_LANGUAGE[idOf(name)];
    /* Latin word -> the native forms the course pairs with it: vocabulary, and
       each token of a drill line whose two halves split into the same count. */
    const known = new Map();
    const pair = (latin, native) => {
        const a = tokens(latin), b = nativeTokens(native);
        if (a.length === b.length) a.forEach((t, i) => (known.get(t) || known.set(t, new Set()).get(t)).add(b[i]));
    };
    for (const lesson of ls) {
        for (const v of lesson.vocabulary || []) if (v.native) pair(v.word, v.native);
        for (const d of [...(lesson.phrases || []), ...(lesson.conversations || [])]) if (d.native) pair(d.correct, d.native);
    }
    const taught = [];
    let written = 0, words = 0, endCovered = 0, teachCovered = 0;
    const uncovered = [];

    ls.forEach((lesson, li) => {
        for (const v of lesson.vocabulary || []) taught.push(norm(v.word), ...(v.alt || []).map(norm));
        for (const v of lesson.vocabulary || []) {
            words++;
            const upto = ls.slice(0, li + 1);
            if (examplesFor(upto, li, v.word).length) endCovered++; else uncovered.push(`L${li + 1} ${v.word}`);
            if (examplesFor(upto, li, v.word, { teaching: true }).length) teachCovered++;
            for (const x of v.examples || []) {
                written++;
                const at = `${name} L${li + 1} ${v.word}: "${x.text}"`;
                if (!x.text || !x.native || !x.meaning) { issue(`${at} — needs text, native and meaning`); continue; }
                const strays = tokens(x.text).filter(t => !taught.some(f => inflects(t, f)));
                if (strays.length) issue(`${at} — not taught by L${li + 1}: ${strays.join(', ')}`);
                const got = detectScript(x.native);
                if (!got || (script && got !== script)) { issue(`${at} — native is ${got || 'no Indic script'}, expected ${script}`); continue; }
                const lat = tokens(x.text), nat = nativeTokens(x.native);
                if (lat.length !== nat.length) { issue(`${at} — ${lat.length} Latin words but ${nat.length} native`); continue; }
                lat.forEach((t, i) => {
                    if (known.get(t)?.has(nat[i])) return;
                    const back = toLatin(nat[i], { language: idOf(name) });
                    if (!E.scoreAnswer(back, t, [], lex).accepted) issue(`${at} — ${nat[i]} romanises to "${back}", not "${t}"`);
                });
            }
        }
    });
    console.log(`${name}: ${written} written examples checked. Coverage — end of lesson ${endCovered}/${words}, `
        + `teach screen ${teachCovered}/${words}.`);
    if (uncovered.length) console.log(`  no example at end of lesson: ${uncovered.join('; ')}`);
}

console.log(issues ? `\n${issues} issue(s).` : '\n0 issues.');
process.exit(issues ? 1 : 0);
