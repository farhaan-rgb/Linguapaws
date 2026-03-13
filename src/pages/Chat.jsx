import React, { useState, useEffect, useRef } from 'react';
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

    const [recalibrationToast, setRecalibrationToast] = useState(null);
    const [copyToast, setCopyToast] = useState(false);
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

            // If the message contains bold text, we assume it's teaching a phrase
            if (msg.content.includes('**')) return true;

            // Skip generic error messages that don't change the tutorial context
            const isError = msg.content.includes("couldn't quite hear") || msg.content.includes("whiskers got tangled");
            if (isError) continue;

            // If it's a normal assistant message without bold text, we are no longer in a tutorial step
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
            .replace(/[\p{Extended_Pictographic}\p{Emoji_Component}]/gu, ''); // Strip emojis (e.g. 🎉, 🐾)

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

        // Soften "Almost Right" matches: if it's > 85%, and the difference is 
        // just single vowels vs double vowels (ai vs ay), bump it up.
        if (score > 0.8 && score < 1.0) {
            const simplifiedA = na.replace(/[aeiouy]/g, 'v');
            const simplifiedB = nb.replace(/[aeiouy]/g, 'v');
            if (simplifiedA === simplifiedB) return 1.0;
        }

        return score;
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
            let greeting = "";
            const currentRepeats = progress?.successfulRepeats || 0;
            let levelId = userLevel || 'conversational';
            if (currentRepeats < 300) {
                const subLevelIdx = Math.floor((currentRepeats % 30) / 10);
                levelId = subLevelIdx === 0 ? 'zero' : subLevelIdx === 1 ? 'basic' : 'conversational';
            } else {
                levelId = 'fluent';
            }

            const SCENARIOS = [
                "Greetings & Identity",
                "Ordering Food & Drinks",
                "Shopping & Prices",
                "Asking for Directions",
                "Transportation & Travel",
                "Time & Schedules",
                "Hobbies & Preferences",
                "Weather & Environment",
                "Health & Body",
                "Social Gatherings & Events"
            ];
            const activeScenarioIdx = Math.min(Math.floor(currentRepeats / 30), 9);
            const activeScenario = SCENARIOS[activeScenarioIdx];

            if (levelId === 'zero') {
                levelNote = `Greet the user briefly (1-2 sentences) introducing yourself as ${activeCharacter?.name || 'Miko'}. Use ONLY ${nativeLangName}. The active scenario is: '${activeScenario}'. Teach exactly ONE simple new target language WORD (noun, verb, or adjective) related to this scenario. Show its transliterated pronunciation in bold. Do not teach full sentences in this first message.`;
            } else if (levelId === 'basic') {
                levelNote = `Greet the user briefly (2 sentences max) introducing yourself as ${activeCharacter?.name || 'Miko'}. Use mostly ${nativeLangName}. The active scenario is: '${activeScenario}'. Ask a simple question related to this scenario that forces them to construct a short phrase using ${targetLangName} words they learned. DO NOT ask them to repeat anything.`;
            } else if (levelId === 'conversational') {
                levelNote = `Greet the user mostly in transliterated ${targetLangName} with ${nativeLangName} translations in parentheses. Introduce yourself as ${activeCharacter?.name || 'Miko'}. The active scenario is: '${activeScenario}'. Ask a conversational question related to this scenario to engage them in a back-and-forth roleplay.`;
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

        setMessages(prev => [...prev, { role: 'user', content: text }]);

        // Track user's words (only track words longer than 3 characters)
        const userWords = text.match(/[\p{L}]{2,}/gu);
        if (userWords) {
            userWords.forEach(word => {
                wordTracker.addWord(word);
            });
        }

        setIsLoading(true);

        try {
            // ── LEVEL DETERMINATION ────────────────────
            const currentRepeats = progress?.successfulRepeats || 0;
            let effectiveLevel = userLevel;
            if (currentRepeats < 300) {
                const subLevelIdx = Math.floor((currentRepeats % 30) / 10);
                effectiveLevel = subLevelIdx === 0 ? 'zero' : subLevelIdx === 1 ? 'basic' : 'conversational';
            } else {
                effectiveLevel = 'fluent';
            }

            // Increment exchange count and determine if this is a scheduled shadow round
            exchangeCount.current += 1;
            const triggerShadow = exchangeCount.current > 0 && exchangeCount.current % 6 === 0;
            const userMessageIndex = messages.length;

            // Find the most recent instruction from Miko
            // We prioritize messages with bold phrases because they are actively teaching
            const lastAssistant = [...messages].reverse().find(m =>
                m.role === 'assistant' &&
                (m.content.includes('**') || (!m.content.includes("couldn't quite hear") && !m.content.includes("whiskers got tangled")))
            );
            const lastWasTopicPrompt = isTopicPrompt(lastAssistant?.content);
            const isTopicAnswer = lastWasTopicPrompt && isTopicReply(text);
            const promptedPhrase = lastWasTopicPrompt
                ? ''
                : extractPromptedPhrase(lastAssistant?.content || '');
            const expected = (promptedPhrase || '').replace(/[.!?]+$/g, '').trim();
            const actual = (text || '').replace(/[.!?]+$/g, '').trim();
            let matchRatio = expected ? similarityRatio(actual, expected) : 0;

            console.log('[Match Step 1]', {
                lastAssistantContent: lastAssistant?.content?.substring(0, 100),
                promptedPhrase,
                expected,
                actual,
                initialMatchRatio: Math.round(matchRatio * 100) + '%',
                bothLatin: isMostlyLatin(actual) && isMostlyLatin(expected),
            });
            let displayPhrase = promptedPhrase;

            // Matching: promptedPhrase now comes directly from bold text in the prompt (**NAMASKARA**). 
            // It is already in the transliterated form we expect for both levels and direct repetition.
            if (promptedPhrase) {
                matchRatio = similarityRatioLatin(actual, promptedPhrase);
                console.log('[Match Debug]', { actual, expected: promptedPhrase, matchRatio: Math.round(matchRatio * 100) + '%' });
            }

            if (promptedPhrase) {
                const scorePercent = Math.round(matchRatio * 100);
                setMatchScores(prev => ({ ...prev, [userMessageIndex]: scorePercent }));
                console.log('[Match Step 2] Score set:', scorePercent + '% for message index', userMessageIndex);
            }
            const threshold = 0.5;

            // Server-side level progression via DB
            if (promptedPhrase && matchRatio >= threshold) {
                console.log('[Progress] Match >= 50%, calling /api/progress/increment...');
                try {
                    const progressResult = await api.post('/api/progress/increment');
                    setProgress(progressResult);
                } catch (err) {
                    console.warn('Failed to increment progress:', err);
                }
            }

            const isBeginner = effectiveLevel === 'zero';
            const feedbackNoun = isVoice ? 'pronunciation' : 'spelling';
            const acceptNote = (promptedPhrase && matchRatio >= threshold)
                ? `The user's ${feedbackNoun} was PERFECT. Output ONLY a single flat confirmation word (Good/Correct/Yes). Do NOT correct them. Do NOT provide alternative variations. ${isBeginner ? 'Then immediately continue your roleplay by teaching ONE new relevant native phrase in the current scenario.' : 'Then move the conversation forward naturally by asking a simple question without bolding any target phrase.'} DO NOT ask them what they want to talk about.`
                : (promptedPhrase && matchRatio < threshold)
                    ? `The user attempted the phrase but their ${feedbackNoun} was incorrect. Gently encourage them and ask them to try saying EXACTLY the SAME phrase again.`
                    : null;

            // We combine display rules with our hidden note about user performance
            const SCENARIOS = [
                "Greetings & Identity",
                "Ordering Food & Drinks",
                "Shopping & Prices",
                "Asking for Directions",
                "Transportation & Travel",
                "Time & Schedules",
                "Hobbies & Preferences",
                "Weather & Environment",
                "Health & Body",
                "Social Gatherings & Events"
            ];
            const activeScenarioIdx = Math.min(Math.floor(currentRepeats / 30), 9);
            const activeScenario = SCENARIOS[activeScenarioIdx];

            let baseMetaNote = acceptNote;
            baseMetaNote += `\n[SYSTEM: The current scenario is '${activeScenario}'. You MUST stay strictly anchored to this scenario.]`;
            if (isBeginner) {
                baseMetaNote += `\n[SYSTEM REMINDER: Only teach NEW isolated vocabulary words related to '${activeScenario}'. Do NOT teach full sentences. MANDATORY: You MUST provide the <phonetic> tag from the glossary for the bolded word.]`;
            }
            if (effectiveLevel === 'basic') {
                baseMetaNote += '\n[SYSTEM REMINDER: You MUST evaluate the grammar of the user\'s response. Output the result in the JSON "success" field. Set "success": true if word order was correct, or "success": false if incorrect/missing. This is critical.]';
            }
            const metaNote = baseMetaNote;

            let rawResponse = null;
            if (isTopicAnswer && effectiveLevel !== 'zero') {
                const followupMsg = `Great! Tell me a topic you like (travel, food, friends), or say "you decide".`;
                const translated = await safeTranslate(followupMsg, nativeLangName);
                rawResponse = { content: translated, success: null };
            } else {
                rawResponse = await aiService.getResponse(text, topicName, activeCharacter, nativeLang, targetLang, triggerShadow, effectiveLevel, metaNote);
            }

            // Fallback safety
            if (!rawResponse || (!rawResponse.content && typeof rawResponse !== 'string')) {
                rawResponse = await aiService.getResponse(text, topicName, activeCharacter, nativeLang, targetLang, triggerShadow, effectiveLevel, metaNote);
            }

            let botResponse = rawResponse?.content || rawResponse;
            if (typeof botResponse !== 'string') botResponse = '';

            // Check for AI-triggered level recalibration (subtle cases the client-side check missed)
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

            // Check for AI-triggered level-up progression
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

            console.log('[AI Response Raw]', rawResponse);
            // Check for AI-triggered short-term progress (Guided Sentence Construction success)
            let statusTag = 'missing';

            // Priority 1: Use explicit success flag if the response was a JSON object
            if (rawResponse?.success !== undefined && rawResponse.success !== null) {
                statusTag = rawResponse.success ? 'true' : 'false';
            } else {
                // Priority 2: Fallback to XML tag regex for legacy sessions or non-JSON responses
                const successMatch = responseWithoutMeta.match(/<success>\s*(true|false)\s*<\/success>/i);
                if (successMatch) {
                    statusTag = successMatch[1].toLowerCase();
                }
            }
            // Clean up tags in either case
            responseWithoutMeta = responseWithoutMeta.replace(/<success>.*?<\/success>/gi, '');

            if (statusTag === 'true' || statusTag === 'false') {
                if (statusTag === 'true' && effectiveLevel !== 'zero') {
                    console.log('[Progress] AI reported success, calling /api/progress/increment...');
                    api.post('/api/progress/increment')
                        .then(progressResult => {
                            console.log('[Progress] AI step API result:', JSON.stringify(progressResult));
                            setProgress(progressResult);
                            // Level up is also handled holistically by the AI <level_up> tag for higher levels
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

            setMessages(prev => [...prev, { role: 'assistant', content: storedResponse }]);
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
                            .filter(m => m.role === 'user' || m.role === 'assistant')
                            .map((m, idx) => {
                                const label = m.role === 'assistant' ? 'Tutor' : 'Learner';

                                let clean = m.content;

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
                            const sub = r < 300 ? Math.floor((r % 30) / 10) : 3;
                            return sub === 0 ? '🌱' : sub === 1 ? '🌿' : sub === 2 ? '🌳' : '⭐';
                        })()}
                    </span>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#7c3aed' }}>
                                {(() => {
                                    const r = progress.successfulRepeats || 0;
                                    const stageNum = Math.min(Math.floor(r / 30) + 1, 10);
                                    const scenarios = [
                                        "Greetings & Identity",
                                        "Ordering Food & Drinks",
                                        "Shopping & Prices",
                                        "Asking for Directions",
                                        "Transportation & Travel",
                                        "Time & Schedules",
                                        "Hobbies & Preferences",
                                        "Weather & Environment",
                                        "Health & Body",
                                        "Social Gatherings & Events"
                                    ];
                                    return `Scenario ${stageNum}: ${scenarios[Math.min(stageNum - 1, 9)]}`;
                                })()}
                            </span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {(() => {
                                    const r = progress.successfulRepeats || 0;
                                    if (r >= 300) return 'Fluent Mode';
                                    const sub = Math.floor((r % 30) / 10);
                                    let subLabel = sub === 0 ? 'Beginner' : sub === 1 ? 'Basic' : 'Conversational';
                                    let nextLabel = sub === 0 ? 'Basic' : sub === 1 ? 'Conversational' : 'Next Scenario';
                                    const pts = r % 10;
                                    return `${subLabel} · ${pts}/10 → ${nextLabel}`;
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
                                animate={{ width: `${Math.min(((progress.successfulRepeats || 0) % 10) * 10, 100)}%` }}
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
                                ) : typeof matchScores[i] === 'number' && (
                                    <div style={{
                                        alignSelf: 'flex-end',
                                        marginTop: '6px',
                                        background: '#eef2ff',
                                        color: '#4338ca',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '4px 10px',
                                        borderRadius: '10px',
                                        border: '1px solid #e0e7ff',
                                    }}>
                                        Match: {matchScores[i]}%
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
