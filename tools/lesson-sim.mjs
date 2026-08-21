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

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const STATE = join(ROOT, '.lesson-sim-state.json');

const E = await import(join(ROOT, 'src/services/lessonEngine.js'));
const { CURRICULUM } = await import(join(ROOT, 'src/services/curriculum.js'));
const srs = await import(join(ROOT, 'backend/services/srs.js')).then(m => m.default ?? m);

/* ── args ──────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? fallback : (argv[i + 1]?.startsWith('--') ? true : argv[i + 1]);
};
const has = (name) => argv.includes(`--${name}`);

/* ── state ─────────────────────────────────────────────────────────────── */
const fresh = (lang, scenarioIdx) => ({
    lang, scenarioIdx, step: 0, messages: [], vocab: {}, reviewSet: null,
});
const load = () => existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : null;
const save = (s) => writeFileSync(STATE, JSON.stringify(s, null, 2));

/* ── model turns ───────────────────────────────────────────────────────── */
function apiKey() {
    try {
        const env = readFileSync(join(ROOT, 'backend/.env'), 'utf8');
        return env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim() || null;
    } catch { return null; }
}

/** The conversational rules the app actually sends, read out of ai.js so there
 *  is one source rather than a paraphrase that drifts. */
function conversationalRules(targetLang, nativeLang = 'English') {
    const ai = readFileSync(join(ROOT, 'src/services/ai.js'), 'utf8');
    const persona = ai.match(/const MIKO_PROMPT = `([\s\S]*?)`;/)?.[1] || '';
    const level = ai.match(/conversational: `([\s\S]*?)`,\n\n {12}fluent/)?.[1]
        || ai.match(/conversational: `([\s\S]*?)`,/)?.[1] || '';
    return `${persona}\n${level}`
        .replaceAll('${targetLangName}', targetLang)
        .replaceAll('${nativeLangName}', nativeLang)
        .replace(/\$\{[^}]*\}/g, '');
}

async function askModel(system, history, note) {
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
        // the app parses a JSON envelope at these levels
        const m = text.match(/\{[\s\S]*"content"\s*:\s*"([\s\S]*?)"[\s\S]*\}/);
        if (m) text = m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"');
        return text;
    } catch (err) {
        return `[model unreachable: ${err.message}]`;
    }
}

/* ── the lesson ────────────────────────────────────────────────────────── */
const PRAISE = ['Spot on!', 'Exactly!', 'Great job!', 'Perfect!', 'Correct!'];
const TEACH_PRAISE = ['Good.', 'Correct.', 'Right.', 'Yes.'];

function lessonOf(s) { return CURRICULUM[s.lang]?.[s.scenarioIdx] || { vocabulary: [], phrases: [], conversations: [] }; }
function synonyms(s) { return E.buildSynonymMap(CURRICULUM[s.lang] || []); }

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

/** Miko's opening line for whatever step we are on. */
function openingFor(s) {
    const lesson = lessonOf(s);
    const slice = E.teachSliceFor(lesson.vocabulary, 0);
    recordTaught(s, slice);
    return E.buildTeachingStep(slice, "Hey there! I'm Miko, your friendly guide. 🐾");
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

    const isQuestion = E.looksLikeQuestion(said);
    const isAck = E.isAcknowledgement(said);

    /* ---- teaching: steps 1-5 ---- */
    if (stage === 'teach') {
        const expected = E.extractPromptedPhrase(lastTutor);
        const alts = E.altsFor(CURRICULUM[s.lang] || [], expected);
        const r = expected ? E.scoreAnswer(said, expected, alts, syn) : { accepted: false };
        const ok = expected && (r.accepted || E.tutorModelled(said, lastTutor, expected));

        if (isAck) {
            push('assistant', E.buildTeachingStep(E.teachSliceFor(vocab, s.step), 'Sure — here it is again. 🐾'));
        } else if (ok) {
            s.step += 1;
            const p = TEACH_PRAISE[s.step % TEACH_PRAISE.length];
            if (E.stageOf(s.step) === 'teach') {
                const slice = E.teachSliceFor(vocab, s.step);
                recordTaught(s, slice);
                push('assistant', E.buildTeachingStep(slice, `${p} 🐾`));
            } else {
                push('system', '🎓 **Vocabulary complete** — all five words done. Quick memory check next.');
                s.reviewSet = buildReviewSet(s);
                push('assistant', `What's the ${s.lang} word for "${s.reviewSet[0].meaning}"?`);
            }
        } else {
            push('assistant', `Not quite — here it is again. ${E.buildTeachingStep(E.teachSliceFor(vocab, s.step))}`);
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
        const ok = r.accepted || E.tutorModelled(said, lastTutor, item.word);
        const revealed = E.answerWasRevealed(lastTutor, item.word);

        if (isQuestion) {
            const reply = await askModel(
                conversationalRules(s.lang),
                s.messages.concat([{ role: 'user', content: said }]),
                `[The learner asked a question instead of answering. Answer it briefly and do NOT reveal the quiz answer. Then stop.]`,
            );
            push('assistant', reply || '[conversation step — not simulated]');
            push('assistant', `So — what's the ${s.lang} word for "${item.meaning}"?`);
            return out;
        }

        recordReview(s, item.word, E.gradeOutcome({ correct: ok, misses, revealed }));

        if (ok) {
            s.step += 1;
            if (E.stageOf(s.step) === 'review') {
                const next = s.reviewSet[s.step - 5] || s.reviewSet[0];
                push('assistant', `${praise} What's the word for "${next.meaning}"?`);
            } else {
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
                push('system', "🎓 **Review passed** — now let's build whole sentences.");
                push('assistant', `${shown} We'll come back to that one. ${E.drillPrompt(lesson.phrases, 0) || ''}`.trim());
            }
        } else {
            push('assistant', `Not quite! What's the word for "${item.meaning}"?`);
        }
        return out;
    }

    /* ---- sentence building: steps 9-11 ---- */
    if (stage === 'phrase') {
        const idx = s.step - 8;
        const item = lesson.phrases?.[idx];
        if (!item) { s.step += 1; push('assistant', 'Let’s move on.'); return out; }
        const r = E.scoreAnswer(said, item.correct, item.acceptable || [], syn);
        const ok = r.accepted || E.tutorModelled(said, lastTutor, item.correct);

        if (isQuestion || isAck) {
            const reply = isQuestion ? await askModel(
                conversationalRules(s.lang),
                s.messages.concat([{ role: 'user', content: said }]),
                `[The learner asked a question instead of answering. Answer it briefly. Do NOT state the target sentence. Then stop.]`,
            ) : null;
            if (reply) push('assistant', reply);
            push('assistant', `So — ${E.drillPrompt(lesson.phrases, idx)}`);
            return out;
        }

        if (ok) {
            s.step += 1;
            if (item.grammarNote) push('system', `💡 ${item.grammarNote}`);
            const nextPhrase = E.drillPrompt(lesson.phrases, idx + 1);
            if (nextPhrase) push('assistant', `${praise} ${nextPhrase}`);
            else {
                push('system', '🎓 **Phrases done** — now real conversation.');
                push('assistant', E.drillPrompt(lesson.conversations, 0) || "Let's talk.");
            }
        } else if (misses >= E.REVIEW_RETRY_LIMIT) {
            s.step += 1;
            const nextPhrase = E.drillPrompt(lesson.phrases, idx + 1) || E.drillPrompt(lesson.conversations, 0);
            push('assistant', `It's **${item.correct}**. We'll come back to this — ${nextPhrase}`);
        } else {
            const hint = item.hint ? ` Hint: ${item.hint}.` : '';
            push('assistant', `Not quite.${hint} ${E.drillPrompt(lesson.phrases, idx)}`);
        }
        return out;
    }

    /* ---- conversation: steps 12-15 (model-driven in the app) ---- */
    const cIdx = s.step - 11;
    const item = lesson.conversations?.[cIdx];
    const r = item ? E.scoreAnswer(said, item.correct, item.acceptable || [], syn) : { accepted: false };
    const ok = item && (r.accepted || E.tutorModelled(said, lastTutor, item.correct));
    if (ok) {
        s.step += 1;
        if (item.grammarNote) push('system', `💡 ${item.grammarNote}`);
        const next = lesson.conversations?.[cIdx + 1];
        if (next) push('assistant', `${praise} ${E.drillPrompt(lesson.conversations, cIdx + 1)}`);
        else {
            const learned = Object.values(s.vocab).map(v => `${v.word} — ${v.meaning}`);
            push('system', '✨ **Scenario complete.**');
            push('system', `📋 **You can now say:** ${learned.join(' · ')}`);
        }
        return out;
    }
    const reply = await askModel(
        conversationalRules(s.lang),
        s.messages.concat([{ role: 'user', content: said }]),
        `[The learner is attempting: "${item?.prompt}". Target: "${item?.correct}". Do NOT reveal it. React in character and re-prompt.]`,
    );
    push('assistant', reply || '[conversation step — not simulated]');
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

function render(content, role) {
    const label = role === 'assistant' ? 'Tutor: ' : role === 'system' ? 'System: ' : 'You: ';
    const shown = String(content || '')
        .replace(/<phonetic>(.*?)<\/phonetic>/gi, ' [say it like: $1]')
        .replace(/<[^>]+>/g, '')
        .replace(/\n+/g, ' ')
        .trim();
    return label + shown;
}
