/* eslint-disable react-refresh/only-export-components -- dev-only entry point, not a module */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '../index.css';
import Steps, { Summary } from '../pages/Steps';
import Home from '../pages/Home';
import LessonMap from '../pages/LessonMap';
import { api } from '../services/api';
import ModeToggle from '../components/ModeToggle';
import { AuthProvider } from '../contexts/AuthContext';
import { CURRICULUM } from '../services/curriculum';
import { findLanguage } from '../../shared/languages.js';
import { aiService } from '../services/ai';
import { buildLessonSteps } from '../services/stepPlan';
import { ensureReviewSet, ensureAdaptation } from '../services/srs';
import { sessionProgress } from '../services/skillProgress';
import { skillsFor } from '../services/skills';
import MySkills from '../pages/MySkills';

/**
 * Dev-only harness for the step-by-step lesson screens.
 *
 * The app proper sits behind Google sign-in and a running backend, so this
 * mounts <Steps> on its own with a language seeded into localStorage. The SRS
 * and progress calls fail unauthenticated and are already swallowed, so the
 * lesson falls back to current-lesson review words and runs entirely offline.
 *
 * Not part of `npm run build` — vite only builds index.html.
 *
 *   /preview.html?lang=Telugu&scenario=0&step=6
 */
const params = new URLSearchParams(location.search);
const lang = params.get('lang') || 'Telugu';
const scenario = params.get('scenario') || '0';

/* The real thing out of the real table, not a guess. This used to build the id
   as `lang.slice(0,2)` and hardcode `code: 'te-IN'`, which meant Kannada was
   previewed as id `ka` — not a language any of the app's lookups know — and
   every language was spoken by a Telugu voice. `asrLadder` reads that id, so
   the preview was reporting "speech recognition does not support Kannada" on a
   screen where the real app is fine. A harness that lies about the state is
   worse than no harness. */
const targetLang = findLanguage(lang) || { id: 'te', name: lang, code: 'te-IN' };
localStorage.setItem('linguapaws_target_lang', JSON.stringify({
    name: lang, id: targetLang.id, code: targetLang.code,
}));
/* Home redirects to onboarding unless these are all set. */
localStorage.setItem('linguapaws_native_lang', JSON.stringify({ name: 'English', code: 'en' }));
localStorage.setItem('linguapaws_level', JSON.stringify({ id: 'conversational' }));
if (params.get('mode')) localStorage.setItem('linguapaws_learn_mode', params.get('mode'));


/* ── The voice path ────────────────────────────────────────────────────────
   Headless Chrome has no microphone and the transcriber needs a signed-in
   backend, so every state of the speak path — listening, heard, and each of
   the four ways it can fail — is unreachable by clicking. Stubbed here rather
   than in the page: `getUserMedia`, `MediaRecorder` and `transcribeAudio` are
   replaced, and the real Steps code runs against them unchanged.

     ?answer=speak|type   which answer mode the lesson opens in
     ?voice=listening     mid-recording
     ?voice=heard         a transcript landed in the box
     ?voice=native        a transcript in the target's own script, which the app
                          romanises on the way in — the ordinary Indic case
     ?voice=denied|none|offline|script|failed|empty   the ways it goes wrong

   `script` returns Urdu's Arabic on purpose. Brahmic script is transliterated
   now rather than refused, so an Indic string no longer reaches that state —
   an abjad, which a romanisation would have to guess the vowels of, is what is
   actually left of it.
*/
const voiceState = params.get('voice');
if (params.get('answer') || voiceState) {
    localStorage.setItem('linguapaws_answer_mode',
        params.get('answer') === 'type' ? 'type' : 'speak');
}

/* ?voice=real&token=<jwt> — the real microphone, the real recogniser and both
   speech paths, for measuring them (Chrome's --use-file-for-fake-audio-capture
   plays a clip as the mic). Only /api/ai/* reaches the server: every other call
   — progress, SRS, word bank — is refused here, so a measuring run writes
   nothing to the database. `?live=off` forces the upload path. */
if (voiceState === 'real') {
    if (params.get('token')) localStorage.setItem('linguapaws_token', params.get('token'));
    if (params.get('live') === 'off') window.__LIVE_STT_OFF = true;
    for (const m of ['get', 'post', 'put', 'delete']) {
        const real = api[m].bind(api);
        api[m] = (path, ...rest) => (String(path).startsWith('/api/ai/')
            ? real(path, ...rest) : Promise.reject(new Error('preview: not sent')));
    }
}

if (voiceState && voiceState !== 'real') {
    const track = { kind: 'audio', stop() {} };
    const stream = { active: true, getTracks: () => [track] };
    const md = navigator.mediaDevices;
    md.getUserMedia = async () => {
        if (voiceState === 'denied' || voiceState === 'none') {
            throw new DOMException('Permission denied', 'NotAllowedError');
        }
        return stream;
    };
    md.enumerateDevices = async () =>
        (voiceState === 'none' ? [] : [{ kind: 'audioinput', deviceId: 'stub' }]);
    if (voiceState === 'offline') {
        Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true });
    }

    window.MediaRecorder = class {
        static isTypeSupported() { return true; }
        constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; this.on = {}; }
        addEventListener(k, f) { (this.on[k] = this.on[k] || []).push(f); }
        removeEventListener(k, f) { this.on[k] = (this.on[k] || []).filter(x => x !== f); }
        start() {
            this.state = 'recording';
            // ?voice=empty is the learner who tapped the mic and said nothing.
            if (voiceState === 'empty') return;
            setTimeout(() => this.ondataavailable?.({
                data: new Blob(['stub-audio'], { type: 'audio/webm' }),
            }), 20);
        }
        stop() { this.state = 'inactive'; (this.on.stop || []).forEach(f => f()); }
    };

    /* Its own script, per language — a Telugu string on a Kannada lesson would
       be testing the wrong transliteration table. */
    const NATIVE_SCRIPT = {
        Telugu: 'నమస్కారం, నేను బాగున్నాను',
        Kannada: 'ನಮಸ್ಕಾರ, ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ',
        Hindi: 'नमस्ते, मैं ठीक हूँ',
        Tamil: 'வணக்கம், நான் நலம்',
    };
    aiService.transcribeAudio = async (blob, native, target, expecting, expected) => {
        if (voiceState === 'failed') return { error: 'Transcription failed: stub' };
        if (voiceState === 'script') return { text: 'نمستے، میں ٹھیک ہوں' };
        if (voiceState === 'native') {
            return { text: NATIVE_SCRIPT[lang] || NATIVE_SCRIPT.Telugu };
        }
        return { text: params.get('heard') || expected || 'Namaskaram' };
    };
}

/* `?askreply=<text>` answers "Ask Miko" with that text after a short wait, so
   the box, its loading state and the answer can be looked at without a server.
   The body sent is kept on window.__askBody for inspection. */
const askReply = params.get('askreply');
if (askReply) {
    const realPost = api.post.bind(api);
    api.post = (path, body) => (path === '/api/ai/ask'
        ? new Promise(r => { window.__askBody = body; setTimeout(() => r({ answer: askReply }), 600); })
        : realPost(path, body));
}

const screen = params.get('screen');

/* ── A stubbed skill model (adaptive phase 2) ──────────────────────────────
   `?skills=w:nanage,e:ge` makes those skills weak and a few others strong, so
   the adaptive Memory check and practice — and the one "Because …" caption —
   can be looked at without a signed-in learner. `?confused=Naanu>Nanage`
   adds an open confused pair (said>needed) for the caption to name. Every
   other call is left as it was. Nothing is written anywhere. */
/* Adaptive phase 3 caches the lesson's adaptation; a preview is always a
   fresh lesson start, adapted (or not) to this URL's stub. */
localStorage.removeItem(`linguapaws_adapt_${lang}_${scenario}`);
const stubSkills = params.get('skills');
let stubModel = [];
if (stubSkills) {
    const weak = stubSkills.split(',').filter(Boolean);
    const confused = (params.get('confused') || '').split(',').filter(Boolean)
        .map(p => { const [said, needed] = p.split('>'); return { said, needed }; });
    /* ?skills=empty: a model with nothing in it (a learner with no evidence yet). */
    const model = stubSkills === 'empty' ? [] : [
        ...weak.map(skillId => ({ skillId, mastery: 0.2, evidence: 3, level: 'weak', weak: true })),
        ...['w:mane', 'w:hoovu', 'w:neeru', 'w:illu', 'w:nenu'].map(skillId => ({
            skillId, mastery: 0.9, evidence: 4, level: 'strong', weak: false, lastSeen: new Date().toISOString() })),
    ];
    stubModel = model;
    localStorage.removeItem(`linguapaws_reviewset_${lang}_${scenario}`);
    const before = api.get.bind(api);
    api.get = async (path, ...rest) => {
        if (String(path).startsWith('/api/progress/skills')) return model;
        if (String(path).startsWith('/api/progress/confusions/open')) return confused;
        return before(path, ...rest);
    };
}

/* ── A due phrase (spaced phrases) ─────────────────────────────────────────
   `?phrases=1` makes the previous lesson's phrases due, as the server's
   /api/progress/due?kind=phrase would, so the Memory check's phrase slot can
   be looked at; the preview counts the previous lesson as finished. */
if (params.get('phrases')) {
    const prevIdx = Number(scenario) - 1;
    const prevLesson = (CURRICULUM[lang] || [])[prevIdx];
    localStorage.removeItem(`linguapaws_reviewset_${lang}_${scenario}`);
    const before = api.get.bind(api);
    api.get = async (path, ...rest) => {
        if (String(path).startsWith('/api/progress/due') && String(path).includes('kind=phrase')) {
            return (prevLesson?.phrases || []).map(d => ({ kind: 'phrase', word: d.correct, lessonIdx: prevIdx, phase: 'phrase' }));
        }
        if (path === '/api/progress') return { successfulRepeats: 0, lessonProgress: { [lang]: prevIdx }, lessonPosition: {} };
        return before(path, ...rest);
    };
}

/* The "My skills" page: ?screen=skills&done=N&board=strong|weak|empty|fail
   builds a model over the skills of the first N+1 lessons. `weak` is shaped
   like Farhaan's real Kannada record (21 weak, 19 learning, the rest new). */
const board = params.get('board');
if (board) {
    const reach = Number(params.get('done') || 14) + 1;
    const ids = [...skillsFor(lang).values()].filter(t => (t.lesson ?? 1) <= reach).map(t => t.id);
    const named = ['c:continuous', 'w:hoguttiddene', 'w:maaduttiddene', 'w:yelli', 'w:iddeera', 'w:sari', 'w:nanna', 'w:kelasa', 'w:yaavaga', 'w:chikka'];
    const order = board === 'weak' ? [...named.filter(i => ids.includes(i)), ...ids.filter(i => !named.includes(i))] : ids;
    const rec = (m, k) => Array.from({ length: 6 }, (_, j) => ((j * 7 + k * 3) % 10) / 10 < m ? 1 : (j + k) % 3 ? 0 : 0.5);
    const at = (skillId, k, mastery, evidence) => ({ skillId, mastery, evidence, level: 'x', recent: rec(mastery, k) });
    const model = board === 'empty' ? [] : order.map((id, k) => {
        if (board === 'weak') {
            if (k < 21) return at(id, k, 0.2 + (k % 5) * 0.05, 2 + (k % 3));
            if (k < 40) return at(id, k, 0.55 + (k % 4) * 0.05, 2 + (k % 2));
            return at(id, k, 0.5, 0.6);
        }
        if (k % 9 === 4) return at(id, k, 0.35, 2.5);
        if (k % 4 === 1) return at(id, k, 0.65, 2);
        if (k % 7 === 6) return at(id, k, 0.5, 0.8);
        return at(id, k, 0.88, 4);
    });
    const realGet = api.get.bind(api);
    api.get = async (path, ...rest) => {
        if (String(path).startsWith('/api/progress/skills')) {
            if (board === 'fail') throw new Error('offline');
            return model;
        }
        if (path === '/api/progress') return { successfulRepeats: 0, lessonProgress: { [lang]: reach - 2 }, lessonPosition: {} };
        return realGet(path, ...rest);
    };
}

/* Header renders the signed-in avatar unconditionally, so the home preview needs
   a stub user. Never a real token — every API call still fails and is swallowed. */
/* The lesson map: ?screen=map&done=N&at=S stubs /api/progress so the map shows
   N lessons finished and S screens into the next one. No `done` = new learner.
   ?screen=practice&done=N opens a practice session over those N lessons. */
if (screen === 'map' || screen === 'practice') {
    const done = params.get('done');
    const at = parseInt(params.get('at') || '0', 10);
    const realGet = api.get.bind(api);
    api.get = async (path) => {
        if (path !== '/api/progress') return realGet(path);
        const p = { successfulRepeats: 0, lessonProgress: {}, lessonPosition: {} };
        if (done !== null) p.lessonProgress[lang] = Number(done) - 1;
        const next = done === null ? 0 : Number(done);
        if (at > 0) p.lessonPosition[lang] = { lessonIdx: next, stepIdx: at };
        return p;
    };
}
if (screen === 'home') {
    localStorage.setItem('linguapaws_user', JSON.stringify({
        name: 'Preview', email: 'preview@example.com', picture: '',
    }));
    localStorage.setItem('linguapaws_token', 'preview-not-a-real-token');
}

/* ── Drivers ───────────────────────────────────────────────────────────────
   The screens are worth looking at in three states — asked, missed, and won —
   and only one of them can be reached by clicking. So the harness computes the
   run's expected answers from the same `buildLessonSteps` the page uses (the
   review triplet is cached in localStorage, so both calls agree) and types the
   real answer when asked to.

     ?step=N     walk to screen N, answering wrongly
     ?win=N      walk to screen N correctly, then answer it correctly
     ?miss=N     walk to screen N correctly, then get it wrong once
     ?reveal=N   walk to screen N correctly, then get it wrong twice
     ?recover=N  get it wrong once, then right — the "Back on it." moment
     ?lock=N     get it wrong twice, then type the revealed answer back
     ?bounce=N   miss screen N, clear it, then clear N+1 — the recovery line
     ?type=…     type this on whatever screen the run lands on
     ?wrong=a|b  the wrong answers ?miss / ?reveal type (default "zzz nonsense")
*/
const wrongTexts = (params.get('wrong') || 'zzz nonsense').split('|');

const cta = () => [...document.querySelectorAll('button')]
    .find(b => /^(Check|Continue|See how you did)$/.test(b.textContent.trim()));
const box = () => document.querySelector('input');
/* A listen screen has no box: it is answered by tapping an English meaning. */
const listenOptions = () => [...document.querySelectorAll('[data-listen-option]')].filter(b => !b.disabled);

const setValue = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
};

/* The voice driver runs after whichever driver put us on this screen. */
window.__driverBusy = false;
window.__typeBusy = false;

const jumpTo = parseInt(params.get('step') ?? '', 10);
if (!Number.isNaN(jumpTo) && jumpTo > 0) {
    let done = 0;
    window.__driverBusy = true;
    const stop = () => { window.__driverBusy = false; clearInterval(tick); };
    const tick = setInterval(() => {
        if (done >= jumpTo) return stop();
        const button = cta();
        const input = box();
        const options = listenOptions();
        if (!button && options.length) return options[0].click();
        if (!button) return;
        if (button.textContent.trim() !== 'Check') {
                /* A locked Continue is the note still printing itself out. Clicking it
               is a no-op, but the counter used to advance anyway, so a walk past any
               drill screen landed several screens short of the one asked for. Wait,
               the way a learner has to. */
            if (button.disabled) return;
            button.click(); done++; return;
        }
        // Answer whatever is on screen — wrongly — so the run can move on.
        if (input && !input.disabled && !input.value) return setValue(input, '.');
        button.click();
    }, 90);
}

/* The correct-answer drivers. `target` is the screen to stop on; `wrongs` is
   how many times to answer it wrongly before stopping. */
const bounce = params.get('bounce');
const winTo = params.get('win') ?? params.get('miss') ?? params.get('reveal')
    ?? params.get('recover') ?? params.get('lock')
    ?? (bounce === null ? null : String(Number(bounce) + 1));
if (winTo !== null && winTo !== undefined) {
    const target = Math.max(parseInt(winTo, 10) || 0, 0);
    const recovering = params.get('recover') !== null;
    const locking = params.get('lock') !== null;
    const wrongs = (params.get('miss') !== null || recovering || bounce !== null) ? 1
        : (params.get('reveal') !== null || locking) ? 2 : 0;
    /* Where the wrong answer goes in. Normally the screen we stop on; for
       ?bounce it is the one before, so the screen we stop on is the recovery. */
    const wrongAt = bounce !== null ? Number(bounce) : target;

    window.__driverBusy = true;
    (async () => {
        const lessonsFor = CURRICULUM[lang] || [];
        const lesson = lessonsFor[Number(scenario)];
        const reviewSet = await ensureReviewSet(
            lang, Number(scenario), lesson.vocabulary || [],
            (lesson.phrases || []).flatMap(p => String(p.correct || '').split(/\s+/)),
        ).catch(() => null);
        const adaptation = await ensureAdaptation(lang, Number(scenario), { reviewSet }).catch(() => null);
        const expected = buildLessonSteps(lesson, reviewSet, lessonsFor, null, adaptation).map(s => s.expected);

        let at = 0, wrongsLeft = wrongs;
        const stop = () => { window.__driverBusy = false; clearInterval(tick); };
        const tick = setInterval(() => {
            const button = cta();
            const input = box();
            const options = listenOptions();
            if (!button && options.length) {
                const want = expected[at];
                if (at === wrongAt && wrongsLeft > 0) {
                    options.find(b => b.dataset.listenOption !== want)?.click();
                    wrongsLeft--;
                    if (!wrongsLeft && !recovering && !locking && bounce === null) stop();
                    return;
                }
                return options.find(b => b.dataset.listenOption === want)?.click();
            }
            if (!button) return;
            if (at > target) return stop();

            if (button.textContent.trim() !== 'Check') {
                if (button.disabled) return;   // see the note in the ?step driver
                if (at !== target) { button.click(); at++; return; }
                /* Settled on the screen we came for. The revealed panel has an
                   answer box of its own; ?lock fills it and stops there. */
                const lockBtn = [...document.querySelectorAll('button')]
                    .find(b => b.textContent.trim() === 'Lock it in');
                if (locking && lockBtn && input) {
                    if (!input.value) return setValue(input, expected[at] || '.');
                    lockBtn.click();
                }
                return stop();
            }
            if (!input) return;
            if (at === wrongAt && wrongsLeft > 0) {
                const wrong = wrongTexts[wrongs - wrongsLeft] || wrongTexts[0];
                if (input.value !== wrong) return setValue(input, wrong);
                button.click(); wrongsLeft--;
                if (!wrongsLeft && !recovering && !locking && bounce === null) stop();
                return;
            }
            /* Set it whenever it is not already the answer — after a miss the
               box still holds the wrong answer, and re-checking it just misses
               again. */
            const want = expected[at] || '.';
            if (input.value !== want) return setValue(input, want);
            button.click();
        }, 110);
    })();
}

/* ── The keyboard on its own ───────────────────────────────────────────────
   `?enter=N` plays N screens with no clicks at all: the answer is typed, Enter
   checks it, and a second Enter moves on. Landing on screen N is the proof —
   before this, Enter could not settle a screen (the input was `disabled`, and
   a disabled input receives no key events) and could not advance one either
   (the settled screen has no input mounted at all). */
const enterTo = parseInt(params.get('enter') ?? '', 10);
if (!Number.isNaN(enterTo)) {
    window.__driverBusy = true;
    const press = () => (document.activeElement || document.body).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

    (async () => {
        const lessonsFor = CURRICULUM[lang] || [];
        const lesson = lessonsFor[Number(scenario)];
        const reviewSet = await ensureReviewSet(
            lang, Number(scenario), lesson.vocabulary || [],
            (lesson.phrases || []).flatMap(p => String(p.correct || '').split(/\s+/)),
        ).catch(() => null);
        const adaptation = await ensureAdaptation(lang, Number(scenario), { reviewSet }).catch(() => null);
        const expected = buildLessonSteps(lesson, reviewSet, lessonsFor, null, adaptation).map(s => s.expected);

        let at = 0;
        const tick = setInterval(() => {
            if (at >= enterTo) { window.__driverBusy = false; return clearInterval(tick); }
            const button = cta();
            const input = box();
            const options = listenOptions();
            if (!button && options.length) {
                return options.find(b => b.dataset.listenOption === expected[at])?.click();
            }
            if (!button) return;
            if (button.textContent.trim() === 'Check') {
                if (!input) return;
                const want = expected[at] || '.';
                if (input.value !== want) return setValue(input, want);
                return press();
            }
            if (button.disabled) return;   // see the note in the ?step driver
            press();
            at++;
        }, 620); /* longer than the guard that stops a double Enter from
                    spending the celebration before it has been read */
    })();
}

/* `?press=N` taps Enter N times once the other drivers are done — the way to
   check that Enter reaches a screen no input is mounted on. `?lock=9&press=1`
   locks the revealed answer in and then moves on without touching Continue. */
const pressN = parseInt(params.get('press') ?? '', 10);
if (!Number.isNaN(pressN)) {
    let left = pressN;
    const tick = setInterval(() => {
        if (window.__driverBusy) return;
        if (left <= 0) return clearInterval(tick);
        (document.activeElement || document.body).dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        left--;
    }, 640);
}

/* `?type=…` puts an answer in the box once the other drivers have finished, and
   before the microphone driver below runs. That order is the whole point: it is
   the state the Kannada report was in — an answer already standing when a
   recording is rejected — and no amount of clicking reaches it, because the only
   way to get text into that box is to type it or to be heard. */
const typeText = params.get('type');
if (typeText !== null) {
    window.__typeBusy = true;
    const tick = setInterval(() => {
        if (window.__driverBusy) return;
        const input = box();
        if (!input || input.disabled) return;
        setValue(input, typeText);
        window.__typeBusy = false;
        clearInterval(tick);
    }, 90);
}

/* `?tap=<button text>` taps one button once the drivers above have finished —
   for a control that only opens on request, like "See it in a sentence". */
const tapText = params.get('tap');
if (tapText) {
    const tick = setInterval(() => {
        if (window.__driverBusy || window.__typeBusy) return;
        const b = [...document.querySelectorAll('button')].find(el => el.textContent.includes(tapText));
        if (!b) return;
        b.click();
        clearInterval(tick);
    }, 300);
}

/* The microphone, once whichever driver put us on this screen has finished.
   One tap starts it; the states that need a transcript take a second tap to
   stop and hand the stub blob to the stubbed transcriber. */
if (voiceState) {
    const mic = () => [...document.querySelectorAll('button')].find(b =>
        /Record your answer|Stop recording/.test(b.getAttribute('aria-label') || ''));
    const taps = ['listening', 'denied', 'none', 'offline', 'real'].includes(voiceState) ? 1 : 2;
    let done = 0;
    const tick = setInterval(() => {
        if (window.__driverBusy || window.__typeBusy) return;
        if (done >= taps) return clearInterval(tick);
        const m = mic();
        if (!m || m.disabled) return;
        m.click();
        done++;
    }, 280);
}

/* The toggle on its own. Home itself needs a real signed-in session — its
   Header dereferences the user unconditionally — so this shows the control
   that Home renders rather than the whole page. */
function TogglePreview() {
    const [mode, setMode] = React.useState(params.get('mode') === 'steps' ? 'steps' : 'chat');
    return (
        <div className="app-container" style={{ paddingTop: 20 }}>
            <ModeToggle mode={mode} onChange={setMode} />
        </div>
    );
}

/* The results card on its own, with chosen numbers — a lesson's end is a
   15-screen walk away and its scores depend on how it was played.
     ?screen=summary&total=15&unaided=0&points=16&best=0&recovered=2&locks=2&bonus=0 */
/* "This lesson worked on…", through the real sessionProgress: the model
   before is the ?skills= stub ([] without one; ?before=none for "unknown"),
   and ?posts=c:nanage-like=1*3,e:ge=0*2 is the session's evidence — each
   skill posted `count` times at full weight with that score. */
function workedPreview() {
    const spec = params.get('posts');
    if (!spec) return [];
    const posts = spec.split(',').filter(Boolean).flatMap(p => {
        const [id, rest = '1*1'] = p.split('=');
        const [score, count = 1] = rest.split('*').map(Number);
        return Array.from({ length: count }, () => [{ skillId: id, score, weight: 1 }]);
    });
    return sessionProgress({ lang, before: params.get('before') === 'none' ? null : stubModel, posts });
}

function SummaryPreview() {
    const n = k => parseInt(params.get(k) || '0', 10);
    const lesson = CURRICULUM[lang]?.[Number(scenario)] || CURRICULUM.Telugu[0];
    const total = n('total') || 15;
    const said = (lesson.phrases || []).slice(0, n('said') || 3)
        .map(p => ({ text: p.correct || p.word || String(p), meaning: p.meaning || '' }));
    return (
        <Summary lesson={lesson} steps={Array.from({ length: total }, () => ({}))}
            banked={(lesson.vocabulary || []).slice(0, 5)} unaided={n('unaided')} said={said}
            score={{ points: n('points'), best: n('best'), recovered: n('recovered'),
                     locks: n('locks'), bonus: n('bonus') }}
            onSpeak={() => {}} scenarioIdx={Number(scenario)} navigate={() => {}}
            worked={workedPreview()} />
    );
}

createRoot(document.getElementById('root')).render(
    <>
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, background: '#1f2937',
            color: '#fff', textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '3px',
        }}>
            PREVIEW · {lang} · scenario {Number(scenario) + 1} · not signed in
        </div>
        <div style={{ paddingTop: 18 }}>
            {screen === 'toggle' ? <TogglePreview /> : screen === 'summary' ? <SummaryPreview /> : (
            <AuthProvider>
                <MemoryRouter initialEntries={[screen === 'home' ? '/' : screen === 'map' ? '/lessons' : screen === 'skills' ? '/skills' : screen === 'practice' ? '/steps?practice=1' : `/steps?scenario=${scenario}`]}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/steps" element={<Steps />} />
                        <Route path="/lessons" element={<LessonMap />} />
                        <Route path="/skills" element={<MySkills />} />
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
            )}
        </div>
    </>,
);
