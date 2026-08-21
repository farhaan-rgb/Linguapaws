import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Mic, Square, BookOpen, Globe, Edit3, Sparkles, Keyboard, Volume2, VolumeX, Phone, PhoneOff, Mic2, Copy, Check } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { aiService } from '../services/ai';
import { api } from '../services/api';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { wordTracker } from '../services/wordTracker';
import { characters as defaultCharacters } from '../data/characters';
import { useTranslation } from '../hooks/useTranslation';
import { getStoredJSON, setStoredJSON } from '../utils/storage';
import { CURRICULUM, AVAILABLE_LANGUAGES, isLanguageAvailable } from '../services/curriculum';
import {
    getReviewSet,
    ensureReviewSet,
    clearReviewSet,
    recordTaughtWord,
    recordReview,
} from '../services/srs';

/** Steps per lesson: 5 teach · 3 review · 3 phrase-building · 4 conversation. */
const CYCLE_SIZE = 15;
const MAX_SCENARIO_IDX = 29;

/** Which lesson a repeat count lands in, honouring the ?scenario= override. */
const scenarioIndexFor = (repeats, override) => {
    if (override !== null && override !== undefined && override !== '') {
        const parsed = parseInt(override, 10);
        if (!Number.isNaN(parsed)) return Math.min(Math.max(parsed, 0), MAX_SCENARIO_IDX);
    }
    return Math.min(Math.floor(repeats / CYCLE_SIZE), MAX_SCENARIO_IDX);
};

export default function Chat() {
    const navigate = useNavigate();
    const { t, langId } = useTranslation();
    const [searchParams] = useSearchParams();
    const topicId = searchParams.get('topic');
    const topicName = searchParams.get('name');

    const { isRecording, startRecording, stopRecording, prepare } = useAudioRecorder();

    // Character and chat identification
    const activeChar = getStoredJSON('linguapaws_active_character', { id: 'miko' });
    const characterId = activeChar?.id || 'miko';
    const chatTopic = searchParams.get('topic') || 'free';

    const [messages, setMessages] = useState([]);

    const [isLoading, setIsLoading] = useState(false);
    const [inputText, setInputText] = useState('');
    const [inputMode, setInputMode] = useState(localStorage.getItem('linguapaws_input_mode') || 'text');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [translations, setTranslations] = useState({});
    const [isMuted, setIsMuted] = useState(localStorage.getItem('linguapaws_muted') === 'true');

    const [activeCharacter, setActiveCharacter] = useState(activeChar);
    const [userLevel, setUserLevel] = useState(() => getStoredJSON('linguapaws_level', { id: 'conversational' })?.id || 'conversational');

    const nativeLang = getStoredJSON('linguapaws_native_lang', {});
    const targetLang = getStoredJSON('linguapaws_target_lang', {});
    const targetLangName = targetLang?.name || 'Hindi';
    // Availability is derived from CURRICULUM. Previously this silently fell back
    // to Hindi (and TopicGrid to Telugu), so a learner who picked an unfinished
    // language was taught a different one without ever being told.
    const languageReady = isLanguageAvailable(targetLangName);
    const safeLang = languageReady ? targetLangName : AVAILABLE_LANGUAGES[0];

    const [recalibrationToast, setRecalibrationToast] = useState(null);
    const [copyToast, setCopyToast] = useState(false);
    const [failures, setFailures] = useState({});
    const [corrections, setCorrections] = useState({}); // New state for fuzzy match corrections
    const [levelUpToast, setLevelUpToast] = useState(null);
    const [userTransliterations, setUserTransliterations] = useState({});
    const [matchScores, setMatchScores] = useState({});
    const [sentenceSuccesses, setSentenceSuccesses] = useState({});
    // Progress bar state (loaded from DB)
    const [progress, setProgress] = useState({ level: 'zero', levelLabel: 'Beginner', successfulRepeats: 0, needed: 100, nextLevelLabel: 'Basic' });
    const scrollRef = useRef(null);
    const audioRef = useRef(new Audio());
    const hasGreeted = useRef(false);
    const isInitialLoadComplete = useRef(false);
    const exchangeCount = useRef(0);
    const isMounted = useRef(true);
    const [isCallMode, setIsCallMode] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [callStatus, setCallStatus] = useState('idle'); // idle, listening, thinking, speaking
    const callTimerRef = useRef(null);

    const normalizePhrase = (value) => {
        if (!value) return '';
        return value
            .toLowerCase()
            .normalize('NFC')
            .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const normalizeLatin = (value) => {
        if (!value) return '';
        return value
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[^a-z0-9\[\]\(\)]+/g, ' ') // Preserve brackets/parens for wildcards
            .replace(/\s+/g, ' ')
            .trim();
    };

    const formatTransliteration = (value, nativeLangValue) => {
        if (!value) return '';
        const isEnglish = (nativeLangValue?.id || '').toLowerCase() === 'en' ||
            (nativeLangValue?.name || '').toLowerCase() === 'english';
        if (isEnglish) return normalizeLatin(value);
        return value.replace(/[!?]+$/g, '').trim();
    };

    const isMostlyLatin = (value) => {
        const letters = (value || '').match(/\p{L}/gu) || [];
        if (letters.length === 0) return false;
        const latin = (value.match(/\p{Script=Latin}/gu) || []).length;
        return latin / letters.length >= 0.8;
    };

    const splitGraphemes = (value) => {
        if (Array.isArray(value)) return value;
        const seg = typeof Intl !== 'undefined' && Intl.Segmenter
            ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
            : null;
        if (seg) return Array.from(seg.segment(value), s => s.segment);
        return Array.from(value);
    };

    const levenshtein = (a, b) => {
        const aa = splitGraphemes(a);
        const bb = splitGraphemes(b);
        const alen = aa.length;
        const blen = bb.length;
        if (alen === 0) return blen;
        if (blen === 0) return alen;
        const dp = Array.from({ length: alen + 1 }, () => new Array(blen + 1).fill(0));
        for (let i = 0; i <= alen; i++) dp[i][0] = i;
        for (let j = 0; j <= blen; j++) dp[0][j] = j;
        for (let i = 1; i <= alen; i++) {
            for (let j = 1; j <= blen; j++) {
                const cost = aa[i - 1] === bb[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[alen][blen];
    };

    const TARGET_SCRIPT_MAP = {
        hi: 'Devanagari',
        bn: 'Bengali',
        te: 'Telugu',
        ta: 'Tamil',
        kn: 'Kannada',
        or: 'Oriya',
        ml: 'Malayalam',
        pa: 'Gurmukhi',
        ur: 'Arabic',
    };

    const TARGET_SCRIPT_BY_NAME = {
        hindi: 'Devanagari',
        bengali: 'Bengali',
        telugu: 'Telugu',
        tamil: 'Tamil',
        kannada: 'Kannada',
        odiya: 'Oriya',
        malayalam: 'Malayalam',
        punjabi: 'Gurmukhi',
        urdu: 'Arabic',
    };

    const isNativeEnglish = (lang = nativeLang) => {
        const id = (lang?.id || '').toLowerCase();
        const name = (lang?.name || '').toLowerCase();
        return id === 'en' || name === 'english';
    };

    const resolveTargetScript = () => {
        const id = (targetLang?.id || '').toLowerCase();
        const name = (targetLang?.name || '').toLowerCase();
        return TARGET_SCRIPT_MAP[id] || TARGET_SCRIPT_BY_NAME[name] || null;
    };

    const isAssistantExpectingTarget = (msgs) => {
        // Look through recent messages for the most recent tutorial state
        for (let i = msgs.length - 1; i >= 0; i--) {
            const msg = msgs[i];
            if (msg.role !== 'assistant') continue;

            // Skip generic error messages that don't change the tutorial context
            const isError = msg.content.includes("couldn't quite hear") || msg.content.includes("whiskers got tangled");
            if (isError) continue;

            // Teaching mode: bold text = expecting that target word
            if (msg.content.includes('**')) return true;

            // Review mode: "What's the word for X?" — user must respond in target language
            if (/what'?s\s+the\s+word\s+for/i.test(msg.content)) return true;

            // Basic/conversational mode: AI is asking user to produce a target-language phrase
            if (/try\s+to\s+say|can\s+you\s+(say|ask)|what\s+would\s+you\s+(say|ask)|go\s+ahead\s+and|give\s+it\s+(a\s+)?(shot|try|go)/i.test(msg.content)) return true;

            // If it's a normal assistant message without any of the above, not expecting target language
            return false;
        }
        return false;
    };

    const stripNonLatinLetters = (text) => {
        if (!text) return text;
        const chars = Array.from(text);
        const kept = chars.filter((ch) => {
            if (/\p{L}|\p{M}/u.test(ch)) {
                return /\p{Script=Latin}/u.test(ch);
            }
            return true;
        });
        return kept.join('').replace(/\s{2,}/g, ' ').trim();
    };

    const stripTargetScript = (text) => {
        if (!text) return text;
        if (isNativeEnglish()) {
            return stripNonLatinLetters(text);
        }
        const script = resolveTargetScript();
        if (!script) return text;
        const re = new RegExp(`\\p{Script=${script}}+`, 'gu');
        return text.replace(re, '').replace(/\s{2,}/g, ' ').trim();
    };

    const hasTargetScript = (text) => {
        if (!text) return false;
        if (isNativeEnglish()) {
            return /[\p{L}\p{M}]/u.test(text) && !/[\p{Script=Latin}]/u.test(text);
        }
        const script = resolveTargetScript();
        if (!script) return false;
        const re = new RegExp(`\\p{Script=${script}}`, 'u');
        return re.test(text);
    };

    const cleanupDisplayText = (text) => {
        if (!text) return text;
        return text
            .replace(/"\s*"/g, '')
            .replace(/"\s*[.?!]+\s*"/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
    };

    const safeTranslate = async (text, nativeLangName) => {
        try {
            const translated = await aiService.translate(text, nativeLangName, 'English');
            return translated?.translation || text;
        } catch {
            return text;
        }
    };

    const stripLatinDiacritics = (text) => {
        if (!text) return text;
        return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').normalize('NFC');
    };

    /**
     * Build clean text for TTS from a raw AI response.
     * Phase 1: Strips <phonetic> tags (prevents reading pronunciation guide aloud).
     * Phase 2: Extracts <tts> native script and replaces the transliterated bold phrase
     *          so Google TTS reads authentic pronunciation (e.g., Odia script for or-IN voice).
     */
    const buildSpeechText = (rawContent) => {
        if (!rawContent) return '';

        // Phase 2: Extract native script from <tts> tag before stripping
        const ttsMatch = rawContent.match(/<tts>(.*?)<\/tts>/i);
        const nativeScript = ttsMatch ? ttsMatch[1].trim() : null;

        // Extract the last bold phrase (the practice phrase) for replacement mapping
        const boldMatches = rawContent.match(/\*\*(.*?)\*\*/g);
        const lastBold = boldMatches ? boldMatches[boldMatches.length - 1].replace(/\*\*/g, '').trim() : null;

        // Strip all special tags
        let text = rawContent
            .replace(/<phonetic>(.*?)<\/phonetic>/gi, '')   // Phase 1: Remove phonetic guides
            .replace(/<tts>(.*?)<\/tts>/gi, '')              // Phase 2: Remove tts tags
            .replace(/<shadow>(.*?)<\/shadow>/gs, '$1')
            .replace(/<word>(.*?)<\/word>/g, '$1')
            .replace(/<recalibrate>.*?<\/recalibrate>/g, '')
            .replace(/<level_up>.*?<\/level_up>/g, '')
            .replace(/<success>.*?<\/success>/gi, '')
            .replace(/<[^>]+>/g, '')                         // Strip any remaining tags
            .replace(/\\\*/g, '')                            // Strip escaped asterisks \*
            .replace(/\*\*/g, '')                            // Strip double asterisks (bold)
            .replace(/\*/g, '')                             // Strip single asterisks (italic)
            .replace(/[\p{Extended_Pictographic}\p{Emoji_Component}]/gu, '') // Strip emojis via Unicode property
            .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')  // Supplementary emoji block fallback
            .replace(/[\u2600-\u27BF\uFE00-\uFE0F]/g, ''); // Misc symbols + variation selectors

        text = cleanupDisplayText(stripTargetScript(text));
        if (isNativeEnglish()) text = stripLatinDiacritics(text);

        // Phase 2: Replace transliterated phrase with native script for authentic TTS
        if (nativeScript && lastBold && text.includes(lastBold)) {
            text = text.replace(lastBold, nativeScript);
        }

        return text;
    };



    const isTopicPrompt = (text) => {
        if (!text) return false;
        const clean = cleanupDisplayText(stripTargetScript(text));
        return /what would you like to (talk about|discuss|learn) next|what do you want to (learn|practice) next|choose a topic|pick a topic|what would you like to talk about now/i.test(clean);
    };

    const isTopicReply = (text) => {
        if (!text) return false;
        const clean = cleanupDisplayText(text).toLowerCase();
        if (!clean) return false;
        const quick = [
            'anything',
            'you decide',
            'your choice',
            'whatever',
            'any topic',
            'surprise me',
            'no preference',
        ];
        if (quick.includes(clean)) return true;
        return clean.split(/\s+/).length <= 4 && !hasTargetScript(text);
    };

    const similarityRatio = (a, b) => {
        const na = normalizePhrase(a);
        const nb = normalizePhrase(b);
        if (!na || !nb) return 0;
        const dist = levenshtein(na, nb);
        return 1 - dist / Math.max(splitGraphemes(na).length, splitGraphemes(nb).length, 1);
    };

    const similarityRatioLatin = (actual, expected) => {
        let na = normalizeLatin(actual);
        let nb = normalizeLatin(expected);
        if (!na || !nb) return 0;

        // Structured Placeholder Support: If expected contains [Place] or (name), 
        // we check if the structure matches and treat the placeholder as 100% correct.
        if (nb.includes('[') || nb.includes('(')) {
            // Create a regex that allows any word(s) in place of the bracketed content
            // We escape the brackets in the regex but keep them in the logic
            const structuralRegex = nb
                .replace(/[\[\]\(\)]/g, '\\$&')
                .replace(/\\\[.*?\\\]/g, '.+')
                .replace(/\\\(.*?\\\)/g, '.+');
            const regex = new RegExp(`^${structuralRegex}$`, 'i');
            if (regex.test(na)) return 1.0;
        }

        const dist = levenshtein(na, nb);
        const len = Math.max(splitGraphemes(na).length, splitGraphemes(nb).length, 1);
        const score = 1 - dist / len;

        // Soften "Almost Right" matches: if it's > 80%, and the difference is 
        // just single vowels vs double vowels (ai vs ay, ee vs i), bump it up.
        if (score > 0.8 && score < 1.0) {
            const simplifiedA = na.replace(/[aeiouy]+/g, 'v');
            const simplifiedB = nb.replace(/[aeiouy]+/g, 'v');
            if (simplifiedA === simplifiedB) return 1.0;
        }

        return score;
    };

    /* ── Token coverage ────────────────────────────────────────────────────
       Levenshtein alone lets a learner drop a whole required word and still
       clear the 0.5 threshold: "Emiti" against "Idhi emiti?" scores exactly
       0.500 and was accepted, teaching them that the bare question word means
       "What is this?". This checks that the words the target needs are actually
       present, so a one-word answer to a two-word target fails on content
       rather than squeaking through on string distance.                     */
    const COVERAGE_FLOOR = 0.7;

    /* Every accepted variant of a word maps to the form the curriculum teaches,
       so a synonym means the same thing at every step rather than only in
       vocabulary recall. Built from the `alt` lists. */
    const SYNONYMS = useMemo(() => {
        const map = new Map();
        for (const lesson of CURRICULUM[safeLang] || []) {
            for (const v of lesson.vocabulary || []) {
                if (!v.word || !Array.isArray(v.alt)) continue;
                const canonical = v.word.toLowerCase();
                for (const a of v.alt) map.set(String(a).toLowerCase(), canonical);
            }
        }
        return map;
    }, [safeLang]);

    const canonical = (token) => SYNONYMS.get(token) || token;

    /* Telugu and Kannada mark the subject in the verb ending, so a one-character
       difference at the end of a word is usually a different PERSON, not a typo:
       bagunnanu is "I am fine", bagunnaru is "you are fine", chesanu is "I did",
       chesaru is "you did". The typo tolerance below would treat those as the
       same word, quietly erasing the one distinction these lessons exist to
       teach. Refuse to forgive an edit that swaps one person ending for another
       on an otherwise identical stem. */
    const PERSON_ENDINGS = ['nu', 'ru', 'vu', 'du', 'di', 'mu', 'ni', 'ri', 'ra', 'va'];

    const differsOnlyByPersonEnding = (a, b) => {
        if (a.length < 4 || b.length < 4) return false;
        const ea = a.slice(-2), eb = b.slice(-2);
        if (ea === eb) return false;
        if (!PERSON_ENDINGS.includes(ea) || !PERSON_ENDINGS.includes(eb)) return false;
        return a.slice(0, -2) === b.slice(0, -2);
    };

    const tokenCoverage = (actual, expected) => {
        const said = normalizeLatin(actual).split(' ').filter(Boolean);
        const need = normalizeLatin(expected).split(' ').filter(Boolean);
        if (!need.length) return 1;

        const pool = [...said];
        let hits = 0;
        for (const token of need) {
            // [Place] / (name) wildcards count as satisfied — similarityRatioLatin
            // already treats them as free, so the gate must agree.
            if (/[[\]()]/.test(token)) { hits++; continue; }
            const want = canonical(token);
            const i = pool.findIndex(raw => {
                const s = canonical(raw);
                return s === want
                    // tolerate a one-character slip, but only on words long enough
                    // that a single edit isn't most of the word — and never when the
                    // slip is a swapped person ending
                    || (Math.max(s.length, want.length) >= 4
                        && levenshtein(s, want) <= 1
                        && !differsOnlyByPersonEnding(s, want));
            });
            if (i !== -1) { hits++; pool.splice(i, 1); }
        }
        return hits / need.length;
    };

    /** Best coverage across the canonical answer and any accepted variants. */
    const bestCoverage = (actual, expected, acceptable = []) =>
        [expected, ...acceptable]
            .filter(Boolean)
            .reduce((best, variant) => Math.max(best, tokenCoverage(actual, variant)), 0);

    /* ── Teaching line ─────────────────────────────────────────────────────
       Built from the curriculum, never authored by the model. The prompt used
       to require a one-sentence scene AND told the model to "vary how you
       introduce each word", which for a word glossed "What" produced
       "you want to ask 'What is this?' ... say Emiti" — inflating a bare gloss
       into a full sentence the word does not cover. Items whose gloss is not a
       standalone English utterance (suffixes, postpositions, question words)
       carry an authored `teach` string; everything else uses the plain
       "To say X, say Y" form that already worked.                           */
    const TEACH_STEPS = 5;

    /** The vocabulary a given teaching step covers — one word usually, two when
        the lesson carries more than five. */
    const teachSliceFor = (vocabulary = [], step = 0) => {
        const n = vocabulary.length;
        if (!n) return [];
        const from = Math.floor((step * n) / TEACH_STEPS);
        const to = Math.floor(((step + 1) * n) / TEACH_STEPS);
        return vocabulary.slice(from, Math.max(to, from + 1));
    };

    const buildTeachingLine = (wordObj, opener = '') => {
        if (!wordObj?.word) return null;
        // An authored `teach` line explains the word but does not ask for it, so
        // it must close with the same direct instruction the plain template
        // carries — otherwise the learner is left reading grammar with no idea
        // it is their turn, and the app sits waiting. The last bold span is what
        // the answer matcher expects, and both spans are the same word.
        const body = wordObj.teach
            ? `${wordObj.teach.replace('{w}', `**${wordObj.word}**`)} Your turn — say **${wordObj.word}**`
            : `To say "${wordObj.meaning}", say **${wordObj.word}**`;
        const phon = wordObj.phonetic ? `\n<phonetic>${wordObj.phonetic}</phonetic>` : '';
        return `${opener}${opener ? ' ' : ''}${body}${phon}`;
    };

    /* ── Review slots ──────────────────────────────────────────────────────
       Steps 5–7 of each 15-step lesson used to quiz three of the *current*
       lesson's five words, four turns after teaching them — massed practice.
       They now draw from the learner's spaced-repetition due queue across every
       lesson they've seen, falling back to current-lesson vocabulary only while
       there is nothing older to review. See services/srs.js.               */

    /** One teaching message for a whole slice. The final bold span is the word
        the learner is asked for, which is what the answer matcher reads. */
    const buildTeachingStep = (slice, opener = '') => {
        const words = (slice || []).filter(w => w?.word);
        if (!words.length) return null;
        if (words.length === 1) return buildTeachingLine(words[0], opener);

        const lead = words.slice(0, -1).map(w => {
            const body = w.teach
                ? w.teach.replace('{w}', `**${w.word}**`)
                : `"${w.meaning}" is **${w.word}**`;
            return body.replace(/\.$/, '');
        }).join('. ');
        const last = words[words.length - 1];
        const lastRaw = last.teach
            ? last.teach.replace('{w}', `**${last.word}**`)
            : `"${last.meaning}" is **${last.word}**`;
        const lastBody = /[.?!]$/.test(lastRaw) ? lastRaw : `${lastRaw}.`;
        const phon = last.phonetic ? `\n<phonetic>${last.phonetic}</phonetic>` : '';
        return `${opener}${opener ? ' ' : ''}${lead}. ${lastBody} Your turn — say **${last.word}**${phon}`;
    };

    /* Accepted spoken variants of a taught word, from the curriculum's `alt`.
       Lets the drill demand the form that shows the morphology (Bagunnanu, where
       the -nu marking "I" is visible) without failing a learner who says the
       clipped form people actually use (bagunna). Deliberately explicit rather
       than a looser edit-distance tolerance: bagunnanu and bagunnaru are two
       edits apart too, and those must stay distinct. */
    const altsFor = (word) => {
        if (!word) return [];
        const target = word.toLowerCase();
        for (const lesson of CURRICULUM[safeLang] || []) {
            for (const v of lesson.vocabulary || []) {
                if (v.word?.toLowerCase() === target) return v.alt || [];
            }
        }
        return [];
    };

    /** Best string-similarity and token-coverage across a target and its variants. */
    const scoreAgainst = (actual, expected, variants = []) => {
        const all = [expected, ...variants].filter(Boolean);
        return {
            ratio: all.reduce((b, v) => Math.max(b, similarityRatioLatin(actual, v)), 0),
            coverage: all.reduce((b, v) => Math.max(b, tokenCoverage(actual, v)), 0),
        };
    };

    /* How many times in a row the learner has just missed the current review
       word. Derived from the message log rather than component state so it
       survives a reload — the chat is restored from the DB, so state would not. */
    const REVIEW_RETRY_LIMIT = 2;

    /* Affirmations for the drill stages, which bypass the model and so cannot
       inherit the persona rules from the prompt. Those rules are explicit:
       "respond with ONLY one flat word" and "No exclamation marks on
       affirmations", rotating Good / Correct / Right / Yes. Keep this list flat
       — praising every single repeated word with "Perfect!" reads as hollow by
       the third one, and it contradicted the tutor's own voice mid-lesson. */
    const FLAT_PRAISE = ["Good.", "Correct.", "Right.", "Yes."];

    const MISS_RE = /Not quite|The answer (was|is)|try again/i;
    const ADVANCED_RE = /Spot on|Exactly|Great job|Perfect|Correct|Good\.|Right\.|Yes\.|come back|💡|🎓/i;

    const consecutiveMisses = (msgs) => {
        let n = 0;
        for (let i = msgs.length - 1; i >= 0; i--) {
            const m = msgs[i];
            if (m.role === 'user') continue;
            if (MISS_RE.test(m.content)) { n++; continue; }
            if (ADVANCED_RE.test(m.content)) break;   // a success or a new stage
            // anything else (the model answering a question) is neutral: walk past
        }
        return n;
    };

    /* Did the previous turn hand the learner the answer? Tested by looking for
       the expected answer itself rather than for a form of words — the earlier
       version only recognised this component's own "The answer was X" template,
       so when the model volunteered the answer ("The Kannada phrase for 'I am
       fine' is 'Naanu chennagiddini'") the parrot that followed was banked as a
       real recall. */
    const answerWasRevealed = (text, expected) => {
        const haystack = normalizeLatin(text || '');
        if (!haystack) return false;
        if (/the answer (was|is)|it'?s \*\*/i.test(text || '')) return true;
        const needle = normalizeLatin(expected || '');
        return Boolean(needle) && needle.length >= 4 && haystack.includes(needle);
    };

    /* Never mark a learner wrong for saying back what the tutor just modelled.
       A learner did exactly that — the tutor offered "Neevu hegiddira?", they
       typed it, and the matcher rejected it because only the split form was on
       the accepted list. Whatever else is true, that must not happen. */
    const tutorModelled = (said, tutorText, expected) => {
        const a = normalizeLatin(said);
        const t = normalizeLatin(tutorText || '');
        const e = normalizeLatin(expected || '');
        if (a.length < 4 || !t.includes(a) || !e) return false;
        const saidTokens = a.split(' ').filter(Boolean);
        const wantTokens = e.split(' ').filter(Boolean);
        if (saidTokens.length < wantTokens.length - 1) return false;
        // must overlap the real answer, so echoing the English hint fails
        return saidTokens.some(x => wantTokens.some(y =>
            x === y || (Math.max(x.length, y.length) >= 4 && levenshtein(x, y) <= 1)));
    };

    /** How much help this answer needed — drives how far the word climbs. */
    const gradeOutcome = ({ correct, misses, revealed }) => {
        if (!correct) return 'missed';
        if (revealed) return 'revealed';
        return misses > 0 ? 'hinted' : 'unaided';
    };

    /* A grammar note is fixed text written about the exercise's canonical
       answer — but the learner is credited for accepted variants too, so the
       note routinely explains endings their sentence does not contain, and can
       even correct a mistake they did not make. Lead with the difference when
       there is one, so the note is about the sentence they actually produced. */
    const noteForAnswer = (item, answer) => {
        const note = item?.grammarNote || '';
        if (!note || !answer || !item?.correct) return note;
        const said = normalizeLatin(answer);
        const target = normalizeLatin(item.correct);
        if (!said || !target || said === target) return note;
        const variants = (item.acceptable || []).map(normalizeLatin);
        const lead = variants.includes(said)
            ? `You said **${answer.trim()}** — that works too. The full form is **${item.correct}**.`
            : `Close. The form to keep is **${item.correct}**.`;
        return `${lead} ${note}`;
    };

    /* Did the learner answer in a DIFFERENT language they've studied here?
       Every language block shares the same scenario and exercise ordering, so
       the same slot in another language is the same question — which makes this
       cheap to detect and worth detecting: someone who did Telugu first will
       reach for "Meeru ela unnaru?" in a Kannada lesson, and a bare "Not quite"
       sends them hunting for a vocabulary error they did not make. Naming the
       language turns a dead end into the one correction they actually need. */
    const crossLanguageMatch = (answer, { scenarioIdx, section, itemIdx }) => {
        if (!answer || !section) return null;
        for (const [lang, lessons] of Object.entries(CURRICULUM)) {
            if (lang === safeLang) continue;
            const peer = lessons?.[scenarioIdx]?.[section]?.[itemIdx];
            if (!peer?.correct) continue;
            const candidates = [peer.correct, ...(peer.acceptable || [])];
            if (candidates.some(c => similarityRatioLatin(answer, c) >= 0.75)) return lang;
        }
        return null;
    };

    /* A learner talking to the tutor rather than answering it.
       The signal is that they switched to ENGLISH, not that the text ends in a
       question mark — plenty of valid Telugu answers do ("Emiti?", "Nenu
       bagunnanu, meeru?"), so punctuation alone misreads real answers as
       questions. Two or more English function words is the giveaway, since none
       of them appear in a romanised Telugu or Kannada answer. */
    const ENGLISH_TELLS = new Set([
        'can', 'cant', 'could', 'why', 'what', 'whats', 'how', 'is', 'are', 'was',
        'do', 'does', 'did', 'the', 'a', 'an', 'and', 'or', 'but', 'not', 'no',
        'i', 'you', 'me', 'my', 'it', 'this', 'that', 'also', 'as', 'well', 'too',
        'say', 'said', 'mean', 'means', 'meaning', 'same', 'different', 'instead',
        'another', 'other', 'both', 'use', 'used', 'about', 'in', 'of', 'to', 'for',
        'should', 'would', 'isnt', 'dont', 'doesnt', 'wrong', 'right', 'correct',
    ]);

    const looksLikeQuestion = (t) => {
        const words = (t || '').toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/).filter(Boolean);
        if (words.length < 3) return false;
        return words.filter(w => ENGLISH_TELLS.has(w.replace(/'/g, ''))).length >= 2;
    };

    /* Every turn must give the learner something to do. The transition into the
       phrase stage used to be a bare "Now let's put those words into phrases!"
       with no task attached — the actual prompt only arrived on the NEXT turn
       from the model, so the learner sat looking at a banner and typed "okay". */
    const drillPrompt = (items, idx) => {
        const item = items?.[idx];
        if (!item?.prompt) return null;
        const p = item.prompt.trim();
        return /[.?!]$/.test(p) ? p : `${p}.`;
    };

    /** The word this review step is asking for, or null if the set isn't built. */
    const reviewItemAt = (scenarioIdx, round, vocabulary = []) => {
        const set = getReviewSet(safeLang, scenarioIdx);
        if (set && set[round]) return set[round];

        // Last-resort fallback: the set hasn't loaded (first paint, offline).
        // Keep the lesson usable rather than blocking on the network.
        const item = vocabulary[round % Math.max(vocabulary.length, 1)];
        return item ? { word: item.word, meaning: item.meaning || '', source: 'lesson' } : null;
    };

    const extractPromptedPhrase = (text) => {
        if (!text) return null;
        const boldMatches = text.match(/\*\*(.*?)\*\*/g);
        if (boldMatches && boldMatches.length > 0) {
            return boldMatches[boldMatches.length - 1].replace(/\*\*/g, '').trim();
        }
        return null;
    };

    // Load chat messages and progress from database on mount
    useEffect(() => {
        let cancelled = false;
        isInitialLoadComplete.current = false;
        (async () => {
            try {
                const [chatData, progressData] = await Promise.all([
                    api.get(`/api/chats?characterId=${characterId}&topic=${chatTopic}`),
                    api.get('/api/progress'),
                ]);
                if (cancelled) return;
                if (chatData.messages?.length > 0) {
                    setMessages(chatData.messages);
                    aiService.setHistory(chatData.messages);
                    hasGreeted.current = true;
                    exchangeCount.current = chatData.messages.filter(m => m.role === 'user').length;
                } else {
                    setMessages([]);
                    aiService.resetHistory();
                    hasGreeted.current = false;
                    exchangeCount.current = 0;
                }
                isInitialLoadComplete.current = true;
                setProgress(progressData);
                setUserLevel(progressData.level || 'zero');
            } catch (err) {
                console.warn('Failed to load chat/progress from DB:', err);
            }
        })();
        return () => { cancelled = true; };
    }, [characterId, chatTopic]);

    /* Build the review triplet for the current lesson ahead of time, so the
       answer matcher can read it synchronously when the learner reaches steps
       5–7 instead of racing a fetch mid-turn. */
    const currentScenarioIdx = scenarioIndexFor(
        progress?.successfulRepeats || 0,
        searchParams.get('scenario')
    );

    useEffect(() => {
        const lesson = CURRICULUM[safeLang]?.[currentScenarioIdx];
        const vocabulary = lesson?.vocabulary || [];
        // words this lesson's own drills are about to require — reviewed first
        const priority = [...(lesson?.phrases || []), ...(lesson?.conversations || [])]
            .flatMap(it => String(it.correct || '').toLowerCase().match(/[a-z]+/g) || []);
        ensureReviewSet(safeLang, currentScenarioIdx, vocabulary, priority);
    }, [safeLang, currentScenarioIdx]);

    // Persist messages to database whenever they change
    const saveTimerRef = useRef(null);
    useEffect(() => {
        if (messages.length === 0) return;
        // Debounce saves to avoid hammering the DB on rapid updates
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            api.put('/api/chats', { characterId, topic: chatTopic, messages }).catch(() => { });
        }, 1000);
    }, [messages, characterId, chatTopic]);

    // Render assistant messages with safe substitutions (no target script on screen).
    // Also renders **bold** and *italic* markdown into JSX.
    const renderMessageContent = (content, idx) => {
        let rendered = content.replace(/<shadow>(.*?)<\/shadow>/gs, '$1')
            .replace(/<phonetic>(.*?)<\/phonetic>/gi, '')
            .replace(/<tts>(.*?)<\/tts>/gi, '');  // Strip native script TTS tags from display

        rendered = cleanupDisplayText(stripTargetScript(rendered));
        if (isNativeEnglish()) {
            rendered = stripLatinDiacritics(rendered);
        }
        // Parse **bold** and *italic* into JSX
        // Match **bold** first, then *italic* (order matters to avoid conflicts)
        const parts = rendered.split(/(\*\*.*?\*\*|\*[^*]+\*)/g);
        if (parts.length <= 1) return rendered;
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} style={{ color: 'var(--accent-purple)', fontWeight: '800' }}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                return <strong key={i} style={{ color: 'var(--accent-purple)', fontWeight: '800' }}>{part.slice(1, -1)}</strong>;
            }
            return part;
        });
    };

    // Resolve the active character — fall back to Miko when none is selected
    const mikoCharacter = defaultCharacters.find(c => c.id === 'miko');
    const resolvedCharacter = activeCharacter || mikoCharacter;

    const toggleMute = () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        localStorage.setItem('linguapaws_muted', newMuted);
        if (newMuted) {
            audioRef.current.pause();
        }
    };

    const toggleInputMode = () => {
        const newMode = inputMode === 'voice' ? 'text' : 'voice';
        setInputMode(newMode);
        localStorage.setItem('linguapaws_input_mode', newMode);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const fetchSuggestions = async () => {
        setIsLoading(true);
        const sugs = await aiService.getSuggestions(targetLang?.name || 'English');
        setSuggestions(sugs);
        setShowSuggestions(true);
        setIsLoading(false);
    };

    // ===== CALL MODE LOGIC =====
    const startCall = async () => {
        setIsCallMode(true);
        setCallDuration(0);
        setCallStatus('speaking');
        callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);

        // Auto-greet when the call connects
        const nativeLangName = nativeLang?.name || 'English';
        const targetLangName = targetLang?.name || 'English';
        const rawGreeting = await aiService.getResponse(
            `[CALL GREETING ONLY — keep it short. Greet warmly and invite practice.]`,
            topicName,
            activeCharacter,
            nativeLang,
            targetLang,
            false,
            userLevel
        );
        const greeting = rawGreeting?.content || rawGreeting;
        const storedGreeting = greeting
            .replace(/<word>(.*?)<\/word>/g, '$1')
            .replace(/<shadow>(.*?)<\/shadow>/gs, '$1')
            .trim();
        const callGreetingSpeech = buildSpeechText(greeting);
        if (isMounted.current) {
            const audioUrl = await aiService.generateSpeech(callGreetingSpeech, resolvedCharacter?.voice || 'alloy', targetLang?.name || null);
            if (audioUrl && isMounted.current && isCallMode) {
                audioRef.current.src = audioUrl;
                audioRef.current.onended = () => setCallStatus('idle');
                audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
            } else {
                setCallStatus('idle');
            }
        }
    };

    const endCall = () => {
        setIsCallMode(false);
        setCallStatus('idle');
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
        audioRef.current.pause();
    };

    const formatCallTime = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const handleCallSpeak = async () => {
        if (isRecording) {
            setCallStatus('thinking');
            const audioBlob = await stopRecording();
            if (audioBlob) {
                // Check if the bot asked the user to repeat a target-language phrase
                // We look back past error messages to find the real context
                const expectingTarget = isAssistantExpectingTarget(messages);
                const result = await aiService.transcribeAudio(audioBlob, nativeLang, targetLang, expectingTarget);
                if (result?.text) {
                    const transcript = result.text;
                    setMessages(prev => [...prev, { role: 'user', content: transcript }]);
                    const userWords = transcript.match(/[\p{L}]{2,}/gu);
                    if (userWords) userWords.forEach(w => { wordTracker.addWord(w); });

                    const rawResponse = await aiService.getResponse(transcript, topicName, activeCharacter, nativeLang, targetLang, false, userLevel);
                    const rawContent = rawResponse?.content || rawResponse;
                    const storedResponse = rawContent
                        .replace(/<word>(.*?)<\/word>/g, '$1')
                        .replace(/<shadow>(.*?)<\/shadow>/gs, '$1')
                        .trim();
                    const callSpeechText = buildSpeechText(rawContent);
                    setMessages(prev => [...prev, { role: 'assistant', content: storedResponse }]);

                    // Handle success status if present (Guided Sentence Construction)
                    if (rawResponse?.success !== undefined && rawResponse.success !== null) {
                        const statusTag = rawResponse.success ? 'true' : 'false';
                        // Use messages.length because it's the index of the user message we just added
                        setSentenceSuccesses(prev => ({ ...prev, [messages.length]: statusTag }));
                        if (statusTag === 'true') {
                            api.post('/api/progress/increment').catch(() => { });
                        }
                    }

                    setCallStatus('speaking');
                    if (isMounted.current) {
                        const audioUrl = await aiService.generateSpeech(callSpeechText, resolvedCharacter?.voice || 'alloy', targetLang?.name || null);
                        if (audioUrl && isMounted.current) {
                            audioRef.current.src = audioUrl;
                            audioRef.current.onended = () => setCallStatus('idle');
                            audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
                        } else {
                            setCallStatus('idle');
                        }
                    }
                } else {
                    const detail = result?.error || "I couldn't quite catch that.";
                    const prefix = activeCharacter?.id === 'miko' ? "Meow... " : "";
                    const errorMsg = `${prefix}${detail} Could you try again? 😿`;
                    setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
                    setCallStatus('idle');
                }
            } else {
                setCallStatus('idle');
            }
        } else {
            audioRef.current.pause();
            setCallStatus('listening');
            await startRecording();
        }
    };


    useEffect(() => {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        aiService.init(apiKey);

        // Warm up the backend on mount so Render free-tier cold starts happen
        // before the user sends their first message, not during it.
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/health`).catch(() => { });

        // Reset mounted state — fixes React Strict Mode double-invocation bug
        isMounted.current = true;

        const greet = async () => {
            // Wait for DB load to finish so we know if we need to greet
            let attempts = 0;
            while (!isInitialLoadComplete.current && attempts < 20) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }

            if (hasGreeted.current) return;
            hasGreeted.current = true;

            setIsLoading(true);
            const nativeLangName = nativeLang?.name || 'English';

            let levelNote;
            let greeting = "";
            const currentRepeats = progress?.successfulRepeats || 0;
            const inScenario = currentRepeats % CYCLE_SIZE;
            const isReviewMode = inScenario >= 5 && inScenario < 8;

            let levelId = userLevel || 'conversational';
            if (inScenario < 5 || isReviewMode) levelId = 'zero';
            else if (inScenario < 11) levelId = 'basic';
            else levelId = 'conversational';

            const activeScenarioIdx = scenarioIndexFor(currentRepeats, searchParams.get('scenario'));
            const scenarioData = (CURRICULUM[safeLang] && CURRICULUM[safeLang][activeScenarioIdx]) || { vocabulary: [] };
            const activeScenario = scenarioData.scenario || 'Learning';
            const vocabIndex = inScenario < 5 ? inScenario : 0;
            const targetSlice = teachSliceFor(scenarioData.vocabulary, vocabIndex);
            const taughtVocab = scenarioData.vocabulary.map(v => `${v.word} (${v.meaning})`).join(', ');

            if (levelId === 'zero' && !isReviewMode) {
                // Instant template — content is 100% known from curriculum, no AI call needed
                const charName = activeCharacter?.name || 'Miko';
                const instantGreeting = buildTeachingStep(
                    targetSlice,
                    `Hey there! I'm ${charName}, your friendly guide. 🐾`
                );
                setMessages([{ role: 'assistant', content: instantGreeting }]);
                setIsLoading(false);
                if (!isMuted && isMounted.current) {
                    const speechText = buildSpeechText(instantGreeting);
                    aiService.generateSpeech(speechText, resolvedCharacter?.voice || 'alloy', targetLang?.name || null)
                        .then(audioUrl => {
                            if (audioUrl && isMounted.current) {
                                audioRef.current.src = audioUrl;
                                audioRef.current.play().catch(() => {});
                            }
                        });
                }
                return;
            } else if (levelId === 'zero' && isReviewMode) {
                /* Deterministic template rather than an AI call. The old prompt
                   told the model to "pick a random meaning from the list" while
                   the matcher independently expected a seeded word — so on the
                   first review turn after a reload, the question asked and the
                   answer accepted could be different words. The review set is
                   now the single source of truth for both. */
                const round = inScenario - 5;
                const vocabulary = scenarioData.vocabulary || [];
                const set = await ensureReviewSet(safeLang, activeScenarioIdx, vocabulary);
                const item = (set && set[round]) || reviewItemAt(activeScenarioIdx, round, vocabulary);

                if (item) {
                    const charName = activeCharacter?.name || 'Miko';
                    const carriedOver = item.source === 'due'
                        ? " Let's warm up an older word first."
                        : '';
                    const reviewGreeting = `Quick memory check, my friend! 🐾${carriedOver} What's the ${targetLangName} word for "${item.meaning}"?`;
                    setMessages([{ role: 'assistant', content: `${charName} here. ${reviewGreeting}` }]);
                    setIsLoading(false);
                    if (!isMuted && isMounted.current) {
                        aiService.generateSpeech(
                            buildSpeechText(reviewGreeting),
                            resolvedCharacter?.voice || 'alloy',
                            targetLang?.name || null
                        ).then(audioUrl => {
                            if (audioUrl && isMounted.current) {
                                audioRef.current.src = audioUrl;
                                audioRef.current.play().catch(() => {});
                            }
                        });
                    }
                    return;
                }

                // No review set could be built at all — fall back to the old prompt.
                levelNote = `Greet the user briefly as ${activeCharacter?.name || 'Miko'}. The active scenario is: '${activeScenario}'. The user has learned these words: [${taughtVocab}]. Start a fun, low-pressure review quiz! Ask them: "What's the ${targetLangName} word for [pick a random meaning from the list]?" Do NOT teach new words. Do NOT use bold text. Keep it playful and encouraging.`;
            } else if (levelId === 'basic') {
                levelNote = `Greet the user briefly (2 sentences max) introducing yourself as ${activeCharacter?.name || 'Miko'}. Use mostly ${nativeLangName}. The active scenario is: '${activeScenario}'. The user currently ONLY knows these target words: [${taughtVocab}]. Ask them to combine SPECIFIC words by naming the exact words they should use. Give a word order hint.`;
            } else if (levelId === 'conversational') {
                levelNote = `Greet the user mostly in transliterated ${targetLangName} with ${nativeLangName} translations in parentheses. Introduce yourself as ${activeCharacter?.name || 'Miko'}. The active scenario is: '${activeScenario}'. The user currently ONLY knows these target words: [${taughtVocab}]. Speak in character as a true roleplay partner and ask exactly ONE conversational question related to this scenario.`;
            } else {
                // fluent
                levelNote = `Greet the user ENTIRELY in transliterated ${targetLangName}. No ${nativeLangName} at all. The active scenario is: '${activeScenario}'. Speak naturally and casually like a local friend starting a conversation about this scenario.`;
            }

            const rawGreeting = await aiService.getResponse(
                `[GREETING ONLY — do not start a conversation, just greet the user. ${levelNote}]`,
                topicName,
                activeCharacter,
                nativeLang,
                targetLang,
                false,
                levelId
            );
            const aiGreeting = rawGreeting?.content || rawGreeting;
            const storedGreeting = aiGreeting
                .replace(/<word>(.*?)<\/word>/g, '$1')
                .replace(/<shadow>(.*?)<\/shadow>/gs, '$1')
                .trim();
            const greetingSpeechText = buildSpeechText(aiGreeting);

            // Pre-fetch audio to sync with text rendering
            let audioUrl = null;
            if (!isMuted && isMounted.current) {
                audioUrl = await aiService.generateSpeech(greetingSpeechText, resolvedCharacter?.voice || 'alloy', targetLang?.name || null);
            }

            setMessages([{ role: 'assistant', content: storedGreeting }]);

            // Play voice immediately now that text is visible
            if (audioUrl && isMounted.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
            }

            setIsLoading(false);
        };

        if (inputMode === 'voice') {
            prepare().catch(() => { });
        }

        greet();
        return () => {
            isMounted.current = false;
            aiService.resetHistory();
            audioRef.current.pause();
            audioRef.current.src = ""; // Clear source to stop buffering/playback
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
                callTimerRef.current = null;
            }
        };
    }, [topicName]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);



    useEffect(() => {
        const nativeLangName = nativeLang?.name || 'English';
        const targetLangName = targetLang?.name || 'English';
        const pending = [];
        messages.forEach((msg, idx) => {
            if (msg.role !== 'user') return;
            if (!hasTargetScript(msg.content)) return;
            if (userTransliterations[idx]) return;
            pending.push({ idx, text: msg.content });
        });
        if (pending.length === 0) return;

        let cancelled = false;
        const run = async () => {
            for (const item of pending) {
                try {
                    const data = await aiService.transliterate(item.text, targetLangName, nativeLangName);
                    if (cancelled) return;
                    if (data?.transliteration) {
                        const formatted = formatTransliteration(data.transliteration, nativeLang);
                        setUserTransliterations(prev => ({ ...prev, [item.idx]: formatted }));
                    }
                } catch { /* ignore */ }
            }
        };
        run();
        return () => { cancelled = true; };
    }, [messages, nativeLang?.name, targetLang?.name]);

    const handleTranslate = async (index, text) => {
        if (translations[index]) {
            const newTrans = { ...translations };
            delete newTrans[index];
            setTranslations(newTrans);
            return;
        }

        if (!nativeLang.name) return;

        setIsLoading(true);
        const translated = await aiService.translate(text, nativeLang.name, targetLang?.name || null);
        const translatedText = translated?.translation;
        if (translatedText) {
            setTranslations(prev => ({ ...prev, [index]: translatedText }));

            // Read aloud the translation if not muted
            if (!isMuted && isMounted.current) {
                const audioUrl = await aiService.generateSpeech(translatedText, activeCharacter?.voice || 'alloy', targetLang?.name || null);
                if (audioUrl && isMounted.current) {
                    audioRef.current.src = audioUrl;
                    audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
                }
            }
        }
        setIsLoading(false);
    };

    const handleSend = async (text, isVoice = false) => {
        if (!text) return;
        // Voice STT sometimes mixes native script — strip it, but only if Latin chars remain
        if (isVoice && hasTargetScript(text)) {
            const stripped = stripTargetScript(text).trim();
            if ((stripped.match(/[\p{L}\p{N}]/gu) || []).length >= 2) {
                text = stripped;
            }
            // else: pure native script input — keep as-is so guard doesn't fire on leftover punctuation
        }

        const userMessageIndex = messages.length; // Store index for this user message
        setMessages(prev => [...prev, { role: 'user', content: text }]);

        // Scenarios advance automatically, but learners still type "continue"/"next"
        // out of habit (an older prompt invited it). Treat that as a nudge to move
        // on, never as an attempted answer. Whole-string match only, so a real
        // answer that happens to contain "next" is unaffected.
        const CONTINUE_WORDS = new Set([
            'continue', 'next', 'next please', 'next one', 'go on', 'goon',
            'proceed', 'move on', 'carry on', 'keep going', 'ready', 'im ready',
            // Acknowledgments. A learner types these when the tutor gave them
            // nothing to do; grading them as wrong answers is what produced
            // "You're getting there!" in response to "okay".
            'okay', 'ok', 'okey', 'sure', 'got it', 'gotit', 'yes', 'yeah', 'yep',
            'hmm', 'hm', 'alright', 'right', 'cool', 'done', 'understood', 'k',
        ]);
        const isContinueRequest = CONTINUE_WORDS.has(
            (text || '').trim().toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
        );

        // Track user's words (only track words longer than 3 characters)
        const userWords = isContinueRequest ? null : text.match(/[\p{L}]{2,}/gu);
        if (userWords) {
            userWords.forEach(word => {
                wordTracker.addWord(word);
            });
        }

        setIsLoading(true);

        try {
            // -- 1. DETERMINE CURRENT STATE --
            const currentRepeats = progress?.successfulRepeats || 0;
            const currentInScenario = currentRepeats % CYCLE_SIZE;

            const isCurrentlyTeaching = currentInScenario < 5;
            const isCurrentlyInReview = currentInScenario >= 5 && currentInScenario < 8;
            const isCurrentlyInBasic = currentInScenario >= 8 && currentInScenario < 11;
            const isCurrentlyInConvo = currentInScenario >= 11;

            const searchParamsVal = new URL(window.location.href).searchParams;
            const scenarioIdxForMatch = scenarioIndexFor(currentRepeats, searchParamsVal.get('scenario'));

            const scenarioDataForMatch = CURRICULUM[safeLang]?.[scenarioIdxForMatch] || { vocabulary: [], phrases: [], conversations: [] };

            // -- 2. EVALUATE USER INPUT (MATCHING) --
            const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
            const promptedPhrase = extractPromptedPhrase(lastAssistant?.content || '');
            const threshold = 0.5;
            const actual = (text || '').replace(/[.!?]+$/g, '').trim();
            // Detect pure native script (e.g. Telugu) — normalizeLatin strips everything, so local match won't work
            const isPureNativeScript = actual.length > 0 && normalizeLatin(actual).length === 0;

            // Guard: reject trivial input (empty, punctuation-only, single char)
            const meaningfulChars = (actual.match(/[\p{L}\p{N}]/gu) || []).length;
            if (meaningfulChars < 2) {
                setMessages(prev => [...prev, { role: 'assistant', content: "Hmm, I didn't catch that! Type your answer and I'll check it. 😊" }]);
                setIsLoading(false);
                return;
            }

            let matchRatio = 0;
            let displayPhrase = null;
            let phraseExpectedCorrect = null;
            let reviewExpectedWord = null;
            let reviewItem = null;   // { word, meaning, source } when in a review step
            let matchCoverage = 0;   // fraction of the target's words actually produced

            if (isCurrentlyTeaching && promptedPhrase) {
                ({ ratio: matchRatio, coverage: matchCoverage } =
                    scoreAgainst(actual, promptedPhrase, altsFor(promptedPhrase)));
                displayPhrase = promptedPhrase;
            } else if (isCurrentlyInReview) {
                const round = currentInScenario - 5;
                reviewItem = reviewItemAt(scenarioIdxForMatch, round, scenarioDataForMatch.vocabulary);
                reviewExpectedWord = reviewItem?.word || null;
                if (reviewExpectedWord) {
                    ({ ratio: matchRatio, coverage: matchCoverage } =
                        scoreAgainst(actual, reviewExpectedWord, altsFor(reviewExpectedWord)));
                    displayPhrase = reviewExpectedWord;
                }
            } else if (isCurrentlyInBasic) {
                const basicIdx = currentInScenario - 8;
                const basicItem = scenarioDataForMatch.phrases?.[basicIdx];
                phraseExpectedCorrect = basicItem?.correct || null;
                if (phraseExpectedCorrect) {
                    const acceptables = basicItem?.acceptable || [];
                    const bestAltScore = acceptables.reduce((best, alt) =>
                        Math.max(best, similarityRatioLatin(actual, alt)), 0);
                    if (bestAltScore >= 0.8) {
                        matchRatio = 1.0;
                    } else {
                        matchRatio = Math.max(similarityRatioLatin(actual, phraseExpectedCorrect), bestAltScore);
                    }
                    matchCoverage = bestCoverage(actual, phraseExpectedCorrect, acceptables);
                    displayPhrase = phraseExpectedCorrect;
                }
            } else if (isCurrentlyInConvo) {
                const convoIdx = currentInScenario - 11;
                const convoItem = scenarioDataForMatch.conversations?.[convoIdx];
                phraseExpectedCorrect = convoItem?.correct || null;
                if (phraseExpectedCorrect) {
                    const acceptables = convoItem?.acceptable || [];
                    const bestAltScore = acceptables.reduce((best, alt) =>
                        Math.max(best, similarityRatioLatin(actual, alt)), 0);
                    if (bestAltScore >= 0.8) {
                        matchRatio = 1.0;
                    } else {
                        matchRatio = Math.max(similarityRatioLatin(actual, phraseExpectedCorrect), bestAltScore);
                    }
                    matchCoverage = bestCoverage(actual, phraseExpectedCorrect, acceptables);
                    displayPhrase = phraseExpectedCorrect;
                }
            }

            /* Both conditions must hold: close enough as a string AND actually
               containing the words the target needs. Levenshtein alone accepted
               "Emiti" for "Idhi emiti?" at exactly 0.500. */
            const hasExpectation = Boolean(promptedPhrase || reviewExpectedWord || phraseExpectedCorrect);
            const expectedForEcho = promptedPhrase || reviewExpectedWord || phraseExpectedCorrect;
            const echoedTutor = hasExpectation
                && tutorModelled(actual, lastAssistant?.content, expectedForEcho);
            const hasCorrectMatch = hasExpectation
                && (echoedTutor || (matchRatio >= threshold && matchCoverage >= COVERAGE_FLOOR));
            const isLastScenarioStep = currentInScenario === 14 && hasCorrectMatch;

            // -- 3. SCORE TRACKING & CORRECTIONS --
            let expectedCorrectionStr = null;
            if (isCurrentlyTeaching) expectedCorrectionStr = promptedPhrase;
            else if (isCurrentlyInReview) expectedCorrectionStr = reviewExpectedWord;
            else expectedCorrectionStr = phraseExpectedCorrect;

            if (hasCorrectMatch) {
                setMatchScores(prev => ({ ...prev, [userMessageIndex]: Math.round(matchRatio * 100) }));
                if (matchRatio < 0.95 && expectedCorrectionStr) {
                   setCorrections(prev => ({ ...prev, [userMessageIndex]: { expected: expectedCorrectionStr, ratio: matchRatio } }));
                }
            }

            /* Put a newly taught word on the ladder once the learner has said it
               back correctly. Sourced from the curriculum rather than the bold
               text in the AI's message, so the record is deterministic even if
               the model paraphrases. Idempotent server-side, so a word taught in
               more than one lesson keeps its existing schedule. */
            if (hasCorrectMatch && isCurrentlyTeaching) {
                for (const taught of teachSliceFor(scenarioDataForMatch.vocabulary, currentInScenario)) {
                    if (!taught?.word) continue;
                    recordTaughtWord({
                        lang: safeLang,
                        word: taught.word,
                        meaning: taught.meaning,
                        scenario: scenarioDataForMatch.scenario,
                    });
                }
            }

            // -- 4. TRANSITION SYSTEM MESSAGES (fire before AI call, based on current state) --
            if (hasCorrectMatch) {
                const activeScenario = scenarioDataForMatch.scenario || 'Learning';
                if (isLastScenarioStep) {
                    setLevelUpToast(`🏆 Scenario Complete: ${activeScenario}!`);
                    setTimeout(() => setLevelUpToast(null), 5000);
                    setMessages(prev => [...prev, { role: 'system', content: '✨ **Scenario Mastered!** You\'ve completed all 15 steps. Moving to the next challenge...' }]);
                    // Lesson done — drop its cached triplet so a replay rebuilds
                    // from whatever is due at that point, not this session's set.
                    clearReviewSet(safeLang, scenarioIdxForMatch);
                } else if (isCurrentlyTeaching && currentInScenario === 4) {
                    setMessages(prev => [...prev, { role: 'system', content: '🎓 **Vocabulary done** — now a quick check on a few of them.' }]);
                } else if (isCurrentlyInReview && currentInScenario === 7) {
                    setMessages(prev => [...prev, { role: 'system', content: '🎓 **Review passed** — now let\'s build whole sentences.' }]);
                }
            }

            // -- 5. META-NOTE CONSTRUCTION (uses optimistic +1 so AI gets the right next step) --
            const optimisticNextRepeats = hasCorrectMatch ? currentRepeats + 1 : currentRepeats;
            const nextInScenario = optimisticNextRepeats % CYCLE_SIZE;
            const HELP_WORDS = ["don't know", "dont know", "i don't know", "idk", "how", "how?", "help", "hint", "tell me", "show me", "not sure", "what", "what?", "confused", "no idea", "repeat", "again", "what part", "not clear"];
            const isHelpRequest = HELP_WORDS.some(h => (text || '').trim().toLowerCase().includes(h));
            const lastAssistantContent = lastAssistant?.content || '';
            const lastWasFailure = lastAssistantContent.includes('Not quite') || lastAssistantContent.includes('try again') || lastAssistantContent.includes('not quite');

            // -- REVIEW FAST PATH: bypass AI entirely (avoids AI ignoring SUCCESS CONFIRMED) --
            if (isCurrentlyInReview) {
                const round = currentInScenario - 5;
                const currentMeaning = reviewItem?.meaning || 'that word';
                const praise = FLAT_PRAISE[currentRepeats % FLAT_PRAISE.length];

                /* A learner asking a question is not a wrong answer. Hand it to
                   the model instead of grading it — falling through to the normal
                   AI path, whose metaNote already knows how to re-ask a review
                   question. Checked after the matcher, so "Emiti?" still scores. */
                const isLearnerQuestion = !hasCorrectMatch && (isHelpRequest || looksLikeQuestion(text));

                if (!isLearnerQuestion) {
                    const misses = consecutiveMisses(messages);
                    const revealed = answerWasRevealed(lastAssistantContent, reviewExpectedWord);

                    /* Feed the outcome back into the ladder — but a correct answer
                       typed straight after being shown the answer is a parrot, not
                       recall, so it is recorded as a lapse. Otherwise the scheduler
                       learns "they know this" from a word it handed over. */
                    if (reviewExpectedWord) {
                        recordReview({
                            lang: safeLang,
                            word: reviewExpectedWord,
                            outcome: gradeOutcome({
                                correct: Boolean(hasCorrectMatch),
                                misses,
                                revealed,
                            }),
                            meaning: reviewItem?.meaning,
                            scenario: scenarioDataForMatch.scenario,
                        });
                    }

                    let reviewResponse;
                    const advance = async () => {
                        const progressRes = await api.post('/api/progress/increment').catch(() => null);
                        if (progressRes) setProgress(progressRes);
                    };
                    const nextQuestion = () => {
                        const nextItem = reviewItemAt(scenarioIdxForMatch, round + 1, scenarioDataForMatch.vocabulary);
                        return `What's the word for "${nextItem?.meaning || 'hello'}"?`;
                    };

                    if (hasCorrectMatch) {
                        await advance();
                        const firstPhrase = drillPrompt(scenarioDataForMatch.phrases, 0);
                        reviewResponse = currentInScenario === 7
                            ? (firstPhrase || "Let's build a sentence.")   // banner carries the transition
                            : `${praise} ${nextQuestion()}`;
                    } else if (misses >= REVIEW_RETRY_LIMIT) {
                        /* Out of retries: show the answer and MOVE ON. Previously the
                           reveal message itself contained "try again", which kept
                           lastWasFailure true forever, so the same line repeated
                           indefinitely with no skip and no escape — and since
                           progress only increments on a correct match, the whole
                           course was blocked behind one word. The word is now a
                           lapse in the ladder, so it comes back on its own. */
                        await advance();
                        const shown = reviewExpectedWord ? `It's **${reviewExpectedWord}**.` : '';
                        const firstPhrase2 = drillPrompt(scenarioDataForMatch.phrases, 0);
                        reviewResponse = currentInScenario === 7
                            ? `${shown} We'll come back to that one. ${firstPhrase2 || ''}`.trim()
                            : `${shown} We'll come back to it later — ${nextQuestion()}`;
                    } else {
                        reviewResponse = `Not quite. What's the word for "${currentMeaning}"?`;
                    }

                    setMessages(prev => [...prev, { role: 'assistant', content: reviewResponse }]);
                    if (!isMuted && isMounted.current) {
                        const audioUrl = await aiService.generateSpeech(reviewResponse, resolvedCharacter?.voice || 'alloy', targetLang?.name || null);
                        if (audioUrl && isMounted.current) {
                            audioRef.current.src = audioUrl;
                            audioRef.current.play().catch(() => {});
                        }
                    }
                    setIsLoading(false);
                    return;
                }
                // isLearnerQuestion: fall through to the model.
            }

            /* -- PHRASE FAST PATH: steps 9-11.
               The model was told "Do NOT give ANY part of the answer — not even
               as an example or tip" and did it anyway on the very first phrase
               step: "you can say Namaskaram, nenu bagunnanu. Now, go ahead and
               say it!" That reduces the drill to copy-typing. The prompts are
               already authored in the curriculum, so emit them directly — same
               reasoning as the teaching and review paths. Conversation steps
               (12-15) stay with the model, where roleplay is the point. */
            if (isCurrentlyInBasic) {
                const phraseIdx = currentInScenario - 8;
                const phraseItem = scenarioDataForMatch.phrases?.[phraseIdx];
                const phraseIsQuestion = !hasCorrectMatch && (isHelpRequest || looksLikeQuestion(text));

                if (phraseItem && !phraseIsQuestion && !isContinueRequest) {
                    const misses = consecutiveMisses(messages);
                    const praise = FLAT_PRAISE[currentRepeats % FLAT_PRAISE.length];
                    const atBoundary = phraseIdx + 1 >= (scenarioDataForMatch.phrases?.length || 0);
                    const nextUp = () => drillPrompt(scenarioDataForMatch.phrases, phraseIdx + 1)
                        // banner announces the move to conversation; don't repeat it
                        || drillPrompt(scenarioDataForMatch.conversations, 0)
                        || "Let's talk.";

                    const out = [];
                    if (hasCorrectMatch) {
                        const pr = await api.post('/api/progress/increment').catch(() => null);
                        if (pr) setProgress(pr);
                        // Explains the answer just given, so it precedes the next prompt.
                        const noteText = noteForAnswer(phraseItem, text);
                        if (noteText) out.push({ role: 'system', content: `💡 ${noteText}` });
                        if (atBoundary) {
                            /* The "Phrases done" banner lives in the AI path, which
                               sits after this fast path's early return — so on the
                               path that actually runs it never fired, while praise
                               was suppressed here in anticipation of it. The last
                               correct phrase was met with silence, then an
                               unannounced jump into conversation. Announce it where
                               the transition actually happens. */
                            out.push({ role: 'assistant', content: praise });
                            out.push({ role: 'system', content: '🎓 **Phrases done** — now real conversation.' });
                            out.push({ role: 'assistant', content: nextUp() });
                        } else {
                            out.push({ role: 'assistant', content: `${praise} ${nextUp()}` });
                        }
                    } else if (misses >= REVIEW_RETRY_LIMIT) {
                        const pr = await api.post('/api/progress/increment').catch(() => null);
                        if (pr) setProgress(pr);
                        out.push({ role: 'assistant', content: `It's **${phraseItem.correct}**. We'll come back to this — ${nextUp()}` });
                    } else {
                        const otherLang = crossLanguageMatch(text, {
                            scenarioIdx: scenarioIdxForMatch, section: 'phrases', itemIdx: phraseIdx,
                        });
                        const hint = phraseItem.hint ? ` Hint: ${phraseItem.hint}.` : '';
                        out.push({
                            role: 'assistant',
                            content: otherLang
                                ? `That's ${otherLang}, not ${safeLang} — a good answer to the wrong question. In ${safeLang}:${hint} ${drillPrompt(scenarioDataForMatch.phrases, phraseIdx)}`
                                : `Not quite.${hint} ${drillPrompt(scenarioDataForMatch.phrases, phraseIdx)}`,
                        });
                    }

                    setMessages(prev => [...prev, ...out]);
                    const spoken = out.filter(m => m.role === 'assistant').map(m => m.content).join(' ');
                    if (!isMuted && isMounted.current && spoken) {
                        const audioUrl = await aiService.generateSpeech(buildSpeechText(spoken), resolvedCharacter?.voice || 'alloy', targetLang?.name || null);
                        if (audioUrl && isMounted.current) {
                            audioRef.current.src = audioUrl;
                            audioRef.current.play().catch(() => {});
                        }
                    }
                    setIsLoading(false);
                    return;
                }
                // question or acknowledgment: fall through to the model.
            }

            /* -- TEACHING FAST PATH: bypass the AI for steps 0-4.
               The line is fully determined by the curriculum, and letting the
               model improvise a "scene" around a bare gloss is what produced
               "you want to ask 'What is this?' ... say Emiti" — a gloss inflated
               into a sentence the single word does not cover. Same reason the
               review path is templated. */
            if (isCurrentlyTeaching) {
                const vocab = scenarioDataForMatch.vocabulary || [];
                const PRAISE = ['Good.', 'Correct.', 'Right.', 'Yes.'];
                const praise = PRAISE[currentRepeats % PRAISE.length];

                let teachResponse;
                if (isContinueRequest) {
                    // Not an answer — re-present the current word without grading it.
                    const current = teachSliceFor(vocab, currentInScenario);
                    teachResponse = current.length
                        ? buildTeachingStep(current, 'Sure — here it is again. 🐾')
                        : "Let's keep going!";
                } else if (hasCorrectMatch && nextInScenario < 5) {
                    teachResponse = buildTeachingStep(teachSliceFor(vocab, nextInScenario), `${praise} 🐾`);
                } else if (hasCorrectMatch) {
                    // Fifth word done — open the review quiz with its first question
                    // rather than handing off to the AI with nothing to ask.
                    const first = reviewItemAt(scenarioIdxForMatch, 0, vocab);
                    // No praise prefix at a stage boundary: the banner above it
                    // already reports the success, and the praise would read as
                    // stranded underneath the announcement.
                    teachResponse = first
                        ? `What's the ${targetLangName} word for "${first.meaning}"?`
                        : `${drillPrompt(scenarioDataForMatch.phrases, 0) || "Let's build a sentence."}`;
                } else {
                    const current = teachSliceFor(vocab, currentInScenario);
                    teachResponse = current.length
                        ? `Not quite — here it is again. ${buildTeachingStep(current)}`
                        : "Hmm, let's try that once more.";
                }

                if (hasCorrectMatch) {
                    const progressRes = await api.post('/api/progress/increment').catch(() => null);
                    if (progressRes) setProgress(progressRes);
                }

                setMessages(prev => [...prev, { role: 'assistant', content: teachResponse }]);
                if (!isMuted && isMounted.current) {
                    const audioUrl = await aiService.generateSpeech(
                        buildSpeechText(teachResponse),
                        resolvedCharacter?.voice || 'alloy',
                        targetLang?.name || null
                    );
                    if (audioUrl && isMounted.current) {
                        audioRef.current.src = audioUrl;
                        audioRef.current.play().catch(() => {});
                    }
                }
                setIsLoading(false);
                return;
            }

            // Build grammarNote for post-answer feedback (only shown AFTER correct answer)
            let postAnswerGrammarNote = '';
            if (isCurrentlyInBasic) {
                const basicIdx = currentInScenario - 8;
                postAnswerGrammarNote = noteForAnswer(scenarioDataForMatch.phrases?.[basicIdx], actual);
            } else if (isCurrentlyInConvo) {
                const convoIdx = currentInScenario - 11;
                postAnswerGrammarNote = noteForAnswer(scenarioDataForMatch.conversations?.[convoIdx], actual);
            }
            // Deliberately NOT handed to the model. It used to arrive as
            // "[GRAMMAR TIP to share: ...]" and get paraphrased — the same
            // mechanism that inflated a one-word gloss into a whole sentence.
            // It is appended verbatim after the reply instead (see below).
            const grammarFeedback = postAnswerGrammarNote
                ? ' Do NOT explain any grammar; a separate note handles that.'
                : '';

            let evalNote = '';
            if (isLastScenarioStep) {
                evalNote = `[SYSTEM: SUCCESS CONFIRMED. The user nailed the final challenge of the scenario! CELEBRATE warmly and congratulate them for mastering this topic! Do NOT introduce any new words yet. Tell them the next scenario has already unlocked and they can simply keep chatting to begin it. Do NOT mention any button, and do NOT tell them to type anything specific - there is no such control in the app.${grammarFeedback}]`;
            } else if (hasCorrectMatch) {
                const matchDetail = displayPhrase ? `matched "${displayPhrase}"` : 'was correct';
                const fuzzyCorrection = (matchRatio < 0.95 && expectedCorrectionStr) ? `![CRITICAL GRAMMAR/SPELLING ERROR: The user said "${actual}" but the formal/correct target is "${expectedCorrectionStr}". You MUST explicitly point out their missing word or spelling mistake before praising them!]` : '';
                evalNote = `[SYSTEM: SUCCESS CONFIRMED. The user ${matchDetail}. ${fuzzyCorrection} Acknowledge with ONE flat word and no exclamation mark, rotating "Good." / "Correct." / "Right." / "Yes." — save real enthusiasm for the end of a stage, or it stops meaning anything. Do NOT repeat the meaning or translation back to the user — they already know it. Just acknowledge and move on.${grammarFeedback} NEVER preview or reference the next target phrase in your current response. Do NOT evaluate again.]`;
            } else if (isContinueRequest) {
                evalNote = `[SYSTEM: The user is asking to move on, not answering. Do NOT grade or correct their message, and do NOT say they were wrong. Briefly acknowledge and present the next challenge for this scenario.]`;
            } else if (isCurrentlyInReview) {
                evalNote = `[SYSTEM: The learner asked you a QUESTION instead of answering: "${actual}". Do NOT grade it, do NOT say they were wrong, and do NOT tell them the answer to the quiz. Answer their question directly and briefly in ${nativeLang?.name || 'English'} — if they asked whether another word also works, say plainly whether it does and how it differs. Then re-ask the quiz question: what is the ${targetLangName} word for "${expectedCorrectionStr ? (reviewItem?.meaning || 'that word') : 'that word'}"?]`;
            } else if (isHelpRequest) {
                evalNote = `[SYSTEM: HELP REQUEST. The user is stuck. Give a helpful hint then re-ask the prompt.]`;
            } else if (lastWasFailure) {
                evalNote = `[SYSTEM: RETRY. User failed previously. Show the hint and re-ask the same prompt.]`;
            } else {
                const targetHint = expectedCorrectionStr
                    ? ` The ONLY accepted answer is "${expectedCorrectionStr}". Be strict: only accept a close match to this exact phrase. If the user typed something unrelated, random, or just punctuation, tell them it's not quite right and ask them to try again — do NOT reveal the answer.`
                    : '';
                const nativeScriptHint = isPureNativeScript
                    ? ` The user answered in ${targetLang?.name || 'target language'} native script — evaluate if it is semantically equivalent to the expected answer.`
                    : '';
                /* Answering in another language they've studied here is a distinct
                   mistake from getting the vocabulary wrong, and needs naming as
                   one — otherwise the learner re-reads a correct sentence looking
                   for a typo. */
                const wrongLang = isCurrentlyInBasic || isCurrentlyInConvo
                    ? crossLanguageMatch(actual, {
                        scenarioIdx: scenarioIdxForMatch,
                        section: isCurrentlyInBasic ? 'phrases' : 'conversations',
                        itemIdx: currentInScenario - (isCurrentlyInBasic ? 8 : 11),
                    })
                    : null;
                const wrongLangHint = wrongLang
                    ? ` IMPORTANT: the user answered in ${wrongLang}, not ${targetLangName} — their sentence is correct, just in the wrong language. Say exactly that first, warmly and in one line, before re-asking. Do NOT imply their ${wrongLang} was wrong, and do NOT reveal the ${targetLangName} answer.`
                    : '';
                evalNote = `[SYSTEM: EVALUATE NOW. The user is attempting the exercise.${targetHint}${nativeScriptHint}${wrongLangHint}]`;
            }

            const activeScenarioLabel = scenarioDataForMatch.scenario || 'Learning';
            // For SUCCESS: evalNote goes as a system-role override (highest authority, AI cannot ignore it).
            // For FAILURE: evalNote stays in the user message as before.
            const systemOverride = (hasCorrectMatch || isLastScenarioStep) ? evalNote : null;
            const contextNote = `\n[SCENARIO: '${activeScenarioLabel}'].`;
            let metaNote = systemOverride ? contextNote : (evalNote + contextNote);

            // Instructions for NEXT step
            if (!isLastScenarioStep) {
                if (nextInScenario < 5) {
                    const wordObj = scenarioDataForMatch.vocabulary[nextInScenario] || { word: 'Word', meaning: 'Meaning' };
                    // Normally unreachable — the teaching fast path returns before this.
                    // Kept correct anyway. "Vary the SCENE" is what inflated a bare
                    // gloss into a sentence the word did not cover ("What is this?"
                    // for Emiti, which only means "what"), so words whose gloss is
                    // not a standalone English utterance now carry an authored line
                    // the model must reproduce verbatim.
                    const authored = wordObj.teach
                        ? ` Use EXACTLY this wording, with the word in bold: "${wordObj.teach.replace('{w}', `**${wordObj.word}**`)}" Then tell them to say it. Do NOT paraphrase and do NOT expand the meaning.`
                        : ` Vary the scene you build around each word — a question, a mini-story, or something the user already said — but never state a meaning broader than the single word: "${wordObj.meaning}" is the whole of it. Always close with a direct instruction to say the word ("... say **${wordObj.word}**") so the user knows it is their turn.`;
                    metaNote += `\n[NEXT: TEACH word **${wordObj.word}** (${wordObj.meaning}).${authored} NEVER say "try", "give it a try", or "give it a go".]`;
                } else if (nextInScenario < 8) {
                    const round = nextInScenario - 5;
                    const nextReview = reviewItemAt(scenarioIdxForMatch, round, scenarioDataForMatch.vocabulary);
                    const meaning = nextReview?.meaning || 'Hello';
                    metaNote += `\n[NEXT: REVIEW. Ask "What's the word for '${meaning}'?". NEVER say "try", "give it a try", or "give it a go".]`;
                } else if (nextInScenario < 11) {
                    const phraseIdx = nextInScenario - 8;
                    const targetPhrase = scenarioDataForMatch.phrases?.[phraseIdx];
                    if (targetPhrase) {
                        const acceptableStr = targetPhrase.acceptable?.length ? ` Also accept (as 100% correct): ${targetPhrase.acceptable.join(', ')}.` : '';
                        metaNote += `\n[NEXT: BASIC PHRASE. Target translation: "${targetPhrase.correct}".${acceptableStr} Prompt the user: "${targetPhrase.prompt}" WITHOUT revealing the translation up front. Do NOT give ANY part of the answer — not even as an example or tip. Weave the hint naturally into conversation — do NOT write equations like "Think of it as X + Y" or "X + Y + Z". Phrase it conversationally like a real tutor. NEVER say "try", "give it a try", or "give it a go". Match → success:true. Else → success:false.]`;
                    }
                } else {
                    const convoIdx = nextInScenario - 11;
                    const targetConvo = scenarioDataForMatch.conversations?.[convoIdx];
                    if (targetConvo) {
                        const acceptableStr = targetConvo.acceptable?.length ? ` Also accept (as 100% correct): ${targetConvo.acceptable.join(', ')}.` : '';
                        metaNote += `\n[NEXT: CONVO MODE. Target translation: "${targetConvo.correct}".${acceptableStr} Set the scene naturally and prompt: "${targetConvo.prompt}". Do NOT reveal ANY part of the translation — not even as an example, tip, or "native touch". Let the user figure it out entirely from context and previously learned words. Weave the hint "${targetConvo.hint}" conversationally — no equations like "X + Y". NEVER say "try", "give it a try", or "give it a go". Match → success:true. Else → success:false.]`;
                    }
                }
            }

            if (isCurrentlyInBasic && (nextInScenario === 11) && hasCorrectMatch) {
                setMessages(prev => [...prev, { role: 'system', content: '🎓 **Phrases done** — now real conversation.' }]);
            }

            // Fire progress increment and AI response in parallel — no more sequential wait
            const progressPromise = hasCorrectMatch
                ? api.post('/api/progress/increment').catch(e => { console.error('Failed to increment progress', e); return null; })
                : Promise.resolve(null);

            let rawResponse = await aiService.getResponse(text, topicName, activeCharacter, nativeLang, targetLang, false, userLevel, metaNote, systemOverride);

            // Fallback safety
            if (!rawResponse || (!rawResponse.content && typeof rawResponse !== 'string')) {
                rawResponse = await aiService.getResponse(text, topicName, activeCharacter, nativeLang, targetLang, false, userLevel, metaNote, systemOverride);
            }

            // Settle progress update (almost certainly already resolved by the time AI responds)
            const progressRes = await progressPromise;
            if (progressRes) {
                setProgress(progressRes);
            }

            let botResponse = rawResponse?.content || rawResponse;
            if (typeof botResponse !== 'string') botResponse = '';

            const LEVEL_LABELS = { zero: 'Beginner', basic: 'Basic', conversational: 'Conversational', fluent: 'Fluent' };
            const charName = resolvedCharacter?.name || activeCharacter?.name || 'Miko';

            const recalibrateMatch = (botResponse || '').match(/<recalibrate>(zero|basic|conversational|fluent)<\/recalibrate>/);
            let responseWithoutMeta = (botResponse || '').replace(/<recalibrate>.*?<\/recalibrate>/g, '');
            if (recalibrateMatch) {
                const newLevelId = recalibrateMatch[1];
                const newLevel = { id: newLevelId, label: LEVEL_LABELS[newLevelId], appDetected: true };
                setUserLevel(newLevelId);
                localStorage.setItem('linguapaws_level', JSON.stringify(newLevel));
                api.put('/api/settings', { englishLevel: newLevel }).catch(() => { });
                setRecalibrationToast(`${charName} adjusted to your level: ${LEVEL_LABELS[newLevelId]} 🎯`);
                setTimeout(() => setRecalibrationToast(null), 4000);
            }

            const levelUpMatch = responseWithoutMeta.match(/<level_up>(zero|basic|conversational|fluent)<\/level_up>/);
            responseWithoutMeta = responseWithoutMeta.replace(/<level_up>.*?<\/level_up>/g, '');
            if (levelUpMatch) {
                const newLevelId = levelUpMatch[1];
                const newLevel = { id: newLevelId, label: LEVEL_LABELS[newLevelId], appDetected: true };
                setUserLevel(newLevelId);
                localStorage.setItem('linguapaws_level', JSON.stringify(newLevel));
                api.put('/api/settings', { englishLevel: newLevel }).catch(() => { });
                const LEVEL_UP_MESSAGES = {
                    basic: "🌿 You've graduated from mimicry! Time to start making choices.",
                    conversational: "🌳 Amazing progress! Let's start having real conversations.",
                    fluent: "⭐ You're ready for full immersion! No more training wheels.",
                };
                setLevelUpToast(LEVEL_UP_MESSAGES[newLevelId] || `🎉 Level up: ${LEVEL_LABELS[newLevelId]}!`);
                setTimeout(() => setLevelUpToast(null), 6000);
            }

            let statusTag = 'missing';
            if (rawResponse?.success !== undefined && rawResponse.success !== null) {
                statusTag = rawResponse.success ? 'true' : 'false';
            } else {
                const successMatch = responseWithoutMeta.match(/<success>\s*(true|false)\s*<\/success>/i);
                if (successMatch) {
                    statusTag = successMatch[1].toLowerCase();
                }
            }
            responseWithoutMeta = responseWithoutMeta.replace(/<success>.*?<\/success>/gi, '');

            if (statusTag === 'true' || statusTag === 'false') {
                if (statusTag === 'true' && userLevel !== 'zero' && !hasCorrectMatch) {
                    console.log('[Progress] AI reported success (fallback), calling /api/progress/increment...');
                    api.post('/api/progress/increment')
                        .then(progressResult => {
                            setProgress(progressResult);
                            if (progressResult.leveledUp) {
                                setUserLevel(progressResult.level);
                                localStorage.setItem('linguapaws_level', JSON.stringify({
                                    id: progressResult.level,
                                    label: progressResult.levelLabel,
                                    appDetected: true,
                                }));
                            }
                        })
                        .catch(err => console.warn('Failed to increment AI progress:', err));
                }
                setSentenceSuccesses(prev => ({ ...prev, [userMessageIndex]: statusTag }));
            }

            // Strip <word> tags for display BUT keep <shadow> tags so ShadowCard renders inline
            const storedResponse = responseWithoutMeta
                .replace(/<word>(.*?)<\/word>/g, '$1')
                .replace(/<shadow>(.*?)<\/shadow>/gs, '$1')
                .trim();
            // Build TTS text: strips <phonetic> (no double-reading) and substitutes
            // native script from <tts> tags for authentic pronunciation
            const speechText = buildSpeechText(responseWithoutMeta);

            if (!storedResponse || !speechText) {
                throw new Error("Empty AI response generated; falling back to error message.");
            }

            // SPEED OPTIMIZATION: Use pre-fetched audio from backend if available
            let audioUrl = null;
            if (!isMuted && isMounted.current) {
                if (rawResponse.audioContent) {
                    // Convert base64 to Blob URL for instant playback
                    const byteCharacters = atob(rawResponse.audioContent);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'audio/mpeg' });
                    audioUrl = URL.createObjectURL(blob);
                } else {
                    // Fallback to separate fetch if backend TTS failed/skipped
                    audioUrl = await aiService.generateSpeech(speechText, activeCharacter?.voice || 'alloy', targetLang?.name || null);
                }
            }

            /* The tip explains the answer the learner just gave, but the model's
               reply already contains the NEXT prompt — appending the tip after it
               stranded the explanation below a new question and read as two
               consecutive tutor messages. It goes first. */
            const outgoing = [];
            if (postAnswerGrammarNote && hasCorrectMatch) {
                outgoing.push({ role: 'system', content: `💡 ${postAnswerGrammarNote}` });
            }
            outgoing.push({ role: 'assistant', content: storedResponse });
            /* If the learner asked a question mid-drill, the model answered it —
               but it does not reliably restate the task afterwards. Do it here so
               they are never left without something to do. */
            if (!hasCorrectMatch && (isCurrentlyInBasic || isCurrentlyInReview)) {
                const task = isCurrentlyInBasic
                    ? drillPrompt(scenarioDataForMatch.phrases, currentInScenario - 8)
                    : (reviewItem?.meaning ? `What's the ${targetLangName} word for "${reviewItem.meaning}"?` : null);
                if (task && !normalizeLatin(storedResponse).includes(normalizeLatin(task).slice(0, 24))) {
                    outgoing.push({ role: 'assistant', content: `So — ${task}` });
                }
            }
            setMessages(prev => [...prev, ...outgoing]);
            setIsLoading(false); // Unblock UI

            // Play voice immediately
            if (audioUrl && isMounted.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
            }
        } catch (err) {
            console.error('Chat send failed:', err);
            const prefix = activeCharacter?.id === 'miko' ? "Meow... " : "";
            const errorMsg = `${prefix}Oops, something went wrong: ${err.message}. Please try again later. 😿`;
            setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleRecording = async () => {
        if (isRecording) {
            const audioBlob = await stopRecording();
            if (audioBlob) {
                setIsLoading(true);
                // Check if the bot asked the user to repeat a target-language phrase
                // We look back past error messages to find the real context
                const expectingTarget = isAssistantExpectingTarget(messages);
                const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
                const targetText = lastAssistantMsg ? extractPromptedPhrase(lastAssistantMsg.content) : null;
                const contextPrompt = lastAssistantMsg ? lastAssistantMsg.content : null;
                const result = await aiService.transcribeAudio(audioBlob, nativeLang, targetLang, expectingTarget, targetText, contextPrompt) || {};
                const text = result.text;
                if (text) {
                    handleSend(text, true);
                } else {
                    const detail = result?.error || "I couldn't quite catch that.";
                    const prefix = activeCharacter?.id === 'miko' ? "Meow... " : "";
                    const errorMsg = `${prefix}${detail} Could you try again? 😿`;
                    setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);

                    if (!isMuted && isMounted.current) {
                        const audioUrl = await aiService.generateSpeech(errorMsg, activeCharacter?.voice || 'alloy', targetLang?.name || null);
                        if (audioUrl && isMounted.current) {
                            audioRef.current.src = audioUrl;
                            audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
                        }
                    }
                    setIsLoading(false);
                }
            }
        } else {
            // Pause current playback if user starts recording
            audioRef.current.pause();
            await startRecording();
        }
    };

    const handleReadAloud = async (text) => {
        if (isMuted) return; // Don't play if muted even on manual click, or alert user?
        setIsLoading(true);
        const speechText = buildSpeechText(text);
        const audioUrl = await aiService.generateSpeech(speechText, activeCharacter?.voice || 'alloy', targetLang?.name || null);
        if (audioUrl) {
            audioRef.current.src = audioUrl;
            audioRef.current.play();
        }
        setIsLoading(false);
    };

    // Existing accounts may still hold a target language saved before it was gated.
    // Say so plainly instead of teaching them a language they did not choose.
    if (!languageReady) {
        return (
            <div className="app-container" style={{
                height: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px', textAlign: 'center',
            }}>
                <div style={{ fontSize: '48px' }}>😺</div>
                <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>
                    {targetLangName} is coming soon
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '320px', margin: 0 }}>
                    Miko is still learning {targetLangName}. Right now the full course is
                    ready in {AVAILABLE_LANGUAGES.join(' and ')} — pick one of those to start practising.
                </p>
                <button
                    onClick={() => navigate('/learn-language')}
                    style={{
                        marginTop: '8px', padding: '14px 24px', borderRadius: '14px', border: 'none',
                        background: 'var(--accent-purple)', color: 'white', fontWeight: '700',
                        fontSize: '15px', cursor: 'pointer',
                    }}
                >
                    Choose a language
                </button>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        padding: '10px 18px', borderRadius: '12px', border: 'none',
                        background: 'transparent', color: 'var(--text-secondary)',
                        fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                    }}
                >
                    Back to home
                </button>
            </div>
        );
    }

    return (
        <div className="app-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
            {/* Header */}
            <div style={{
                padding: '12px 20px',
                background: 'white',
                borderBottom: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                    <ChevronLeft size={24} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        background: resolvedCharacter?.color || '#fef3c7',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        overflow: 'hidden'
                    }}>
                        {resolvedCharacter?.image ? (
                            <img src={resolvedCharacter.image} alt={resolvedCharacter.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            resolvedCharacter?.icon || '👤'
                        )}
                    </div>
                    <div>
                        <h4 style={{ fontSize: '15px', fontWeight: '700' }}>{resolvedCharacter?.name || 'Miko'}</h4>
                        <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }}></span>
                            {resolvedCharacter?.id ? (t[`${resolvedCharacter.id}_trait`] || resolvedCharacter.trait) : (t.coach_name || 'Coach')}
                        </span>
                    </div>
                </div>

                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMute}
                    style={{
                        background: 'white',
                        border: '1px solid #eee',
                        padding: '10px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        color: isMuted ? '#ef4444' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </motion.button>

                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                        const transcript = messages
                            .map((m, idx) => {
                                if (m.role !== 'user' && m.role !== 'assistant' && m.role !== 'system') return null;
                                const label = m.role === 'assistant' ? 'Tutor' : m.role === 'system' ? 'System' : 'Learner';

                                let clean = m.role === 'user' ? (userTransliterations[idx] || m.content) : m.content;

                                clean = stripTargetScript(clean)
                                    .replace(/<phonetic>.*?<\/phonetic>/gi, '')
                                    .replace(/<tts>.*?<\/tts>/gi, '')
                                    .replace(/<shadow>.*?<\/shadow>/gs, '')
                                    .replace(/<recalibrate>.*?<\/recalibrate>/gs, '')
                                    .replace(/<level_up>.*?<\/level_up>/gs, '')
                                    .replace(/<[^>]+>/g, '')
                                    .replace(/\*\*(.*?)\*\*/g, '$1')
                                    .replace(/\*(.*?)\*/g, '$1')
                                    .trim();
                                return `${label}: ${clean}`;
                            })
                            .filter(Boolean)
                            .join('\n');
                        navigator.clipboard.writeText(transcript).then(() => {
                            setCopyToast(true);
                            setTimeout(() => setCopyToast(false), 2000);
                        });
                    }}
                    style={{
                        background: 'white',
                        border: '1px solid #eee',
                        padding: '10px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        color: copyToast ? '#10b981' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        position: 'relative',
                    }}
                >
                    <Copy size={20} />
                    {copyToast && (
                        <span style={{
                            position: 'absolute',
                            top: '-28px',
                            background: '#10b981',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            whiteSpace: 'nowrap',
                        }}>Copied!</span>
                    )}
                </motion.button>

                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={startCall}
                    style={{
                        background: '#10b981',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                    }}
                >
                    <Phone size={20} />
                </motion.button>
            </div>

            {/* Progress bar */}
            {progress && (
                <div style={{
                    padding: '8px 20px',
                    background: 'linear-gradient(135deg, #faf5ff, #eff6ff)',
                    borderBottom: '1px solid #e8e0f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <span style={{ fontSize: '14px' }}>
                        {(() => {
                            const r = progress.successfulRepeats || 0;
                            const sub = r < 450 ? Math.floor((r % 15) / 5) : 3;
                            return sub === 0 ? '🌱' : sub === 1 ? '🌿' : sub === 2 ? '🌳' : '⭐';
                        })()}
                    </span>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#7c3aed' }}>
                                {(() => {
                                    const r = progress.successfulRepeats || 0;
                                    const stageNum = Math.min(Math.floor(r / 15) + 1, 30);
                                    
                                    const scenarioLabel = CURRICULUM[safeLang]?.[stageNum - 1]?.scenario || `Scenario ${stageNum}`;
                                    
                                    return `Scenario ${stageNum}: ${scenarioLabel}`;
                                })()}
                            </span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {(() => {
                                    const r = progress.successfulRepeats || 0;
                                    if (r >= 450) return 'Fluent Mode';
                                    const inS = r % 15;
                                    let subLabel, nextLabel, pts, total;
                                    if (inS < 5) { subLabel = 'Beginner'; nextLabel = 'Review'; pts = inS; total = 5; }
                                    else if (inS < 8) { subLabel = 'Review'; nextLabel = 'Basic'; pts = inS - 5; total = 3; }
                                    else if (inS < 11) { subLabel = 'Basic'; nextLabel = 'Conversational'; pts = inS - 8; total = 3; }
                                    else { subLabel = 'Conversational'; nextLabel = 'Next Scenario'; pts = inS - 11; total = 4; }
                                    return `${subLabel} · ${pts}/${total} → ${nextLabel}`;
                                })()}
                            </span>
                        </div>
                        <div style={{
                            height: '6px',
                            background: '#e2e8f0',
                            borderRadius: '3px',
                            overflow: 'hidden',
                        }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                    width: `${(() => {
                                        const r = (progress.successfulRepeats || 0) % 15;
                                        if (r < 5) return (r / 5) * 100;
                                        if (r < 8) return ((r - 5) / 3) * 100;
                                        if (r < 11) return ((r - 8) / 3) * 100;
                                        return ((r - 11) / 4) * 100;
                                    })()}%`
                                }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                style={{
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #a855f7, #3b82f6)',
                                    borderRadius: '3px',
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Recalibration toast */}
            <AnimatePresence>
                {recalibrationToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        style={{
                            margin: '0 20px 8px',
                            padding: '10px 16px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: '600',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                        }}
                    >
                        {recalibrationToast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Level-up celebration toast */}
            <AnimatePresence>
                {levelUpToast && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: -12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -12 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        style={{
                            margin: '0 20px 8px',
                            padding: '14px 20px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #f59e0b, #f97316, #ef4444)',
                            color: 'white',
                            fontSize: '15px',
                            fontWeight: '700',
                            textAlign: 'center',
                            boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)',
                            letterSpacing: '0.3px',
                        }}
                    >
                        {levelUpToast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages */}
            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}
            >
                {messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                padding: '14px 18px',
                                borderRadius: msg.role === 'user' ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
                                background: msg.role === 'user' ? 'var(--primary-gradient)' : 'white',
                                color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                fontSize: '16px',
                                lineHeight: '1.5'
                            }}
                        >
                            {msg.role === 'user'
                                ? (userTransliterations[i] || stripTargetScript(msg.content) || '...')
                                : renderMessageContent(msg.content, i)}
                        </motion.div>

                        {msg.role === 'user' && (
                            <>
                                {sentenceSuccesses[i] ? (
                                    <div style={{
                                        alignSelf: 'flex-end',
                                        marginTop: '6px',
                                        background: sentenceSuccesses[i] === 'true' ? '#ecfdf5' : sentenceSuccesses[i] === 'false' ? '#fef2f2' : '#f3f4f6',
                                        color: sentenceSuccesses[i] === 'true' ? '#059669' : sentenceSuccesses[i] === 'false' ? '#dc2626' : '#4b5563',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '4px 10px',
                                        borderRadius: '10px',
                                        border: `1px solid ${sentenceSuccesses[i] === 'true' ? '#d1fae5' : sentenceSuccesses[i] === 'false' ? '#fee2e2' : '#e5e7eb'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        {sentenceSuccesses[i] === 'true' && <Check size={12} strokeWidth={3} />}
                                        {sentenceSuccesses[i] === 'true' ? 'Success' : sentenceSuccesses[i] === 'false' ? 'Not Successful' : 'Status Not Received'}
                                    </div>
                                ) : null}

                                {/* Fuzzy match correction toast-like hint */}
                                {corrections[i] && (
                                    <div style={{
                                        alignSelf: 'flex-end',
                                        marginTop: '4px',
                                        background: '#fffbeb',
                                        color: '#b45309',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '4px 10px',
                                        borderRadius: '10px',
                                        border: '1px solid #fde68a',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <span>Close! Spelled:</span>
                                        <span style={{ color: '#d97706', fontSize: '12px' }}>{corrections[i].expected}</span>
                                    </div>
                                )}

                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => navigate('/feedback', { state: { text: msg.content } })}
                                    style={{
                                        alignSelf: 'flex-end',
                                        marginTop: '8px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                        color: '#3b82f6',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Edit3 size={12} />
                                    {t.feedback}
                                </motion.button>
                            </>
                        )}

                        {msg.role === 'assistant' && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleTranslate(i, msg.content)}
                                    style={{
                                        background: translations[i] ? 'var(--accent-purple)' : '#f1f1f1',
                                        border: 'none',
                                        color: translations[i] ? 'white' : '#666',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        padding: '6px',
                                        borderRadius: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                    aria-label={translations[i] ? t.original : (typeof t.translate_to === 'string' ? t.translate_to.replace('{n}', nativeLang?.name || 'Lang') : 'Translate')}
                                    title={translations[i] ? t.original : (typeof t.translate_to === 'string' ? t.translate_to.replace('{n}', nativeLang?.name || 'Lang') : 'Translate')}
                                >
                                    <Globe size={12} />
                                </motion.button>

                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => navigate('/dictionary', { state: { text: msg.content } })}
                                    style={{
                                        background: '#f1f1f1',
                                        border: 'none',
                                        color: '#666',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        padding: '6px',
                                        borderRadius: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                    aria-label={t.dictionary}
                                    title={t.dictionary}
                                >
                                    <BookOpen size={12} />
                                </motion.button>

                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleReadAloud(msg.content)}
                                    style={{
                                        background: '#f1f1f1',
                                        border: 'none',
                                        color: '#666',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        padding: '6px',
                                        borderRadius: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                    aria-label={t.read_aloud}
                                    title={t.read_aloud}
                                >
                                    <Volume2 size={12} />
                                </motion.button>

                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => navigate('/shadow', { state: { targetText: msg.content, voice: resolvedCharacter?.voice || 'alloy' } })}
                                    style={{
                                        background: '#f5f3ff',
                                        border: '1px solid #ddd6fe',
                                        color: '#7c3aed',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        padding: '6px',
                                        borderRadius: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                    aria-label={t.shadow}
                                    title={t.shadow}
                                >
                                    <Mic2 size={12} />
                                </motion.button>
                            </div>
                        )}
                        {/* Pronunciation Card (Refined Style) */}
                        {(() => {
                            const prompted = extractPromptedPhrase(msg.content);
                            const phoneticMatch = msg.content.match(/<phonetic>(.*?)<\/phonetic>/i);
                            let phonetic = phoneticMatch ? phoneticMatch[1] : null;

                            // Clean phonetic from AI-generated brackets
                            if (phonetic) phonetic = phonetic.replace(/[\[\]]/g, '').trim();

                            if (phonetic && msg.role === 'assistant') {
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        style={{
                                            marginTop: '10px',
                                            padding: '12px 16px',
                                            background: '#f1f5fe',
                                            borderRadius: '16px',
                                            borderLeft: '4px solid #5c67f2',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            boxShadow: '0 2px 10px rgba(92, 103, 242, 0.05)'
                                        }}
                                    >
                                        <span style={{ fontSize: '14px', color: '#444', fontWeight: '800' }}>Pronunciation:</span>
                                        <span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                                            {phonetic}
                                        </span>
                                    </motion.div>
                                );
                            }
                            return null;
                        })()}
                        {translations[i] && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                style={{
                                    fontSize: '14px',
                                    color: '#555',
                                    background: '#fef3c7',
                                    padding: '12px 16px',
                                    borderRadius: '16px',
                                    marginTop: '8px',
                                    fontStyle: 'italic',
                                    borderLeft: '4px solid #fbbf24',
                                    lineHeight: '1.4'
                                }}
                            >
                                {translations[i]}
                            </motion.div>
                        )}
                        {/* The pronunciation box is intentionally removed here. 
                           The pronunciation is now rendered as bolded transliterated text. */}
                    </div>
                ))}
                {isLoading && (
                    <div style={{ alignSelf: 'flex-start', padding: '12px 16px', background: 'white', borderRadius: '20px', display: 'flex', gap: '4px' }}>
                        <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }}>🐾</motion.span>
                        <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}>🐾</motion.span>
                        <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}>🐾</motion.span>
                    </div>
                )}
            </div>

            {/* Suggestions UI Overlay */}
            {showSuggestions && (
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        position: 'absolute',
                        bottom: '120px',
                        left: '24px',
                        right: '24px',
                        background: 'white',
                        borderRadius: '24px',
                        padding: '20px',
                        boxShadow: '0 -8px 24px rgba(0,0,0,0.1)',
                        zIndex: 100,
                        border: '1px solid #eee'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sparkles size={18} color="#8b5cf6" />
                            <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{t.suggested_responses}</span>
                        </div>
                        <button
                            onClick={() => setShowSuggestions(false)}
                            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                        >
                            {t.close}
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {suggestions.map((sug, i) => (
                            <motion.button
                                key={i}
                                whileHover={{ scale: 1.02, backgroundColor: '#f5f3ff' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    handleSend(sug, false);
                                    setInputText('');
                                    setShowSuggestions(false);
                                }}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '16px',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    textAlign: 'left',
                                    fontSize: '14px',
                                    color: '#475569',
                                    cursor: 'pointer',
                                    lineHeight: '1.4'
                                }}
                            >
                                {sug}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Persistent Input Mode Controller */}
            <div style={{ padding: '12px 20px', background: 'white', borderTop: '1px solid #eee', position: 'relative' }}>
                {inputMode === 'voice' ? (
                    /* Voice-First Layout - Optimized for space */
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                        {/* Left: Action Buttons (Stacked vertically to save height) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={toggleInputMode}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    borderRadius: '16px',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    color: '#475569',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            >
                                <Keyboard size={14} />
                                {t.switch_to_typing}
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={fetchSuggestions}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    borderRadius: '16px',
                                    background: '#f5f3ff',
                                    border: '1px solid #ddd6fe',
                                    color: '#7c3aed',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            >
                                <Sparkles size={14} />
                                {t.help_me_answer}
                            </motion.button>
                        </div>

                        {/* Right: Compact Mic Button */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <div style={{ position: 'relative' }}>
                                <motion.button
                                    animate={isRecording ? {
                                        scale: [1, 1.1, 1],
                                        boxShadow: ['0 0 0px #ef4444', '0 0 20px rgba(239, 68, 68, 0.4)', '0 0 0px #ef4444']
                                    } : {}}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={toggleRecording}
                                    style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '50%',
                                        background: isRecording ? '#ef4444' : 'var(--primary-gradient)',
                                        border: 'none',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                                        zIndex: 2,
                                        position: 'relative'
                                    }}
                                >
                                    {isRecording ? <Square size={24} fill="white" /> : <Mic size={28} />}
                                    {isRecording && (
                                        <motion.div
                                            animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                            style={{
                                                position: 'absolute',
                                                width: '100%',
                                                height: '100%',
                                                borderRadius: '50%',
                                                background: '#ef4444',
                                                zIndex: -1
                                            }}
                                        />
                                    )}
                                </motion.button>
                            </div>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: '800',
                                color: isRecording ? '#ef4444' : '#94a3b8',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {isRecording ? 'Stop' : 'Speak'}
                            </span>
                        </div>
                    </div>
                ) : (
                    /* Text Mode Layout */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: '12px',
                            background: '#f8fafc',
                            padding: '8px 12px',
                            borderRadius: '24px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={t.type_message}
                                style={{
                                    flex: 1,
                                    background: 'none',
                                    border: 'none',
                                    outline: 'none',
                                    padding: '10px 4px',
                                    fontSize: '15px',
                                    resize: 'none',
                                    maxHeight: '120px',
                                    minHeight: '24px'
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (inputText.trim()) {
                                            handleSend(inputText.trim(), false);
                                            setInputText('');
                                        }
                                    }
                                }}
                            />
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    if (inputText.trim()) {
                                        handleSend(inputText.trim(), false);
                                        setInputText('');
                                    }
                                }}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: inputText.trim() ? 'var(--primary-gradient)' : '#e2e8f0',
                                    border: 'none',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <Send size={18} />
                            </motion.button>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                            <button
                                onClick={toggleInputMode}
                                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Mic size={14} /> {t.back_to_voice}
                            </button>
                            <button
                                onClick={fetchSuggestions}
                                style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Sparkles size={14} /> {t.help_me_answer}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ===== CALL MODE OVERLAY ===== */}
            <AnimatePresence>
                {isCallMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
                            zIndex: 3000,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px 24px'
                        }}
                    >
                        {/* Character Name & Status */}
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            style={{ textAlign: 'center', marginBottom: '40px' }}
                        >
                            <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>
                                {resolvedCharacter?.name || 'Miko'}
                            </h2>
                            <p style={{
                                color: callStatus === 'listening' ? '#fbbf24' : callStatus === 'speaking' ? '#10b981' : callStatus === 'thinking' ? '#a78bfa' : '#94a3b8',
                                fontSize: '14px',
                                fontWeight: '600',
                                letterSpacing: '0.5px'
                            }}>
                                {callStatus === 'listening'
                                    ? t.call_listening
                                    : callStatus === 'speaking'
                                        ? t.call_speaking
                                        : callStatus === 'thinking'
                                            ? t.call_thinking
                                            : t.call_tap_mic}
                            </p>
                        </motion.div>

                        {/* Avatar with Pulse Rings */}
                        <div style={{ position: 'relative', marginBottom: '40px' }}>
                            {/* Animated pulse rings */}
                            {(callStatus === 'speaking' || callStatus === 'listening') && (
                                <>
                                    <motion.div
                                        animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                                        style={{
                                            position: 'absolute',
                                            inset: '-20px',
                                            borderRadius: '50%',
                                            border: `2px solid ${callStatus === 'listening' ? '#fbbf24' : '#10b981'}`,
                                        }}
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 1.8], opacity: [0.2, 0] }}
                                        transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: 'easeOut' }}
                                        style={{
                                            position: 'absolute',
                                            inset: '-20px',
                                            borderRadius: '50%',
                                            border: `2px solid ${callStatus === 'listening' ? '#fbbf24' : '#10b981'}`,
                                        }}
                                    />
                                </>
                            )}
                            <motion.div
                                animate={callStatus === 'thinking' ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                style={{
                                    width: '120px',
                                    height: '120px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: `3px solid ${callStatus === 'listening' ? '#fbbf24' : callStatus === 'speaking' ? '#10b981' : '#475569'}`,
                                    boxShadow: `0 0 40px ${callStatus === 'listening' ? 'rgba(251,191,36,0.3)' : callStatus === 'speaking' ? 'rgba(16,185,129,0.3)' : 'rgba(0,0,0,0.3)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: resolvedCharacter?.color || '#fef3c7',
                                    fontSize: '48px'
                                }}
                            >
                                {resolvedCharacter?.image ? (
                                    <img src={resolvedCharacter.image} alt={resolvedCharacter.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    resolvedCharacter?.icon || '👤'
                                )}
                            </motion.div>
                        </div>

                        {/* Call Duration */}
                        <p style={{ color: '#94a3b8', fontSize: '20px', fontWeight: '600', fontFamily: 'monospace', marginBottom: '60px' }}>
                            {formatCallTime(callDuration)}
                        </p>

                        {/* Call Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                            {/* Mic / Speak Button */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleCallSpeak}
                                disabled={callStatus === 'thinking' || callStatus === 'speaking'}
                                style={{
                                    width: '72px',
                                    height: '72px',
                                    borderRadius: '50%',
                                    background: callStatus === 'listening'
                                        ? '#fbbf24'
                                        : (callStatus === 'thinking' || callStatus === 'speaking')
                                            ? '#475569'
                                            : 'white',
                                    border: 'none',
                                    cursor: (callStatus === 'thinking' || callStatus === 'speaking') ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: callStatus === 'listening' ? 'white' : '#1e293b',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                    opacity: (callStatus === 'thinking' || callStatus === 'speaking') ? 0.5 : 1
                                }}
                            >
                                {callStatus === 'listening' ? <Square size={28} fill="white" /> : <Mic size={32} />}
                            </motion.button>

                            {/* End Call */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={endCall}
                                style={{
                                    width: '72px',
                                    height: '72px',
                                    borderRadius: '50%',
                                    background: '#ef4444',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    boxShadow: '0 8px 24px rgba(239,68,68,0.3)'
                                }}
                            >
                                <PhoneOff size={28} />
                            </motion.button>
                        </div>

                        {/* Subtle hint */}
                        <p style={{ color: '#64748b', fontSize: '12px', marginTop: '32px', textAlign: 'center' }}>
                            Speak naturally — your tutor is listening
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
