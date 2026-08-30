/* eslint-disable react-refresh/only-export-components -- dev-only entry point, not a module */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '../index.css';
import Steps from '../pages/Steps';
import Home from '../pages/Home';
import ModeToggle from '../components/ModeToggle';
import { AuthProvider } from '../contexts/AuthContext';
import { CURRICULUM } from '../services/curriculum';
import { aiService } from '../services/ai';
import { buildLessonSteps } from '../services/stepPlan';
import { ensureReviewSet } from '../services/srs';

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

localStorage.setItem('linguapaws_target_lang', JSON.stringify({
    name: lang, id: lang.slice(0, 2).toLowerCase(), code: 'te-IN',
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
     ?voice=denied|none|offline|script|failed|empty   the ways it goes wrong
*/
const voiceState = params.get('voice');
if (params.get('answer') || voiceState) {
    localStorage.setItem('linguapaws_answer_mode',
        params.get('answer') === 'type' ? 'type' : 'speak');
}

if (voiceState) {
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

    aiService.transcribeAudio = async (blob, native, target, expecting, expected) => {
        if (voiceState === 'failed') return { error: 'Transcription failed: stub' };
        if (voiceState === 'script') return { text: 'నమస్కారం, నేను బాగున్నాను' };
        return { text: params.get('heard') || expected || 'Namaskaram' };
    };
}

const screen = params.get('screen');

/* Header renders the signed-in avatar unconditionally, so the home preview needs
   a stub user. Never a real token — every API call still fails and is swallowed. */
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
*/

const cta = () => [...document.querySelectorAll('button')]
    .find(b => /^(Check|Continue|See how you did)$/.test(b.textContent.trim()));
const box = () => document.querySelector('input');

const setValue = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
};

/* The voice driver runs after whichever driver put us on this screen. */
window.__driverBusy = false;

const jumpTo = parseInt(params.get('step') ?? '', 10);
if (!Number.isNaN(jumpTo) && jumpTo > 0) {
    let done = 0;
    window.__driverBusy = true;
    const stop = () => { window.__driverBusy = false; clearInterval(tick); };
    const tick = setInterval(() => {
        if (done >= jumpTo) return stop();
        const button = cta();
        const input = box();
        if (!button) return;
        if (button.textContent.trim() !== 'Check') { button.click(); done++; return; }
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
        const expected = buildLessonSteps(lesson, reviewSet, lessonsFor).map(s => s.expected);

        let at = 0, wrongsLeft = wrongs;
        const stop = () => { window.__driverBusy = false; clearInterval(tick); };
        const tick = setInterval(() => {
            const button = cta();
            const input = box();
            if (!button) return;
            if (at > target) return stop();

            if (button.textContent.trim() !== 'Check') {
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
                if (!input.value) return setValue(input, 'zzz nonsense');
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
        const expected = buildLessonSteps(lesson, reviewSet, lessonsFor).map(s => s.expected);

        let at = 0;
        const tick = setInterval(() => {
            if (at >= enterTo) { window.__driverBusy = false; return clearInterval(tick); }
            const button = cta();
            const input = box();
            if (!button) return;
            if (button.textContent.trim() === 'Check') {
                if (!input) return;
                const want = expected[at] || '.';
                if (input.value !== want) return setValue(input, want);
                return press();
            }
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

/* The microphone, once whichever driver put us on this screen has finished.
   One tap starts it; the states that need a transcript take a second tap to
   stop and hand the stub blob to the stubbed transcriber. */
if (voiceState) {
    const mic = () => [...document.querySelectorAll('button')].find(b =>
        /Record your answer|Stop recording/.test(b.getAttribute('aria-label') || ''));
    const taps = ['listening', 'denied', 'none', 'offline'].includes(voiceState) ? 1 : 2;
    let done = 0;
    const tick = setInterval(() => {
        if (window.__driverBusy) return;
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

createRoot(document.getElementById('root')).render(
    <>
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, background: '#1f2937',
            color: '#fff', textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '3px',
        }}>
            PREVIEW · {lang} · scenario {Number(scenario) + 1} · not signed in
        </div>
        <div style={{ paddingTop: 18 }}>
            {screen === 'toggle' ? <TogglePreview /> : (
            <AuthProvider>
                <MemoryRouter initialEntries={[screen === 'home' ? '/' : `/steps?scenario=${scenario}`]}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/steps" element={<Steps />} />
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
            )}
        </div>
    </>,
);
