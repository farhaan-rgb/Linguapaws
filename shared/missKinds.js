/* What kind of mistake a miss was.
 *
 * Why this file exists
 * --------------------
 * A miss used to be a boolean. `recordReview({ outcome })` said how much help
 * the learner needed — unaided, hinted, revealed, missed — and nothing at all
 * about *what went wrong*. So this answer:
 *
 *     wanted:  naanu eega tinnuttiddene, aamele hoguttene
 *     written: naanu eega tinnuttiddene, hoguttene aamele
 *
 * — every word right, the last two swapped — reached the scheduler as the same
 * fact as not knowing *hoguttene* at all. The word dropped to box 0 and came
 * back as a vocabulary question, which is a drill for something the learner
 * demonstrably knows; and the thing they actually lack, where the verb goes,
 * was not written down anywhere a later lesson could read it.
 *
 * The engine already tells those apart. `orderMiss` and `misplacedWord` find a
 * swap, `endingMiss` finds a dropped -ge, DISTINCT_WORDS finds *beku* said for
 * *beda*, `isSpellingSlip` and `droppedSyllable` find a typo, and `missHelp`
 * picks one of them to write a sentence about. All of that was computed to
 * produce one line of English and then thrown away. This taxonomy names what
 * the engine already knows, so the knowledge survives the screen.
 *
 * Shared, ESM, and dependency-free on purpose: the frontend imports it, the
 * backend `require()`s it (Node 22 can require an ESM file), and the engine can
 * import it without a cycle. One definition — the precedent is
 * `shared/languages.js`, which exists because three copies of a mapping
 * disagreed.
 *
 * Nothing here grades anything. A kind is attached after
 * `lessonEngine.scoreAnswer` has already rejected an answer; no value in this
 * file can turn a rejection into an acceptance or the other way round.
 */

/**
 * The kinds, in the order a reader should meet them: the grammatical ones
 * first (what a drill can be aimed at), then the lexical ones, then the two
 * that mean "we could not say".
 *
 * Stored verbatim in Mongo and sent over the wire, so these strings are an
 * interface. Add a kind rather than renaming one; an old row carrying a
 * retired name must still parse.
 */
export const MISS_KINDS = [
    'order',
    'ending',
    'confusion',
    'wrong-word',
    'missing-word',
    'extra-word',
    'english',
    'spelling',
    'reasoned',
    'blank',
    'unknown',
];

const KIND_SET = new Set(MISS_KINDS);

/**
 * For each kind: the short name a learner could be shown, a sentence saying
 * what it is, and `signal` — the detection in `lessonEngine.js` that already
 * finds it. `signal` is the load-bearing column: a kind nothing in the engine
 * can detect is a kind that will never be recorded, and this table is where
 * that becomes obvious.
 */
export const MISS_KIND_INFO = {
    order: {
        label: 'Word order',
        what: 'Every word of the answer was there, in the wrong sequence.',
        signal: 'orderMiss / misplacedWord',
    },
    ending: {
        label: 'Word ending',
        what: 'The right word with the wrong ending on it — a missing -ge, a -galu where -aru belongs, "I" where "you" was asked for.',
        signal: 'endingMiss, carriesEnding, differsOnlyByPersonEnding',
    },
    confusion: {
        label: 'Mixed-up words',
        what: 'One taught word said in place of another the course teaches against it, so the pair is known: beku for beda, nimma for avara.',
        signal: 'DISTINCT_WORDS, families, authored traps — missHelp `pairs`',
    },
    'wrong-word': {
        label: 'Wrong word',
        what: 'A word that is not the one the answer wants, and no partner can be named for it with confidence.',
        signal: 'missHelp `subs` with no pair, near-forms of a taught word',
    },
    'missing-word': {
        label: 'Missing word',
        what: 'A word of the answer is simply not there, and nothing in the attempt stood in for it.',
        signal: 'missHelp `missing` with no wrong word to blame',
    },
    'extra-word': {
        label: 'One word too many',
        what: 'The whole answer, plus a word this sentence leaves out — naanu where the verb already carries "I".',
        signal: "missHelp kind 'extra'",
    },
    english: {
        label: 'Left in English',
        what: 'A word of the answer was written in English.',
        signal: 'missHelp `english`',
    },
    spelling: {
        label: 'Spelling',
        what: 'The right words, one of them misspelt past what the grader will take.',
        signal: 'isSpellingSlip, droppedSyllable, levenshtein — spellingNote',
    },
    reasoned: {
        label: 'Reasoned from the parts',
        what: 'Two taught words put together where the language has one word for it. Good thinking, wrong form.',
        signal: "missHelp kind 'reasoned' (builtFromParts)",
    },
    blank: {
        label: 'No attempt',
        what: 'Nothing was offered — "I don\'t know", or a skip.',
        signal: 'no tokens in the attempt; the caller knows there was none',
    },
    unknown: {
        label: 'Not diagnosed',
        what: 'The engine looked and could not say what went wrong. The floor, never a verdict about the learner.',
        signal: "missHelp kind 'other' with nothing else matching",
    },
};

/** Every kind except the floor: the ones that say something about the learner. */
export const DIAGNOSTIC_MISS_KINDS = MISS_KINDS.filter((k) => k !== 'unknown');

export const isMissKind = (k) => typeof k === 'string' && KIND_SET.has(k);

/** A kind, or null — for anything arriving from a client, a tool or an old row. */
export const normaliseMissKind = (k) => (isMissKind(k) ? k : null);

export const missKindLabel = (k) => MISS_KIND_INFO[k]?.label || String(k || '');

/**
 * One kind for a whole screen, from the kinds of its attempts in order.
 *
 * The SRS hears the first attempt only — that rule is already in Steps.jsx for
 * the outcome, and it holds harder here. By the second attempt the learner has
 * been told what was wrong with the first, so a second-attempt ending slip may
 * be a slip while reading the sentence that named it. The first attempt is the
 * uncontaminated one.
 *
 * Two exceptions, both of them cases where the first attempt said nothing:
 * `unknown` is skipped entirely, and `blank` is skipped if any later attempt
 * was diagnosed — a learner who said "I don't know" and then tried and got the
 * ending wrong has an ending problem, not a blank.
 *
 * @param {Array<string|null|undefined>} kinds one per attempt, in order
 * @returns {string|null} a kind, or null when there is nothing to record
 */
export function dominantMissKind(kinds) {
    const list = (Array.isArray(kinds) ? kinds : [kinds]).map(normaliseMissKind).filter(Boolean);
    if (!list.length) return null;
    const diagnosed = list.filter((k) => k !== 'unknown');
    if (!diagnosed.length) return 'unknown';
    return diagnosed.find((k) => k !== 'blank') || 'blank';
}

/**
 * The kind to send with one review post, from whatever the caller has — a
 * kind, a list of per-attempt kinds, or neither — and the outcome.
 *
 * `unaided` means the learner answered first time with no help, so there was
 * no miss to have a kind; a kind arriving with one is a caller bug and is
 * dropped here rather than written. The server applies the same rule again,
 * because the server does not trust the client about anything.
 *
 * @returns {string|null} null when there is nothing to send
 */
export function reviewMissKind({ outcome, missKind, missKinds } = {}) {
    if (outcome === 'unaided') return null;
    const kind = missKinds !== undefined ? dominantMissKind(missKinds) : normaliseMissKind(missKind);
    return kind || null;
}
