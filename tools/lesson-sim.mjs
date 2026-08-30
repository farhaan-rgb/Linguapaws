#!/usr/bin/env node
/**
 * lesson-sim — play a lesson from the command line.
 *
 *   node tools/lesson-sim.mjs --lang Kannada --scenario 1 --reset
 *   node tools/lesson-sim.mjs --say "Namaskara"
 *   node tools/lesson-sim.mjs --transcript
 *
 * Runs the REAL lesson engine (src/services/lessonEngine.js) against the REAL
 * curriculum, so the replies are the ones a learner actually gets. Built so a
 * tester who knows nothing about the code can play a lesson and report back.
 *
 * Steps 1-11 (teaching, review quiz, sentence building) are fully deterministic
 * in the app and reproduced exactly here. Steps 12-15 are conversation practice
 * and go through the model in production; if OPENAI_API_KEY is present in
 * backend/.env this calls it, otherwise those turns are marked
 * [conversation step — not simulated].
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* SIM_DEBUG=1 reports on stderr why a model reply was rejected or emptied. The
   guards are silent by design, so without this a reply that never reaches the
   learner is indistinguishable from a model that said nothing. */
const DEBUG = process.env.SIM_DEBUG === '1';
const debug = (...a) => { if (DEBUG) console.error('[sim]', ...a); };

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const E = await import(join(ROOT, 'src/services/lessonEngine.js'));

/* Node can read the system wordlist; the engine's browser-safe curated list is
   only a floor. Passing this in stops good replies being discarded for ordinary
   English the curated list happens not to contain. */
const SYSTEM_ENGLISH = (() => {
    try {
        return new Set(readFileSync('/usr/share/dict/words', 'utf8')
            .split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));
    } catch { return null; }
})();
const { CURRICULUM } = await import(join(ROOT, 'src/services/curriculum.js'));
const srs = await import(join(ROOT, 'backend/services/srs.js')).then(m => m.default ?? m);

/* ── args ──────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? fallback : (argv[i + 1]?.startsWith('--') ? true : argv[i + 1]);
};
const has = (name) => argv.includes(`--${name}`);

/* Each play-through gets its own state file, so several testers (or several
   simulated learners) can be mid-lesson at the same time without overwriting
   one another. No --session keeps the original single-slot file. */
const SESSION = (() => {
    const raw = arg('session', null);
    if (raw === null || raw === true) return null;
    const safe = String(raw).replace(/[^A-Za-z0-9._-]/g, '_');
    return safe || null;
})();
const STATE = SESSION
    ? join(ROOT, '.lesson-sim', `${SESSION}.json`)
    : join(ROOT, '.lesson-sim-state.json');

/* ── state ─────────────────────────────────────────────────────────────── */
const fresh = (lang, scenarioIdx) => ({
    lang, scenarioIdx, step: 0, messages: [], vocab: {}, reviewSet: null,
    // Notes already shown. One tester saw the same note five times in a lesson,
    // another twice inside a single turn; repetition makes the tutor look like it
    // is not tracking the conversation, and buries the note that is new.
    shownNotes: [],
});
const load = () => existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : null;
const save = (s) => {
    mkdirSync(dirname(STATE), { recursive: true });
    writeFileSync(STATE, JSON.stringify(s, null, 2));
};

/* ── model turns ───────────────────────────────────────────────────────── */
function apiKey() {
    try {
        const env = readFileSync(join(ROOT, 'backend/.env'), 'utf8');
        return env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim() || null;
    } catch { return null; }
}

/** The rules the app actually sends, read out of ai.js so there is one source
 *  rather than a paraphrase that drifts.
 *
 *  The level matters as much as the persona. Chat.jsx picks the level from the
 *  step — 'zero' through vocabulary and the review quiz, 'basic' for sentence
 *  building, 'conversational' for the conversation stage — and they differ on
 *  the thing a beginner notices most: 'zero' forbids the tutor from uttering
 *  any target-language sentence at all. The harness used to send
 *  'conversational' at every step, so a learner on their first word got
 *  answered in fluent Telugu and the transcript blamed the course for it. */
const LEVEL_IDS = ['zero', 'basic', 'conversational', 'fluent'];

function levelGuidance(levelId) {
    const ai = readFileSync(join(ROOT, 'src/services/ai.js'), 'utf8');
    const next = LEVEL_IDS[LEVEL_IDS.indexOf(levelId) + 1];
    const re = next
        ? new RegExp(`${levelId}: \`([\\s\\S]*?)\`,\\s*\\n\\s*${next}:`)
        : new RegExp(`${levelId}: \`([\\s\\S]*?)\`,?\\s*\\n\\s*\\}`);
    return ai.match(re)?.[1] || '';
}

/** Same mapping as Chat.jsx: steps 0-7 'zero', 8-10 'basic', 11+ conversation. */
function levelForStep(step) {
    if (step < 8) return 'zero';
    if (step < 11) return 'basic';
    return 'conversational';
}

function conversationalRules(targetLang, nativeLang = 'English', levelId = 'conversational') {
    const ai = readFileSync(join(ROOT, 'src/services/ai.js'), 'utf8');
    const persona = ai.match(/const MIKO_PROMPT = `([\s\S]*?)`;/)?.[1] || '';
    return `${persona}\n${levelGuidance(levelId)}`
        .replaceAll('${targetLangName}', targetLang)
        .replaceAll('${nativeLangName}', nativeLang)
        .replace(/\$\{[^}]*\}/g, '');
}

/** One retry, then a safe line. The instruction not to invent forms is not
 *  self-enforcing, and a fabricated inflection reaching the learner is the most
 *  expensive thing that happened in round 1 — so the reply is checked before it
 *  is shown, and a reply that invents is thrown away rather than displayed. */
async function askModel(system, history, note, guard = null) {
    const key = apiKey();
    if (!key) return null;
    const body = {
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: system },
            ...history.slice(-10).map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content,
            })),
            ...(note ? [{ role: 'system', content: note }] : []),
        ],
        temperature: 0.7,
        max_tokens: 300,
    };
    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
            body: JSON.stringify(body),
        });
        if (!res.ok) return `[model error ${res.status}]`;
        const json = await res.json();
        let text = json.choices?.[0]?.message?.content?.trim() || '';
        /* The app parses a JSON envelope at these levels, with JSON.parse. This
           used to pick the content out with a regex, whose non-greedy `"(.*?)"`
           stopped at the first ESCAPED quote — so a reply quoting the answer came
           out as `You were very close! In this case, you would say \` and a tester
           reported the truncated line. Parse it properly, regex only as a last
           resort for genuinely malformed output. */
        const envelope = text.match(/\{[\s\S]*\}/);
        if (envelope) {
            try {
                const parsed = JSON.parse(envelope[0]);
                if (typeof parsed?.content === 'string') text = parsed.content;
            } catch {
                const m = text.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                if (m) text = m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            }
        }

        if (guard) {
            /* The `zero` and `basic` levels require the whole reply to be in the
               learner's own language. The model mostly complies and then
               intermittently does not — testers were answered with "Katha anedi
               stories ki, illu anedi houses ki" and with ten untaught words in a
               row. Enforced rather than requested. */
            if (guard.englishOnly && E.speaksForeign(text, guard.allowed, SYSTEM_ENGLISH)) {
                debug('rejected: foreign intrusions', JSON.stringify(E.foreignIntrusions(text, guard.allowed, SYSTEM_ENGLISH)), '|', text.slice(0, 90));
                if (!guard.retried) {
                    return askModel(system, history,
                        `${note}\n[Your previous reply used ${guard.lang} words. At this stage the learner reads no ${guard.lang} at all — write the whole reply in English, naming ${guard.lang} words only when they are among the ones they have been taught.]`,
                        { ...guard, retried: true });
                }
                return null;
            }
            const bad = E.fabricatedForms(text, guard.target, guard.allowed);
            if (bad.length) {
                debug('rejected: fabricated', JSON.stringify(bad.map(b => `${b.wrote}<-${b.insteadOf}`)), '|', text.slice(0, 90));
                if (!guard.retried) {
                    return askModel(system, history,
                        `${note}\n[Your previous reply contained ${bad.map(b => `"${b.wrote}"`).join(', ')}, which is not a word this course teaches. Rewrite it. You may use these words and no others: ${(guard.allowed || []).join(', ')}. Keep every sentence complete — do not delete the word you are explaining, name it correctly.]`,
                        { ...guard, retried: true });
                }
                return null;   // caller falls back to its templated line
            }
        }
        return text;
    } catch (err) {
        return `[model unreachable: ${err.message}]`;
    }
}

/** Show a model reply only if it survives having its own questions removed.
 *  An empty result means the templated instruction stands alone, which is
 *  correct — better than a stray '[conversation step — not simulated]' or a
 *  literal 'null', both of which reached testers. */
/** A 💡 note the learner has not already been given. */
/** Show a 💡 note, unless the learner has already been given it.
 *  Returns whether anything was shown, so a caller can say something else
 *  rather than fall silent. */
function pushNote(s, push, text, opts = {}) {
    if (!text) return false;
    /* On a MISS the note must not contain the word the learner just got wrong.
       A round-K2 tester answered "The house is there" with the word for "here",
       was correctly told so — and then handed the note "without it `mane alli` is
       just 'house there'", which prints the correct word before the retry. They
       called it "a free answer for getting it wrong", and they are right: the
       retry then tests nothing. Notes on a HIT are unaffected, which is where
       most of them fire. */
    if (opts.withholdIfItNames) {
        const plain = E.normalizeLatin(String(text));
        const leaks = E.normalizeLatin(opts.withholdIfItNames).split(' ')
            .filter(w => w.length > 2)
            .some(w => plain.split(' ').includes(w));
        if (leaks) return false;
    }
    const key = String(text).slice(0, 80);
    if (!s.shownNotes) s.shownNotes = [];
    if (s.shownNotes.includes(key)) return false;
    /* Also check what is actually on screen. A lesson's teaching step prints its
       word's `teach` line, and the same text coming back as the answer to a
       question one turn later reads as the tutor repeating itself — three testers
       reported exactly that. The teaching step does not go through this function,
       so the shown-list alone cannot see it. */
    const recent = (s.messages || []).slice(-6).map(m => m.content || '').join(' ');
    if (recent.includes(key)) return false;
    s.shownNotes.push(key);
    push('system', `💡 ${text}`);
    return true;
}

function pushHelper(push, reply, guard = {}) {
    if (reply && typeof reply === 'object') {
        /* An authored explanation is the lesson's own sentence — push it as-is,
           since stripping would cut wording the curriculum chose deliberately. An
           EMPTY one falls through, or an off-syllabus question ends here unanswered. */
        if (reply.authored && reply.text) { pushNote(guard.state, push, reply.text); return; }
        reply = reply.authored ? '' : reply.text;
    }

    /* A bare echo of the word is not an answer to a question about it. */
    if (E.isBareEcho(reply, guard.target)) reply = '';

    /* Cleaning must never be the reason a learner gets no answer. In round 5 the
       six testers asked 55 questions and 9 were answered — the model WAS replying,
       and these filters were emptying it. So a reply that survives nothing keeps
       its plainest form. */
    const cleaned = E.stripPraise(E.stripInstructions(E.stripQuestions(reply)));
    const salvage = E.stripPraise(String(reply || '')
        .replace(/<phonetic>[\s\S]*?<\/phonetic>/gi, ' ')
        .replace(/\[say it like:[^\]]*\]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim());
    /* Stripping can leave a fragment starting mid-sentence — testers got
       `Tutor: for "I am fine, and you?".` and `Tutor: question! The course
       hasn't covered...`. If what survives no longer begins like a sentence, the
       unstripped form is the lesser evil. */
    const startsMidSentence = (t) => /^[a-z]/.test(t) && !/^(i|i'm|it|its|it's)\b/i.test(t);
    let kept = (cleaned && !startsMidSentence(cleaned)) ? cleaned : salvage;
    // Nothing but a leftover pleasantry says nothing at all — and neither does
    // "I understand you'd like an example sentence", which is seven words of
    // acknowledgement and no answer.
    if (kept && E.normalizeLatin(kept).split(' ').filter(Boolean).length < 3) kept = '';
    if (kept && guard.asked && !E.explainsSomething(kept, guard.taught || [])) kept = '';
    if (!kept && reply) debug('emptied by cleaning:', String(reply).slice(0, 120));

    if (kept) {
        const { target, misses, asked } = guard;
        /* Naming a single word while explaining it is fine and often necessary.
           Printing a whole target SENTENCE is not: a tester asked "how would I use
           that in a sentence?", was handed `Nenu bagunnanu, meeru?`, and typed it
           back next turn. Nor only the CURRENT target — the sentences the lesson
           has not reached yet are just as copyable, and that question drew them
           out too. */
        const sentences = [target, ...(guard.upcoming || [])]
            .filter(Boolean)
            .filter(t => E.normalizeLatin(t).split(' ').filter(Boolean).length >= 2);
        const currentIsWord = target
            && E.normalizeLatin(target).split(' ').filter(Boolean).length < 2;
        const gaveAway = sentences.some(t => E.answerWasRevealed(kept, t));
        const allowedToReveal = asked && currentIsWord
            && !sentences.some(t => t !== target && E.answerWasRevealed(kept, t));
        if (!gaveAway || allowedToReveal || (misses ?? 0) >= E.REVIEW_RETRY_LIMIT) {
            push('assistant', kept);
            return;
        }
        debug('withheld: reply revealed an answer |', kept.slice(0, 90));
    }

    /* Withheld or unusable. Never silence: the lesson's own note if there is a
       relevant one, otherwise an honest line. */
    if (!guard.asked) return;

    /* A learner REPORTING a hole — "you haven't taught me the word for and" — is
       telling you the course asked for something it never gave them. This has to
       be checked BEFORE the note fallback below, not after it: round K1 added the
       honest reply but left it downstream of `guard.fallback`, so any lesson
       carrying a vaguely relevant note still answered a gap report with "that is
       the note just above — have another look". A round-K3 tester hit exactly
       that on lesson 1's untaught "and", was pointed at a note that did not
       contain the answer, was marked wrong, and called it the worst moment in the
       course. Pointing someone at notes that do not contain the answer is worse
       than saying nothing, because they go and read them. */
    const saidText = String(guard.said || '');
    const reportsAGap = /\b(you|it)\s*(have|haven'?t|has|hasn'?t|did|didn'?t|never|not)\b[^.?!]{0,40}\b(taught|showed|shown|given|covered|told)\b/i.test(saidText)
        || /\b(never|not)\s+(been\s+)?(taught|shown|covered|given)\b/i.test(saidText)
        || /\bdon'?t know (the |any )?word\b/i.test(saidText);
    const namesTaughtWord = (guard.taught || []).some(w =>
        E.normalizeLatin(saidText).split(' ').includes(E.normalizeLatin(w)));
    if (reportsAGap && !namesTaughtWord) {
        push('assistant', "You are right, that has not come up yet — good catch, and it is the course's gap, not yours. Answer with what you do know and I will not hold the missing piece against you.");
        return;
    }

    if (guard.fallback) {
        if (pushNote(guard.state, push, guard.fallback)) return;
        /* pushNote refused because the learner has seen this note. Only call it
           "just above" if it really is on screen — a tester was pointed at a note
           three times when it either did not exist or appeared BELOW the pointer.
           Otherwise show it again; a repeat beats a false direction. */
        const key = String(guard.fallback).slice(0, 80);
        const onScreen = (guard.state?.messages || []).slice(-6)
            .some(m => String(m.content || '').includes(key));
        if (onScreen) {
            push('assistant', "That is the note just above — have another look, and ask again if it is still unclear.");
        } else {
            push('system', `💡 ${guard.fallback}`);
        }
        return;
    }
    /* Only say "not covered" when it really is not. A tester asked about *Sare* —
       a lesson-4 word, on screen at that moment — and was told twice it had not
       come up yet. */
    const namesTaught = (guard.taught || []).some(w =>
        E.normalizeLatin(guard.said || '').split(' ').includes(E.normalizeLatin(w)));

    push('assistant', namesTaught
        ? "That word has come up already — take another look at your notes above, and ask again if it is still unclear."
        : "I would rather not hand you a whole sentence you have not been taught yet. Ask me about any single word and I will answer that.");
}

/** One sentence on what was wrong with THIS attempt.
 *
 *  Mirrors `aiService.diagnoseAttempt`, which the app calls on every miss — at
 *  the vocabulary, review and sentence stages alike. The harness had none of it
 *  and answered every wrong attempt with a bare "Not quite", so both voice
 *  testers reported that the app teaches when you are right and quizzes when you
 *  are wrong. That is true of this harness and false of the product; without
 *  this, the round measures the wrong thing.
 *
 *  The prompt and the leak check are copied from ai.js rather than paraphrased,
 *  including its refusal to accept a diagnosis that contains the answer.
 */
async function diagnoseAttempt(s, { answer, target, acceptable = [], prompt, hint }) {
    if (!answer || !target) return null;

    /* The grader already knows why it refused. Ask it first: across thirteen
       wrong answers in one session the model's version named the wrong part of
       the word five times, gave backwards instructions twice, and invented a
       meaning once. A deterministic answer is never any of those. */
    const certain = E.explainMiss(answer, target, acceptable, synonyms(s));
    if (certain) return certain;
    const system = `You are a ${s.lang} tutor helping a beginner whose native language is English.
The learner was asked: "${prompt}"
The correct answer is: "${target}"${hint ? `\nThe structure is: ${hint}` : ''}
They said: "${answer}"

Write ONE short sentence (max 20 words) in English that tells them what is missing or wrong in THEIR attempt, so they can fix it themselves.

HARD RULES:
- NEVER write the correct answer, or any part of it, in ${s.lang}. Not as an example, a tip, or a "native touch".
- Describe what is missing rather than supplying it — "the verb at the end is missing", "that is the word for 'you', not 'how'", "close, but one sound is off".
- If they used a word from a different language, say which language.
- No greeting, no praise, no follow-up question. One sentence only.`;

    const reply = await askModel(system, [], '');
    const text = (reply || '').trim().replace(/^["']|["']$/g, '');
    if (!text || text.length > 220) return null;

    // Checked, not trusted: any leak of the answer voids the diagnosis.
    const strip = (v) => String(v).toLowerCase().normalize('NFD')
        .replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '');
    const haystack = strip(text);
    const forbidden = [target, ...acceptable]
        .flatMap(t => String(t).split(/[\s,.?!]+/))
        .map(strip)
        .filter(w => w.length >= 4);
    if (forbidden.some(w => haystack.includes(w))) {
        debug('diagnosis discarded: it contained the answer |', text.slice(0, 70));
        return null;
    }
    return text;
}

/** Answer a learner's question, preferring the lesson's own words.
 *
 *  The model paraphrases, and paraphrasing grammar goes wrong: asked about
 *  idhi/ee it recast a syntactic distinction as distance; asked how to pluralise
 *  a noun it reproduced the three-branch rule but attached the wrong example to
 *  the wrong branch, giving *pusthakam* as the vowel-ending case. The authored
 *  note is correct by construction and testers named these notes the best thing
 *  in the course, so where the lesson already answers the question, its own
 *  sentence goes out verbatim and the model is not consulted at all.
 *
 *  The model still handles everything the lesson does not cover — which is what
 *  it is good at, and where a paraphrase costs nothing.
 */
async function explain(s, said, target, lesson, note) {
    const shortlist = E.rankedExplanationsFor(lesson, said, 3, s.step);
    const grounding = shortlist.length
        ? `\n[The lesson's own explanations, most likely relevant first. Answer the learner FROM these — quote or paraphrase, but do not contradict them and do not invent a different reason. If none of them addresses the question, say briefly and honestly that this course has not covered it yet.\n${shortlist.map((t, i) => `(${i + 1}) ${t}`).join('\n')}]`
        : '';
    const reply = await askModel(
        conversationalRules(s.lang, 'English', levelForStep(s.step)),
        s.messages.concat([{ role: 'user', content: said }]),
        note + grounding,
        { target: target || '', allowed: taughtSoFar(s), englishOnly: s.step < 11, lang: s.lang },
    );
    // If the model gave nothing usable, the lesson's own words go out unaltered.
    return reply ? { text: reply, authored: false } : { text: shortlist[0] || '', authored: true };
}

/** The lesson's own wording, which the model must explain FROM rather than
 *  reconstruct — it recast the idhi/ee distinction as distance when asked. */
function explanationAuthority(lesson) {
    const text = E.lessonExplanations(lesson);
    return text
        ? `The lesson explains its own material like this, and this is the authority — explain FROM it, in your own words if you like, but never contradict it and never invent a different reason: "${text}"`
        : '';
}

/** A learner who answers correctly AND asks something deserves both: the credit
 *  and the answer. The question branches are guarded on `!ok` so a correct answer
 *  is never mis-read as a request for help, which used to drop the question
 *  entirely. This runs alongside the advance instead. */
async function answerAside(s, said, target, lesson) {
    return explain(s, said, target, lesson,
        `[The learner answered correctly AND asked a question. Do not grade anything, do not praise, do not re-teach, do not set a new task — a separate line already handles all of that. Answer their question, briefly, in English, right now, and stop. ${explanationAuthority(lesson)} ${E.antiFabricationRule(target || '', taughtSoFar(s))} ${E.ONE_QUESTION_RULE}]`);
}

/** Sentences this lesson has not asked for yet. A reply must not print them:
 *  they are copyable, and "how would I use that in a sentence?" reliably drew
 *  one out. */
function upcomingAnswers(s, lesson) {
    const phrases = lesson.phrases || [];
    const convos = lesson.conversations || [];
    const out = [];
    phrases.forEach((d, i) => { if (8 + i >= s.step && d.correct) out.push(d.correct); });
    convos.forEach((d, i) => { if (11 + i >= s.step && d.correct) out.push(d.correct); });
    return out;
}

/** Every word the course has taught up to and including this lesson — the
 *  allow-list the model is held to. */
function taughtSoFar(s) {
    /* Alt spellings included. Without them the guard treated *santhoshamga* and
       *alupuga* — forms the lessons teach and the drills require — as invented,
       retried, failed again, and returned nothing. That silence is why round-4
       testers still had questions go unanswered: the model was answering, and the
       harness was throwing the answer away. */
    return (CURRICULUM[s.lang] || [])
        .slice(0, s.scenarioIdx + 1)
        .flatMap(l => (l.vocabulary || []).flatMap(v => [v.word, ...(v.alt || [])]))
        .filter(Boolean);
}

/* ── the lesson ────────────────────────────────────────────────────────── */
const PRAISE = ['Spot on!', 'Exactly!', 'Great job!', 'Perfect!', 'Correct!'];
const TEACH_PRAISE = ['Good.', 'Correct.', 'Right.', 'Yes.'];

function lessonOf(s) { return CURRICULUM[s.lang]?.[s.scenarioIdx] || { vocabulary: [], phrases: [], conversations: [] }; }
function synonyms(s) { return E.buildLexicon(CURRICULUM[s.lang] || []); }

/** Three words for the review quiz: due first, then the words the lesson's own
 *  drills are about to need, then the rest. */
function buildReviewSet(s) {
    const lesson = lessonOf(s);
    const now = Date.now();
    const due = Object.entries(s.vocab)
        .filter(([, v]) => new Date(v.dueAt).getTime() <= now)
        .sort((a, b) => new Date(a[1].dueAt) - new Date(b[1].dueAt))
        .map(([w, v]) => ({ word: v.word || w, meaning: v.meaning, source: 'due' }));

    const set = due.slice(0, 3);
    // least-practised first: words that shared a teaching step were never asked
    // for on their own, and later words have had fewer turns since
    const rest = [];
    for (let step = E.TEACH_STEPS - 1; step >= 0; step--) {
        const slice = E.teachSliceFor(lesson.vocabulary || [], step);
        slice.slice(0, -1).forEach(v => rest.push(v));
        if (slice.length) rest.push(slice[slice.length - 1]);
    }
    const taken = new Set(set.map(w => w.word.toLowerCase()));
    for (const v of rest) {
        if (set.length >= 3) break;
        if (taken.has(v.word.toLowerCase())) continue;
        set.push({ word: v.word, meaning: v.meaning, source: 'lesson' });
        taken.add(v.word.toLowerCase());
    }
    return set;
}

function recordTaught(s, slice) {
    for (const v of slice) {
        if (!v?.word) continue;
        const k = v.word.toLowerCase();
        if (s.vocab[k]) continue;
        const init = srs.initialSchedule(new Date());
        s.vocab[k] = { word: v.word, meaning: v.meaning, box: init.box, dueAt: init.dueAt, reviews: 0 };
    }
}

function recordReview(s, word, outcome) {
    const k = String(word).toLowerCase();
    const rec = s.vocab[k] || { word, meaning: '', box: 0, dueAt: new Date().toISOString(), reviews: 0 };
    const next = srs.nextSchedule(rec.box, outcome, new Date());
    s.vocab[k] = { ...rec, box: next.box, dueAt: next.dueAt, reviews: rec.reviews + 1, lastOutcome: next.outcome };
}

/** The answer being asked for right now, for the skip hatch. */
function skipAnswerFor(s, lesson) {
    const stage = E.stageOf(s.step);
    if (stage === 'teach') return E.expectedForTeachStep(E.teachSliceFor(lesson.vocabulary || [], s.step));
    if (stage === 'review') return ((s.reviewSet || [])[s.step - 5] || (s.reviewSet || [])[0])?.word || null;
    if (stage === 'phrase') return lesson.phrases?.[s.step - 8]?.correct || null;
    return lesson.conversations?.[s.step - 11]?.correct || null;
}

/** The instruction for whatever step we have just moved to. */
function promptForStep(s, lesson) {
    const stage = E.stageOf(s.step);
    if (stage === 'teach') {
        const slice = E.teachSliceFor(lesson.vocabulary || [], s.step);
        recordTaught(s, slice);
        return E.buildTeachingStep(slice, '');
    }
    if (stage === 'review') {
        if (!s.reviewSet) s.reviewSet = buildReviewSet(s);
        const item = s.reviewSet[s.step - 5] || s.reviewSet[0];
        return item ? `What's the ${s.lang} word for "${item.meaning}"?` : null;
    }
    if (stage === 'phrase') return E.drillPrompt(lesson.phrases, s.step - 8);
    if (s.step >= 15) return null;
    return E.drillPrompt(lesson.conversations, s.step - 11);
}

/** Miko's opening line for whatever step we are on. */
function openingFor(s) {
    const lesson = lessonOf(s);
    const slice = E.teachSliceFor(lesson.vocabulary, 0);
    recordTaught(s, slice);
    return E.buildTeachingStep(slice, lesson.opener || "Hey there! I'm Miko, your friendly guide. 🐾");
}

async function turn(s, said) {
    const lesson = lessonOf(s);
    const vocab = lesson.vocabulary || [];
    const stage = E.stageOf(s.step);
    const out = [];
    const push = (role, content) => out.push({ role, content });
    const lastTutor = [...s.messages].reverse().find(m => m.role === 'assistant')?.content || '';
    const syn = synonyms(s);
    const misses = E.consecutiveMisses(s.messages);
    const praise = PRAISE[s.step % PRAISE.length];

    const isAck = E.isAcknowledgement(said);
    /* The escape hatch the tutor promises when it admits a gap. It was never
       implemented: "skip" was graded as a wrong answer and the learner stayed
       put. Handled before anything else, at every stage. */
    const wantsSkip = E.isSkipRequest(said);
    // The app treats a help phrase as a question at every stage, not just the
    // ones whose text happens to trip looksLikeQuestion. Mirror it, or the
    // harness reports a dead end the learner never actually hits.
    const isQuestion = !isAck && (E.isHelpRequest(said) || E.looksLikeQuestion(said));
    /* Opening with "Is..." or "What..." means asking, and must never be graded as
       answering — even when the question names the very word being asked for. */
    const askingOnly = E.opensAsQuestion(said);

    /* "I don't know" is a help request, so it is never graded as a miss — which is
       right, but it means a learner who says it can never REACH the two-miss cap
       that reveals the answer and moves on. They get the drill re-asked instead,
       for as long as they keep admitting they are stuck. A round-K4 transcript
       shows the whole shape: two wrong attempts, then "I guess I don't know then",
       then the answer stated AND the same question asked again in the next line.
       Retrieval has become guessing, and the app is pretending it has not.

       So an explicit surrender AFTER a failed attempt is treated as reaching the
       cap: say the answer, say plainly that the pieces had not been put together
       yet, and move on. Without a prior attempt it stays a help request, because
       "I don't know" on first sight of a drill is a request for a hint. */
    const givesUp = E.isHelpRequest(said) && /\b(i (guess i )?(really )?(do ?n'?t|dont) know|no idea|give up|stuck)\b/i.test(said);
    const surrendered = givesUp && misses >= 1;

    if (wantsSkip) {
        const shown = skipAnswerFor(s, lesson);
        if (shown) {
            const stageBefore = E.stageOf(s.step);
            /* A skip is a lapse — the clearest signal there is that the word is
               not known. "That one will come back later" is a promise about the
               ladder, and it was not being told. */
            if (stageBefore === 'teach' || stageBefore === 'review') {
                for (const w of String(shown).split(/\s+/)) if (w) recordReview(s, w, 'missed');
            }
            s.step += 1;
            push('assistant', `No problem — it's **${shown}**. That one will come back later.`);
            /* Skipping the LAST card of a section used to cross the boundary in
               silence, because the announcement is emitted by the normal advance
               path. A learner who skips is exactly the one who needs telling that
               the format is about to change. */
            const stageAfter = E.stageOf(s.step);
            if (stageAfter !== stageBefore) {
                const banner = stageAfter === 'review'
                    ? `🎓 **Vocabulary done** — ${(lesson.vocabulary || []).length} words. Quick memory check next.`
                    : stageAfter === 'phrase'
                        ? "🎓 **Review done** — now let's build whole sentences."
                        : '🎓 **Phrases done** — now real conversation.';
                push('system', banner);
            }
            const next = promptForStep(s, lesson);
            if (next) push('assistant', next);
            else {
                push('system', '✨ **Scenario complete.**');
                if (lesson.farewell) push('system', `🎉 ${lesson.farewell}`);
            }
            return out;
        }
    }

    /* ---- teaching: steps 1-5 ---- */
    if (stage === 'teach') {
        const expected = E.extractPromptedPhrase(lastTutor);
        /* A doubled step shows two words and now asks for both, so either one —
           or both together — counts, and each word's own alt spellings with it. */
        /* A doubled step asks for BOTH words. Accepting either meant a learner
           typed one, was told "Correct", and was quizzed four turns later on a
           word they had never produced — with the banner counting it as taught. */
        const slice = E.teachSliceFor(vocab, s.step);
        const wanted = E.expectedForTeachStep(slice) || expected;
        const alts = [
            ...E.teachStepVariants(slice),
            ...(E.wordsOfferedBy(slice).length > 1 ? [] : [
                ...E.altsFor(CURRICULUM[s.lang] || [], expected),
                ...E.wordsOfferedBy(slice).flatMap(w => E.altsFor(CURRICULUM[s.lang] || [], w)),
            ]),
        ].filter(Boolean);
        const r = wanted ? E.scoreAnswer(said, wanted, alts, syn) : { accepted: false };
        const ok = wanted && !askingOnly
            && (r.accepted || E.tutorModelled(said, lastTutor, wanted));

        if (isQuestion && !ok) {
            /* Matches the app's teachIsQuestion branch: asking for help during
               vocabulary is answered, not graded. */
            const slice = E.teachSliceFor(vocab, s.step);
            const known = (lesson.vocabulary || []).map(v => `${v.word} (${v.meaning})`).join(', ');
            const reply = await explain(s, said, slice[0]?.word, lesson,
                `[The learner asked for help instead of answering. They are being taught the word "${slice[0]?.word}" meaning "${slice[0]?.meaning}". Answer their question briefly and encouragingly, then stop — do NOT re-teach the word and do NOT tell them to say it, because the line immediately after yours does both. ${explanationAuthority(lesson)} ${E.antiFabricationRule(slice[0]?.word || '', taughtSoFar(s))} ${E.ONE_QUESTION_RULE}]`);
            // At the vocabulary stage the word is the lesson, not a puzzle — the
            // teaching line right below repeats it anyway, so no reveal guard.
            pushHelper(push, reply, { state: s, target: wanted, misses, asked: true,
                // the teaching step below reprints these words' own lines
                fallback: E.bestExplanationFor(lesson, said, s.step, E.wordsOfferedBy(slice)),
                taught: taughtSoFar(s), said, upcoming: upcomingAnswers(s, lesson) });
            push('assistant', E.buildTeachingStep(slice, 'Here it is again. 🐾'));
        } else if (isAck) {
            push('assistant', E.buildTeachingStep(E.teachSliceFor(vocab, s.step), 'Sure — here it is again. 🐾'));
        } else if (ok) {
            if (isQuestion) {
                pushHelper(push, await answerAside(s, said, expected, lesson), { state: s, asked: true, fallback: E.bestExplanationFor(lesson, said, s.step), taught: taughtSoFar(s), said, upcoming: upcomingAnswers(s, lesson) });
            }
            s.step += 1;
            const p = TEACH_PRAISE[s.step % TEACH_PRAISE.length];
            const spell = E.spellingNote(said, wanted, alts, syn);
            if (E.stageOf(s.step) === 'teach') {
                const slice = E.teachSliceFor(vocab, s.step);
                recordTaught(s, slice);
                push('assistant', E.buildTeachingStep(slice, `${p}${spell} 🐾`));
            } else {
                /* Every tester who reached a stage boundary reported the answer
                   just before it vanishing: no praise, no spelling correction.
                   The banner announced the stage and swallowed the grade. */
                push('assistant', `${p}${spell}`.trim());
                push('system', `🎓 **Vocabulary done** — ${vocab.length} words. Quick memory check next.`);
                s.reviewSet = buildReviewSet(s);
                push('assistant', `What's the ${s.lang} word for "${s.reviewSet[0].meaning}"?`);
            }
        } else {
            /* The app diagnoses a miss here too — it is the stage where a learner
               most often types a neighbouring word by mistake. */
            const why = await diagnoseAttempt(s, {
                answer: said, target: wanted,
                prompt: `Say the ${s.lang} word for "${slice[0]?.meaning || ''}"`,
            });
            push('assistant', `Not quite.${why ? ` ${why}` : ''} Here it is again. ${E.buildTeachingStep(E.teachSliceFor(vocab, s.step))}`);
        }
        return out;
    }

    /* ---- review quiz: steps 6-8 ---- */
    if (stage === 'review') {
        if (!s.reviewSet) s.reviewSet = buildReviewSet(s);
        const round = s.step - 5;
        const item = s.reviewSet[round] || s.reviewSet[0];
        const alts = E.altsFor(CURRICULUM[s.lang] || [], item.word);
        const r = E.scoreAnswer(said, item.word, alts, syn);
        const ok = !askingOnly && (r.accepted || E.tutorModelled(said, lastTutor, item.word));
        const revealed = E.answerWasRevealed(lastTutor, item.word);

        /* Guarded on !ok the way the app guards on !hasCorrectMatch. Without it a
           correct answer that also trips the help heuristic is never graded. */
        if (isQuestion && !ok) {
            const reply = await explain(s, said, item.word, lesson,
                `[The learner asked a question instead of answering. Answer it briefly without giving away the quiz answer. ${explanationAuthority(lesson)} ${E.antiFabricationRule(item.word, taughtSoFar(s))} ${E.ONE_QUESTION_RULE}]`);
            pushHelper(push, reply, { state: s, target: item.word, misses, asked: true, fallback: E.bestExplanationFor(lesson, said, s.step), taught: taughtSoFar(s), said, upcoming: upcomingAnswers(s, lesson) });
            push('assistant', `So — what's the ${s.lang} word for "${item.meaning}"?`);
            return out;
        }

        recordReview(s, item.word, E.gradeOutcome({ correct: ok, misses, revealed }));

        if (ok && isQuestion) {
            pushHelper(push, await answerAside(s, said, item.word, lesson), { state: s, asked: true, fallback: E.bestExplanationFor(lesson, said, s.step), taught: taughtSoFar(s), said, upcoming: upcomingAnswers(s, lesson) });
        }
        if (ok) {
            s.step += 1;
            const spell = E.spellingNote(said, item.word, E.altsFor(CURRICULUM[s.lang] || [], item.word), syn);
            if (E.stageOf(s.step) === 'review') {
                const next = s.reviewSet[s.step - 5] || s.reviewSet[0];
                push('assistant', `${praise}${spell} What's the word for "${next.meaning}"?`);
            } else {
                push('assistant', `${praise}${spell}`.trim());
                push('system', "🎓 **Review passed** — now let's build whole sentences.");
                push('assistant', E.drillPrompt(lesson.phrases, 0) || "Let's build a sentence.");
            }
        } else if (misses >= E.REVIEW_RETRY_LIMIT) {
            s.step += 1;
            const shown = `It's **${item.word}**.`;
            if (E.stageOf(s.step) === 'review') {
                const next = s.reviewSet[s.step - 5] || s.reviewSet[0];
                push('assistant', `${shown} We'll come back to it later — what's the word for "${next.meaning}"?`);
            } else {
                // Not "passed" — they were let through on the retry cap, and a
                // tester noticed the banner claiming otherwise.
                push('system', "🎓 **Moving on** — that one will come back later. Now let's build whole sentences.");
                push('assistant', `${shown} We'll come back to that one. ${E.drillPrompt(lesson.phrases, 0) || ''}`.trim());
            }
        } else {
            const why = await diagnoseAttempt(s, {
                answer: said, target: item.word,
                prompt: `What's the ${s.lang} word for "${item.meaning}"?`,
            });
            push('assistant', why
                ? `Not quite. ${why} What's the word for "${item.meaning}"?`
                : `Not quite! What's the word for "${item.meaning}"?`);
        }
        return out;
    }

    /* ---- sentence building: steps 9-11 ---- */
    if (stage === 'phrase') {
        const idx = s.step - 8;
        const item = lesson.phrases?.[idx];
        if (!item) { s.step += 1; push('assistant', 'Let’s move on.'); return out; }
        const r = E.scoreAnswer(said, item.correct, item.acceptable || [], syn);
        const ok = !askingOnly && (r.accepted || E.tutorModelled(said, lastTutor, item.correct));

        if (!ok && surrendered) {
            s.step += 1;
            const nextPhrase = E.drillPrompt(lesson.phrases, idx + 1) || E.drillPrompt(lesson.conversations, 0);
            push('assistant', `That is fine — you had the pieces, we had not put them together yet. It is **${item.correct}**. ${nextPhrase}`);
            return out;
        }
        if ((isQuestion || isAck) && !ok) {
            /* The question gets answered AND the answer gets graded. A tester
               wrote `Naaku dabbulu undi (guessing at the verb...)` and got only
               "So — Say 'I have money'." — no verdict, no hint — while the same
               bare answer next turn was properly corrected. */
            const reply = isQuestion ? await explain(s, said, item.correct, lesson,
                `[The learner asked a question instead of answering. Answer it briefly without stating the target sentence. ${explanationAuthority(lesson)} ${E.antiFabricationRule(item.correct, taughtSoFar(s))} ${E.ONE_QUESTION_RULE}]`) : null;
            pushHelper(push, reply, { state: s, target: item.correct, misses, asked: true, fallback: E.bestExplanationFor(lesson, said, s.step), taught: taughtSoFar(s), said, upcoming: upcomingAnswers(s, lesson) });
            const attempted = E.normalizeLatin(said).split(' ').some(t => t.length > 2
                && E.normalizeLatin(item.correct).split(' ').includes(t));
            const h = attempted && item.hint ? ` Hint: ${item.hint.replace(/[.?!]+$/, '')}.` : '';
            push('assistant', attempted
                ? `${E.MISS_MARKER}.${h} ${E.drillPrompt(lesson.phrases, idx)}`
                : `So — ${E.drillPrompt(lesson.phrases, idx)}`);
            return out;
        }

        if (!ok && surrendered) {
            s.step += 1;
            const nextPhrase = E.drillPrompt(lesson.phrases, idx + 1) || E.drillPrompt(lesson.conversations, 0);
            push('assistant', `That is fine — you had the pieces, we had not put them together yet. It is **${item.correct}**. ${nextPhrase}`);
            return out;
        }
        if (ok && isQuestion) {
            pushHelper(push, await answerAside(s, said, item.correct, lesson), { state: s, asked: true, fallback: E.bestExplanationFor(lesson, said, s.step), taught: taughtSoFar(s), said, upcoming: upcomingAnswers(s, lesson) });
        }
        if (ok) {
            s.step += 1;
            /* Verdict first, then why, then what's next — the order a teacher
               speaks in, and the order the app's audio now follows. */
            const spell = E.spellingNote(said, item.correct, item.acceptable || [], syn);
            const nextPhrase = E.drillPrompt(lesson.phrases, idx + 1);
            if (nextPhrase) push('assistant', `${praise}${spell}`.trim());
            if (item.grammarNote) pushNote(s, push, item.grammarNote);
            if (nextPhrase) push('assistant', nextPhrase);
            else {
                push('assistant', `${praise}${spell}`.trim());
                push('system', '🎓 **Phrases done** — now real conversation.');
                push('assistant', E.drillPrompt(lesson.conversations, 0) || "Let's talk.");
            }
        } else if (misses >= E.REVIEW_RETRY_LIMIT) {
            s.step += 1;
            const nextPhrase = E.drillPrompt(lesson.phrases, idx + 1) || E.drillPrompt(lesson.conversations, 0);
            push('assistant', `It's **${item.correct}**. We'll come back to this — ${nextPhrase}`);
        } else {
            const hint = item.hint ? ` Hint: ${item.hint.replace(/[.?!]+$/, '')}.` : '';
            const why = await diagnoseAttempt(s, {
                answer: said, target: item.correct, acceptable: item.acceptable || [],
                prompt: item.prompt, hint: item.hint,
            });
            // Verdict, then why, then the task again — the same order as a hit.
            push('assistant', why ? `Not quite. ${why}` : `Not quite.${hint}`);
            if (misses === 0) pushNote(s, push, item.grammarNote, { withholdIfItNames: item.correct });
            push('assistant', E.drillPrompt(lesson.phrases, idx));
        }
        return out;
    }

    /* ---- conversation: steps 12-15 (model-driven in the app) ---- */
    const cIdx = s.step - 11;
    const item = lesson.conversations?.[cIdx];
    const r = item ? E.scoreAnswer(said, item.correct, item.acceptable || [], syn) : { accepted: false };
    const ok = item && !askingOnly && (r.accepted || E.tutorModelled(said, lastTutor, item.correct));
    if (item && !ok && surrendered) {
        s.step += 1;
        const next = E.drillPrompt(lesson.conversations, cIdx + 1);
        push('assistant', next
            ? `That is fine — you had the pieces, we had not put them together yet. It is **${item.correct}**. ${next}`
            : `That is fine — it is **${item.correct}**. That is the scenario done.`);
        if (!next) {
            push('system', '✨ **Scenario complete.**');
            const learned = Object.values(s.vocab).map(v => `${v.word} — ${v.meaning}`);
            push('system', `📋 **You can now say:** ${learned.join(' · ')}`);
        }
        return out;
    }
    if (ok && isQuestion) {
        pushHelper(push, await answerAside(s, said, item.correct, lesson), { state: s, asked: true, fallback: E.bestExplanationFor(lesson, said, s.step), taught: taughtSoFar(s), said, upcoming: upcomingAnswers(s, lesson) });
    }
    if (ok) {
        s.step += 1;
        const next = lesson.conversations?.[cIdx + 1];
        const spell = E.spellingNote(said, item.correct, item.acceptable || [], syn);
        /* Verdict first whether or not there is a next drill. The final turn of
           every lesson used to praise AFTER the note, so the one card a learner
           is most likely to remember inverted the order. */
        push('assistant', `${praise}${spell}`.trim());
        if (item.grammarNote) pushNote(s, push, item.grammarNote);
        if (next) push('assistant', E.drillPrompt(lesson.conversations, cIdx + 1));
        else {
            const learned = Object.values(s.vocab).map(v => `${v.word} — ${v.meaning}`);
            push('assistant', "That's the last one.");
            /* The send-off comes FIRST. A tester got it fourth — after "that's the
               last one", the generic completion stamp and a five-word vocabulary
               list — and said the ending was buried. */
            if (lesson.farewell) push('system', `🎉 ${lesson.farewell}`);
            push('system', '✨ **Scenario complete.**');
            push('system', `📋 **You can now say:** ${learned.join(' · ')}`);
        }
        return out;
    }
    // Same two-miss cap as every other stage. Without it the checker waits for a
    // target utterance indefinitely while the model chats, and the learner sits
    // at the same step with nothing telling them why.
    if (item && misses >= E.REVIEW_RETRY_LIMIT && !isQuestion && !isAck) {
        s.step += 1;
        const next = E.drillPrompt(lesson.conversations, cIdx + 1);
        if (next) push('assistant', `It's **${item.correct}**. We'll come back to this — ${next}`);
        else {
            push('assistant', `It's **${item.correct}**. That's the scenario done — nicely handled.`);
            push('system', '✨ **Scenario complete.**');
            const learned = Object.values(s.vocab).map(v => `${v.word} — ${v.meaning}`);
            push('system', `📋 **You can now say:** ${learned.join(' · ')}`);
            if (lesson.farewell) push('system', `🎉 ${lesson.farewell}`);
        }
        return out;
    }

    const known = (lesson.vocabulary || []).map(v => `${v.word} (${v.meaning})`).join(', ');
    const reply = isQuestion
        ? await explain(s, said, item?.correct, lesson,
            `[The learner asked a question. Answer it briefly, in English, without stating the target sentence. ${explanationAuthority(lesson)} ${E.antiFabricationRule(item?.correct || '', taughtSoFar(s))} ${E.ONE_QUESTION_RULE}]`)
        : await askModel(
            conversationalRules(s.lang, 'English', levelForStep(s.step)),
            s.messages.concat([{ role: 'user', content: said }]),
            `[Stay on the scenario: "${lesson.scenario}". The learner is attempting: "${item?.prompt}". Never write square brackets or placeholders. ${E.antiFabricationRule(item?.correct || '', taughtSoFar(s))} ${E.ONE_QUESTION_RULE}]`,
            { target: item?.correct || '', allowed: taughtSoFar(s), englishOnly: s.step < 11, lang: s.lang },
        );
    pushHelper(push, reply, { state: s, target: item?.correct, misses, asked: isQuestion, fallback: E.bestExplanationFor(lesson, said, s.step), taught: taughtSoFar(s), said, upcoming: upcomingAnswers(s, lesson) });
    const nextPrompt = E.drillPrompt(lesson.conversations, cIdx);
    if (!nextPrompt) {
        // Past the last drill: the lesson is finished. Saying "Not quite" and
        // appending a null prompt is what produced "Tutor: Not quite. null".
        push('assistant', "That's the scenario done — nothing left to answer here.");
        return out;
    }
    const hint = item?.hint ? ` Hint: ${item.hint.replace(/[.?!]+$/, '')}.` : '';
    /* Asking is not answering wrongly. The phrase stage already knew this; the
       conversation stage stamped "Not quite" on a question — a tester asked "how
       would I say 'very good'?" before answering and was marked wrong for it.

       But a WRONG ANSWER with a question stuck on the end is still a wrong answer,
       and this branch was swallowing the verdict for it. A round-K2 tester typed
       `Adu yenu? — though I can't tell from the prompt whether the book is near or
       far`, got no "Not quite" at all and could not tell whether they had been
       marked wrong or ignored; retyping it bare produced the real verdict. Their
       conclusion is the right one: "writing out loud makes your errors less
       legible", which punishes exactly the behaviour the mixed-language handling
       was built to allow. So the verdict is suppressed only when the turn carries
       no attempt at the target — the same `attempted` test the phrase stage uses.

       `askingOnly` has to gate that test, though. Without it a question that
       merely QUOTES a target word — "is it ketta or chennagilla here?" — counts as
       an attempt and gets graded, and a round-K3 tester who asked exactly that was
       told "Not quite. 2 of the words are missing". Marking a pure question wrong
       is the very fault this branch was added to fix, so the attempt test only
       applies to turns that are not asking-only. */
    const attemptedConvo = !askingOnly && E.normalizeLatin(said).split(' ').some(t => t.length > 2
        && E.normalizeLatin(item?.correct || '').split(' ').includes(t));
    if (isQuestion && !attemptedConvo) {
        push('assistant', `So — ${nextPrompt}`);
        return out;
    }
    const why = await diagnoseAttempt(s, {
        answer: said, target: item?.correct, acceptable: item?.acceptable || [],
        prompt: item?.prompt, hint: item?.hint,
    });
    push('assistant', why ? `${E.MISS_MARKER}. ${why}` : `${E.MISS_MARKER}.${hint}`);
    if (misses === 0) pushNote(s, push, item?.grammarNote, { withholdIfItNames: item?.correct });
    push('assistant', nextPrompt);
    return out;
}

/* ── run ───────────────────────────────────────────────────────────────── */
let state = load();

if (has('reset') || !state) {
    const lang = arg('lang', 'Kannada');
    const scenario = Number(arg('scenario', 1)) - 1;
    state = fresh(lang, Math.max(0, scenario));
    const opening = openingFor(state);
    state.messages.push({ role: 'assistant', content: opening });
    save(state);
    console.log(render(opening, 'assistant'));
    if (!has('say')) process.exit(0);
}

/* A learner who reaches lesson N has the earlier lessons' words in their head.
   Dropping a tester straight into lesson 12 without them produces complaints
   about words that WERE taught, six lessons ago. This prints that notebook. */
if (has('notes')) {
    const lang = arg('lang', state?.lang || 'Telugu');
    const upto = Number(arg('scenario', (state?.scenarioIdx ?? 0) + 1)) - 1;
    const lessons = CURRICULUM[lang] || [];
    if (upto <= 0) console.log('(no earlier lessons — this is your first)');
    for (let i = 0; i < Math.min(upto, lessons.length); i++) {
        const l = lessons[i];
        const words = (l.vocabulary || []).map(v => {
            const alt = (v.alt || []).length ? ` (also: ${v.alt.join(', ')})` : '';
            return `${v.word} = ${v.meaning}${alt}`;
        }).join(' · ');
        console.log(`L${i + 1} ${l.scenario || ''}: ${words}`);
    }
    process.exit(0);
}

if (has('transcript')) {
    for (const m of state.messages) console.log(render(m.content, m.role));
    process.exit(0);
}

if (has('status')) {
    const lesson = lessonOf(state);
    console.log(`lesson: ${state.lang} scenario ${state.scenarioIdx + 1} — ${lesson.scenario}`);
    const done = state.step >= 15;
    console.log(done ? 'step:   complete (15 of 15)'
        : `step:   ${state.step + 1} of 15  (${E.stageOf(state.step)})`);
    console.log(`words:  ${Object.keys(state.vocab).length} taught`);
    process.exit(0);
}

const said = arg('say');
if (typeof said !== 'string' || !said.trim()) {
    console.log('usage: node tools/lesson-sim.mjs --say "your answer"');
    console.log('       node tools/lesson-sim.mjs --reset --lang Kannada --scenario 1');
    console.log('       node tools/lesson-sim.mjs --transcript | --status');
    process.exit(1);
}

state.messages.push({ role: 'user', content: said });
const replies = await turn(state, said);
for (const m of replies) state.messages.push(m);
save(state);
for (const m of replies) console.log(render(m.content, m.role));

/* The app is voice-first, and a plain transcript hides that completely: it
   renders every line the same way, so a reader takes them all in equally and a
   listener does not. Eleven rounds of playtesting missed that the whole of the
   feedback — every 💡 note, every 🎓 banner — was `role: 'system'` and never
   reached text-to-speech at all.
   Both channels are now shown. A note prints in full on screen and its opening
   sentence is spoken, so a tester can judge whether what they HEAR carries the
   point, which is the only question that matters for a voice-first app. */
function render(content, role) {
    if (role === 'system') {
        const spoken = E.spokenFormOfNote(content);
        const full = String(content || '').replace(/\n+/g, ' ').trim();
        const lines = [`👁  On screen: ${full}`];
        if (spoken) lines.push(`🔊 Spoken:    ${spoken}`);
        return lines.join('\n');
    }
    /* The app runs `buildSpeechText` over everything it synthesises, stripping
       markdown and emoji. The harness printed the raw string, so testers kept
       reporting asterisks and 🐾 "in the audio" that a real listener never hears.
       Cleaned the same way, so the spoken channel here is the spoken channel. */
    if (role === 'assistant') {
        const guides = [];
        const body = String(content || '')
            .replace(/<phonetic>(.*?)<\/phonetic>/gi, (_, g) => { guides.push(g.trim()); return ''; })
            .replace(/<[^>]+>/g, '')
            .replace(/\n+/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
        const heard = E.spokenFormOfNote(body);
        const tail = guides.map(g => `\n        say it like: ${g}`).join('');
        return `🔊 Tutor: ${heard}${tail}`;
    }
    const label = '   You: ';
    /* Pronunciation guides go on their own lines. Flattened into the sentence
       they read as one mangled blob when a step teaches two words —
       "[say it like: A = x]  [say it like: B = y]" — which testers reported in
       three separate rounds. */
    const guides = [];
    const body = String(content || '')
        .replace(/<phonetic>(.*?)<\/phonetic>/gi, (_, g) => { guides.push(g.trim()); return ''; })
        .replace(/<[^>]+>/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
    const tail = guides.map(g => `\n        say it like: ${g}`).join('');
    return label + body + tail;
}
