#!/usr/bin/env node
/* Step-mode miss lines for taught word endings (WORD_ENDINGS).
   Usage: node tools/ending-check.mjs        — exits 1 on any failed case.
   Each case runs lessonEngine.missHelp exactly as Steps.jsx calls it. */
import * as engine from '../src/services/lessonEngine.js';
import { CURRICULUM, WORD_FAMILIES, KNOWN_WORDS, WORD_ENDINGS } from '../src/services/curriculum.js';
import { tipSegments } from '../src/services/speechScript.js';

/* The drill whose answer this is, for its prompt meaning and accepted forms —
   what Steps.jsx passes as `meaning` and `variants`. */
const drillFor = (lessons, lessonNo, expected) => {
    for (const l of lessons.slice(0, lessonNo)) {
        for (const d of [...(l.phrases || []), ...(l.conversations || [])]) {
            if (engine.normalizeLatin(d.correct) === engine.normalizeLatin(expected)) return d;
        }
    }
    return null;
};
const help = (lang, lessonNo, said, expected, reveal = false) => {
    const lessons = CURRICULUM[lang];
    const drill = drillFor(lessons, lessonNo, expected);
    return engine.missHelp(said, expected, {
        variants: drill?.acceptable || [], meaning: drill?.meaning || '',
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
    /* The authored Nimma <- Neevu trap: "you" against "your", outlined, not spelled. */
    ['Kannada', 8, 'Neevu hesaru enu', 'Nimma hesaru enu', false, /^\*Neevu\* is “you”\. Before a thing, “your” is N____\.$/, /Nimma/],
    ['Kannada', 8, 'Nanage oota beku illa', 'Nanage oota beda', false, /^Good thinking: \*beku\* \+ \*illa\* makes sense/],
    /* Round 16 (Telugu L1-10): a word whose meaning IS in the prompt was told
       it "is not what this asks for". */
    ['Telugu', 3, 'nenu ikkada unnanu, meeru?', 'Nenu ikkada, meeru?', false, /“?I am”?.*which fits, but this sentence leaves it out/, /not what this asks for/],
    ['Telugu', 4, 'nenu neeru kaavali', 'Neeru kaavali', false, /^\*Nenu\* means “I”, but you don't need “I” here/, /not what this asks for/],
    ['Telugu', 6, 'meeru evaru unnaru', 'Meeru evaru?', false, /^\*Unnaru\* means “you are”, which fits/, /not what this asks for/],
    ['Telugu', 5, 'naaku annam vaddu', 'Annam vaddu', false, /you don't need “I” here/, /not what this asks for/],
    ['Telugu', 7, 'naaku rendu kaavali', 'Rendu kaavali', false, null, /not what this asks for/],
    // ...while a word whose meaning is not in the prompt still gets it.
    ['Telugu', 3, 'illu ekkada akkada', 'Illu ekkada?', false, /not what this asks for|There/],
    /* Word order on a first miss: the misplaced word and where, never the sentence. */
    /* Was `ela meeru unnaru`, which round 17 made correct: the question word
       and the subject move freely before the verb. The verb still goes last. */
    ['Telugu', 1, 'unnaru meeru ela', 'Meeru ela unnaru', false, /^All the right words — the order is not\. unnaru goes last\.$/],
    ['Telugu', 10, 'ivvandi billu', 'Billu ivvandi', false, /^All the right words — the order is not\. ivvandi goes last\.$/, /billu ivvandi/],
    // A synonym form is not "all the right words", and the first miss names the learner's word.
    ['Telugu', 3, 'vellu akkadiki', 'Akkadiki vellandi', false, /^The order is off\. vellu goes last\.$/, /All the right words|vellandi/],
    ['Telugu', 3, 'vellu akkadiki', 'Akkadiki vellandi', true, /akkadiki vellandi/],
    // A dropped syllable is a spelling slip, not a missing word.
    ['Telugu', 6, 'snehudu', 'Snehithudu', false, /^Close, check the spelling of snehudu\.$/, /missing/],
    ['Telugu', 6, 'snehudu', 'Snehithudu', true, /snehithudu/, /missing/],
    // Authored traps (curriculum `traps`): the "why not X" written for the answer a faithful learner gives.
    ['Kannada', 11, 'Hoguttene', 'Hoguttiddene', false, /^\*Hoguttene\* is “I go” or “I will go”, from lesson 3\. For right now, on the way, add \*-idd-\* before the ending: H___________\.$/],
    ['Kannada', 11, 'Hoguttene', 'Hoguttiddene', true, /add \*-idd-\* before the ending: \*Hoguttiddene\*\.$/],
    ['Kannada', 11, 'Hogittene', 'Hoguttiddene', false, /^\*Hogittene\* sounds like \*hoguttene\*, which is “I go”.*-idd-/],
    ['Kannada', 12, 'Naanu manege hoguttiddene', 'Naanu manege hoguttene', false, /^\*Hoguttiddene\* is only for right now.*: H________\.$/, /\*hoguttene\*/i],
    // A trap whose word is not taught yet never fires.
    ['Kannada', 3, 'Hoguttiddene', 'Hoguttene', false, null, /-idd-/],
    // The needed word keeps its qualifier.
    ['Kannada', 11, 'Maaduttiddene', 'Hoguttiddene', false, /This asks for “I am going \(right now\)”\.$/],
    ['Kannada', 25, 'Hodare', 'Bandare', false, /This asks for “if \(someone\) comes”/],
];

let fail = 0;
for (const [lang, n, said, expected, reveal, want, not] of CASES) {
    const line = help(lang, n, said, expected, reveal);
    const ok = (!want || want.test(line)) && (!not || !not.test(line));
    if (!ok) fail++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${lang} L${n} "${said}" for "${expected}"${reveal ? ' (reveal)' : ''}\n     ${line || '(no line)'}`);
}
/* A question is answered, never graded (round 16, chat L2). */
const QUESTIONS = [
    ['Telugu', 'wait, do I use adhi or aa here?', 'Adhi emiti?', true],
    ['Telugu', 'hmm, is it idhi or adhi?', 'Adhi emiti?', true],
    ['Telugu', 'adhi emiti', 'Adhi emiti?', false],
];
for (const [lang, said, target, want] of QUESTIONS) {
    const got = engine.isPureQuestion(said, target, { lexicon: engine.buildLexicon(CURRICULUM[lang]) });
    const ok = got === want;
    if (!ok) fail++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} isPureQuestion("${said}") = ${got}`);
}

/* What the voice hears (round 16): a colon between two target spans is a
   pause, "+" between target words is said, and nothing merges. */
const voiced = (line) => tipSegments('Telugu', line).map(g => (g.target ? `‹${g.text}›` : g.text)).join(' | ');
const SPOKEN = [
    ['All the right words — the order is not. ela goes right after meeru: meeru ela unnaru.', /‹meeru:?› \| ‹meeru ela unnaru\.?›/],
    ['Use *ayana* for a person, not *idhi*: *idhi* is for things.', /‹idhi:?› \| ‹idhi›/],
    ['This is how you say “I have”: *naaku* + *undi*.', /‹naaku› \| plus \| ‹undi\.?›/],
];
for (const [line, want] of SPOKEN) {
    const got = voiced(line);
    const ok = want.test(got);
    if (!ok) fail++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} spoken: ${got}`);
}
const total = CASES.length + QUESTIONS.length + SPOKEN.length;
console.log(`\n${total - fail}/${total} passed`);
process.exit(fail ? 1 : 0);
