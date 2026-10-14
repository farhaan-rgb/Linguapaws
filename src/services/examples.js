/* "See it in a sentence": up to two sentences from the course's own phrases and
   conversations that use a vocabulary word.

   The trigger was a Kannada memory check asking for "It is / there is". The
   learner had *Ide* as a word and no idea where it goes in a sentence — and the
   course already holds *Mane alli ide*, two screens later, unconnected to it.
   So nothing here is written: every sentence is one the course teaches, with the
   meaning and native script it was written with.

   Read-only over the engine. Nothing here grades anything.

   What counts as the word appearing: the word or one of its `alt` spellings as a
   whole token, or a clear inflection of it — the word plus a short ending
   (*mane* -> *manege*) — provided that longer token is not itself another word
   the course teaches (*ide* is not *ideya*, "is there?").

   What makes a sentence usable: every other word in it has been taught by this
   point. A sentence that needs a word the learner has not met is not an example,
   it is another lesson. When nothing qualifies the answer is none — a weak
   example is worse than the button not being there. */
import { normalizeLatin, buildRealWordSet } from './lessonEngine.js';

const MAX_ENDING = 3;   // -ge, -alli, -lo, -ki: the endings the courses teach
const MIN_STEM = 3;     // below this a "prefix" is a coincidence, not a stem

const tokensOf = (text) => normalizeLatin(text).split(' ').filter(Boolean);

const formsOf = (v) => [v.word, ...(v.alt || [])].map(normalizeLatin).filter(Boolean);

/* Is `token` the form `f`, or `f` with a short ending? */
const inflects = (token, f) => token === f
    || (f.length >= MIN_STEM && token.startsWith(f) && token.length - f.length <= MAX_ENDING);

/**
 * @param lessons   the whole course for the language
 * @param lessonIdx the lesson the learner is on
 * @param word      the vocabulary headword (`Ide`)
 * @param opts.teaching  true on a teach screen: the current lesson's words
 *                       after this one have not been shown yet
 * @returns [{ correct, meaning, native, lessonIdx }] — at most two, maybe none
 */
export function examplesFor(lessons = [], lessonIdx = 0, word = '', { teaching = false, max = 2 } = {}) {
    if (!word || !lessons.length) return [];
    const here = Math.min(Math.max(lessonIdx, 0), lessons.length - 1);
    const key = normalizeLatin(word);

    /* The word's own entry, wherever it was taught — a review can ask for a word
       from an earlier lesson. */
    let entry = null;
    for (let i = 0; i <= here && !entry; i++) {
        entry = (lessons[i].vocabulary || []).find(v => normalizeLatin(v.word) === key) || null;
    }
    const own = entry ? formsOf(entry) : [key];

    /* Everything taught up to now. */
    const taught = [];
    for (let i = 0; i <= here; i++) {
        const vocab = lessons[i].vocabulary || [];
        let upto = vocab.length;
        if (teaching && i === here) {
            const at = vocab.findIndex(v => normalizeLatin(v.word) === key);
            if (at !== -1) upto = at + 1;
        }
        for (const v of vocab.slice(0, upto)) taught.push(...formsOf(v));
    }

    /* Another real word of the course is never an inflection of this one. */
    const realWords = buildRealWordSet(lessons);
    const ownSet = new Set(own);
    const isOwn = (t) => own.some(f => inflects(t, f))
        && (ownSet.has(t) || !realWords.has(t));
    const isTaught = (t) => taught.some(f => inflects(t, f));

    const found = [];
    const seen = new Set();
    for (let i = 0; i <= here; i++) {
        const lesson = lessons[i];
        for (const d of [...(lesson.phrases || []), ...(lesson.conversations || [])]) {
            if (!d?.correct || !d.meaning) continue;
            const toks = tokensOf(d.correct);
            if (toks.length < 2 || toks.some(t => /[[\]()]/.test(t))) continue;
            const sig = toks.join(' ');
            if (seen.has(sig)) continue;
            if (!toks.some(isOwn)) continue;
            if (!toks.every(t => isOwn(t) || isTaught(t))) continue;
            seen.add(sig);
            found.push({ correct: d.correct, meaning: d.meaning, native: d.native || '', lessonIdx: i, len: toks.length });
        }
    }

    /* Finished lessons first, then this one; shorter first within each. */
    found.sort((a, b) => ((a.lessonIdx === here) - (b.lessonIdx === here)) || (a.len - b.len));
    return found.slice(0, max).map(({ correct, meaning, native, lessonIdx: li }) => ({ correct, meaning, native, lessonIdx: li }));
}
