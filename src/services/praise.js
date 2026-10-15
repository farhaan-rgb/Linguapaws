/**
 * What the app says when a learner gets it right — and when they don't.
 *
 * Split out of Steps.jsx for two reasons. Copy is the part of this feature most
 * likely to be rewritten, and it is the part worth checking mechanically:
 * `tools/reward-check.mjs` walks every screen of the course through these functions
 * and fails if a learner would ever see the same line twice in a row, or be
 * told something the screen contradicts.
 *
 * Nothing here is random. Every pick is a function of how many answers the
 * learner has cleared, so the sequence varies for the learner, repeats for a
 * screenshot, and can be asserted in a test.
 *
 * None of the praise is read aloud. Miko's read-aloud speaks the word and the
 * tips; a spoken verdict on every screen would be exactly the noise this file
 * is trying to turn down.
 */

/** Rotate through a list rather than sampling it — no repeats, ever. */
const pick = (list, seed) => list[Math.abs(Math.trunc(seed)) % list.length];

/* ── Verdicts ──────────────────────────────────────────────────────────────
   Scaled to what the screen asked of the learner, because praise that is the
   same size everywhere stops meaning anything. A Kannada playtester stopped
   reading these by lesson 15: "Three in a row — you are ahead of the lesson"
   for repeating a word Miko had said four seconds earlier.

     teach     — repeat a word just shown. A plain nod, nothing more.
     recall    — a memory check, a phrase built, a reply, right first time.
                 The warm lines live here, and only here.
     fixed     — right after a miss. Names the fix, which is the real event.
     contrast  — a mixed-up pair put right. Its own fact, said plainly.
     helped    — right, after tapping an English word for part of the answer.

   Every line has to be true of every screen it can land on. Lists are
   disjoint, so two screens of different weight never read the same.       */

/** How much the screen asked of the learner. Everything below keys off this. */
export function effortFor(step, misses = 0, helped = false) {
    if (step?.kind === 'teach') return 'teach';
    if (misses > 0) return 'fixed';
    if (helped) return 'helped';
    if (step?.kind === 'review' && step.item?.contrast) return 'contrast';
    return 'recall';
}

/** Only these count towards a streak, a milestone, or a streak bonus. */
export const countsForStreak = (step) => effortFor(step) !== 'teach';

export const TEACH_ACK = [
    'Got it.',
    "That's the one.",
    'Right.',
    "That's it.",
];

export const CLEAN_PRAISE = [
    'Spot on.',
    'Right first time.',
    'Nailed it.',
    'Exactly right.',
];

export const RECOVERED_PRAISE = [
    'You fixed it.',
    'Got there.',
    'Fixed.',
    'You worked it out.',
];

/* Right, after tapping an English word for part of the answer. True, and no
   more than true: the learner got there, with a look. */
export const HELPED_PRAISE = [
    'Right — with a little help.',
    'There it is — with a look first.',
];

export const CONTRAST_PRAISE = [
    'Those two are sorted now.',
    'Right one, not the lookalike.',
];

/** The verdict headline. `cleared` is how many answers the learner has cleared
 *  in this lesson, which is what keeps the line moving. */
export function verdictFor({ step = null, misses = 0, cleared = 0, helped = false } = {}) {
    switch (effortFor(step, misses, helped)) {
        case 'helped':   return pick(HELPED_PRAISE, cleared);
        case 'teach':    return pick(TEACH_ACK, cleared);
        case 'fixed':    return pick(RECOVERED_PRAISE, cleared);
        case 'contrast': return pick(CONTRAST_PRAISE, cleared);
        default:         return pick(CLEAN_PRAISE, cleared);
    }
}

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

/** The collapsed row on a reveal that explains one of the learner's own wrong
 *  answers: they know what they typed, so the question is theirs, not ours. */
export const whyNotLabel = (said) => `Why not *${said}*?`;

/** Caption on a screen re-asked at the end of its round, after its answer
 *  had to be shown. */
export const RETRY_TAG = 'One more go';

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
    listening: 'Listening…',
    working:   'Working out what you said…',
    again:     'Say it again',
    /** A spoken answer the engine did not accept. It costs a try like a typed
     *  miss — it used to cost nothing, and a speaking learner could then never
     *  reach the reveal — so it is shown back, to make a mishearing visible. */
    heard:     (said) => `Heard: “${said}”. Not a match yet — say it again, or type it.`,
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
 *  an instruction for a control that is not there. The box is named, not
 *  pointed at — it sits above this line on the answer screen and above it again
 *  in the revealed panel, so "your answer below" was pointing the wrong way. */
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
                ? `${what} The answer in the box still stands — tap ${action}, or say it again.`
                : `${what} Say it once more, or type it.`;
        }
        case 'empty':
        case 'failed':
        default: {
            const what = ATTEMPT_TROUBLE[kind] || ATTEMPT_TROUBLE.failed;
            if (hasAnswer) return `${what} The answer in the box still stands — tap ${action}, or say it again.`;
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

export function achievementFor({ step, lang = '', misses = 0, helped = false } = {}) {
    if (!step) return '';
    const language = lang || 'the language';

    /* Repeating a word that is still on the screen is not an achievement, and
       saying it is one cheapens every line that is. */
    if (step.kind === 'teach') return '';

    if (step.kind === 'review') {
        const c = step.item?.contrast;
        if (c) return misses > 0 || helped
            ? 'You caught the mix-up and put it right.'
            : 'Both in the right place, first try.';
        if (misses > 0) return 'It came back on the second look.';
        if (helped) return 'You looked, then wrote it yourself.';
        return step.item?.source === 'due'
            ? 'Still there, from an earlier lesson.'
            : 'Back out from memory.';
    }

    const n = wordCount(step.expected);
    if (helped) return `You built it in ${language}, with a word looked up.`;
    if (step.phase === 'conversation') return `A real reply, in ${language}.`;
    if (n >= 3) return `A whole sentence — ${n} words of ${language}.`;
    if (n >= 2) return 'You built that out of words you already had.';
    /* A handful of drills across the course want a single word back — a number,
       an apology, a plural. */
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
   Counts recall screens only — a teach screen neither adds to it nor breaks
   it — so "three in a row" means three answers the learner had to find.
   Every blurb is a count of what happened, not a forecast about the learner. */

export const MILESTONES = {
    3:  { icon: '🔥', title: 'Three in a row',  blurb: 'Three checks, right first time.' },
    5:  { icon: '⚡', title: 'Five straight',   blurb: 'Nothing has caught you out yet.' },
    8:  { icon: '🌟', title: 'Eight in a row',  blurb: 'Eight checks without a miss.' },
    12: { icon: '👑', title: 'Twelve unbroken', blurb: 'Twelve checks and not one slip.' },
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

/* A screen helped by an English tap scores as a second try would: the
   learner produced it, but not unaided. No streak bonus either way. */
export function pointsFor({ correct, misses = 0, combo = 0, helped = false } = {}) {
    if (!correct) return { base: 0, bonus: 0, total: 0 };
    if (helped && misses === 0) return { base: RECOVERED_POINTS, bonus: 0, total: RECOVERED_POINTS };
    const base = misses > 0 ? RECOVERED_POINTS : CLEAN_POINTS;
    const bonus = combo >= STREAK_BONUS_FROM ? STREAK_BONUS : 0;
    return { base, bonus, total: base + bonus };
}

/* ── The end of the lesson ─────────────────────────────────────────────────
   Graded on first-try answers, not on completion — everyone completes.      */

export function summaryFor({ unaided = 0, total = 1, bestCombo = 0, practice = false } = {}) {
    const share = total ? unaided / total : 0;
    /* Practice is old material, so the lines talk about what held, not a lesson. */
    if (practice) {
        if (unaided >= total) return { badge: 'All of it held', icon: '👑',
                                       line: 'Every one first time, from lessons you had left behind.' };
        if (share >= 0.5) return { badge: 'Holding up', icon: '🌱',
                                   line: `${unaided} of ${total} came straight back. The rest is what practice is for.` };
        return { badge: 'Round done', icon: '🐾',
                 line: 'Some of these fought back. Seeing them again is how they stick.' };
    }
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

/** The numbers on the results card, each carrying its own label so none of
 *  them can be read as something else. The ring is first-try answers, not
 *  progress — everyone finishes — and paws say where they came from, because
 *  "16 paws" on its own is a number with no fact behind it. A streak under 2
 *  is not a streak, so it is not shown. `low` lets the card lead with the
 *  finish and the sentences instead of a big zero. */
export function resultsFor({ unaided = 0, total = 0, recovered = 0, locks = 0, bonus = 0, best = 0, practice = false } = {}) {
    const share = total ? unaided / total : 0;
    const paws = [
        unaided > 0 && `${unaided} first time`,
        recovered > 0 && `${recovered} fixed after a slip`,
        locks > 0 && `${locks} ${locks === 1 ? 'word' : 'words'} locked in`,
        bonus > 0 && `+${bonus} streak bonus`,
    ].filter(Boolean);
    return {
        complete: practice ? `${unaided} of ${total} right first time` : `Lesson complete · ${total} screens`,
        low: share < 0.5,
        ringLabel: 'right first time',
        firstLine: unaided > 0 ? `${unaided} of ${total} right first time` : null,
        pawsLabel: 'paws earned',
        pawsFrom: paws,
        streak: best >= 2 ? `${best} in a row — your best run` : null,
    };
}

/* ── The lesson map ────────────────────────────────────────────────────────
   Facts about where the learner stands, not cheers. A new learner is told what
   the first stop is; someone mid-way is told how much of the language is
   already theirs. */

export function mapHeadline({ lang = '', done = 0, total = 0 } = {}) {
    if (done <= 0) return { kicker: 'Your path starts here', title: lang,
                            line: `${total} lessons. The first one starts with hello.` };
    if (done >= total) return { kicker: 'Path complete', title: lang,
                                line: `All ${total} lessons done. Every one is open to replay.` };
    return { kicker: 'Your path', title: lang,
             line: `${done} of ${total} lessons behind you. Lesson ${done + 1} is next.` };
}

/** The sign between two units of the path. */
export function mapUnitLabel({ unit = 1, from = 1, to = 1 } = {}) {
    return { title: `Unit ${unit}`, line: from === to ? `Lesson ${from}` : `Lessons ${from}–${to}` };
}

/** The small tag over a review lesson's name, and over the last lesson's. */
export function mapCheckpointTag({ last = false } = {}) {
    return last ? 'Final lesson' : 'Checkpoint';
}

/** Under the end of the path. */
export function mapFinishLine({ lang = '', done = 0, total = 0 } = {}) {
    if (done >= total) return `Finish line. All ${total} lessons of ${lang} are yours.`;
    const left = total - done;
    return `Finish line: ${left} lesson${left === 1 ? '' : 's'} to go.`;
}

/** The marker on the current lesson. */
export const MAP_HERE = 'You are here';

/** The caption under the current lesson's node. */
export function mapHereLine({ stepIdx = 0, stepTotal = 0 } = {}) {
    if (stepIdx > 0 && stepTotal > 0) return `${stepIdx} of ${stepTotal} screens done`;
    return 'Start here';
}

/** Tap-a-word: the popover's quiet labels and the header switch. */
export const TAP = {
    toggleOn: 'Tap words for meaning: on',
    toggleOff: 'Tap words for meaning: off',
    fromLesson: (n) => `from lesson ${n}`,
    notYet: 'not taught yet',
    hear: (word) => `Hear ${word}`,
    /* An English word whose translation is in the answer of a screen still
       being asked. Said before anything is shown, because showing it is help. */
    gate: 'This gives you part of the answer.',
    show: 'Show',
    /** Said on the popover once the gate is down, so the help is never silent. */
    helped: 'Counts as help on this question',
    inLang: 'the word for it',
};
