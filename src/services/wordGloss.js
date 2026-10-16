/* What a tapped word means, for step mode's tap-a-word popover.
 *
 * Only what the course itself says: a vocabulary entry's own meaning, the
 * KNOWN_WORDS glossary (labelled "not taught yet"), or — for an inflected form
 * the course never stored whole — the stem's entry plus the ending from
 * WORD_ENDINGS (`manege` → mane + -ge). Anything else has no entry, and a word
 * with no entry is simply not tappable: a guessed gloss would teach a wrong
 * word. Display only; nothing here is graded.
 */

import { CURRICULUM, KNOWN_WORDS, WORD_ENDINGS } from './curriculum.js';

export const keyOf = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const indexes = new Map();

function indexFor(langName) {
    if (indexes.has(langName)) return indexes.get(langName);
    const taught = new Map();
    (CURRICULUM[langName] || []).forEach((lesson, i) => {
        for (const v of lesson.vocabulary || []) {
            const k = keyOf(v?.word);
            /* A single word only: "Hege iddira" glosses the phrase, not *hege*. */
            if (!k || k.includes(' ') || taught.has(k)) continue;
            taught.set(k, { word: v.word, meaning: v.meaning, lesson: i + 1 });
        }
    });
    const known = new Map();
    for (const w of KNOWN_WORDS[langName] || []) {
        const k = keyOf(w.word);
        if (k && !known.has(k)) known.set(k, { word: w.word, meaning: w.meaning, note: w.note || '' });
    }
    const idx = { taught, known, endings: WORD_ENDINGS[langName] || null };
    indexes.set(langName, idx);
    return idx;
}

/** The stem entry an inflected form is built on, when WORD_ENDINGS can say.
 *  `only` limits it to one ending. */
function viaEnding(idx, k, only = null) {
    const { endings, taught } = idx;
    if (!endings) return null;
    for (const e of only ? [only] : endings.endings || []) {
        if (!k.endsWith(e.ending) || k.length - e.ending.length < 2) continue;
        const bare = k.slice(0, -e.ending.length);
        const stems = [bare];
        /* Stem-end swaps taught before an ending: *pusthaka*-lu is pusthakam. */
        for (const [from, to] of endings.changes || []) {
            if (bare.endsWith(to)) stems.push(bare.slice(0, -to.length) + from);
        }
        for (const s of stems) {
            const stem = taught.get(s);
            if (stem) return { stem, ending: e };
        }
    }
    return null;
}

/**
 * @param {string} langName
 * @param {string} token one word as displayed
 * @param {number} lessonNo the lesson on screen, 1-based
 * @returns {null | {word, meaning, lesson?, status: 'taught'|'later'|'known', parts?}}
 *   `parts` is `{ stem, stemMeaning, ending, endingMeans }` for an inflected form.
 */
export function glossFor(langName, token, lessonNo = Infinity) {
    const k = keyOf(token);
    if (!k || k.includes(' ')) return null;
    const idx = indexFor(langName);
    const status = (lesson) => (lesson > lessonNo ? 'later' : 'taught');
    /* "from lesson N" only for a word met before this lesson: one taught on
       this very screen's lesson needs no provenance. */
    const hit = idx.taught.get(k);
    if (hit) return { word: token, meaning: hit.meaning, lesson: hit.lesson, status: status(hit.lesson), earlier: hit.lesson < lessonNo };
    const via = viaEnding(idx, k);
    if (via) {
        const { stem, ending } = via;
        const lesson = Math.max(stem.lesson, ending.lesson || 0);
        const exact = keyOf(ending.example?.word) === k ? ending.example.meaning : '';
        return {
            word: token, meaning: exact, lesson, status: status(lesson), earlier: lesson < lessonNo,
            parts: {
                stem: stem.word.toLowerCase(), stemMeaning: stem.meaning.charAt(0).toLowerCase() + stem.meaning.slice(1),
                ending: `-${ending.ending}`, endingMeans: ending.needs || '',
            },
        };
    }
    const kn = idx.known.get(k);
    if (kn) return { word: token, meaning: kn.meaning, note: kn.note, status: 'known' };
    return null;
}

/* ── The other way: an English word to the word the course taught for it ──
   Built from the vocabulary's own `meaning` glosses — "Don't want",
   "House / home", "You (polite)" — with the parenthetical notes dropped and
   each `/` alternative indexed whole. Only whole glosses are keys, so "is" or
   "the" never matches on its own; "I" does, because the course taught a word
   for it. A plural falls back to its singular ("books" → book). */

export const englishKey = (s) => String(s || '').toLowerCase().replace(/’/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();

/** Never a key on their own, even if a gloss somewhere were just this. */
const ENGLISH_FILLER = new Set(['a', 'an', 'the', 'to', 'of', 'is', 'and', 'or', 'it']);
const englishIndexes = new Map();

function englishIndexFor(langName) {
    if (englishIndexes.has(langName)) return englishIndexes.get(langName);
    const map = new Map();
    (CURRICULUM[langName] || []).forEach((lesson, i) => {
        for (const v of lesson.vocabulary || []) {
            if (!v?.word || !v?.meaning) continue;
            const alts = String(v.meaning).replace(/\([^)]*\)/g, ' ').split(/[/;,]/);
            for (const alt of alts) {
                const k = englishKey(alt);
                if (!k || ENGLISH_FILLER.has(k)) continue;
                const list = map.get(k) || [];
                if (!list.some(e => keyOf(e.word) === keyOf(v.word))) {
                    list.push({ word: v.word, meaning: v.meaning, lesson: i + 1 });
                }
                map.set(k, list);
            }
        }
    });
    englishIndexes.set(langName, map);
    return map;
}

/** Longest English phrase the index holds, in words. */
export const ENGLISH_MAX_WORDS = 4;

/**
 * The taught word(s) for an English word or phrase, up to two.
 *
 * With `answer` (the screen's expected answer and its variants, as course
 * keys), an English word no taught WORD covers can fall back to a taught
 * ENDING: "at" in "at one o'clock" is the -ge of *gantege*. Only when the
 * answer actually carries that ending on a taught stem — "look at the book"
 * or "You're at a stall" use "at" in a way -ge does not, and a rule offered
 * there would teach a wrong sentence.
 * @returns {null | {english: true, phrase, options: [{word, meaning, lesson, earlier}]}
 *   | {english: true, phrase, ending: {ending, means, example, lesson}, applied: {stem, form}}}
 */
export function englishFor(langName, phrase, lessonNo = Infinity, answer = null, context = '') {
    const k = englishKey(phrase);
    if (!k) return null;
    const pron = pronounFor(langName, k, lessonNo, context);
    if (pron) return { english: true, phrase, ...pron };
    const idx = englishIndexFor(langName);
    const taughtBy = (key) => (idx.get(key) || []).filter(e => e.lesson <= lessonNo);
    /* A plural taught later ("Books", lesson 9) must not hide the singular
       taught already. */
    let list = taughtBy(k);
    if (!list.length && k.length > 3 && /[^s']s$/.test(k)) list = taughtBy(k.slice(0, -1));
    if (!list.length && k.length > 4 && /es$/.test(k)) list = taughtBy(k.slice(0, -2));
    const options = list.slice(0, 2).map(e => ({ ...e, earlier: e.lesson < lessonNo }));
    if (options.length) return { english: true, phrase, options };
    return answer ? englishEndingFor(langName, phrase, lessonNo, answer) : null;
}

/* ── Pronouns: one English word, more than one taught form ──
   "I" is *naanu* in "I am here" but *nanage* in "I like it" — the course
   teaches that liking, wanting, knowing and having come "to me". A popover
   that answered "I" with *naanu* alone would teach the sentence the course
   tells the learner never to say. So "I", "me", "my", "you" and "your" open
   to every form of that person this lesson has taught — found through the
   course's own glosses ("I", "To me", "My"), never a list kept here — each
   with a one-line "when". The tapped word's own form leads; when the
   sentence around it is a liking/wanting/knowing/having one, the "to me"
   form leads instead and is marked as the one meant here. */

const PERSONS = {
    1: { subject: ['i'], dative: ['to me'], possessive: ['my'] },
    2: { subject: ['you'], dative: ['to you'], possessive: ['your'] },
};
/** English word tapped → which person, and which of its forms it names. */
const PRONOUN_TAPS = {
    i: [1, 'subject'], me: [1, 'dative'], my: [1, 'possessive'],
    you: [2, 'subject'], your: [2, 'possessive'],
};
/** English that takes the "to me" form in these languages. "Have to" is a
 *  must, not a having. */
const DATIVE_CUE = /\b(?:like[sd]?|liking|wants?|wanted|know[sn]?|knew|need[sd]?|remember(?:s|ed)?|(?:have|has|had)(?!\s+to\b)|hungry|thirsty)\b/i;
const dativeCueWords = new Map();

/** Taught target words that carry those meanings (*ishta*, *beku*, *gottu*),
 *  so a target-language sentence cues the form as well. */
function dativeCuesFor(langName, lessonNo) {
    const key = `${langName}|${lessonNo}`;
    if (dativeCueWords.has(key)) return dativeCueWords.get(key);
    const s = new Set();
    const pron = new Set();
    for (const p of Object.values(PERSONS)) for (const keys of Object.values(p)) for (const k of keys) pron.add(k);
    (CURRICULUM[langName] || []).forEach((lesson, i) => {
        if (i + 1 > lessonNo) return;
        for (const v of lesson.vocabulary || []) {
            const k = keyOf(v?.word);
            if (!k || k.includes(' ')) continue;
            const m = englishKey(String(v.meaning || '').replace(/\([^)]*\)/g, ' '));
            if (pron.has(m) || m.includes('to me') || m.includes('to you')) continue;
            if (DATIVE_CUE.test(m)) s.add(k);
        }
    });
    dativeCueWords.set(key, s);
    return s;
}

export function wantsDative(langName, context, lessonNo = Infinity) {
    const text = String(context || '');
    if (DATIVE_CUE.test(englishKey(text))) return true;
    const cues = dativeCuesFor(langName, lessonNo);
    return keyOf(text).split(' ').some(t => cues.has(t));
}

/** @returns {null | {pronoun: true, options: [{word, meaning, lesson, earlier, role, person, here}]}}
 *  Null when this lesson has taught fewer than two forms: the plain lookup
 *  then says everything there is to say. */
export function pronounFor(langName, englishK, lessonNo = Infinity, context = '') {
    const tap = PRONOUN_TAPS[englishK];
    if (!tap) return null;
    const [person, focus] = tap;
    const idx = englishIndexFor(langName);
    const forms = [];
    for (const [role, keys] of Object.entries(PERSONS[person])) {
        const hit = keys.flatMap(k => idx.get(k) || []).find(e => e.lesson <= lessonNo);
        if (hit && !forms.some(f => keyOf(f.word) === keyOf(hit.word))) {
            forms.push({ ...hit, earlier: hit.lesson < lessonNo, role, person });
        }
    }
    if (forms.length < 2) return null;
    const dative = forms.find(f => f.role === 'dative');
    const lead = focus === 'subject' && dative && wantsDative(langName, context, lessonNo) ? 'dative' : focus;
    const rank = (f) => (f.role === lead ? 0 : f.role === focus ? 1 : f.role === 'subject' ? 2 : f.role === 'dative' ? 3 : 4);
    forms.sort((a, b) => rank(a) - rank(b));
    if (lead !== focus) forms[0] = { ...forms[0], here: true };
    return { pronoun: true, options: forms.slice(0, 3) };
}

/** The taught ending an English word stands for on this screen, with the
 *  answer's word that carries it (*gante* → *gantege*). See `englishFor`. */
export function englishEndingFor(langName, phrase, lessonNo, answer) {
    const k = englishKey(phrase);
    const idx = indexFor(langName);
    for (const e of idx.endings?.endings || []) {
        if (!(e.english || []).includes(k) || (e.lesson || 0) > lessonNo) continue;
        for (const t of answer) {
            const via = viaEnding(idx, keyOf(t), e);
            if (!via || via.stem.lesson > lessonNo) continue;
            return {
                english: true, phrase,
                ending: { ending: e.ending, means: e.means, example: e.example || null, lesson: e.lesson },
                applied: { stem: via.stem.word.toLowerCase(), form: keyOf(t) },
            };
        }
    }
    return null;
}
