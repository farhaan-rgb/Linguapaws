/* Indic script → Latin, deterministically.
 *
 * Why this file exists
 * --------------------
 * The course is written in romanised Latin — `Namaskara`, not `ನಮಸ್ಕಾರ` — and
 * `lessonEngine.normalizeLatin` throws away every character outside `[a-z0-9]`.
 * Every speech recogniser we can reach returns Indic languages in their **own
 * script**. Measured against the live APIs on 2026-08-30:
 *
 *   Deepgram nova-3, language=kn, on Google's own kn-IN sample WAV
 *     → "ಮೇಘ ಯಂತ್ರ ಕಲಿಕೆಯೊಂದಿಗೆ ನಿಮ್ಮ ..."   (confidence 0.954)
 *   OpenAI gpt-transcribe, language=kn, same audio
 *     → "ಮೇಘ ಯಂತ್ರ ಕಲಿಕೆಯೊಂದಿಗೆ ನಿಮ್ಮ ..."
 *   OpenAI whisper-1, language=kn, same audio
 *     → "ಮೇಗಾಯಂದ್ರ ಕಳಿಕೆಯೋಂದಿಗೆ ..."
 *
 * Not one of them can be asked for Latin output. (`hi-Latn` exists on Deepgram
 * and is the only romanised Indic code any of them offers; there is no
 * `kn-Latn`, `te-Latn` or `or-Latn`.) So a correct spoken answer arrived at the
 * grader as characters the grader deletes, and step mode told the learner
 * "That came back written in Kannada script … say it once more."
 *
 * Before this file, the romanising was done by a `gpt-4o-mini` prompt in
 * `backend/routes/ai.js`. Run five times against the production prompt on
 * 2026-08-30, transcript `ನಮಸ್ತೆ`, target `Namaskara`, it returned:
 *
 *   "ನಮಸ್ಕಾರ"  "ನಮಸ್ಕಾರ"  "ನಮಸ್ಕಾರ"  "Namaste"  "Namaste"
 *
 * — three times the script the app rejects, twice a romanisation. That is the
 * reported bug in one line of output: same word, same prompt, a different
 * alphabet on different attempts. A grader cannot be built on that. This file
 * is a table, so it gives the same answer every time.
 *
 * How it works
 * ------------
 * The nine Brahmic blocks the product needs are laid out in Unicode in parallel:
 * Devanagari at U+0900, Bengali U+0980, Gurmukhi U+0A00, Gujarati U+0A80, Odia
 * U+0B00, Tamil U+0B80, Telugu U+0C00, Kannada U+0C80, Malayalam U+0D00 — one
 * block every 0x80, with the same letter at the same offset. So `ನ` (U+0CA8) and
 * `न` (U+0928) share offset 0x28, and one offset table romanises all nine.
 *
 * What it deliberately does NOT preserve
 * --------------------------------------
 * Retroflex/dental (ಟ/ತ both → `t`), the three sibilants (ಶ/ಷ → `sh`, ಸ → `s`),
 * and aspiration is written but not defended. That is not sloppiness — it is
 * the target. `vowelSkeleton` in the engine already collapses doubled letters
 * and drops the `h` after b/c/d/g/k/p/t, because the *course* romanisation does
 * not distinguish them either: it writes `Chennagiddeeni`, `santhosham`,
 * `moodu`. The output here has to survive that normalisation and land on the
 * spelling the curriculum uses, not on a scholarly ISO 15919 form. `ṇamaskāra`
 * would be more correct and would score worse.
 *
 * ESM, like `shared/languages.js` and for the same reason: Vite will not
 * transform a CommonJS source file in dev, and the CommonJS backend reaches it
 * through `require()`, which Node supports for a synchronous ESM graph.
 */

/** Unicode block base for every script a target language is written in. */
const BRAHMIC_BLOCKS = [
    { script: 'Devanagari', base: 0x0900 },
    { script: 'Bengali', base: 0x0980 },
    { script: 'Gurmukhi', base: 0x0A00 },
    { script: 'Gujarati', base: 0x0A80 },
    { script: 'Oriya', base: 0x0B00 },
    { script: 'Tamil', base: 0x0B80 },
    { script: 'Telugu', base: 0x0C00 },
    { script: 'Kannada', base: 0x0C80 },
    { script: 'Malayalam', base: 0x0D00 },
];

/** Which script each target language is actually written in. Urdu is the odd
 *  one out: it is Arabic script, which is an abjad — the short vowels are not
 *  written at all, so there is no table that can turn `نمستے` into `namaste`
 *  without guessing. Urdu is therefore `null` here on purpose, and the callers
 *  are expected to say "cannot romanise this" rather than invent vowels. */
export const SCRIPT_BY_LANGUAGE = {
    hi: 'Devanagari',
    mr: 'Devanagari',
    bn: 'Bengali',
    pa: 'Gurmukhi',
    gu: 'Gujarati',
    or: 'Oriya',
    ta: 'Tamil',
    te: 'Telugu',
    kn: 'Kannada',
    ml: 'Malayalam',
    ur: null,          // Arabic script — see above
    en: null,
};

/* ── The offset table ──────────────────────────────────────────────────────
   Offsets are from the block base, i.e. the Devanagari code point minus 0x0900.
   Consonants carry NO inherent vowel here; the walker below adds the `a`, and
   a virama or a matra takes it away again. */

/** Independent vowels: अ आ इ ई उ ऊ ऋ ऌ ऍ ऎ ए ऐ ऑ ऒ ओ औ */
const INDEPENDENT_VOWELS = {
    0x05: 'a', 0x06: 'aa', 0x07: 'i', 0x08: 'ee', 0x09: 'u', 0x0A: 'oo',
    0x0B: 'ri', 0x0C: 'li', 0x0D: 'e', 0x0E: 'e', 0x0F: 'e', 0x10: 'ai',
    0x11: 'o', 0x12: 'o', 0x13: 'o', 0x14: 'au',
    0x60: 'ri', 0x61: 'li',
};

/** Dependent vowel signs (matras). Each one cancels the inherent `a`. */
const MATRAS = {
    0x3E: 'aa', 0x3F: 'i', 0x40: 'ee', 0x41: 'u', 0x42: 'oo',
    0x43: 'ri', 0x44: 'ri', 0x45: 'e', 0x46: 'e', 0x47: 'e', 0x48: 'ai',
    0x49: 'o', 0x4A: 'o', 0x4B: 'o', 0x4C: 'au',
    0x62: 'li', 0x63: 'li',
    /* Kannada and Telugu write the long ē/ō as short + a length mark, and
       Kannada's ai as e + U+0CD6. The length mark adds nothing a romanisation
       needs (the engine collapses vowel length anyway); the ai mark adds an i. */
    0x55: '', 0x56: 'i',
};

/** Consonants, without the inherent vowel. */
const CONSONANTS = {
    0x15: 'k', 0x16: 'kh', 0x17: 'g', 0x18: 'gh', 0x19: 'ng',
    0x1A: 'ch', 0x1B: 'chh', 0x1C: 'j', 0x1D: 'jh', 0x1E: 'ny',
    0x1F: 't', 0x20: 'th', 0x21: 'd', 0x22: 'dh', 0x23: 'n',
    0x24: 't', 0x25: 'th', 0x26: 'd', 0x27: 'dh', 0x28: 'n', 0x29: 'n',
    0x2A: 'p', 0x2B: 'ph', 0x2C: 'b', 0x2D: 'bh', 0x2E: 'm',
    0x2F: 'y', 0x30: 'r', 0x31: 'r', 0x32: 'l', 0x33: 'l', 0x34: 'zh',
    0x35: 'v', 0x36: 'sh', 0x37: 'sh', 0x38: 's', 0x39: 'h',
    /* Nukta forms, which Devanagari, Bengali, Gurmukhi and Odia all use for
       borrowed sounds: क़ ख़ ग़ ज़ ड़ ढ़ फ़ य़ */
    0x58: 'k', 0x59: 'kh', 0x5A: 'g', 0x5B: 'z', 0x5C: 'r', 0x5D: 'rh',
    0x5E: 'f', 0x5F: 'y',
    /* Bengali khanda-ta ৎ — a bare `t` with no inherent vowel, but the virama
       logic below cannot see it, so it is listed as a consonant and the
       trailing `a` it gains is collapsed harmlessly by the engine. */
    0x4E: 't',
    /* Malayalam chillu letters: ൺ ൻ ർ ൽ ൾ ൿ — consonants that are already
       vowel-less. Same reasoning as khanda-ta. */
    0x7A: 'n', 0x7B: 'n', 0x7C: 'r', 0x7D: 'l', 0x7E: 'l', 0x7F: 'k',
};

const VIRAMA = 0x4D;
/* U+0901 ँ, U+0902 ं, U+0903 ः — and the same three offsets in all nine blocks.
   These were written one apart from the truth in the first draft, which made
   Telugu ం and Gujarati ં come out as `h`: `namaskaarah` for నమస్కారం, against a
   course that spells it `Namaskaram`. Worth the three named constants. */
const CANDRABINDU = 0x01;
const ANUSVARA = 0x02;
const VISARGA = 0x03;
const NUKTA = 0x3C;
const AVAGRAHA = 0x3D;
const DIGIT_ZERO = 0x66;

/* Scripts that delete the word-final inherent vowel.
   The course is the authority here, not the grammar books: Hindi lesson 1
   teaches `Namaste`, Bengali `Namaskar`, Marathi `Namaskar`, Punjabi
   `Sat Sri Akaal` — and Odiya, in the same block of scripts, teaches
   `Namaskara` with the vowel kept. So schwa deletion is on for the four
   northern scripts and off for Odia and the four Dravidian ones, which is
   what the ten courses actually spell. */
const SCHWA_DELETING = new Set(['Devanagari', 'Bengali', 'Gurmukhi', 'Gujarati']);

/* The same four scripts also carry a different romanisation *style* in this
   course, and it is not decoration — `vowelSkeleton` keeps vowel identity, so
   getting it wrong costs a match. The Dravidian courses write long ī as `ee`
   and long ū as `oo`: `Neevu`, `Chennagiddeeni`, `moodu`. The northern ones
   write them plain: Marathi `Mi` (मी), `Tumhi` (तुम्ही), Punjabi `Tusi` (ਤੁਸੀਂ),
   Hindi `Theek` being the one exception and a Latin loan-spelling at that.
   Rendering मी as `mee` puts an `e` where the course has an `i`, which is a
   different vowel to a grader built for Dravidian deixis. */
const NORTHERN_LONG_VOWELS = { 0x08: 'i', 0x0A: 'u', 0x40: 'i', 0x42: 'u' };

/* Letters that are already vowel-less and must not be handed an inherent `a`:
   the Malayalam chillus ൺ ൻ ർ ൽ ൾ ൿ and the Bengali khanda-ta ৎ. Without this,
   ഞാൻ came out `nyaana` — a spare syllable on the end of "I". */
const VOWELLESS = new Set([0x4E, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E, 0x7F]);

/** Zero-width joiners arrive inside conjuncts from some recognisers and mean
 *  nothing to a romanisation. */
const INVISIBLE = new Set([0x200B, 0x200C, 0x200D, 0xFEFF]);

/** The block a code point belongs to, or null if it is not Brahmic. */
function blockOf(cp) {
    for (const b of BRAHMIC_BLOCKS) {
        if (cp >= b.base && cp <= b.base + 0x7F) return b;
    }
    return null;
}

/** Which Brahmic script a string is written in, by majority of its letters, or
 *  `null` if it carries none. Majority rather than first-hit because a real
 *  transcript mixes in Latin ("ನಿಮ್ಮ application ಚಿತ್ರಗಳು" is a genuine
 *  Deepgram result) and one stray character must not decide the answer. */
export function detectScript(text) {
    const counts = new Map();
    for (const ch of String(text || '')) {
        const b = blockOf(ch.codePointAt(0));
        if (b) counts.set(b.script, (counts.get(b.script) || 0) + 1);
    }
    if (!counts.size) return null;
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** True when the string contains any character this file can romanise. */
export function hasBrahmicScript(text) {
    for (const ch of String(text || '')) {
        if (blockOf(ch.codePointAt(0))) return true;
    }
    return false;
}

/** True when the string carries letters but none of them are Latin — i.e. the
 *  grader would be handed nothing at all. Covers Arabic-script Urdu, which
 *  `hasBrahmicScript` cannot see and this file cannot romanise. */
export function isNonLatinScript(text) {
    const s = String(text || '');
    if (!/\p{L}/u.test(s)) return false;
    return !/\p{Script=Latin}/u.test(s);
}

/** An anusvara before a labial is `m` everywhere. At the end of a word the two
 *  halves of the subcontinent disagree and so do the ten courses: Telugu
 *  `Namaskaram` (నమస్కారం) and `santhosham` end in m, while Hindi `Main` (मैं)
 *  and Punjabi `Tusi` (ਤੁਸੀਂ) do not — up north a final bindi is a nasalised
 *  vowel, not a consonant. So the rule is script-aware.
 *
 *  Candrabindu is nasalisation and nothing else, in every script. It used to be
 *  folded in with anusvara here, which turned Odia ମୁଁ ("I") into `mum`. */
function anusvaraFor(nextLatin, northern) {
    if (!nextLatin) return northern ? 'n' : 'm';
    return 'pbm'.includes(nextLatin[0]) ? 'm' : 'n';
}

/**
 * Romanise one Brahmic string. Characters outside the Brahmic blocks — Latin,
 * digits, spaces, punctuation — pass through untouched, so a mixed transcript
 * survives intact.
 *
 * Returns the romanisation, or the input unchanged when there is nothing
 * Brahmic in it.
 */
export function toLatin(text, opts = {}) {
    const src = String(text || '');
    if (!hasBrahmicScript(src)) return src;

    const script = detectScript(src);
    const northern = SCHWA_DELETING.has(script);
    const {
        /* 'plain' writes ī/ū as i/u, 'double' as ee/oo. See NORTHERN_LONG_VOWELS. */
        longVowels = northern ? 'plain' : 'double',
        /* Whether a word-final anusvara is written at all. Hindi मैं is `Main`
           and Punjabi ਤੁਸੀਂ is `Tusi` — same mark, one course writes it, the
           other does not. */
        finalNasal = true,
        /* ഞ is `Njan` in the Malayalam course and `ny` in every reference. */
        palatalNasal = 'ny',
        /* Bengali's inherent vowel is ô, not a — but its own course romanises
           নমস্কার as `Namaskar` and কেমন as `Kemon`, using both in lesson one. */
        inherent = 'a',
    } = opts;

    const chars = Array.from(src);
    const out = [];
    const dropsFinalSchwa = northern;
    /* True when a consonant has been emitted and still owes its inherent `a`.
       A matra or a virama cancels the debt; anything else pays it. */
    let owesInherentA = false;
    /* Anusvara resolution needs the sound that FOLLOWS it, which has not been
       produced yet, so it is parked here and flushed one step later. */
    let pendingAnusvara = false;

    const emit = (s) => { if (s) out.push(s); };
    /* `atWordEnd` is what makes `Namaskar` come out of Devanagari and
       `Namaskara` out of Odia: the northern scripts write the final consonant's
       inherent vowel and do not say it, and the course spells what is said. */
    const payInherent = (atWordEnd = false) => {
        if (!owesInherentA) return;
        owesInherentA = false;
        if (atWordEnd && dropsFinalSchwa) return;
        emit(inherent);
    };
    const flushAnusvara = (nextLatin) => {
        if (!pendingAnusvara) return;
        pendingAnusvara = false;
        if (!nextLatin && !finalNasal) return;
        emit(anusvaraFor(nextLatin, northern));
    };

    for (const ch of chars) {
        const cp = ch.codePointAt(0);

        if (INVISIBLE.has(cp)) continue;

        const block = blockOf(cp);
        if (!block) {
            /* Latin, space, punctuation, digit: settle everything owed, pass
               through. Anything that is not a letter ends the word. */
            payInherent(!/\p{L}/u.test(ch));
            flushAnusvara(null);
            emit(ch);
            continue;
        }

        const off = cp - block.base;

        if (off === VIRAMA) { owesInherentA = false; continue; }
        if (off === NUKTA) continue;                 // already folded into 0x58-0x5F
        if (off === AVAGRAHA) { payInherent(); flushAnusvara(null); continue; }

        if (off === CANDRABINDU) {
            payInherent();
            flushAnusvara(null);
            continue;                                 // nasalisation, no letter
        }
        if (off === ANUSVARA) {
            payInherent();
            flushAnusvara(null);
            pendingAnusvara = true;
            continue;
        }
        if (off === VISARGA) {
            payInherent();
            flushAnusvara(null);
            emit('h');
            continue;
        }

        if (off >= DIGIT_ZERO && off <= DIGIT_ZERO + 9) {
            payInherent();
            flushAnusvara(null);
            emit(String(off - DIGIT_ZERO));
            continue;
        }

        const matra = longVowels === 'plain' && NORTHERN_LONG_VOWELS[off] !== undefined
            ? NORTHERN_LONG_VOWELS[off] : MATRAS[off];
        if (matra !== undefined) {
            owesInherentA = false;                    // the matra replaces it
            flushAnusvara(matra);
            emit(matra);
            continue;
        }

        const cons = off === 0x1E ? palatalNasal : CONSONANTS[off];
        if (cons !== undefined) {
            payInherent();
            flushAnusvara(cons);
            emit(cons);
            owesInherentA = !VOWELLESS.has(off);
            continue;
        }

        const vowel = longVowels === 'plain' && NORTHERN_LONG_VOWELS[off] !== undefined
            ? NORTHERN_LONG_VOWELS[off] : INDEPENDENT_VOWELS[off];
        if (vowel !== undefined) {
            payInherent();
            flushAnusvara(vowel);
            emit(vowel);
            continue;
        }

        /* An unmapped Brahmic code point. Dropping it silently would quietly
           mangle a word; the caller has no way to know. Nothing in the nine
           blocks that a recogniser emits is unmapped today, and if that changes
           the check in tools/stt-check.mjs is where it will show up. */
        payInherent();
        flushAnusvara(null);
    }

    payInherent(true);
    flushAnusvara(null);

    /* A geminate written with a digraph doubles the whole digraph: ങ്ങ is
       `ngng` and ഛ്ഛ is `chhchh`. The engine's `vowelSkeleton` only collapses
       runs of the SAME character, so `ningngal` never met `Ningal`. Collapsed
       here, where the digraph is still visible as a unit. */
    return out.join('')
        .replace(/([a-z]{2,3})\1/g, '$1')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * Every romanisation of a string this file considers plausible, primary first.
 *
 * Why a set and not one answer: the ten courses do not agree with each other on
 * how to romanise, and neither does any one of them with itself. Lesson 1 of
 * Bengali writes নমস্কার as `Namaskar` (inherent a) and কেমন as `Kemon`
 * (inherent o) on the same screen. Hindi writes ठीक as `Theek` while Marathi
 * writes मी as `Mi` — the same long ī, two spellings. Punjabi writes ਤੁਸੀਂ as
 * `Tusi`, dropping a nasal Hindi keeps in `Main`.
 *
 * The alternative to a candidate set is loosening the matcher, and that is the
 * thing this repo has repeatedly got burned by: `vowelSkeleton` used to collapse
 * every vowel run and taught a tester that *alli* and *illi* were one word. The
 * matcher stays exactly as strict as it is. The ambiguity that genuinely belongs
 * to the *transliteration* is enumerated here instead, and the caller picks the
 * candidate that matches what the lesson asked for — a pure function of the
 * transcript and the target, so it is as reproducible as a lookup.
 *
 * Bounded at 16 by construction: four binary-ish axes, deduped.
 */
export function latinVariants(text) {
    const src = String(text || '');
    if (!hasBrahmicScript(src)) return [src];

    const script = detectScript(src);
    const northern = SCHWA_DELETING.has(script);
    const axes = {
        longVowels: northern ? ['plain', 'double'] : ['double', 'plain'],
        finalNasal: [true, false],
        palatalNasal: script === 'Malayalam' ? ['nj', 'ny'] : ['ny', 'nj'],
        inherent: script === 'Bengali' ? ['a', 'o'] : ['a'],
    };

    let combos = [{}];
    for (const [key, values] of Object.entries(axes)) {
        combos = combos.flatMap(c => values.map(v => ({ ...c, [key]: v })));
    }
    const seen = new Set();
    const out = [];
    for (const opts of combos) {
        const r = toLatin(src, opts);
        if (seen.has(r)) continue;
        seen.add(r);
        out.push(r);
    }
    return out;
}

/**
 * The transcript boundary's version: says what it did, so a caller can log it
 * and a learner can be told the truth.
 *
 *   { text, script, romanised, translatable }
 *
 * `translatable` is false only when the text is in a non-Latin script this file
 * cannot handle — Arabic-script Urdu being the one that occurs. That is the
 * single case where a learner may honestly be asked to try again, and it is the
 * only thing `praise.voiceTrouble('script')` should ever fire on.
 */
export function romanise(text) {
    const src = String(text || '');
    const script = detectScript(src);
    if (script) {
        const variants = latinVariants(src);
        return {
            text: variants[0], script, romanised: true, translatable: true,
            native: src, variants,
        };
    }
    if (isNonLatinScript(src)) {
        return {
            text: src, script: 'unknown', romanised: false, translatable: false,
            native: src, variants: [src],
        };
    }
    return {
        text: src, script: null, romanised: false, translatable: true,
        native: null, variants: [src],
    };
}
