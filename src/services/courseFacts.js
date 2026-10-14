/* What the course itself says about the words a learner asked about.
 *
 * Round K5 (Kannada L21-30): asked "isn't baruttide the same as baruttade?",
 * the tutor said baruttade means "it comes" — two turns before the grader told
 * the same learner it means "can (know how to)". Asked about hoga/hogu it said
 * nothing; asked about bandare it invented a root. An earlier round got "you
 * also need naanu", the opposite of the lesson. Each time the model had only
 * the CURRENT lesson's notes, so a question about a word from another lesson
 * was answered from the model's own Kannada, which is not the course's.
 *
 * So the question path is handed the course's facts for every word the
 * question names — its vocabulary entry from whichever lesson taught it, the
 * notes that mention it, its word family, and any word the course teaches
 * against it — and told to answer from those and nothing else. Step mode,
 * which does not call the model, prints the same facts directly.
 *
 * Shared by Chat.jsx, Steps.jsx and tools/lesson-sim.mjs, so all three answer
 * the same question the same way. */
import { CURRICULUM, WORD_FAMILIES } from './curriculum.js';
import { DISTINCT_WORDS, normalizeLatin } from './lessonEngine.js';

const norm = (w) => normalizeLatin(String(w || '')).replace(/\s+/g, '');

/** Every taught word up to and including lesson `scenarioIdx`, keyed by its
 *  normalised spelling and each alt spelling. */
const indexFor = (lang, scenarioIdx) => {
    const idx = new Map();
    (CURRICULUM[lang] || []).slice(0, scenarioIdx + 1).forEach((lesson, li) => {
        (lesson.vocabulary || []).forEach(v => {
            const entry = { ...v, lesson: li + 1 };
            for (const k of [v.word, ...(v.alt || [])].map(norm).filter(Boolean)) {
                if (!idx.has(k)) idx.set(k, entry);
            }
        });
    });
    return idx;
};

/* The words that frame a question rather than name what it is about. Without
   them "what is tomorrow?" would also look up Yenu ("what") and Ide ("is"). */
const QUESTION_FRAME = new Set(('what whats is does do how say said mean means meaning the word words '
    + 'for in a an of again was it its please you i me to again called tell').split(' '));

/** An English meaning as a learner would type it: "Tomorrow", not
 *  "Tomorrow (adverb)". */
const gistOf = (meaning) => normalizeLatin(String(meaning || '').replace(/\s*\(.*?\)/g, ''));

/** The taught words a question names. Exact spellings and alts first; then a
 *  token of four letters or more that a taught word starts with ("hoga" for
 *  hogabeku), because learners ask about the piece they noticed.
 *
 *  Then the English side. Stuck on "Tomorrow I am going home" at "tomorrow",
 *  a learner asked "What is tomorrow?" and was told the course hadn't covered
 *  it — Naale was taught three screens earlier. Only the Kannada spellings
 *  were indexed, and a learner who has forgotten the word can only ask in
 *  English. */
export const wordsAskedAbout = (question, lang, scenarioIdx) => {
    const idx = indexFor(lang, scenarioIdx);
    const tokens = normalizeLatin(String(question || '')).split(' ').filter(Boolean);
    const found = new Map();
    for (const t of tokens) {
        const hit = idx.get(t);
        if (hit) { found.set(hit.word, hit); continue; }
        if (t.length < 4) continue;
        for (const [k, e] of idx) {
            if (k.length > t.length && k.startsWith(t)) { found.set(e.word, e); break; }
        }
    }
    if (found.size) return [...found.values()];

    const rest = tokens.filter(t => !QUESTION_FRAME.has(t) && t !== normalizeLatin(lang));
    if (!rest.length) return [];
    const asked = ` ${rest.join(' ')} `;
    const byMeaning = new Map();
    for (const e of idx.values()) {
        const gist = gistOf(e.meaning);
        if (!gist || byMeaning.has(e.word)) continue;
        // The whole meaning, as words: "go" must not match inside "going".
        if (asked.includes(` ${gist} `)) byMeaning.set(e.word, { e, len: gist.length });
    }
    // Longest meaning first: "I am fine" before "I".
    return [...byMeaning.values()].sort((a, b) => b.len - a.len).map(x => x.e);
};

const meaningOf = (w, idx) => idx.get(norm(w));
const plain = (s) => String(s || '').replace(/\*/g, '');

/* No full stop after a meaning that already ends a sentence: “Really?”. */
const endStop = (m = '') => (/[.?!]$/.test(m.trim()) ? '' : '.');

/** The course's facts for a question, as plain lines. Empty when the question
 *  names nothing the course has taught. */
export const courseFactsFor = (question, lang, scenarioIdx) => {
    const idx = indexFor(lang, scenarioIdx);
    const asked = wordsAskedAbout(question, lang, scenarioIdx);
    const facts = [];
    const keys = new Set(asked.map(e => norm(e.word)));
    for (const e of asked) {
        const teach = e.teach ? ` ${plain(e.teach.replaceAll('{w}', e.word))}` : '';
        facts.push(`${e.word} (lesson ${e.lesson}) means "${e.meaning}"${endStop(e.meaning)}${teach}`);
    }
    for (const pair of DISTINCT_WORDS) {
        if (!pair.some(m => keys.has(norm(m)))) continue;
        const known = pair.filter(m => meaningOf(m, idx));
        // An alt spelling of the same entry (hogi is an alt of Hogu) is not a pair.
        if (known.length < 2 || new Set(known.map(m => meaningOf(m, idx).word)).size < 2) continue;
        facts.push(`The course teaches these as different words, not spellings of one word: ${known
            .map(m => `${m} = "${meaningOf(m, idx).meaning}" (lesson ${meaningOf(m, idx).lesson})`).join('; ')}.`);
    }
    for (const fam of WORD_FAMILIES[lang] || []) {
        if (!fam.members.some(m => keys.has(norm(m)))) continue;
        const members = fam.members.filter(m => meaningOf(m, idx))
            .map(m => `${m} "${meaningOf(m, idx).meaning}"`);
        if (members.length > 1) facts.push(`Word family "${fam.name}": ${members.join(', ')}.`);
    }
    /* Notes from any lesson so far that name the words — the ones naming the
       most of them first, three at most. naanu alone is named by a dozen. */
    const notes = [];
    (CURRICULUM[lang] || []).slice(0, scenarioIdx + 1).forEach(lesson => {
        for (const d of [...(lesson.phrases || []), ...(lesson.conversations || [])]) {
            if (!d.grammarNote) continue;
            const toks = new Set(normalizeLatin(d.grammarNote).split(' '));
            const hits = [...keys].filter(k => toks.has(k)).length;
            if (hits) notes.push({ hits, text: `Course note: ${plain(d.grammarNote)}` });
        }
    });
    notes.sort((a, b) => b.hits - a.hits);
    facts.push(...notes.slice(0, 3).map(n => n.text));
    return [...new Set(facts)].slice(0, 10);
};

/** The instruction that goes with the facts. */
export const groundedAnswerRule = (facts, nativeLang = 'English') => facts.length
    ? `\n[COURSE FACTS — the only things you may say about these words. Answer the learner's question ONLY from these facts, in plain ${nativeLang}, in 2-3 sentences. Do not add meanings, roots, origins, rules or forms that are not written here, and do not contradict them. If these facts do not answer the question, say "The course hasn't covered that yet." rather than guessing. Answer, then stop: no scene-setting, no new task, no "keep practicing".\n${facts.map(f => `- ${f}`).join('\n')}]`
    : `\n[Answer in plain ${nativeLang}, in 2-3 sentences, only from what this course has taught. If the course has not taught what they asked, say "The course hasn't covered that yet." rather than guessing. Answer, then stop: no scene-setting, no new task.]`;

/** A model-free answer, for step mode: what the course says about each word
 *  the question names, shortest useful first. */
export const answerFromFacts = (question, lang, scenarioIdx) => {
    const idx = indexFor(lang, scenarioIdx);
    const asked = wordsAskedAbout(question, lang, scenarioIdx).slice(0, 3);
    if (!asked.length) return '';
    const lines = asked.map(e => {
        const teach = e.teach ? e.teach.replaceAll('{w}', `*${e.word}*`) : '';
        // A teaching line that already gives the meaning is the whole answer.
        const gist = String(e.meaning).toLowerCase().replace(/\s*\(.*\)$/, '');
        if (teach && teach.toLowerCase().includes(gist)) return teach;
        return `*${e.word}* means “${e.meaning}”${endStop(e.meaning)}${teach ? ` ${teach}` : ''}`;
    });
    const keys = new Set(asked.map(e => norm(e.word)));
    for (const pair of DISTINCT_WORDS) {
        if (!pair.every(m => meaningOf(m, idx))) continue;
        if (meaningOf(pair[0], idx).word === meaningOf(pair[1], idx).word) continue;
        if (!pair.some(m => keys.has(norm(m)))) continue;
        // Only worth a line when the learner named one side and not the other.
        if (pair.every(m => keys.has(norm(m)))) continue;
        const other = pair.find(m => !keys.has(norm(m)));
        lines.push(`Not to be confused with *${other}*, “${meaningOf(other, idx).meaning}”.`);
    }
    return lines.join(' ');
};
