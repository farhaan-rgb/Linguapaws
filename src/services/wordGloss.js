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

/** The stem entry an inflected form is built on, when WORD_ENDINGS can say. */
function viaEnding(idx, k) {
    const { endings, taught } = idx;
    if (!endings) return null;
    for (const e of endings.endings || []) {
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
    const hit = idx.taught.get(k);
    if (hit) return { word: token, meaning: hit.meaning, lesson: hit.lesson, status: status(hit.lesson) };
    const via = viaEnding(idx, k);
    if (via) {
        const { stem, ending } = via;
        const lesson = Math.max(stem.lesson, ending.lesson || 0);
        const exact = keyOf(ending.example?.word) === k ? ending.example.meaning : '';
        return {
            word: token, meaning: exact, lesson, status: status(lesson),
            parts: {
                stem: stem.word.toLowerCase(), stemMeaning: stem.meaning,
                ending: `-${ending.ending}`, endingMeans: ending.needs || '',
            },
        };
    }
    const kn = idx.known.get(k);
    if (kn) return { word: token, meaning: kn.meaning, note: kn.note, status: 'known' };
    return null;
}
