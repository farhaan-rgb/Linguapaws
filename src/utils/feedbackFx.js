/**
 * The sound and the buzz of getting it right.
 *
 * Synthesised, not sampled — a two-note chime is a few lines of WebAudio and
 * costs nothing to ship, where an mp3 is a network request that arrives after
 * the moment it was meant to mark.
 *
 * Everything here is best-effort and silent on failure. Safari before a user
 * gesture, an audio context that will not resume, a browser with no
 * `vibrate` — none of that is worth an error, and none of it is worth a
 * try/catch at every call site, so it is all swallowed in here.
 */

const FX_KEY = 'linguapaws_fx';

export const isFxOn = () => {
    try { return localStorage.getItem(FX_KEY) !== 'off'; } catch { return true; }
};

export const setFxOn = (on) => {
    try { localStorage.setItem(FX_KEY, on ? 'on' : 'off'); } catch { /* private mode */ }
};

let ctx = null;
/** Created on the first play, which is always inside a click — the only moment
 *  a browser will let an audio context start. */
const audio = () => {
    try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        if (!ctx) ctx = new Ctor();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    } catch { return null; }
};

/** One note. Short attack, exponential tail — a bell, not a beep. */
const note = (freq, at, dur, gain = 0.13, type = 'sine') => {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime + at;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
};

const play = (fn) => { if (isFxOn()) { try { fn(); } catch { /* no audio */ } } };

export const buzz = (pattern) => {
    if (!isFxOn()) return;
    try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
};

/* C-major, so nothing can ever land sour however it stacks up. */
const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5;

/**
 * Right answer. The chime climbs a step for each answer in the streak, so a
 * learner on a run literally hears themselves getting further up the scale —
 * the cheapest escalation in the whole feature and the one testers notice.
 */
export const playCorrect = (combo = 1) => play(() => {
    const lift = Math.min(Math.max(combo - 1, 0), 5) * 0.0595; // semitones, capped
    const up = Math.pow(2, lift);
    note(C5 * up, 0, 0.18, 0.11);
    note(G5 * up, 0.075, 0.3, 0.1);
    if (combo >= 3) note(C6 * up, 0.15, 0.35, 0.07);
    buzz(12);
});

/** A miss. Falls rather than rises, quiet, and over quickly. Not a buzzer:
 *  a buzzer is a punishment sound and this is not a punishment. */
export const playMiss = () => play(() => {
    note(392, 0, 0.16, 0.07, 'triangle');
    note(329.63, 0.09, 0.22, 0.06, 'triangle');
    buzz(16);
});

/** Typing out an answer that was revealed. Small, warm, resolved. */
export const playLockIn = () => play(() => {
    note(E5, 0, 0.2, 0.08);
    note(C6, 0.08, 0.3, 0.06);
    buzz(10);
});

/** A streak milestone. */
export const playMilestone = () => play(() => {
    [C5, E5, G5, C6].forEach((f, i) => note(f, i * 0.06, 0.4, 0.1));
    buzz([8, 40, 16]);
});

/** The end of the lesson. */
export const playComplete = () => play(() => {
    [C5, E5, G5, C6, E6].forEach((f, i) => note(f, i * 0.085, 0.55, 0.1));
    note(G5, 0.42, 0.9, 0.06);
    buzz([10, 50, 20, 40, 30]);
});
