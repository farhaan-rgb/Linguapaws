/* ── Endings, made visible ────────────────────────────────────────────────
 * Display only: nothing here is graded, and lessonEngine never reads it.
 *
 * Telugu carries person, politeness, direction and number in the last letters
 * of a word — *bagunna-nu* "I am fine", *unna-ru* "you are". A learner who
 * sees *Unnaru* as one flat word has nothing to notice, and a form that is
 * not noticed is not learned. So step mode marks the ending and says what it
 * does, in the course's own words.
 *
 * Only endings a lesson teaches in its own text, from the lesson that teaches
 * them (`lesson`, 1-based) — the same bar as WORD_ENDINGS in curriculum.js and
 * the `sure` entries of tools/structures/telugu.json. Each gloss is quoted or
 * condensed from the grammar note named beside it. Telugu only for now: the
 * Kannada person endings are not written down anywhere the app can quote.
 *
 *   match  — the whole token, lowercased; group 2 is the ending
 *   except — tokens that match but are words, not stem + ending
 */
export const NOTICE_ENDINGS = {
    Telugu: [
        /* L1 note: "The end of the word tells you who: unnanu is 'I am'". */
        { ending: 'nu', lesson: 1, gloss: 'I', match: /^(\w+[ae])(nu)$/,
            except: ['nenu', 'galanu', 'lenu'] },
        /* L1 note: "unnaru is 'you are'. Unnaru also means 'he is' or 'she
           is', said with respect." */
        { ending: 'ru', lesson: 1, gloss: 'you, polite — or he/she, with respect', match: /^(\w+a)(ru)$/,
            except: ['meeru', 'evaru', 'vaaru'] },
        /* L1 note: "With a close friend, say unnavu." */
        { ending: 'vu', lesson: 1, gloss: 'you, to a close friend', match: /^(\w+a)(vu)$/,
            except: ['selavu'] },
        /* L3 note: "Here's intiki, 'to the house'. The -ki goes on the end". */
        { ending: 'ki', lesson: 3, gloss: 'to', match: /^(\w+[iu])(ki)$/, except: [] },
        /* L8 note: "Pusthakam dropped -am and took -alu. Words ending in a
           vowel just add -lu." */
        { ending: 'lu', lesson: 8, gloss: 'more than one', match: /^(\w+[aiu])(lu)$/,
            except: ['dhanyavaadaalu', 'dabbulu', 'rupayalu', 'billu', 'illu', 'vellu'] },
        /* L10 note: "The -andi at the end makes it polite." */
        { ending: 'andi', lesson: 10, gloss: 'polite — “please”', match: /^(\w+?)([ao]ndi)$/, except: [] },
    ],
};

const tokenKey = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * The ending a word carries, when the course has taught it by `lessonNo`.
 * @returns {null | { stem, end, ending, gloss }} — `stem` and `end` keep the
 *   token's own casing, so `stem + end` is the word exactly as displayed.
 */
export function endingOf(lang, token, lessonNo = Infinity) {
    const raw = String(token || '').replace(/[^\p{L}\p{N}]+/gu, '');
    const k = tokenKey(raw);
    if (k.length < 4) return null;
    for (const e of NOTICE_ENDINGS[lang] || []) {
        if (e.lesson > lessonNo || e.except.includes(k)) continue;
        const m = k.match(e.match);
        if (!m || m[1].length < 2) continue;
        const cut = raw.length - m[2].length;
        return { stem: raw.slice(0, cut), end: raw.slice(cut), ending: e.ending, gloss: e.gloss };
    }
    return null;
}

/** A sentence as tokens, each with its ending when it has one:
 *  `[{ text, mark: endingOf(...) | null }]`, spaces and punctuation kept. */
export function markEndings(lang, text, lessonNo = Infinity) {
    return String(text || '').split(/(\s+)/).filter(s => s !== '').map(part => {
        if (/^\s+$/.test(part)) return { text: part, mark: null };
        const lead = part.match(/^[^\p{L}\p{N}]*/u)[0];
        const trail = part.match(/[^\p{L}\p{N}]*$/u)[0];
        const core = part.slice(lead.length, part.length - trail.length || undefined);
        const mark = core ? endingOf(lang, core, lessonNo) : null;
        return { text: part, lead, trail, mark };
    });
}

/** Distinct endings in a sentence, in order — for the one-line gloss row. */
export function endingsIn(lang, text, lessonNo = Infinity) {
    const seen = new Map();
    for (const t of markEndings(lang, text, lessonNo)) {
        if (t.mark && !seen.has(t.mark.ending)) seen.set(t.mark.ending, { ...t.mark, word: t.mark.stem + t.mark.end });
    }
    return [...seen.values()];
}

/* ── The pattern screen ──
   Once an ending has turned up in PATTERN_MIN phrases from lessons the learner
   has already finished, one lesson shows them side by side: the same ending,
   different sentences, one meaning. Each ending gets this once, at the first
   lesson where it qualifies, and a lesson shows at most one — so it comes
   round every few lessons, not every lesson. Pure and computed from the
   curriculum alone, so a resumed lesson rebuilds the same plan. */
export const PATTERN_MIN = 3;
export const PATTERN_MAX = 4;

const drillsOf = (l) => [...(l?.phrases || []), ...(l?.conversations || [])].filter(d => d?.correct);

const cache = new Map();
function patternsFor(lang, lessons) {
    const hit = cache.get(lessons);
    if (hit) return hit;
    const out = new Array(lessons.length).fill(null);
    const shown = new Set();
    for (let li = 1; li < lessons.length; li++) {
        /* Known = every drill of lessons 1..li (0-based li is lesson li+1). */
        let best = null;
        for (const e of NOTICE_ENDINGS[lang] || []) {
            if (shown.has(e.ending) || e.lesson > li) continue;
            const phrases = [];
            const seen = new Set();
            for (let j = 0; j < li; j++) {
                for (const d of drillsOf(lessons[j])) {
                    const key = tokenKey(d.correct);
                    if (seen.has(key)) continue;
                    const words = endingsIn(lang, d.correct, li).filter(m => m.ending === e.ending);
                    if (!words.length) continue;
                    seen.add(key);
                    phrases.push({ correct: d.correct, meaning: d.meaning || '', native: d.native || '',
                        word: tokenKey(words[0].word), lesson: j + 1 });
                }
            }
            if (phrases.length < PATTERN_MIN) continue;
            if (!best || phrases.length > best.phrases.length) best = { e, phrases };
        }
        if (!best) continue;
        shown.add(best.e.ending);
        /* Different words first: the point is that it is the ending, not the
           word, that keeps meaning the same thing. */
        const byWord = new Map();
        for (const p of best.phrases) if (!byWord.has(p.word)) byWord.set(p.word, p);
        const pick = [...byWord.values(), ...best.phrases.filter(p => !byWord.has(p.word) || byWord.get(p.word) !== p)]
            .slice(0, PATTERN_MAX);
        out[li] = { ending: best.e.ending, gloss: best.e.gloss, phrases: pick };
    }
    cache.set(lessons, out);
    return out;
}

/** The pattern a lesson shows, or null. `lessonIdx` is 0-based. */
export function patternFor(lang, lessons, lessonIdx) {
    if (!lang || !Array.isArray(lessons) || !(lessonIdx > 0)) return null;
    return patternsFor(lang, lessons)[lessonIdx] || null;
}
