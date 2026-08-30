/**
 * What the app says when a learner gets it right — and when they don't.
 *
 * Split out of Steps.jsx for two reasons. Copy is the part of this feature most
 * likely to be rewritten, and it is the part worth checking mechanically:
 * `tools/praise-check.mjs` runs long simulated lessons through these functions
 * and fails if a learner would ever see the same line twice in a row, or be
 * told something the screen contradicts.
 *
 * Nothing here is random. Every pick is a function of how many answers the
 * learner has cleared, so the sequence varies for the learner, repeats for a
 * screenshot, and can be asserted in a test.
 */

/** Rotate through a list rather than sampling it — no repeats, ever. */
const pick = (list, seed) => list[Math.abs(Math.trunc(seed)) % list.length];

/* ── Verdicts ──────────────────────────────────────────────────────────────
   Two registers. A first-try answer gets a flat statement of fact; an answer
   that took a second go gets credit for the second go, because that is the one
   that actually teaches. Neither gushes: a tutor that shouts "AMAZING!!" at a
   learner for typing two words they were shown ninety seconds ago is not
   praising them, it is talking to itself.                                    */

export const CLEAN_PRAISE = [
    'Nailed it.',
    'Exactly right.',
    "That's it.",
    'Spot on.',
    'Perfect.',
    'Clean.',
    'Straight through.',
];

export const RECOVERED_PRAISE = [
    'Got there.',
    "That's the one.",
    'You worked it out.',
    'There it is.',
    'Second go, and it counts double for memory.',
];

/** The verdict headline. `cleared` is how many answers the learner has cleared
 *  in this lesson, which is what keeps the line moving. */
export const verdictFor = ({ misses = 0, cleared = 0 } = {}) =>
    (misses > 0 ? pick(RECOVERED_PRAISE, cleared) : pick(CLEAN_PRAISE, cleared));

/* ── Encouragement ─────────────────────────────────────────────────────────
   A miss is the most fragile moment in the lesson — it is where people quit.
   So: no red, no "wrong", no exclamation mark, and never a line that implies
   the learner should have known. The specific diagnosis comes from
   lessonEngine.explainMiss and sits underneath these.                        */

export const MISS_LINES = [
    'Not quite — one more go.',
    'Close. Have another look.',
    'Almost. Try it once more.',
    'Not this one — you have another try.',
];

export const REVEAL_LINES = [
    "Here it is. This one's worth a second look.",
    'No shame in this one — here it is.',
    "Let's just look at it together.",
    'Have this one on me.',
];

export const missLineFor = (seed = 0) => pick(MISS_LINES, seed);
export const revealLineFor = (seed = 0) => pick(REVEAL_LINES, seed);

/** Said on the first clean answer after a screen that went wrong. The single
 *  most motivating thing a learner can be told is that they recovered. */
export const RECOVERY_LINE = 'Back on it.';

/* ── Answering out loud ────────────────────────────────────────────────────
   Speaking is the mode the rest of the app is built around, and the one thing
   it must never do is strand somebody. Every line here ends with a way
   forward, and every state below still has a text box under it — so a learner
   whose microphone is broken, denied, or simply not there is never on a screen
   they cannot leave.                                                        */

export const VOICE = {
    idle:      'Tap and say it',
    opening:   'Opening the mic…',
    listening: 'Listening — tap when you are done',
    working:   'Working out what you said…',
    again:     'Say it again',
    /** Shown under the box the transcript landed in. The learner checks it,
     *  we do not — a mis-hearing must not be able to spend one of their tries. */
    heard:     'That is what I heard. Fix it if I got it wrong, then check.',
    typeInstead: 'or type it',
};

/** The four ways the microphone is simply not going to work on this device.
 *  They are facts about the setup, not about one recording, so they stand until
 *  something changes — and the answer really is "type it". Everything else is
 *  one lost attempt and is worth another go. */
export const MIC_BLOCKED_KINDS = ['unsupported', 'none', 'denied', 'offline'];

/** The fifth one, which is not about this device at all: no speech-recognition
 *  vendor the app is wired to covers this language. Odiya is the case — thirty
 *  lessons, and neither Deepgram nor any OpenAI transcription model accepts the
 *  language at any code spelling (probed 2026-08-30; see shared/asr.js). Kept
 *  apart from the four above because those are worth re-testing when the learner
 *  changes something and this one is not: nothing they can do will fix it. */
export const NO_ASR_KIND = 'nolang';

/** What a discarded recording was. Kept separate from the way out, because the
 *  way out depends on whether the learner already has an answer standing. */
const ATTEMPT_TROUBLE = {
    empty:  'Nothing came through that time.',
    failed: 'Could not make that out.',
};

/** Something went wrong with the microphone or the transcriber. `lang` is the
 *  language being learned, used only where naming it helps.
 *
 *  `hasAnswer` is the one that earns its keep. A rejected transcript does not
 *  empty the box, so telling somebody who is already holding a right answer to
 *  "say it once more, or type it" talks them out of an answer that would have
 *  passed — it reads as *the box is empty and this is your problem to solve*.
 *  When there is text standing, the message says the recording was dropped and
 *  points at the button that would settle the screen. `action` is that button's
 *  own label, because "tap Check" on a screen whose button says Lock it in is
 *  an instruction for a control that is not there. */
export function voiceTrouble(kind, lang = '', { hasAnswer = false, action = 'Check' } = {}) {
    const language = lang || 'the language';
    switch (kind) {
        case 'unsupported':
            return "This browser will not give the app a microphone. Type your answer for now.";
        case 'none':
            return 'No microphone found. Plug one in, or type your answer.';
        case 'denied':
            return "The mic is blocked. Allow it in the address bar, or type your answer.";
        case 'offline':
            return 'Speaking needs a connection, and there is none right now. Type it instead.';
        case NO_ASR_KIND:
            /* Never "try again". A learner told to speak more clearly at a
               language nothing can transcribe will keep trying until they quit,
               and conclude their accent is the problem. Name the limit, say it
               is ours, point at the thing that works. */
            return `Speech recognition does not support ${language} yet — that is us, not you. Type your answer and carry on.`;
        case 'wronglang':
            /* The recogniser answered in a different language from the one the
               lesson is in. It has happened two distinct ways in this stack
               already, so it gets its own sentence: the learner should try
               again, but they should not be left thinking their pronunciation
               was the problem. */
            return `The recogniser answered in the wrong language there, not ${language}. Say it once more, or type it.`;
        case 'script': {
            /* This used to fire on every Indic transcript, which is to say on
               every correct spoken answer a learner ever gave: the recognisers
               all return their own script and the course is romanised. Those are
               transliterated now (shared/transliterate.js) and never reach here.
               What is left is a script the table cannot romanise — Urdu's
               Arabic, which does not write the short vowels a romanisation would
               have to guess. */
            const what = `That one came back in ${language} script, which could not be spelled out.`;
            return hasAnswer
                ? `${what} Your answer below still stands — tap ${action}, or say it again.`
                : `${what} Say it once more, or type it.`;
        }
        case 'empty':
        case 'failed':
        default: {
            const what = ATTEMPT_TROUBLE[kind] || ATTEMPT_TROUBLE.failed;
            if (hasAnswer) return `${what} Your answer below still stands — tap ${action}, or say it again.`;
            return kind === 'empty'
                ? `${what} Hold the phone closer and try again — or type it.`
                : `${what} Try once more, or type it.`;
        }
    }
}

/** The invitation on the revealed screen. The point is the same in both modes:
 *  the screen ends on something the learner did, not on the miss. */
export const LOCK_IN_PROMPT = {
    type:  "Write it out once — that is how it stops being someone else's word.",
    speak: "Say it once with it in front of you — that is how it stops being someone else's word.",
};

/* ── What they actually just did ───────────────────────────────────────────
   The clause under the verdict. This is the part that makes the moment mean
   something: "Perfect." is a sticker, "A full sentence — four words, in
   Telugu" is a fact about the learner that was not true five minutes ago. */

const wordCount = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;

export function achievementFor({ step, lang = '', combo = 0 } = {}) {
    if (!step) return '';
    const language = lang || 'the language';

    if (step.kind === 'teach') {
        const n = (step.slice || []).length;
        return n > 1 ? `${n} new words banked.` : "Banked — that one's yours now.";
    }

    if (step.kind === 'review') {
        return step.item?.source === 'due'
            ? 'Still there, from an earlier lesson.'
            : 'Straight back out again — that is memory forming.';
    }

    const n = wordCount(step.expected);
    if (step.phase === 'conversation') {
        return combo >= 3
            ? `A real reply in ${language}, and you did not stop to think.`
            : `A real reply, in ${language}.`;
    }
    if (n >= 3) return `A whole sentence — ${n} words of ${language}.`;
    if (n >= 2) return 'You built that out of words you already had.';
    /* A handful of drills across the course want a single word back — a number,
       an apology, a plural. `reward-check` found five of them landing on an
       empty clause, which is a screen that celebrates nothing. */
    return 'Exactly the word this one needed.';
}

/* ── The scaffold ──────────────────────────────────────────────────────────
   `lessonEngine.explainMiss` answers most misses precisely, but it returns
   null when the answer is too far from the target to diagnose — which is
   exactly the learner who most needs something to hold on to. A drill has the
   curriculum's own hint for that; a teach or review screen has nothing, and
   used to print "Not quite" and stop.

   So: the shape of the answer, and no more of it. Enough to start writing,
   not enough to copy.                                                      */

export function scaffoldFor(expected) {
    const words = String(expected || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    const first = words[0].replace(/[^\p{L}\p{N}]/gu, '');
    if (!first) return '';
    if (words.length === 1) {
        return `It starts with **${first[0].toUpperCase()}** and runs to ${first.length} letters.`;
    }
    return `${words.length} words, and the first starts with **${first[0].toUpperCase()}**.`;
}

/* ── Streak ────────────────────────────────────────────────────────────────
   Milestones are deliberately sparse. A banner on every second answer is
   wallpaper; four in a lesson still land.                                   */

export const MILESTONES = {
    3:  { icon: '🔥', title: 'Three in a row',   blurb: 'You are ahead of the lesson.' },
    5:  { icon: '⚡', title: 'Five straight',    blurb: 'Nothing has caught you out yet.' },
    8:  { icon: '🌟', title: 'Eight in a row',   blurb: 'This is fluency-shaped.' },
    12: { icon: '👑', title: 'Twelve unbroken',  blurb: 'Almost the whole lesson, clean.' },
};

export const milestoneFor = (combo) => MILESTONES[combo] || null;

/* ── Points ────────────────────────────────────────────────────────────────
   Called paws, and honest about what they measure. A revealed answer scores
   nothing on its own — but typing it once afterwards is a real action and is
   worth something, which is what turns the worst screen in the lesson into one
   the learner still finishes.                                               */

export const CLEAN_POINTS = 10;
export const RECOVERED_POINTS = 6;
export const LOCK_IN_POINTS = 2;
export const STREAK_BONUS = 5;
/** A streak pays a bonus from here on. */
export const STREAK_BONUS_FROM = 3;

export function pointsFor({ correct, misses = 0, combo = 0 } = {}) {
    if (!correct) return { base: 0, bonus: 0, total: 0 };
    const base = misses > 0 ? RECOVERED_POINTS : CLEAN_POINTS;
    const bonus = combo >= STREAK_BONUS_FROM ? STREAK_BONUS : 0;
    return { base, bonus, total: base + bonus };
}

/* ── The end of the lesson ─────────────────────────────────────────────────
   Graded on first-try answers, not on completion — everyone completes.      */

export function summaryFor({ unaided = 0, total = 1, bestCombo = 0 } = {}) {
    const share = total ? unaided / total : 0;
    if (unaided >= total) {
        return { badge: 'Perfect lesson', icon: '👑',
                 line: 'Every single screen, first try. That does not happen by accident.' };
    }
    if (share >= 0.8) {
        return { badge: 'Sharp', icon: '⚡',
                 line: `${unaided} of ${total} first time. You know this lesson.` };
    }
    if (share >= 0.5) {
        return { badge: 'Solid', icon: '🌱',
                 line: bestCombo >= 3
                     ? `${bestCombo} in a row at your best. The rest is repetition.`
                     : 'More than half of it, first try. That is the lesson working.' };
    }
    return { badge: 'You finished it', icon: '🐾',
             line: 'This one fought back and you stayed. That is the part that counts.' };
}
