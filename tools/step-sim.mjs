#!/usr/bin/env node
/**
 * step-sim — play a lesson in STEP mode from the command line.
 *
 *   node tools/step-sim.mjs --session me --reset --lang Telugu --scenario 0
 *   node tools/step-sim.mjs --session me --say "Namaskaram"
 *   node tools/step-sim.mjs --session me --status
 *   node tools/step-sim.mjs --session me --transcript
 *   node tools/step-sim.mjs --notes --lang Telugu --scenario 7
 *
 * `lesson-sim` plays the chat surface. This plays the other one — the fifteen
 * screens of `Steps.jsx` — through the same real modules the app renders from:
 * `stepPlan.buildLessonSteps` for the run, `lessonEngine.scoreAnswer` for every
 * accept/reject, `lessonEngine.explainMiss` for what went wrong, and `praise`
 * for what the screen says about it. Nothing here re-implements any of that, so
 * a finding is a finding about the product.
 *
 * State lands in `.lesson-sim/<session>.json` in the shape `lesson-sim` writes,
 * which is what makes `leak-check` work on a step-mode transcript unchanged:
 *
 *   node tools/leak-check.mjs .lesson-sim/<session>.json
 *
 * ── The channel ──
 * Step mode speaks the target and nothing else. Every grammar note, spelling
 * note and verdict clause is screen-only — where chat speaks its notes aloud.
 * So the transcript marks each line 🔊 or 👁, the same distinction `lesson-sim`
 * draws, because a tester judging by ear needs to know which half of the
 * teaching never reaches them.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const E = await import(join(ROOT, 'src/services/lessonEngine.js'));
const P = await import(join(ROOT, 'src/services/praise.js'));
const { buildLessonSteps, stepCaption } = await import(join(ROOT, 'src/services/stepPlan.js'));
const { CURRICULUM } = await import(join(ROOT, 'src/services/curriculum.js'));

/* ── args ──────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? fallback : (argv[i + 1]?.startsWith('--') ? true : argv[i + 1]);
};
const has = (name) => argv.includes(`--${name}`);

const SESSION = (() => {
    const raw = arg('session', null);
    return (raw === null || raw === true) ? 'step' : String(raw).replace(/[^\w.-]/g, '_');
})();
const DIR = join(ROOT, '.lesson-sim');
const FILE = join(DIR, `${SESSION}.json`);

const load = () => (existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : null);
const save = (s) => {
    if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
    writeFileSync(FILE, JSON.stringify(s, null, 1));
};

/* ── the learner's notebook ────────────────────────────────────────────────
   What earlier lessons taught. Handed to a tester starting mid-course, or they
   report words as untaught that they met six lessons ago.                   */
function notes(lang, scenarioIdx) {
    const lessons = CURRICULUM[lang] || [];
    return lessons.slice(0, scenarioIdx).map((l, i) => {
        const words = (l.vocabulary || []).map(w => {
            const alt = (w.alt || []).length ? ` (also: ${w.alt.join(', ')})` : '';
            return `${w.word} = ${w.meaning}${alt}`;
        }).join(' · ');
        return `L${i + 1} ${l.scenario}: ${words}`;
    }).join('\n');
}

/* ── review slots ──────────────────────────────────────────────────────────
   The app fills these from the server's due queue and falls back to the
   current lesson when there is nothing else yet. A fresh session has an empty
   queue, so a tester starting at lesson 1 sees the fallback — exactly what a
   new learner sees. Carried vocabulary makes later lessons review properly. */
function buildReviewSet(s, lesson) {
    const now = Date.now();
    const due = Object.entries(s.vocab || {})
        .filter(([, v]) => new Date(v.dueAt).getTime() <= now)
        .sort((a, b) => new Date(a[1].dueAt) - new Date(b[1].dueAt))
        .map(([w, v]) => ({ word: v.word || w, meaning: v.meaning, source: 'due' }));

    const set = due.slice(0, 3);
    const taken = new Set(set.map(w => w.word.toLowerCase()));
    for (const v of (lesson.vocabulary || [])) {
        if (set.length >= 3) break;
        if (!v?.word || taken.has(v.word.toLowerCase())) continue;
        set.push({ word: v.word, meaning: v.meaning, source: 'lesson' });
        taken.add(v.word.toLowerCase());
    }
    return set;
}

const lessonsFor = (lang) => CURRICULUM[lang] || [];
const stepsFor = (s) => {
    const lessons = lessonsFor(s.lang);
    const lesson = lessons[s.scenarioIdx];
    return buildLessonSteps(lesson, s.reviewSet, lessons);
};

/* ── what a screen looks like ──────────────────────────────────────────────
   Text is not a substitute for the screen, but it has to carry the same
   information in the same order, or a tester reports on a lesson nobody is
   being given.                                                              */
function render(s, steps) {
    const step = steps[s.index];
    if (!step) return '';
    const out = [];
    const caption = stepCaption(steps, s.index)
        + (s.index === steps.length - 1 ? ' · last one' : '');
    out.push(`── ${caption} ── (🐾 ${s.points}${s.combo >= 2 ? `  🔥 ${s.combo}` : ''})`);

    if (step.kind === 'teach') {
        for (const w of step.slice) {
            out.push(`🔊 ${w.word}`);
            if (w.phonetic) out.push(`   say it like: ${w.phonetic}`);
            out.push(`   means: ${w.meaning}`);
            if (w.teach) out.push(`👁  ${w.teach.replaceAll('{w}', w.word)}`);
        }
        out.push(`   Your turn — say ${step.slice.map(w => w.word).join(', then ')}`);
    }

    if (step.kind === 'review') {
        out.push(`👁  ${step.prompt}`);
        if (step.item.source === 'due') out.push('   (from an earlier lesson)');
    }

    if (step.kind === 'drill') {
        out.push(`👁  ${step.prompt}`);
        /* The hint is behind a tap until the learner misses, when the screen
           opens it for them. Showing it here unasked would make every drill
           easier than the one in the app. */
        if (step.drill?.hint && s.misses > 0) out.push(`   💡 hint: ${step.drill.hint}`);
        else if (step.drill?.hint) out.push('   [a hint is available — ask for it with --hint]');
    }
    out.push('   > _');
    return out.join('\n');
}

/* ── the reward layer, as text ─────────────────────────────────────────── */
function celebrate(s, step, misses) {
    const out = [];
    if (misses === 0) {
        s.combo += 1;
        s.best = Math.max(s.best, s.combo);
        s.unaided += 1;
    } else {
        s.combo = 0;
    }
    s.cleared += 1;
    const points = P.pointsFor({ correct: true, misses, combo: s.combo });
    s.points += points.total;

    const milestone = P.milestoneFor(s.combo);
    if (milestone) out.push(`🎉 ${milestone.icon} ${milestone.title} — ${milestone.blurb}`);
    if (s.stumbled && misses === 0) out.push(`👁  ${P.RECOVERY_LINE}`);

    out.push(`🔊 ${step.expected}`);
    out.push(`👁  ${P.verdictFor({ misses, cleared: s.cleared - 1 })}`);
    const did = P.achievementFor({ step, lang: s.lang, combo: s.combo });
    if (did) out.push(`👁  ${did}`);
    out.push(`👁  +${points.base} 🐾${points.bonus ? ` · +${points.bonus} streak bonus` : ''}`);
    return out;
}

/* ── one answer ────────────────────────────────────────────────────────── */
function say(s, text) {
    const steps = stepsFor(s);
    const step = steps[s.index];
    if (!step) return ['The lesson is already finished. --reset to play it again.'];

    const lexicon = E.buildLexicon(lessonsFor(s.lang));
    const said = String(text || '').trim();
    s.messages.push({ role: 'user', content: said });

    /* Revealed and being typed back — the lock-in box. Not scored as an
       answer; it is worth paws because typing it out is a real action. */
    if (s.phase === 'revealed') {
        const { accepted } = E.scoreAnswer(said, step.expected, step.variants, lexicon);
        if (!accepted) return ['👁  Almost — copy it exactly as it is written above.'];
        s.points += P.LOCK_IN_POINTS;
        return [`👁  🔒 Locked in. +${P.LOCK_IN_POINTS} 🐾`, '   (--next for the next screen)'];
    }

    const { accepted } = E.scoreAnswer(said, step.expected, step.variants, lexicon);
    if (accepted) {
        const out = celebrate(s, step, s.misses);
        const note = E.spellingNote(said, step.expected, step.variants, lexicon);
        if (note) out.push(`👁  ${note.trim()}`);
        if (step.drill?.grammarNote) out.push(`👁  💡 ${step.drill.grammarNote}`);
        s.phase = 'correct';
        s.stumbled = s.misses > 0;
        out.push('   (--next for the next screen)');
        return out;
    }

    s.misses += 1;
    s.combo = 0;
    const diagnosis = E.explainMiss(said, step.expected, step.variants, lexicon)
        || (step.drill?.hint ? '' : P.scaffoldFor(step.expected));

    if (s.misses >= E.REVIEW_RETRY_LIMIT) {
        s.phase = 'revealed';
        s.stumbled = true;
        const out = [`👁  ${P.revealLineFor(step.index)}`, `🔊 ${step.expected}`];
        if (step.kind === 'drill' && step.drill?.meaning) out.push(`   “${step.drill.meaning}”`);
        out.push('👁  Write it out once — that is how it stops being someone else\'s word.');
        out.push('   (--say it back to lock it in, or --next to move on)');
        return out;
    }

    const out = [`👁  ${P.missLineFor(step.index + s.misses)}`];
    if (diagnosis) out.push(`👁  ${diagnosis.replace(/\*\*/g, '')}`);
    if (step.drill?.hint) out.push(`   💡 hint: ${step.drill.hint}`);
    return out;
}

/* ── main ──────────────────────────────────────────────────────────────── */
if (has('notes')) {
    const lang = arg('lang', 'Telugu');
    const scenario = Number(arg('scenario', 0)) || 0;
    const body = notes(lang, scenario);
    console.log(body || `Nothing yet — ${lang} lesson ${scenario + 1} is your first.`);
    process.exit(0);
}

let s = load();

if (has('reset') || !s) {
    const lang = arg('lang', s?.lang || 'Telugu');
    const scenarioIdx = Number(arg('scenario', s?.scenarioIdx ?? 0)) || 0;
    const lesson = lessonsFor(lang)[scenarioIdx];
    if (!lesson) {
        console.log(`No ${lang} lesson ${scenarioIdx + 1}. ${lessonsFor(lang).length} exist.`);
        process.exit(1);
    }
    const carried = has('reset') && s && s.lang === lang ? (s.vocab || {}) : {};
    s = {
        lang, scenarioIdx, index: 0, misses: 0, phase: 'answering',
        messages: [], vocab: carried, reviewSet: null,
        points: 0, combo: 0, best: 0, cleared: 0, unaided: 0, stumbled: false,
        step: 0, shownNotes: [],
    };
    s.reviewSet = buildReviewSet(s, lesson);
}

const steps = stepsFor(s);

const emit = (lines) => {
    const text = Array.isArray(lines) ? lines.join('\n') : String(lines);
    if (text) console.log(text);
    return text;
};

if (has('status')) {
    emit([
        `${s.lang} lesson ${s.scenarioIdx + 1} — screen ${Math.min(s.index + 1, steps.length)} of ${steps.length}`,
        `🐾 ${s.points}   🔥 ${s.combo} (best ${s.best})   first try ${s.unaided}/${s.cleared}`,
    ]);
    process.exit(0);
}

if (has('transcript')) {
    console.log(s.messages.map(m => (m.role === 'user' ? `You: ${m.content}` : m.content)).join('\n'));
    process.exit(0);
}

if (has('hint')) {
    const step = steps[s.index];
    console.log(step?.drill?.hint ? `💡 ${step.drill.hint}` : 'No hint on this screen.');
    process.exit(0);
}

if (has('next')) {
    if (s.phase === 'answering') {
        console.log('Answer this screen first (--say "…").');
        process.exit(1);
    }
    /* Bank the words a teach screen just gave, so later lessons can review
       them — the same thing `recordTaughtWord` does in the app. */
    const step = steps[s.index];
    if (step?.kind === 'teach') {
        for (const w of step.slice || []) {
            s.vocab[w.word.toLowerCase()] = {
                word: w.word, meaning: w.meaning, box: 0, reviews: 0,
                dueAt: new Date(Date.now() - 1000).toISOString(),
            };
        }
    }
    s.index += 1;
    s.misses = 0;
    s.phase = 'answering';
    if (s.index >= steps.length) {
        const verdict = P.summaryFor({ unaided: s.unaided, total: steps.length, bestCombo: s.best });
        const out = [
            `🎉 ${verdict.icon} ${verdict.badge}`,
            `👁  ${verdict.line}`,
            `👁  ${s.unaided} of ${steps.length} first try · 🐾 ${s.points} · best streak ${s.best}`,
        ];
        s.messages.push({ role: 'assistant', content: out.join('\n') });
        save(s);
        emit(out);
        process.exit(0);
    }
    const screen = render(s, steps);
    s.messages.push({ role: 'assistant', content: screen });
    save(s);
    emit(screen);
    process.exit(0);
}

const toSay = arg('say', null);
if (toSay !== null && toSay !== true) {
    const out = say(s, toSay);
    s.messages.push({ role: 'assistant', content: out.join('\n') });
    save(s);
    emit(out);
    process.exit(0);
}

/* No command — show the screen the learner is on. */
const screen = render(s, steps);
if (!s.messages.length) s.messages.push({ role: 'assistant', content: screen });
save(s);
emit(screen);
