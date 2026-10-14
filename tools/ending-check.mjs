#!/usr/bin/env node
/* Step-mode miss lines for taught word endings (WORD_ENDINGS).
   Usage: node tools/ending-check.mjs        — exits 1 on any failed case.
   Each case runs lessonEngine.missHelp exactly as Steps.jsx calls it. */
import * as engine from '../src/services/lessonEngine.js';
import { CURRICULUM, WORD_FAMILIES, KNOWN_WORDS, WORD_ENDINGS } from '../src/services/curriculum.js';

const help = (lang, lessonNo, said, expected, reveal = false) => {
    const lessons = CURRICULUM[lang];
    return engine.missHelp(said, expected, {
        lexicon: engine.buildLexicon(lessons), taughtLessons: lessons.slice(0, lessonNo),
        families: WORD_FAMILIES[lang] || [], knownWords: KNOWN_WORDS[lang] || [],
        language: lang, reveal, endings: WORD_ENDINGS[lang],
    }).line || '';
};

// [lang, lesson (1-based), said, expected, reveal, must match, must NOT match]
const CASES = [
    ['Kannada', 8, 'Hoovegalu', 'Hoovu', false, /^Good thinking: \*-galu\* makes it more than one, like \*manegalu\* \(houses\)\. This asks for just one flower: H____\.$/],
    ['Kannada', 8, 'Hoovugalu', 'Hoovu', false, /-galu\* makes it more than one.*H____/],
    ['Kannada', 8, 'Hoovegalu', 'Hoovu', true, /just one flower: \*Hoovu\*\.$/],
    ['Kannada', 8, 'Hoovegalu beku', 'Hoovu beku', false, /-galu/],
    ['Kannada', 3, 'Naanu mane hoguttene', 'Naanu manege hoguttene', false, /^Right word, but this needs “to”: add \*-ge\*\.$/, /Manege/i],
    ['Kannada', 3, 'Naanu mane hoguttene', 'Naanu manege hoguttene', true, /\*Manege\*/],
    ['Kannada', 28, 'Naale naanu nanna ooru hoguttene', 'Naale naanu nanna oorige hoguttene', false, /needs “to”: it takes \*-ge\*, like \*manege\*/],
    ['Kannada', 27, 'Chillare ide', 'Chillare ideya', false, /question form: add \*-ya\*/],
    ['Kannada', 20, 'Nanage gottuilla', 'Nanage gottu', false, /-illa\* makes it “not”/],
    ['Kannada', 8, 'Manegalu', 'Manege', false, /^\*-galu\* makes it more than one; this needs “to”, so \*-ge\* instead\.$/],
    ['Kannada', 8, 'Snehitagalu', 'Snehitaru', false, /^Close: \*-galu\* is for things\. For people, add \*-aru\*: S________\.$/],
    ['Kannada', 8, 'Nanna snehitagalu', 'Nanna snehitaru', true, /^Close: \*-galu\* is for things\. For people, add \*-aru\*: \*Snehitaru\*\.$/],
    // Not taught yet: -galu arrives in lesson 8.
    ['Kannada', 7, 'Hoovegalu', 'Hoovu', false, null, /galu/],
    // Right ending, wrong stem: falls through to the meaning-based line.
    ['Kannada', 8, 'Manegalu', 'Hoovu', false, null, /Good thinking/],
    // Random strings are not rescued.
    ['Kannada', 8, 'Hxgalu', 'Hoovu', false, null, /Good thinking/],
    ['Kannada', 8, 'Hoogalu', 'Hoovu', false, null, /Good thinking/],
    ['Telugu', 8, 'Pusthakamlu', 'Pusthakam', false, /-lu\* makes it more than one.*just one book/],
    ['Telugu', 8, 'Pusthakalu', 'Pusthakam', false, /^Good thinking: \*-lu\* makes it more than one\. This asks for just one book: P________\.$/],
    ['Telugu', 8, 'Guruvulu', 'Guruvu', false, /-lu\* makes it more than one, like \*pusthakalu\* \(books\)\. This asks for just one teacher/],
    ['Telugu', 3, 'Nenu illu velthunnanu', 'Nenu intiki velthunnanu', false, /needs “to”: it takes \*-ki\*, like \*paniki\*/],
    ['Telugu', 3, 'Nenu inti velthunnanu', 'Nenu intiki velthunnanu', false, /needs “to”: add \*-ki\*/],
    ['Telugu', 8, 'Snehithudulu', 'Snehithudu', false, /-lu\* makes it more than one/],
    ['Telugu', 8, 'Snehithulu', 'Snehithudu', false, /-lu\* makes it more than one/],    // Ranked: the wrong-meaning word leads, the typos follow in one line.
    ['Kannada', 12, 'Ivatte, naanu kesala hogittene', 'Ivattu naanu kelasa maaduttiddene', false, /^\*Hogittene\* sounds like \*hoguttene\*, “I go or I will go”\. This asks for “I am doing”: M____________\. Also check the spelling of \*ivatte\* and \*kesala\*\.$/, /Maaduttiddene/],
    ['Kannada', 12, 'Ivatte, naanu kesala hogittene', 'Ivattu naanu kelasa maaduttiddene', true, /“I am doing”: \*Maaduttiddene\*\. Also check the spelling/],
    ['Kannada', 12, 'Ivatte naanu kelasa', 'Ivattu naanu kelasa maaduttiddene', false, /^The word for "I am doing" is missing\. Also check the spelling of \*ivatte\*\.$/],
    ['Kannada', 12, 'Ivatte naanu kelasa maaduttiddene', 'Ivattu naanu kelasa maaduttiddene', false, /^Close, you wrote ivatte; the word you want starts with I_____\.$/],
    ['Kannada', 8, 'Ivu dodda pustaka', 'Idu dodda pustaka', false, /^\*Ivu\* means “these” \(more than one\)\. For one book, use the word for “this”: I__\.$/],
    ['Kannada', 8, 'Neevu hesaru enu', 'Nimma hesaru enu', false, /^\*Neevu\* means “you”, said politely\. This asks for “your”\.$/],
    ['Kannada', 8, 'Nanage oota beku illa', 'Nanage oota beda', false, /^Good thinking: \*beku\* \+ \*illa\* makes sense/],
];

let fail = 0;
for (const [lang, n, said, expected, reveal, want, not] of CASES) {
    const line = help(lang, n, said, expected, reveal);
    const ok = (!want || want.test(line)) && (!not || !not.test(line));
    if (!ok) fail++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${lang} L${n} "${said}" for "${expected}"${reveal ? ' (reveal)' : ''}\n     ${line || '(no line)'}`);
}
console.log(`\n${CASES.length - fail}/${CASES.length} passed`);
process.exit(fail ? 1 : 0);
