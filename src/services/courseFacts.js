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
import { DISTINCT_WORDS, MISS_MARKER, normalizeLatin, levenshtein, outlineOf } from './lessonEngine.js';

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

/* Words of asking that are not in QUESTION_FRAME because the English-meaning
   pass below needs them: only the spelling-prefix pass skips them. */
const FRAME_EXTRA = new Set('remember really know dont forgot forget show give which there here then this that just'.split(' '));

/** An English meaning as a learner would type it: "Tomorrow", not
 *  "Tomorrow (adverb)" — and each side of "House / home". */
const gistsOf = (meaning) => String(meaning || '').replace(/\s*\(.*?\)/g, '')
    .split('/').map(normalizeLatin).filter(Boolean);

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
        /* A frame word is not a piece of a taught word: "can you tell me?"
           looked up *Telupu* through its alt *tella*, and a learner asking
           for "Fear" was told about white (round t2130 L26). */
        if (t.length < 4 || QUESTION_FRAME.has(t) || FRAME_EXTRA.has(t)) continue;
        for (const [k, e] of idx) {
            if (k.length > t.length && k.startsWith(t)) { found.set(e.word, e); break; }
        }
    }
    /* A misspelling is a question about the word it misspells: "why not
       hogittene" is asking about Hoguttene. One letter off, two on a long word,
       same first letter — and never a word the course teaches against it. */
    for (const t of tokens) {
        if (t.length < 5 || idx.has(t) || QUESTION_FRAME.has(t)) continue;
        let best = null;
        for (const [k, e] of idx) {
            if (k[0] !== t[0] || Math.abs(k.length - t.length) > 2) continue;
            const d = levenshtein(k, t);
            if (d <= (t.length >= 8 ? 2 : 1) && (!best || d < best.d)) best = { d, e };
        }
        if (best) found.set(best.e.word, best.e);
    }
    if (found.size) return [...found.values()];

    /* "Why" asks about a choice, not for a word: "why not hogittene" must not
       look up Illa for "not". */
    if (tokens[0] === 'why') return [];
    /* "the slow one" is a pronoun "one", not the number: dropped after a
       content word. */
    const rest = tokens.filter((t, i) => !QUESTION_FRAME.has(t) && t !== normalizeLatin(lang)
        && !(t === 'one' && i > 0 && !QUESTION_FRAME.has(tokens[i - 1])) && t !== 'forgot');
    if (!rest.length) return [];
    const asked = ` ${rest.join(' ')} `;
    const whole = ` ${tokens.join(' ')} `; // "I am fine" is itself made of frame words
    const byMeaning = new Map();
    for (const e of idx.values()) {
        if (byMeaning.has(e.word)) continue;
        for (const gist of gistsOf(e.meaning)) {
            // The whole meaning, as words: "go" must not match inside "going".
            /* ...or the stem of a one-word meaning: "the slow one?" asks for
               *Mellaga*, "Slowly" (round 17 L16). Four letters at least, and
               at most an ending of three. */
            const stem = !gist.includes(' ') && rest.some(t => t.length >= 4
                && gist.startsWith(t) && gist.length - t.length <= 3);
            const hit = stem || asked.includes(` ${gist} `) || (gist.includes(' ') && whole.includes(` ${gist} `));
            if (hit) { byMeaning.set(e.word, { e, len: gist.length }); break; }
        }
    }
    // Longest meaning first: "I am fine" before "I".
    return [...byMeaning.values()].sort((a, b) => b.len - a.len).map(x => x.e);
};

const meaningOf = (w, idx) => idx.get(norm(w));

/* Both sides of an authored trap (curriculum `traps`), named in one question:
   "why hoguttiddene and not hoguttene" gets the line written for exactly that
   confusion. `{answer}` is the word the trap belongs to. */
const shown = (w) => `*${w}*`;
const trapPairs = (asked, fill = shown) => {
    const words = new Map(asked.map(e => [norm(e.word), e]));
    return asked.flatMap(e => (e.traps || [])
        .filter(t => t.why && words.has(norm(t.said)) && norm(t.said) !== norm(e.word))
        .map(t => ({ owner: e, said: words.get(norm(t.said)), why: t.why.replace(/\{answer\}/g, fill(e.word)) })));
};
const trapAsked = (question, asked) => {
    const pairs = trapPairs(asked);
    if (!pairs.length) return '';
    if (pairs.length === 1) return pairs[0].why;
    /* Both directions are authored: the word after "not" / "instead of" is
       the one the learner said; otherwise the first-named is the one asked about. */
    const tokens = normalizeLatin(String(question || '')).split(' ').filter(Boolean);
    const posOf = (e) => tokens.findIndex(t => [e.word, ...(e.alt || [])].map(norm).includes(t)
        || (t.length >= 5 && levenshtein(t, norm(e.word)) <= 2));
    const negated = (e) => { const i = posOf(e); return i > 0 && /^(not|of|than)$/.test(tokens[i - 1]); };
    const pick = pairs.find(p => negated(p.said))
        || [...pairs].sort((a, b) => posOf(a.owner) - posOf(b.owner))[0];
    return pick.why;
};
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
    for (const p of trapPairs(asked)) {
        facts.push(`Why ${p.owner.word} and not ${p.said.word}: ${plain(p.why)}`);
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

/** "Why not hoguttene?" asked on a screen whose answer is known: the word
 *  asked about, compared with the answer word it stands in for. Asked on the
 *  Kannada L11 reveal, the question names only the learner's word, so without
 *  the screen's answer it was answered with what *hoguttene* means and nothing
 *  about why it was not right here.
 *
 *  The authored trap line when there is one, else both meanings. `reveal`
 *  false (the answer not yet shown) puts the answer in as its outline, the
 *  same first-miss rule missHelp keeps. '' when the question is not a
 *  "why / why not", names no taught word, or names only the answer's own. */
export const whyNotAnswer = (question, lang, scenarioIdx, { expected = '', reveal = false } = {}) => {
    if (!expected) return '';
    const q = normalizeLatin(String(question || ''));
    if (!/^(why|how come)\b/.test(q) && !/\b(not|instead|than|isnt)\b/.test(q)) return '';
    const idx = indexFor(lang, scenarioIdx);
    const inAnswer = [...new Map(normalizeLatin(expected).split(' ').map(t => idx.get(norm(t)))
        .filter(Boolean).map(e => [e.word, e])).values()];
    if (!inAnswer.length) return '';
    const own = new Set(inAnswer.map(e => e.word));
    const said = wordsAskedAbout(question, lang, scenarioIdx).find(e => !own.has(e.word));
    if (!said) return '';
    const fill = reveal ? shown : (w) => outlineOf(w.charAt(0).toUpperCase() + w.slice(1));
    const trap = trapPairs([said, ...inAnswer], fill).find(p => own.has(p.owner.word) && p.said.word === said.word);
    if (trap) return trap.why;
    // The answer word it most likely stands in for: nearest in spelling.
    const want = [...inAnswer].sort((a, b) => levenshtein(norm(said.word), norm(a.word))
        - levenshtein(norm(said.word), norm(b.word)))[0];
    if (!want.meaning || !said.meaning) return '';
    return `*${said.word}* means “${said.meaning}”${endStop(said.meaning)} `
        + `This asks for “${want.meaning}”${reveal ? `: *${want.word}*.` : endStop(want.meaning)}`;
};

/** A model-free answer, for step mode: what the course says about each word
 *  the question names, shortest useful first. With `{ expected }` — the
 *  answer of the screen it was asked on — a "why not X" is answered against
 *  that answer (whyNotAnswer). */
export const answerFromFacts = (question, lang, scenarioIdx, { expected = '', reveal = false } = {}) => {
    const versus = whyNotAnswer(question, lang, scenarioIdx, { expected, reveal });
    if (versus) return versus;
    const idx = indexFor(lang, scenarioIdx);
    const asked = wordsAskedAbout(question, lang, scenarioIdx).slice(0, 3);
    if (!asked.length) return '';
    const trap = trapAsked(question, asked);
    if (trap) return trap;
    const lines = asked.map(e => {
        const teach = e.teach ? e.teach.replaceAll('{w}', `*${e.word}*`) : '';
        // A teaching line that already gives the meaning is the whole answer.
        // Either side of "I go / I will go" counts as the meaning.
        if (teach && gistsOf(e.meaning).some(g => normalizeLatin(teach).includes(g))) return teach;
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

/* ── For chat's question path (round t2130, Telugu L21-30) ─────────────── */

/** "i really don't remember, can you tell me?" is "I don't know", said at
 *  length. The engine's DONT_KNOW only takes the short forms, so L26's learner
 *  was answered about colours instead of being shown the word. A request for
 *  the answer, not a question about one: anything asking why or how stays a
 *  question. */
export const asksForTheAnswer = (said) => {
    const q = String(said || '').toLowerCase();
    if (/\b(why|how|which|differen|instead|mean)\b/.test(q)) return false;
    return /\b(do ?n['’]?t|do not|can['’]?t|cannot) (really )?(remember|recall)\b/.test(q)
        || /\bi (forgot|forget)\b/.test(q)
        || /\b(can|could|would|will) you (just |please )?(tell|show|give) me( (it|the (answer|word)))?( please)?[\s.!?]*$/.test(q)
        || /^\s*(please )?(just )?(tell|show|give) me (it|the (answer|word))[\s.!?]*$/.test(q);
};

/** "what is the word for agree?" when the course has no such word. Round t2130
 *  L29 got "I would rather not hand you a whole sentence" for it — the
 *  learner had asked about one word. '' when the question is not of that shape
 *  or names a word the course has taught (answerFromFacts answers those). */
export const notTaughtAnswer = (question, lang, scenarioIdx, { prompt = '' } = {}) => {
    const q = String(question || '');
    const tail = `["“'‘]?([a-z][a-z' -]{0,28}?)["”'’]?\\s*(?:in \\w+)?\\s*\\??\\s*$`;
    const m = new RegExp(`\\bwhat(?:['’]?s| is)\\s+(?:the\\s+)?(?:\\w+\\s+)?word\\s+for\\s+${tail}`, 'i').exec(q)
        || new RegExp(`\\bhow do (?:i|you) say\\s+${tail}`, 'i').exec(q);
    if (!m) return '';
    const what = m[1].trim().replace(/^(a|an|the|to)\s+/i, '');
    if (!what || what.split(' ').length > 3) return '';
    if (wordsAskedAbout(question, lang, scenarioIdx).length) return '';
    const onScreen = new RegExp(`\\b${what.replace(/[^a-z' -]/gi, '')}\\b`, 'i').test(prompt);
    return `The course hasn't taught a word for “${what}” yet.${onScreen
        ? ' This screen says it with words you already have, so you can build it without one.' : ''}`;
};

/** A question that compares two forms — "so is it thin or tin?", "which one,
 *  thinnanu or tintanu?" — needs an answer, not two glosses (L23). */
export const comparesForms = (question, lang, scenarioIdx) => {
    const q = normalizeLatin(String(question || ''));
    if (!/\b(or|which|how do i know|is it)\b/.test(q)) return false;
    return wordsAskedAbout(question, lang, scenarioIdx).length >= 1;
};

/** The learner's last graded miss on this screen and the line the grader gave
 *  for it: `{ attempt, reason }`, or null. Read off the transcript — a user
 *  turn answered "Not quite…" — within the last few turns. Ask Miko is given
 *  both so its explanation cannot contradict the verdict: L29's tutor told a
 *  learner rejected for "bagundi kada" to "add K___ after bagundi". */
export const lastMissOf = (messages = [], within = 8) => {
    const tail = messages.slice(-within);
    for (let i = tail.length - 1; i > 0; i--) {
        const m = tail[i];
        if (m?.role !== 'assistant' || !String(m.content || '').startsWith(MISS_MARKER)) continue;
        const prev = tail.slice(0, i).reverse().find(x => x?.role === 'user');
        if (!prev) return null;
        const reason = String(m.content).replace(/^Not quite[.!]?\s*/, '').trim();
        return { attempt: String(prev.content || '').trim(), reason };
    }
    return null;
};

/** Every word the course taught BEFORE lesson `scenarioIdx` (0-based), with
 *  its alt spellings, normalised. Ask Miko never masks these: "N___ vellali"
 *  hid *nenu*, a lesson-1 word, from a lesson-23 learner. */
export const taughtBefore = (lang, scenarioIdx) => {
    const out = new Set();
    (CURRICULUM[lang] || []).slice(0, Math.max(0, scenarioIdx)).forEach(lesson => {
        for (const v of lesson.vocabulary || []) {
            for (const w of [v.word, ...(v.alt || [])]) {
                for (const t of normalizeLatin(String(w || '')).split(' ')) if (t) out.add(t);
            }
        }
    });
    return out;
};

/** "so is it thin or tin?" asked about the word on screen: which of the two
 *  pieces the course's spelling starts with, and which taught words share
 *  each. Round t2130 L23 got two glosses back, then (from the model) a root
 *  the course never teaches. Only for a one-word answer the learner can
 *  already see; '' otherwise, and the question goes on to the model. */
export const stemAnswer = (question, lang, scenarioIdx, { expected = '', reveal = false } = {}) => {
    const want = norm(expected);
    if (!reveal || !want || normalizeLatin(expected).split(' ').length !== 1) return '';
    const q = normalizeLatin(String(question || ''));
    const m = /\b([a-z]{2,8})\s+or\s+([a-z]{2,8})\b/.exec(q);
    if (!m || m[1] === m[2]) return '';
    const [a, b] = [m[1], m[2]];
    const fits = [a, b].filter(p => want.startsWith(p));
    if (!fits.length) return '';
    const pick = fits.sort((x, y) => y.length - x.length)[0];
    const other = pick === a ? b : a;
    if (want.startsWith(other) && other.length === pick.length) return '';
    const asked = wordsAskedAbout(question, lang, scenarioIdx).filter(e => norm(e.word) !== want);
    const like = asked.filter(e => norm(e.word).startsWith(pick));
    const unlike = asked.filter(e => !like.includes(e) && norm(e.word).startsWith(other));
    const head = expected.charAt(0).toUpperCase() + expected.slice(1);
    let line = `*${head}* starts *${pick}-*`;
    line += like.length ? `, the same as ${like.map(e => `*${e.word}* (“${e.meaning}”)`).join(' and ')}.` : '.';
    if (unlike.length) {
        line += ` ${unlike.map(e => `*${e.word}*`).join(' and ')} ${unlike.length > 1 ? 'are' : 'is'} spelled with *${other}-*.`;
    }
    return line;
};
