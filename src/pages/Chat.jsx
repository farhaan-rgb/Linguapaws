import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Mic, Square, BookOpen, Globe, Edit3, Sparkles, Keyboard, Volume2, VolumeX, Phone, PhoneOff, Mic2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { aiService } from '../services/ai';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { wordTracker } from '../services/wordTracker';
import { characters as defaultCharacters } from '../data/characters';
import { useTranslation } from '../hooks/useTranslation';
import ShadowCard from '../components/ShadowCard';

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
            .normalize('NFKC')
            .replace(/[^\p{L}\p{N}]+/gu, ' ')
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

    const levenshtein = (a, b) => {
        const alen = a.length;
        const blen = b.length;
        if (alen === 0) return blen;
        if (blen === 0) return alen;
        const dp = Array.from({ length: alen + 1 }, () => new Array(blen + 1).fill(0));
        for (let i = 0; i <= alen; i++) dp[i][0] = i;
        for (let j = 0; j <= blen; j++) dp[0][j] = j;
        for (let i = 1; i <= alen; i++) {
            for (let j = 1; j <= blen; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[alen][blen];
    };

    const similarityRatio = (a, b) => {
        const na = normalizePhrase(a);
        const nb = normalizePhrase(b);
        if (!na || !nb) return 0;
        const dist = levenshtein(na, nb);
        return 1 - dist / Math.max(na.length, nb.length, 1);
    };

    const similarityRatioLatin = (a, b) => {
        const na = normalizeLatin(a);
        const nb = normalizeLatin(b);
        if (!na || !nb) return 0;
        const dist = levenshtein(na, nb);
        return 1 - dist / Math.max(na.length, nb.length, 1);
    };

    const extractPromptedPhrase = (text) => {
        if (!text) return null;
        const clean = text.replace(/<[^>]+>/g, '');
        const sayMatch = clean.match(/(?:say|try saying)\s*:\s*["“]?(.+?)["”]?(?:$|\n)/i);
        if (sayMatch && sayMatch[1]) return sayMatch[1].trim();
        return null;
    };

    // Persist messages to sessionStorage on every update
    useEffect(() => {
        sessionStorage.setItem(chatSessionKey, JSON.stringify(messages));
    }, [messages]);

    // Parse <shadow>phrase</shadow> tags in assistant messages and render ShadowCard inline
    const renderMessageContent = (content, character) => {
        if (!content.includes('<shadow>')) return content;
        const parts = content.split(/(<shadow>.*?<\/shadow>)/gs);
        return parts.map((part, i) => {
            const m = part.match(/^<shadow>(.*?)<\/shadow>$/s);
            if (m) return <ShadowCard key={i} phrase={m[1]} character={character} />;
            return <span key={i}>{part}</span>;
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
        let greeting = await aiService.getResponse(
            `[CALL GREETING ONLY — keep it short. Greet warmly and invite practice.]`,
            topicName,
            activeCharacter,
            nativeLang,
            targetLang,
            false,
            userLevel
        );
        greeting = greeting.replace(/<[^>]+>/g, '').trim();
        if (isMounted.current) {
            const audioUrl = await aiService.generateSpeech(greeting, resolvedCharacter?.voice || 'alloy', targetLang?.name || null);
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

                    const botResponse = await aiService.getResponse(transcript, topicName, activeCharacter, nativeLang, targetLang, false, userLevel);
                    const cleanResponse = botResponse.replace(/<word>(.*?)<\/word>/g, '$1');
                    setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse }]);

                    setCallStatus('speaking');
                    if (isMounted.current) {
                        const audioUrl = await aiService.generateSpeech(cleanResponse, resolvedCharacter?.voice || 'alloy', targetLang?.name || null);
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

            const scriptNote = `CRITICAL LANGUAGE RULE: The user's native language is ${nativeLangName}. You MUST write all ${nativeLangName} parts in its NATIVE SCRIPT (e.g. Devanagari for Hindi, Bengali script for Bengali, Tamil script for Tamil). Do NOT use Roman/Latin transliteration and do NOT use the character's own regional language if it differs from the user's native language.`;
            const levelNote = levelId === 'zero'
                ? `${scriptNote} Greet the user briefly (2 sentences max) introducing yourself as ${activeCharacter?.name || 'Miko'}. Write MOST of the greeting in ${nativeLangName} so a complete beginner understands, then end with just ONE simple ${targetLangName} word or phrase like "Say: Hello!". Do NOT use more than one ${targetLangName} phrase.`
                : levelId === 'basic'
                    ? `${scriptNote} Greet the user with a mix of ${nativeLangName} and simple ${targetLangName} (2 sentences max), introducing yourself as ${activeCharacter?.name || 'Miko'}. Keep it warm and encouraging.`
                    : `${scriptNote} Greet the user in ${targetLangName} (2 sentences max), introducing yourself as ${activeCharacter?.name || 'Miko'}. Keep it warm and encouraging.`;

            const aiGreeting = await aiService.getResponse(
                `[GREETING ONLY — do not start a conversation, just greet the user. ${levelNote}]`,
                topicName,
                activeCharacter,
                nativeLang,
                targetLang,
                false,
                levelId
            );
            greeting = aiGreeting.replace(/<[^>]+>/g, '').trim();
            setMessages([{ role: 'assistant', content: greeting }]);
            aiService.history.push({ role: 'assistant', content: greeting });

            // Speak the greeting
            if (!isMuted && isMounted.current) {
                const audioUrl = await aiService.generateSpeech(greeting, resolvedCharacter?.voice || 'alloy', targetLang?.name || null);
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

        const lastAssistantWithPrompt = [...messages].reverse().find(m => m.role === 'assistant' && extractPromptedPhrase(m.content));
        const promptedPhrase = extractPromptedPhrase(lastAssistantWithPrompt?.content || '');
        let matchRatio = promptedPhrase ? similarityRatio(text, promptedPhrase) : 0;
        let usedTranslit = false;

        if (promptedPhrase && isMostlyLatin(text) && !isMostlyLatin(promptedPhrase)) {
            const assistantIndex = messages.lastIndexOf(lastAssistantWithPrompt);
            let translit = transliterations[assistantIndex];
            if (!translit) {
                try {
                    const data = await aiService.transliterate(promptedPhrase, targetLang?.name || 'English', nativeLang?.name || 'English');
                    translit = formatTransliteration(data?.transliteration || '', nativeLang);
                    if (translit) {
                        setTransliterations(prev => ({ ...prev, [assistantIndex]: translit }));
                    }
                } catch { /* ignore */ }
            }
            if (translit) {
                matchRatio = similarityRatioLatin(text, translit);
                usedTranslit = true;
            }
        }

        if (promptedPhrase) {
            const userMessageIndex = messages.length; // index of the message we're about to append
            setMatchScores(prev => ({ ...prev, [userMessageIndex]: Math.round(matchRatio * 100) }));
        }
        const acceptNote = (promptedPhrase && matchRatio >= 0.7)
            ? `The user attempted to repeat the requested phrase. Similarity is ~${Math.round(matchRatio * 100)}%. Treat this as correct and move forward; do not ask to repeat again.`
            : null;

        let botResponse = await aiService.getResponse(text, topicName, activeCharacter, nativeLang, targetLang, triggerShadow, effectiveLevel, acceptNote);
        if (acceptNote && /say|try saying/i.test(botResponse)) {
            const targetLangName = targetLang?.name || 'English';
            const nativeLangName = nativeLang?.name || 'English';
            botResponse = `Great job! ✅ You said it well. In ${nativeLangName}, nice work. Let's continue learning ${targetLangName}. What would you like to talk about next?`;
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
        const cleanResponse = responseWithoutMeta.replace(/<word>(.*?)<\/word>/g, '$1');
        // Strip ALL special tags from TTS so audio doesn't read "shadow the weather shadow"
        const speechText = cleanResponse.replace(/<shadow>(.*?)<\/shadow>/gs, '$1');

        setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse }]);
        setIsLoading(false); // unblock UI before TTS — audio loading must not block chat

        // Play voice (non-blocking — after UI is already updated)
        if (!isMuted && isMounted.current) {
            const audioUrl = await aiService.generateSpeech(speechText, activeCharacter?.voice || 'alloy', targetLang?.name || null);
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
        const speechText = text
            .replace(/<shadow>(.*?)<\/shadow>/gs, '$1')
            .replace(/<word>(.*?)<\/word>/g, '$1')
            .replace(/<[^>]+>/g, '');
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
                            {renderMessageContent(msg.content, resolvedCharacter)}
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
