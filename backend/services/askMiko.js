/* ── Ask Miko: a question about the screen, answered by the model ──────────
 *
 * A Kannada learner opened "See it in a sentence" for *Ide* ("it is / there
 * is"), saw *Mane alli ide*, "The house is there", and asked why it is not
 * just *Mane ide*. The answer is about English: "there is a house" announces
 * that something exists (*ide*), "the house is there" says where it is (*alli*).
 * Step mode could not give it — the answer box only looks words up in the
 * course (answerFromFacts), and chat has no idea what screen the learner is on.
 *
 * So this is chat's grounded question path (courseFacts.js, c16306c) with the
 * screen attached: what it asks, the example sentence the learner is looking
 * at, the course's facts for every word on it — and the screen's answer only
 * once the learner can already see it. Before that the model is told not to
 * give it, and anything that slips through is cut back to its first-letter
 * outline here, on the server, so the word never reaches the page.
 *
 * Nothing here grades anything. A question is never an answer. */
const { courseFactsFor, taughtBefore } = require('../../src/services/courseFacts.js');
const { normalizeLatin, levenshtein, outlineOf } = require('../../src/services/lessonEngine.js');

const MAX_QUESTION = 300;
const MAX_FACTS = 14;

const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/** The course's facts for the question first, then for every word on screen. */
const factsFor = ({ question, lang, lessonIdx, prompt, expected, examples, attempt = '' }) => {
    const screen = [prompt, expected, ...examples.map(e => e.correct)].join(' ');
    return [...new Set([
        ...courseFactsFor(question, lang, lessonIdx),
        ...(attempt ? courseFactsFor(attempt, lang, lessonIdx) : []),
        ...courseFactsFor(screen, lang, lessonIdx),
    ])].slice(0, MAX_FACTS);
};

/** Validates and normalises a request body. Throws a message for a 400. */
const readAsk = (body = {}) => {
    const question = clip(body.question, MAX_QUESTION + 1);
    if (!question) throw new Error('question is required');
    if (question.length > MAX_QUESTION) throw new Error(`question is longer than ${MAX_QUESTION} characters`);
    const lang = clip(body.lang, 30);
    if (!lang) throw new Error('lang is required');
    const lessonIdx = Math.max(0, Math.min(60, parseInt(body.lessonIdx, 10) || 0));
    const examples = (Array.isArray(body.examples) ? body.examples : []).slice(0, 3)
        .map(e => ({ correct: clip(e?.correct, 120), meaning: clip(e?.meaning, 160) }))
        .filter(e => e.correct);
    return {
        question, lang, lessonIdx, examples,
        prompt: clip(body.prompt, 200),
        expected: clip(body.expected, 120),
        variants: (Array.isArray(body.variants) ? body.variants : []).slice(0, 8).map(v => clip(v, 120)),
        answerShown: Boolean(body.answerShown),
        /* The learner's last graded attempt on this screen and the grader's
           line for it (courseFacts.lastMissOf). Round t2130 L29: rejected for
           "bagundi kada", the learner asked why, and the model told them to
           "add K___ after bagundi" — what they had said. */
        attempt: clip(body.attempt, 120),
        missReason: clip(body.missReason, 240),
        /* Words the learner can already see in the chat: the tutor's recent
           lines. Never masked. */
        known: (Array.isArray(body.known) ? body.known : []).slice(0, 60).map(w => clip(w, 30)).filter(Boolean),
    };
};

/** The messages for the model. */
const buildAskMessages = (ask) => {
    const { question, lang, lessonIdx, prompt, expected, answerShown, examples } = ask;
    const facts = factsFor(ask);
    const screen = [
        `The learner is on lesson ${lessonIdx + 1} of the ${lang} course.`,
        prompt ? `The screen asks them: "${prompt}".` : '',
        expected && answerShown ? `The answer on this screen is "${expected}" and the learner can already see it.` : '',
        expected && !answerShown ? `The learner has NOT answered this screen yet. Do NOT say, spell, or hint at the ${lang} answer to it; if they ask for it, tell them to try it or tap "I don't know — show me".` : '',
        ask.attempt && ask.missReason ? `The learner's last answer on this screen was "${ask.attempt}", and the course's grader REJECTED it. The grader's reason: "${ask.missReason}" Your answer must agree with that verdict. Do NOT say their answer was right, acceptable or nearly there, and do NOT tell them to add a word their answer already contains. If they think it should count, say plainly that the course does not accept it on this screen, and explain the grader's reason in your own words.` : '',
        examples.length ? `They are looking at ${examples.length > 1 ? 'these example sentences' : 'this example sentence'}: ${examples.map(e => `"${e.correct}" = "${e.meaning}"`).join('; ')}.` : '',
    ].filter(Boolean).join('\n');
    const system = `You are Miko, the cat who tutors this ${lang} course. A learner tapped "Ask Miko" during a lesson and typed a question.

${screen}

COURSE FACTS (romanised ${lang}, from the lessons they have done):
${facts.length ? facts.map(f => `- ${f}`).join('\n') : '- (none for the words on this screen)'}

How to answer:
- Plain English, 2-4 short sentences. No lists, no headings, no emoji, no cat puns.
- Everything you say about ${lang} must come from the course facts and the screen above. Never invent a ${lang} word, form, ending, root or rule that is not written there.
- Many questions come from English, not ${lang}: one English word doing two jobs. Say what the English is doing, then which course word does each job. For example, English "there" both announces that something exists ("there is a house" — no place is named) and names a place ("the house is there" — "there" is the place). A word the course glosses "there is" covers only the first job; the place needs the course's word for "there".
- Build any ${lang} you write only from words in the facts, put together the way the facts and the example sentences do. Do not call a combination wrong unless the facts say so.
- Write ${lang} only in the course's romanised spelling, in *asterisks*. Never use ${lang} script.
- Say "The course hasn't covered that yet." only when the answer needs a ${lang} fact that is missing above; if the facts and English are enough, answer.
- Answer, then stop: no new task, no "keep practising".`;
    return [
        { role: 'system', content: system },
        { role: 'user', content: question },
    ];
};

/* Every spelling of the answer a reply could give away: each word of the
   expected answer and its variants, with the alt spellings the course lists. */
const answerForms = ({ expected, variants, question = '', attempt = '', known = [], lang = '', lessonIdx = 0 }) => {
    const forms = new Set();
    for (const a of [expected, ...variants]) {
        for (const t of normalizeLatin(a).split(' ')) if (t.length >= 2) forms.add(t);
    }
    /* Mask only what the learner has not got yet. Round t2130 heard "N___
       vellali" (*nenu*, lesson 1), "N____ means 'to me'" (*naaku*) and "K___
       means 'right?'" (*kada*, which the learner had just typed). A word they
       wrote, a word the tutor just showed them, and — when the answer is a
       sentence — any word from an earlier lesson are theirs already: hiding
       them hides nothing and garbles the explanation. A one-word answer stays
       masked whatever lesson taught it, because it is the thing being recalled. */
    const sentence = normalizeLatin(expected).split(' ').filter(Boolean).length > 1;
    // The tutor's recent lines can hold a one-word review answer it taught a
    // few turns ago; those count only for sentences.
    const free = new Set([question, attempt, ...(sentence ? known : [])]
        .flatMap(x => normalizeLatin(x).split(' ')).filter(Boolean));
    const before = sentence && lang ? taughtBefore(lang, lessonIdx) : new Set();
    for (const f of [...forms]) if (free.has(f) || before.has(f)) forms.delete(f);
    return forms;
};

const givesAway = (token, forms) => {
    const t = normalizeLatin(token).replace(/\s+/g, '');
    if (!t) return false;
    if (forms.has(t)) return true;
    if (t.length < 5) return false;
    for (const f of forms) {
        if (f.length >= 5 && f[0] === t[0] && levenshtein(f, t) <= 1) return true;
    }
    return false;
};

/** Cuts every word of an unseen answer back to its outline: *Beku* → *B___*.
 *  Latin or script, any case. `{ text, redacted }`. */
const redactAnswer = (reply, ask) => {
    if (ask.answerShown || !ask.expected) return { text: reply, redacted: false };
    const forms = answerForms(ask);
    let redacted = false;
    const text = String(reply || '').replace(/[\p{L}\p{M}]+/gu, (tok) => {
        if (!givesAway(tok, forms)) return tok;
        redacted = true;
        const roman = /^[a-z]/i.test(tok) ? tok : normalizeLatin(tok) || tok;
        return outlineOf(roman.charAt(0).toUpperCase() + roman.slice(1));
    });
    return { text, redacted };
};

/* ── Per-user rate limit ──
   In memory: one server, and a restart forgiving the count is acceptable. */
const WINDOWS = [{ ms: 60_000, max: 6 }, { ms: 24 * 3600_000, max: 150 }];
const hits = new Map();
const rateLimited = (userId, now = Date.now()) => {
    const key = String(userId || 'anon');
    const list = (hits.get(key) || []).filter(t => now - t < WINDOWS[1].ms);
    const over = WINDOWS.some(w => list.filter(t => now - t < w.ms).length >= w.max);
    if (!over) list.push(now);
    hits.set(key, list);
    return over;
};
const resetRateLimit = () => hits.clear();

module.exports = { MAX_QUESTION, readAsk, buildAskMessages, redactAnswer, rateLimited, resetRateLimit, factsFor };
