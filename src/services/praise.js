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

/* First try, accepted, but with a slip the screen is about to show. "Exactly
   right." above a struck-through word contradicts itself. */
export const SLIP_PRAISE = [
    'Got it. Mind the spelling below.',
    'Right words. One spelling to check.',
    'Understood. Check the spelling below.',
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
export function verdictFor({ step = null, misses = 0, cleared = 0, helped = false, slips = false } = {}) {
    switch (effortFor(step, misses, helped)) {
        case 'helped':   return pick(HELPED_PRAISE, cleared);
        case 'teach':    return pick(TEACH_ACK, cleared);
        case 'fixed':    return pick(RECOVERED_PRAISE, cleared);
        case 'contrast': return pick(CONTRAST_PRAISE, cleared);
        default:         return pick(slips ? SLIP_PRAISE : CLEAN_PRAISE, cleared);
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

/* ── When Ask Miko cannot answer ───────────────────────────────────────────
   One line per reason, because the reasons ask different things of the
   learner. The box said "Miko could not answer just now. Try again in a
   moment." for every failure there is, and on the day the backend process was
   not running that told Farhaan to retry something that could never succeed —
   a network that cannot be reached, a model that returned a 502 and a token
   that has expired were one string.

   Keyed by `ApiError.kind` (services/api.js), which is where the distinction
   had to be made: before this the caller genuinely could not tell them apart.
   Same rule as voiceTrouble above — say what happened, and end on the thing
   that would fix it. Nothing here says "try again" unless trying again could
   work.                                                                     */
export const ASK_TROUBLE = {
    offline: 'Cannot reach the server, so Miko never got the question. Check your connection.',
    timeout: 'Miko took too long to answer that one. Ask again in a moment.',
    auth:    'Your session has run out. Sign in again and Miko can answer.',
    rate:    'That is a lot of questions at once. Give it a minute.',
    server:  'Miko could not answer just now. Try again in a moment.',
};

/** The line for a failed Ask Miko question. Anything unrecognised is treated
 *  as the model having failed, which is the one the old code always showed. */
export const askTrouble = (kind) => ASK_TROUBLE[kind] || ASK_TROUBLE.server;

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
        /* A phrase from an earlier lesson (phraseReview.js): what came back is
           a whole line, not a word, and which lesson it was is the news. */
        if (step.item?.phrase) {
            const li = step.item.phrase.lessonIdx;
            const from = Number.isInteger(li) ? `lesson ${li + 1}` : 'an earlier lesson';
            const n = wordCount(step.expected);
            return n >= 2
                ? `The whole line from ${from} — ${n} words of ${language}, still in one piece.`
                : `Still there, from ${from}.`;
        }
        return step.item?.source === 'due'
            ? 'Still there, from an earlier lesson.'
            : 'Back out from memory.';
    }

    /* A listen screen's answer is English: what they did was understand. */
    if (step.kind === 'listen') {
        if (misses > 0) return 'Caught it on another listen.';
        if (helped) return 'Understood, once you had seen it written.';
        return `Understood by ear — no ${language} on screen to lean on.`;
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

/* ── The Listen screen ── (Steps.jsx ListenScreen). "Again" only when the
   word has already played itself: with sound off nothing has been heard. */
export const LISTEN_COPY = {
    replay: (autoplayed) => (autoplayed ? 'Tap to hear it again' : 'Tap to hear it'),
    peek: "Can't hear it? Show the word",
    miss: 'Not that one — listen again.',
};

/* ── Endings, made visible ─────────────────────────────────────────────────
   The words around an ending endings.js has found. The gloss itself is the
   course's (endings.js NOTICE_ENDINGS); these only frame it. */
export const ENDING_COPY = {
    /** The chip beside a marked word, and its hover/tap title. */
    chip: (end, gloss) => `-${end} · ${gloss}`,
    title: (end, gloss) => `The ending -${end}: ${gloss}`,
    /** The pattern screen. */
    patternHead: (ending) => `-${ending} shows up in all of these`,
    patternSub: (gloss) => `Different words, same ending, same job: ${gloss}.`,
    patternFoot: (n) => `${n} lines you already know — the ending is what they share.`,
};

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

/* The floating control that appears once "You are here" has been scrolled off
   the screen. It carries the lesson back into view; it does not open it — so
   it says where it goes rather than "Continue", which would promise a lesson
   starting on the next tap. The second half is the node's own caption, so the
   pill and the card it lands on say the same thing. */
export function mapJumpHere({ lesson = 1, stepIdx = 0, stepTotal = 0 } = {}) {
    const line = stepIdx > 0 && stepTotal > 0 ? `${stepIdx} of ${stepTotal} screens` : 'Start here';
    return {
        title: `Lesson ${lesson}`,
        line,
        aria: `Back to lesson ${lesson}, where you are on the path`,
    };
}

/** Tap-a-word: the popover's quiet labels and the header switch. */
/* An accepted answer that was not word-for-word the course's: what the learner
   wrote, with each slip beside its course spelling. */
export const ANSWER_DIFF = {
    wrote: 'You wrote',
    said: 'You said',
    left: (words) => `Left out: ${words.map(w => `*${w}*`).join(', ')}.`,
    order: (course) => `The course puts them in this order: *${course}*.`,
};

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
    /* An English word the language says with an ending, not a word ("at" in
       "at one o'clock" is the -ge of *gantege*). The rule is free; showing it
       on the answer's own word is help. The button does not name the word:
       it is part of the answer. Light markdown, rendered by RichText. */
    endingRule: (phrase, ending) => `*${phrase}* → add **-${ending}** to the end`,
    endingSame: (ending, word, meaning) => ` — the same -${ending} as *${word}* (${meaning}).`,
    endingShow: 'Show it on the word',
    endingApplied: (stem, form) => `*${stem}* → **${form}**`,
    /* "I", "you", "my": every form this lesson taught, each with when it is
       used. The "to me" form is what liking, wanting, knowing and having take
       — "I like it" is *nanage ishta*, never *naanu ishta*. */
    pronounWhen: {
        1: { subject: 'I (I am, I go)', dative: 'to me (like, want, know, have)', possessive: 'my (my name, my house)' },
        2: { subject: 'you (you are, you go)', dative: 'to you (like, want, know, have)', possessive: 'your (your name)' },
    },
    /** Marks the form the sentence around the tapped word uses. */
    here: 'here',
};

/* ── The learner's own skills (skillProgress.js) ───────────────────────────
   Direction, never a number, and never more than three. A mark says which way
   a skill moved because of what the learner just did; "still tricky" promises
   what happens next instead of judging. Shared by the results card, the map's
   focus card and the "My skills" page to come. */
export const SKILL_MARK = {
    up: { arrow: '↑', text: 'getting stronger' },
    new: { arrow: '✦', text: 'off to a good start' },
    tricky: { arrow: '↻', text: 'still tricky — it will come back soon' },
};

/** The block on the results card: what this session worked on. */
export function workedOnFor({ practice = false, items = [] } = {}) {
    const ups = items.filter(i => i.mark !== 'tricky').length;
    return {
        title: practice ? 'This round worked on…' : 'This lesson worked on…',
        line: ups
            ? 'Miko picks what comes next from how these went.'
            : 'Miko will bring this back in a different way.',
    };
}

/** The lesson map's card, by focusSkills' state. Null draws nothing. */
export function focusCardFor({ state = 'none', count = 0 } = {}) {
    if (state === 'focus') return {
        title: 'Miko’s focus for you',
        line: count === 1
            ? 'One thing that keeps slipping. A short round on just this helps it stick.'
            : 'A few things that keep slipping. A short round on just these helps them stick.',
        button: count === 1 ? 'Practise this' : 'Practise these',
    };
    if (state === 'clear') return {
        title: 'Miko’s focus for you',
        line: 'Nothing is slipping right now. Everything you have practised is holding up.',
    };
    if (state === 'thin') return {
        title: 'Miko is getting to know you',
        line: 'A few more answers, and Miko will point out what is worth another go.',
    };
    return null;
}

/* ── The "My skills" page ─────────────────────────────────────────────────
   Leads with what is holding up. The count of tricky skills is never the
   headline: a learner with twenty of them is told which three come next. */
export const SKILL_TREND = {
    up: { arrow: '↑', text: 'getting stronger' },
    steady: { arrow: '→', text: 'holding steady' },
    wobbly: { arrow: '↻', text: 'a bit wobbly lately' },
};

export const SKILLS_PAGE = {
    title: 'Your skills',
    groups: {
        strong: { title: 'Strong', line: 'These hold up whenever they come back.' },
        learning: { title: 'Getting there', line: 'Mostly right, and settling in.' },
        tricky: { title: 'To work on', line: 'The ones Miko is bringing back first.' },
        unknown: { title: 'Still getting to know', line: 'Too few answers yet for Miko to say. Nothing here is good or bad.' },
    },
    types: { word: 'Words', ending: 'Endings', construction: 'Patterns', order: 'Word order' },
    showOthers: (n) => `Show the other ${n}`,
    showFewer: 'Show fewer',
    taught: (n, title) => `Taught in lesson ${n}${title ? ` · ${title}` : ''}`,
    recent: 'Your last few answers',
    seeAll: 'See all your skills',
    loading: 'Looking at your answers…',
    practise: (n) => (n === 1 ? 'Practise the one to work on' : `Practise the ${n} to work on`),
    failed: { title: 'Miko could not load your skills just now', line: 'Your progress is safe. Try again in a moment.', button: 'Try again' },
    empty: { title: 'Miko is getting to know you', line: 'A few more answers and your skills start to show up here — what is holding up, and what is worth another go.' },
};

/** The one line under the title. Counts strong and getting-there; for the
 *  tricky ones it names how many come next, never how many there are. */
export function skillsSummaryFor({ strong = 0, learning = 0, next = 0 } = {}) {
    const parts = [];
    if (strong) parts.push(`${strong} strong`);
    if (learning) parts.push(`${learning} getting there`);
    const head = parts.length ? `${parts.join(', ')}.` : 'Everything you have reached is still settling in.';
    if (!next) return parts.length ? `${head} Nothing is slipping.` : head;
    return `${head} Miko picked ${next === 1 ? 'one thing' : `${next}`} to work on next.`;
}
