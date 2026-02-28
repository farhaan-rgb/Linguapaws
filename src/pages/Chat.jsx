import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Mic, Square, BookOpen, Globe, Edit3, Sparkles, Keyboard, Volume2, VolumeX, Phone, PhoneOff, Mic2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { aiService } from '../services/ai';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { wordTracker } from '../services/wordTracker';
import { characters as defaultCharacters } from '../data/characters';
import { useTranslation } from '../hooks/useTranslation';

export default function Chat() {
    const navigate = useNavigate();
    const { t, langId } = useTranslation();
    const [searchParams] = useSearchParams();
    const topicId = searchParams.get('topic');
    const topicName = searchParams.get('name');

    const { isRecording, startRecording, stopRecording } = useAudioRecorder();

    // Restore chat session from sessionStorage — survives navigation to Shadow/Dictionary
    const chatSessionKey = `linguapaws_chat_${JSON.parse(localStorage.getItem('linguapaws_active_character') || 'null')?.id || 'miko'}_${searchParams.get('topic') || 'free'}`;
    const [messages, setMessages] = useState(() => {
        try {
            const saved = sessionStorage.getItem(chatSessionKey);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [isLoading, setIsLoading] = useState(false);
    const [inputText, setInputText] = useState('');
    const [inputMode, setInputMode] = useState(localStorage.getItem('linguapaws_input_mode') || 'voice');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [translations, setTranslations] = useState({});
    const [isMuted, setIsMuted] = useState(localStorage.getItem('linguapaws_muted') === 'true');
    const [activeCharacter, setActiveCharacter] = useState(JSON.parse(localStorage.getItem('linguapaws_active_character') || 'null'));
    const [userLevel, setUserLevel] = useState(() => JSON.parse(localStorage.getItem('linguapaws_level') || '{}')?.id || 'conversational');
    const [recalibrationToast, setRecalibrationToast] = useState(null); // toast message when AI recalibrates
    const [transliterations, setTransliterations] = useState({});
    const [userTransliterations, setUserTransliterations] = useState({});
    const [matchScores, setMatchScores] = useState({});
    const scrollRef = useRef(null);
    const audioRef = useRef(new Audio());
    const hasGreeted = useRef(messages.length > 0); // Skip greeting if chat already has messages
    const exchangeCount = useRef(messages.filter(m => m.role === 'user').length); // Track exchanges for shadow trigger
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
            .replace(/[^a-z0-9]+/g, ' ')
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
        gu: 'Gujarati',
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
        gujarati: 'Gujarati',
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

    const stripLatinDiacritics = (text) => {
        if (!text) return text;
        return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').normalize('NFC');
    };

    const buildPronunciationHint = (phrase) => {
        if (!phrase || !isNativeEnglish()) return '';
        const isVowel = (ch) => /[aeiou]/i.test(ch);
        const words = phrase.split(/\s+/).filter(Boolean);
        const hinted = words.map((word) => {
            const parts = [];
            let i = 0;
            while (i < word.length) {
                let start = i;
                while (i < word.length && !isVowel(word[i])) i++;
                if (i < word.length) {
                    i++;
                    while (i < word.length && isVowel(word[i])) i++;
                    parts.push(word.slice(start, i));
                } else {
                    parts.push(word.slice(start));
                    break;
                }
            }
            return parts.join('-');
        });
        return hinted.join(' ');
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

    const similarityRatioLatin = (a, b) => {
        const na = normalizeLatin(a);
        const nb = normalizeLatin(b);
        if (!na || !nb) return 0;
        const dist = levenshtein(na, nb);
        return 1 - dist / Math.max(splitGraphemes(na).length, splitGraphemes(nb).length, 1);
    };

    const extractPromptedPhrase = (text) => {
        if (!text) return null;
        const targetMatch = text.match(/<target>(.*?)<\/target>/s);
        if (targetMatch && targetMatch[1]) return targetMatch[1].trim();
        const clean = text.replace(/<[^>]+>/g, '');
        const targetLangId = (targetLang?.id || '').toLowerCase();

        const findQuotedByScript = (scriptName) => {
            const re = /["“]([^"”]+?)["”]/g;
            let match;
            while ((match = re.exec(clean)) !== null) {
                const candidate = match[1].trim();
                if (!candidate) continue;
                const scriptRe = new RegExp(`\\p{Script=${scriptName}}`, 'u');
                if (scriptRe.test(candidate)) return candidate;
            }
            return null;
        };

        if (targetLangId === 'kn') {
            const kannada = findQuotedByScript('Kannada');
            if (kannada) return kannada;
        }

        const patterns = [
            /(?:say|try saying)\s*:\s*["“]([^"”]+?)["”]/i,
            /it'?s\s*:\s*["“]([^"”]+?)["”]/i,
            /give it a try[:\s]*["“]([^"”]+?)["”]/i,
            /can you try saying\s*["“]([^"”]+?)["”]/i,
        ];
        for (const pattern of patterns) {
            const m = clean.match(pattern);
            if (m && m[1]) return m[1].trim();
        }
        return null;
    };

    const buildDisplayRule = (nativeLangName, targetLangName) => (
        `CRITICAL DISPLAY RULE: Respond in ${nativeLangName}. ` +
        `Do NOT show ${targetLangName} script in visible text. ` +
        `Whenever you ask the user to say a ${targetLangName} phrase, include the exact target phrase inside ` +
        `<target>...</target> (in ${targetLangName} script). In visible text, show ONLY a pronunciation guide ` +
        `in ${nativeLangName} (use native script; if ${nativeLangName} is English, use Latin). ` +
        `Always explain the meaning of the practice phrase in ${nativeLangName} so the user knows what they are saying.`
    );

    // Persist messages to sessionStorage on every update
    useEffect(() => {
        sessionStorage.setItem(chatSessionKey, JSON.stringify(messages));
    }, [messages]);

    // Render assistant messages with safe substitutions (no target script on screen).
    const renderMessageContent = (content, idx) => {
        let rendered = content.replace(/<shadow>(.*?)<\/shadow>/gs, '$1');
        if (rendered.includes('<target>')) {
            const replacement = transliterations[idx] || '';
            rendered = rendered.replace(/<target>.*?<\/target>/gs, replacement);
        }
        rendered = cleanupDisplayText(stripTargetScript(rendered));
        if (isNativeEnglish()) {
            rendered = stripLatinDiacritics(rendered);
        }
        return rendered;
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
        const displayRuleNote = buildDisplayRule(nativeLangName, targetLangName);
        let greeting = await aiService.getResponse(
            `[CALL GREETING ONLY — keep it short. Greet warmly and invite practice.]`,
            topicName,
            activeCharacter,
            nativeLang,
            targetLang,
            false,
            userLevel,
            displayRuleNote
        );
        const storedGreeting = greeting
            .replace(/<word>(.*?)<\/word>/g, '$1')
            .replace(/<shadow>(.*?)<\/shadow>/gs, '$1')
            .trim();
        let displayGreeting = cleanupDisplayText(
            stripTargetScript(storedGreeting.replace(/<target>.*?<\/target>/gs, ''))
        );
        if (isNativeEnglish()) displayGreeting = stripLatinDiacritics(displayGreeting);
        if (isMounted.current) {
            const audioUrl = await aiService.generateSpeech(displayGreeting, resolvedCharacter?.voice || 'alloy', nativeLang?.name || null);
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
                const transcript = await aiService.transcribeAudio(audioBlob, targetLang?.id || null);
                if (transcript) {
                    setMessages(prev => [...prev, { role: 'user', content: transcript }]);
                    const userWords = transcript.match(/[\p{L}]{2,}/gu);
                    if (userWords) userWords.forEach(w => { wordTracker.addWord(w); });

                    const nativeLangName = nativeLang?.name || 'English';
                    const targetLangName = targetLang?.name || 'English';
                    const displayRuleNote = buildDisplayRule(nativeLangName, targetLangName);
                    const botResponse = await aiService.getResponse(transcript, topicName, activeCharacter, nativeLang, targetLang, false, userLevel, displayRuleNote);
                    const storedResponse = botResponse
                        .replace(/<word>(.*?)<\/word>/g, '$1')
                        .replace(/<shadow>(.*?)<\/shadow>/gs, '$1')
                        .trim();
                    let displayResponse = cleanupDisplayText(
                        stripTargetScript(storedResponse.replace(/<target>.*?<\/target>/gs, ''))
                    );
                    if (isNativeEnglish()) displayResponse = stripLatinDiacritics(displayResponse);
                    setMessages(prev => [...prev, { role: 'assistant', content: storedResponse }]);

                    setCallStatus('speaking');
                    if (isMounted.current) {
                        const audioUrl = await aiService.generateSpeech(displayResponse, resolvedCharacter?.voice || 'alloy', nativeLang?.name || null);
                        if (audioUrl && isMounted.current) {
                            audioRef.current.src = audioUrl;
                            audioRef.current.onended = () => setCallStatus('idle');
                            audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
                        } else {
                            setCallStatus('idle');
                        }
                    }
                } else {
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

    const nativeLang = JSON.parse(localStorage.getItem('linguapaws_native_lang') || '{}');
    const targetLang = JSON.parse(localStorage.getItem('linguapaws_target_lang') || '{}');

    useEffect(() => {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        aiService.init(apiKey);

        // Warm up the backend on mount so Render free-tier cold starts happen
        // before the user sends their first message, not during it.
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/health`).catch(() => { });

        // Reset mounted state — fixes React Strict Mode double-invocation bug
        isMounted.current = true;

        const greet = async () => {
            if (hasGreeted.current) return;
            hasGreeted.current = true;

            setIsLoading(true);
            let greeting = "";
            const levelId = userLevel || 'conversational';
            const nativeLangName = nativeLang?.name || 'Hindi';
            const targetLangName = targetLang?.name || 'English';

            const displayRule = buildDisplayRule(nativeLangName, targetLangName);
            const levelNote = levelId === 'zero'
                ? `${displayRule} Greet the user briefly (2 sentences max) introducing yourself as ${activeCharacter?.name || 'Miko'}. Use ONLY ${nativeLangName}. End with ONE simple practice phrase and ask them to try saying it. Include the phrase inside <target>...</target> and show only its pronunciation in ${nativeLangName} script in the visible text.`
                : levelId === 'basic'
                    ? `${displayRule} Greet the user briefly (2 sentences max) introducing yourself as ${activeCharacter?.name || 'Miko'}. Use ONLY ${nativeLangName}. End with ONE simple practice phrase and ask them to try saying it. Include the phrase inside <target>...</target> and show only its pronunciation in ${nativeLangName} script in the visible text.`
                    : `${displayRule} Greet the user briefly (2 sentences max) introducing yourself as ${activeCharacter?.name || 'Miko'}. Use ONLY ${nativeLangName}. End with ONE simple practice phrase and ask them to try saying it. Include the phrase inside <target>...</target> and show only its pronunciation in ${nativeLangName} script in the visible text.`;

            const aiGreeting = await aiService.getResponse(
                `[GREETING ONLY — do not start a conversation, just greet the user. ${levelNote}]`,
                topicName,
                activeCharacter,
                nativeLang,
                targetLang,
                false,
                levelId
            );
            const storedGreeting = aiGreeting
                .replace(/<word>(.*?)<\/word>/g, '$1')
                .replace(/<shadow>(.*?)<\/shadow>/gs, '$1')
                .trim();
        let displayGreeting = cleanupDisplayText(
            stripTargetScript(storedGreeting.replace(/<target>.*?<\/target>/gs, ''))
        );
        if (isNativeEnglish()) displayGreeting = stripLatinDiacritics(displayGreeting);
            setMessages([{ role: 'assistant', content: storedGreeting }]);
            aiService.history.push({ role: 'assistant', content: storedGreeting });

            // Speak the greeting
            if (!isMuted && isMounted.current) {
                const audioUrl = await aiService.generateSpeech(displayGreeting, resolvedCharacter?.voice || 'alloy', nativeLang?.name || null);
                if (audioUrl && isMounted.current) {
                    audioRef.current.src = audioUrl;
                    audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
                }
            }

            setIsLoading(false);
        };

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
            if (msg.role !== 'assistant') return;
            const phrase = extractPromptedPhrase(msg.content);
            if (!phrase) return;
            if (transliterations[idx]) return;
            pending.push({ idx, phrase });
        });
        if (pending.length === 0) return;

        let cancelled = false;
        const run = async () => {
            for (const item of pending) {
                try {
                    const data = await aiService.transliterate(item.phrase, targetLangName, nativeLangName);
                    if (cancelled) return;
                    if (data?.transliteration) {
                        const formatted = formatTransliteration(data.transliteration, nativeLang);
                        setTransliterations(prev => ({ ...prev, [item.idx]: formatted }));
                    }
                } catch { /* ignore */ }
            }
        };
        run();
        return () => { cancelled = true; };
    }, [messages, userLevel, nativeLang?.name, targetLang?.name]);

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
                const audioUrl = await aiService.generateSpeech(translatedText, activeCharacter?.voice || 'alloy', nativeLang?.name || null);
                if (audioUrl && isMounted.current) {
                    audioRef.current.src = audioUrl;
                    audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
                }
            }
        }
        setIsLoading(false);
    };

    const handleSend = async (text) => {
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

        // ── CLIENT-SIDE RECALIBRATION (first message only) ────────────────────
        // Deterministically detect obvious level mismatches before calling AI.
        // React state updates are async so we track the effective level locally.
        let effectiveLevel = userLevel;
        const isFirstMessage = exchangeCount.current === 0;
        const allowRecalibration = (targetLang?.id || '').toLowerCase() === 'en';
        if (isFirstMessage && allowRecalibration) {
            const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
            const latinRatio = latinChars / Math.max(text.replace(/\s/g, '').length, 1);
            const LEVEL_LABELS = { zero: 'Beginner', basic: 'Basic', conversational: 'Conversational', fluent: 'Fluent' };
            const charName = activeCharacter?.name || 'Miko';

            const applyRecalibration = (newLevelId) => {
                effectiveLevel = newLevelId;
                setUserLevel(newLevelId);
                const newLevel = { id: newLevelId, label: LEVEL_LABELS[newLevelId], appDetected: true };
                localStorage.setItem('linguapaws_level', JSON.stringify(newLevel));
                api.put('/api/settings', { englishLevel: newLevel }).catch(() => { });
                setRecalibrationToast(`${charName} adjusted to your level: ${LEVEL_LABELS[newLevelId]} 🎯`);
                setTimeout(() => setRecalibrationToast(null), 4000);
            };

            // Non-target-language message + high stated level → recalibrate down
            if (latinRatio < 0.15 && (userLevel === 'fluent' || userLevel === 'conversational')) {
                applyRecalibration('zero');
            }
            // Very basic target-language + high stated level → recalibrate to basic
            else if (latinRatio > 0.5 && latinRatio < 0.85 && text.trim().split(/\s+/).length <= 4 && userLevel === 'fluent') {
                applyRecalibration('basic');
            }
            // Fluent target-language paragraphs + stated zero → recalibrate up  
            else if (latinRatio > 0.85 && text.trim().split(/\s+/).length > 6 && (userLevel === 'zero' || userLevel === 'basic')) {
                applyRecalibration('fluent');
            }
        }
        // ── END CLIENT-SIDE RECALIBRATION ─────────────────────────────────────

        // Increment exchange count and determine if this is a scheduled shadow round
        exchangeCount.current += 1;
        const triggerShadow = exchangeCount.current > 0 && exchangeCount.current % 6 === 0;

        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
        const lastWasTopicPrompt = isTopicPrompt(lastAssistant?.content);
        const isTopicAnswer = lastWasTopicPrompt && isTopicReply(text);
        const promptedPhrase = (lastWasTopicPrompt || isTopicReply(text))
            ? ''
            : extractPromptedPhrase(lastAssistant?.content || '');
        const expected = (promptedPhrase || '').replace(/[.!?]+$/g, '').trim();
        const actual = (text || '').replace(/[.!?]+$/g, '').trim();
        let matchRatio = expected ? similarityRatio(actual, expected) : 0;
        let displayPhrase = promptedPhrase;
        let translit = null;
        const isNativeEnglish = (nativeLang?.id || '').toLowerCase() === 'en' ||
            (nativeLang?.name || '').toLowerCase() === 'english';

        if (promptedPhrase && (!isNativeEnglish || !isMostlyLatin(promptedPhrase))) {
            const assistantIndex = messages.lastIndexOf(lastAssistant);
            translit = transliterations[assistantIndex];
            if (!translit) {
                try {
                    const data = await aiService.transliterate(promptedPhrase, targetLang?.name || 'English', nativeLang?.name || 'English');
                    translit = formatTransliteration(data?.transliteration || '', nativeLang);
                    if (translit) {
                        setTransliterations(prev => ({ ...prev, [assistantIndex]: translit }));
                    }
                } catch { /* ignore */ }
            }
            if (translit) displayPhrase = translit;
        }

        if (promptedPhrase && isMostlyLatin(text) && translit) {
            matchRatio = similarityRatioLatin(actual, translit);
        }

        if (promptedPhrase) {
            const userMessageIndex = messages.length; // index of the message we're about to append
            setMatchScores(prev => ({ ...prev, [userMessageIndex]: Math.round(matchRatio * 100) }));
        }
        const threshold = 0.5;
        const acceptNote = (promptedPhrase && matchRatio >= threshold)
            ? `The user attempted to repeat the requested phrase. Similarity is ~${Math.round(matchRatio * 100)}%. Treat this as correct and move forward; do not ask to repeat again.`
            : null;

        const nativeLangName = nativeLang?.name || 'English';
        const targetLangName = targetLang?.name || 'English';
        const displayRuleNote = buildDisplayRule(nativeLangName, targetLangName);
        const metaNote = [displayRuleNote, acceptNote].filter(Boolean).join(' ');
        let botResponse = '';
        if (isTopicAnswer) {
            const followupMsg = `Great! Tell me a topic you like (travel, food, friends), or say "you decide".`;
            const translated = await aiService.translate(followupMsg, nativeLangName, 'English');
            botResponse = translated?.translation || followupMsg;
        } else {
            botResponse = await aiService.getResponse(text, topicName, activeCharacter, nativeLang, targetLang, triggerShadow, effectiveLevel, metaNote);
        }
        if (acceptNote) {
            const successMsg = `Great job! You said it well. Let's continue learning ${targetLangName}. What would you like to talk about next?`;
            const translated = await aiService.translate(successMsg, nativeLangName, 'English');
            botResponse = translated?.translation || successMsg;
        } else if (promptedPhrase && matchRatio < threshold) {
            const prompt = (displayPhrase || promptedPhrase || '').replace(/[.!?]+$/g, '');
            const retryMsg = `Nice try! You're close. Let's repeat the same phrase: "${prompt}". Please say it again.`;
            const translated = await aiService.translate(retryMsg, nativeLangName, 'English');
            const baseMsg = translated?.translation || retryMsg;
            botResponse = `${baseMsg} <target>${promptedPhrase}</target>`;
        }

        // Check for AI-triggered level recalibration (subtle cases the client-side check missed)

        const recalibrateMatch = botResponse.match(/<recalibrate>(zero|basic|conversational|fluent)<\/recalibrate>/);
        let responseWithoutMeta = botResponse.replace(/<recalibrate>.*?<\/recalibrate>/g, '');
        if (recalibrateMatch) {
            const newLevelId = recalibrateMatch[1];
            const LEVEL_LABELS = { zero: 'Beginner', basic: 'Basic', conversational: 'Conversational', fluent: 'Fluent' };
            const newLevel = { id: newLevelId, label: LEVEL_LABELS[newLevelId], appDetected: true };
            setUserLevel(newLevelId);
            localStorage.setItem('linguapaws_level', JSON.stringify(newLevel));
            api.put('/api/settings', { englishLevel: newLevel }).catch(() => { });
            setRecalibrationToast(`Miko adjusted to your level: ${LEVEL_LABELS[newLevelId]} 🎯`);
            setTimeout(() => setRecalibrationToast(null), 4000);
        }

        // Strip <word> tags for display BUT keep <shadow> tags so ShadowCard renders inline
        const storedResponse = responseWithoutMeta
            .replace(/<word>(.*?)<\/word>/g, '$1')
            .replace(/<shadow>(.*?)<\/shadow>/gs, '$1')
            .trim();
        let displayResponse = cleanupDisplayText(
            stripTargetScript(storedResponse.replace(/<target>.*?<\/target>/gs, ''))
        );
        if (isNativeEnglish()) displayResponse = stripLatinDiacritics(displayResponse);
        // Strip ALL special tags from TTS so audio doesn't read hidden tags
        const speechText = stripTargetScript(displayResponse);

        setMessages(prev => [...prev, { role: 'assistant', content: storedResponse }]);
        setIsLoading(false); // unblock UI before TTS — audio loading must not block chat

        // Play voice (non-blocking — after UI is already updated)
        if (!isMuted && isMounted.current) {
            const audioUrl = await aiService.generateSpeech(speechText, activeCharacter?.voice || 'alloy', nativeLang?.name || null);
            if (audioUrl && isMounted.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
            }
        }
    };

    const toggleRecording = async () => {
        if (isRecording) {
            const audioBlob = await stopRecording();
            if (audioBlob) {
                setIsLoading(true);
                const transcript = await aiService.transcribeAudio(audioBlob, targetLang?.id || null);
                if (transcript) {
                    handleSend(transcript);
                } else {
                    const errorMsg = "Meow... I couldn't quite hear that. Could you try again? 😿";
                    setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);

                    if (!isMuted && isMounted.current) {
                        const audioUrl = await aiService.generateSpeech(errorMsg, activeCharacter?.voice || 'alloy', nativeLang?.name || null);
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
        const speechText = text
            .replace(/<shadow>(.*?)<\/shadow>/gs, '$1')
            .replace(/<word>(.*?)<\/word>/g, '$1')
            .replace(/<[^>]+>/g, '');
        const audioUrl = await aiService.generateSpeech(speechText, activeCharacter?.voice || 'alloy', nativeLang?.name || null);
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
                                {typeof matchScores[i] === 'number' && (
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
                                    aria-label={translations[i] ? t.original : t.translate_to.replace('{n}', nativeLang.name || 'Lang')}
                                    title={translations[i] ? t.original : t.translate_to.replace('{n}', nativeLang.name || 'Lang')}
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
                        {msg.role === 'assistant' && transliterations[i] && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                style={{
                                    fontSize: '13px',
                                    color: '#475569',
                                    background: '#eef2ff',
                                    padding: '10px 14px',
                                    borderRadius: '14px',
                                    marginTop: '8px',
                                    borderLeft: '4px solid #6366f1',
                                    lineHeight: '1.4'
                                }}
                            >
                                <strong style={{ marginRight: '6px' }}>{t.pronunciation_hint || 'Pronunciation'}:</strong>
                                {transliterations[i]}
                                {isNativeEnglish() && (
                                    <span style={{ marginLeft: '6px', color: '#64748b', fontSize: '12px' }}>
                                        (pron: {buildPronunciationHint(transliterations[i])})
                                    </span>
                                )}
                            </motion.div>
                        )}
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
                                    handleSend(sug);
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
            <div style={{ padding: '24px', background: 'white', borderTop: '1px solid #eee', position: 'relative' }}>
                {inputMode === 'voice' ? (
                    /* Voice-First Layout */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                        <div style={{ position: 'relative' }}>
                            <motion.button
                                animate={isRecording ? { scale: [1, 1.1, 1], boxShadow: ['0 0 0px #ef4444', '0 0 20px #ef4444', '0 0 0px #ef4444'] } : {}}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                onClick={toggleRecording}
                                style={{
                                    width: '90px',
                                    height: '90px',
                                    borderRadius: '50%',
                                    background: isRecording ? '#ef4444' : 'var(--primary-gradient)',
                                    border: 'none',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)'
                                }}
                            >
                                {isRecording ? <Square size={36} fill="white" /> : <Mic size={40} />}
                            </motion.button>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center' }}>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={toggleInputMode}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px',
                                    borderRadius: '20px',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    color: '#475569',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                <Keyboard size={16} />
                                {t.switch_to_typing}
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={fetchSuggestions}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px',
                                    borderRadius: '20px',
                                    background: '#f5f3ff',
                                    border: '1px solid #ddd6fe',
                                    color: '#7c3aed',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                <Sparkles size={16} />
                                {t.help_me_answer}
                            </motion.button>
                        </div>
                    </div>
                ) : (
                    /* Text Mode Layout */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                                            handleSend(inputText.trim());
                                            setInputText('');
                                        }
                                    }
                                }}
                            />
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    if (inputText.trim()) {
                                        handleSend(inputText.trim());
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
