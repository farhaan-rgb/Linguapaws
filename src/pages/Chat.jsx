import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Mic, Square, BookOpen, Globe, Edit3, Sparkles, Keyboard, Volume2, VolumeX, Phone, PhoneOff, Mic2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { aiService } from '../services/ai';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { wordTracker } from '../services/wordTracker';
import { characters as defaultCharacters } from '../data/characters';
import ShadowCard from '../components/ShadowCard';

export default function Chat() {
    const navigate = useNavigate();
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
    const scrollRef = useRef(null);
    const audioRef = useRef(new Audio());
    const hasGreeted = useRef(messages.length > 0); // Skip greeting if chat already has messages
    const exchangeCount = useRef(messages.filter(m => m.role === 'user').length); // Track exchanges for shadow trigger
    const isMounted = useRef(true);
    const [isCallMode, setIsCallMode] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [callStatus, setCallStatus] = useState('idle'); // idle, listening, thinking, speaking
    const callTimerRef = useRef(null);

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
        const sugs = await aiService.getSuggestions();
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
        const greetings = resolvedCharacter?.greetings || ["Hey! Great to hear from you! Let's practice some English together!"];
        const greeting = greetings[Math.floor(Math.random() * greetings.length)];
        if (isMounted.current) {
            const audioUrl = await aiService.generateSpeech(greeting, resolvedCharacter?.voice || 'alloy');
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
                const transcript = await aiService.transcribeAudio(audioBlob);
                if (transcript) {
                    setMessages(prev => [...prev, { role: 'user', content: transcript }]);
                    const userWords = transcript.toLowerCase().match(/\b(\w+)\b/g);
                    if (userWords) userWords.forEach(w => { if (w.length > 3) wordTracker.addWord(w); });

                    const botResponse = await aiService.getResponse(transcript, topicName, activeCharacter, nativeLang);
                    const cleanResponse = botResponse.replace(/<word>(.*?)<\/word>/g, '$1');
                    setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse }]);

                    setCallStatus('speaking');
                    if (isMounted.current) {
                        const audioUrl = await aiService.generateSpeech(cleanResponse, resolvedCharacter?.voice || 'alloy');
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

    useEffect(() => {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        aiService.init(apiKey);

        // Reset mounted state — fixes React Strict Mode double-invocation bug
        isMounted.current = true;

        const greet = async () => {
            if (hasGreeted.current) return;
            hasGreeted.current = true;

            setIsLoading(true);
            let greeting = "";
            const levelId = userLevel || 'conversational';
            const nativeLangName = nativeLang?.name || 'Hindi';

            if (activeCharacter) {
                if (levelId === 'zero' || levelId === 'basic') {
                    // For beginners, ask AI to generate a level-aware greeting in character
                    const scriptNote = `CRITICAL LANGUAGE RULE: The user's native language is ${nativeLangName}. You MUST write your entire response in ${nativeLangName} using its NATIVE SCRIPT (e.g. Devanagari for Hindi, Bengali script for Bengali, Tamil script for Tamil). Do NOT use Roman/Latin transliteration and do NOT use the character's own regional language — for example, even if the character is from Kolkata, do NOT use Bengali if the user's language is Hindi. The character's regional personality and warmth should show only through tone and the one English phrase.`;
                    const levelNote = levelId === 'zero'
                        ? `${scriptNote} Greet the user briefly (2 sentences max) introducing yourself as ${activeCharacter.name}. End with just ONE simple English word or phrase like "Say: Hello!".`
                        : `${scriptNote} Greet the user with a mix of ${nativeLangName} and simple English (2 sentences max), introducing yourself as ${activeCharacter.name}. Keep it warm and encouraging.`;
                    const aiGreeting = await aiService.getResponse(
                        `[GREETING ONLY — do not start a conversation, just greet the user. ${levelNote}]`,
                        topicName, activeCharacter, nativeLang, false, levelId
                    );
                    // Strip any accidental tags
                    greeting = aiGreeting.replace(/<[^>]+>/g, '').trim();
                } else {
                    // Conversational / Fluent — use fast hardcoded character greeting
                    const greetings = activeCharacter.greetings || ["Hello! How are you today?"];
                    greeting = greetings[Math.floor(Math.random() * greetings.length)];
                }
            } else {


                if (levelId === 'zero') {
                    // Mostly native language — one simple English phrase at the end
                    const zeroGreetings = {
                        hi: `नमस्ते! 🐾 मैं Miko हूँ — आपका English सीखने का दोस्त! घबराइए मत, हम बहुत धीरे-धीरे शुरू करेंगे। बस इतना कहिए: "Hello!"`,
                        te: `నమస్కారం! 🐾 నేను Miko — మీ English నేర్పించే స్నేహితుడిని! భయపడకండి, మనం నెమ్మదిగా మొదలు పెడదాం. ఇది చెప్పండి: "Hello!"`,
                        mr: `नमस्कार! 🐾 मी Miko — तुमचा English शिकण्याचा मित्र! घाबरू नका, आपण हळूहळू सुरुवात करू. फक्त म्हणा: "Hello!"`,
                        bn: `নমস্কার! 🐾 আমি Miko — আপনার ইংরেজি শেখার বন্ধু! ভয় পাবেন না, আমরা ধীরে ধীরে শুরু করব। শুধু বলুন: "Hello!"`,
                        ta: `வணக்கம்! 🐾 நான் Miko — உங்கள் English கற்பிக்கும் நண்பன்! பயப்படாதீர்கள், நாம் மெதுவாக ஆரம்பிப்போம். இதை சொல்லுங்கள்: "Hello!"`,
                        kn: `ನಮಸ್ಕಾರ! 🐾 ನಾನು Miko — ನಿಮ್ಮ English ಕಲಿಕೆಯ ಸ್ನೇಹಿತ! ಭಯಪಡಬೇಡಿ, ನಾವು ನಿಧಾನವಾಗಿ ಪ್ರಾರಂಭಿಸೋಣ. ಹೇಳಿ: "Hello!"`,
                        gu: `નમસ્તે! 🐾 હું Miko — તમારો English શીખવાનો મિત્ર! ગભરાશો નહીં, આપણે ધીરે ધીરે શરૂ કરીશું. ફક્ત કહો: "Hello!"`,
                        pa: `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! 🐾 ਮੈਂ Miko ਹਾਂ — ਤੁਹਾਡਾ English ਸਿੱਖਣ ਦਾ ਦੋਸਤ! ਡਰੋ ਨਾ, ਅਸੀਂ ਹੌਲੀ ਹੌਲੀ ਸ਼ੁਰੂ ਕਰਾਂਗੇ। ਬੱਸ ਕਹੋ: "Hello!"`,
                        or: `ନମସ୍କାର! 🐾 ମୁଁ Miko — ତୁମର English ଶିକ୍ଷା ବନ୍ଧୁ! ଡରଅ ନାହିଁ, ଆମେ ଧୀରେ ଧୀରେ ଆରମ୍ଭ କରିବା। ବସ୍ କୁହ: "Hello!"`,
                        ml: `നമസ്കാരം! 🐾 ഞാൻ Miko — നിങ്ങളുടെ English പഠന സുഹൃത്ത്! ഭയപ്പെടേണ്ട, നമ്മൾ സ천ിനെ ആരംഭിക്കും. ഇത് പറയൂ: "Hello!"`,
                        ur: `السلام علیکم! 🐾 میں Miko ہوں — آپ کا انگریزی سیکھنے کا دوست! گھبرائیں نہیں، ہم آہستہ آہستہ شروع کریں گے۔ بس کہیں: "Hello!"`,
                    };
                    greeting = zeroGreetings[nativeLang?.id] || `${nativeLangName} में: नमस्ते! मैं Miko हूँ। बस कहिए: "Hello!" 🐾`;
                } else if (levelId === 'basic') {
                    greeting = topicName
                        ? `Meow! 🐾 Let's talk about ${topicName} today! (${nativeLangName}: हम "${topicName}" के बारे में बात करेंगे।) Ready? Say: "Yes, I am ready!"`
                        : `Meow! 🐾 I'm Miko — your English buddy! We'll go slowly, no worries. Can you say: "My name is ___."?`;
                } else {
                    // Conversational / Fluent — full English
                    greeting = topicName
                        ? `Meow! I'm so excited to talk about ${topicName} with you! 🐾 How are you feeling today?`
                        : `Meow! Purr-fect timing! Ready for some English practice? What's on your mind today? 🐾`;
                }
            }

            setMessages([{ role: 'assistant', content: greeting }]);
            aiService.history.push({ role: 'assistant', content: greeting });

            // Speak the greeting
            if (!isMuted && isMounted.current) {
                const audioUrl = await aiService.generateSpeech(greeting, resolvedCharacter?.voice || 'alloy');
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

    const handleTranslate = async (index, text) => {
        if (translations[index]) {
            const newTrans = { ...translations };
            delete newTrans[index];
            setTranslations(newTrans);
            return;
        }

        if (!nativeLang.name) return;

        setIsLoading(true);
        const translatedText = await aiService.translate(text, nativeLang.name);
        if (translatedText) {
            setTranslations(prev => ({ ...prev, [index]: translatedText }));

            // Read aloud the translation if not muted
            if (!isMuted && isMounted.current) {
                const audioUrl = await aiService.generateSpeech(translatedText, activeCharacter?.voice || 'alloy');
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
        const userWords = text.toLowerCase().match(/\b(\w+)\b/g);
        if (userWords) {
            userWords.forEach(word => {
                if (word.length > 3) {
                    wordTracker.addWord(word);
                }
            });
        }

        setIsLoading(true);

        // ── CLIENT-SIDE RECALIBRATION (first message only) ────────────────────
        // Deterministically detect obvious level mismatches before calling AI.
        // React state updates are async so we track the effective level locally.
        let effectiveLevel = userLevel;
        const isFirstMessage = exchangeCount.current === 0;
        if (isFirstMessage) {
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

            // Non-English message + high stated level → recalibrate down
            if (latinRatio < 0.15 && (userLevel === 'fluent' || userLevel === 'conversational')) {
                applyRecalibration('zero');
            }
            // Very basic English + high stated level → recalibrate to basic
            else if (latinRatio > 0.5 && latinRatio < 0.85 && text.trim().split(/\s+/).length <= 4 && userLevel === 'fluent') {
                applyRecalibration('basic');
            }
            // Fluent English paragraphs + stated zero → recalibrate up  
            else if (latinRatio > 0.85 && text.trim().split(/\s+/).length > 6 && (userLevel === 'zero' || userLevel === 'basic')) {
                applyRecalibration('fluent');
            }
        }
        // ── END CLIENT-SIDE RECALIBRATION ─────────────────────────────────────

        // Increment exchange count and determine if this is a scheduled shadow round
        exchangeCount.current += 1;
        const triggerShadow = exchangeCount.current > 0 && exchangeCount.current % 6 === 0;

        const botResponse = await aiService.getResponse(text, topicName, activeCharacter, nativeLang, triggerShadow, effectiveLevel);

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

        // Play voice
        if (!isMuted && isMounted.current) {
            const audioUrl = await aiService.generateSpeech(speechText, activeCharacter?.voice || 'alloy');
            if (audioUrl && isMounted.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.play().catch(e => console.warn("Audio play blocked:", e));
            }
        }

        setIsLoading(false);
    };

    const toggleRecording = async () => {
        if (isRecording) {
            const audioBlob = await stopRecording();
            if (audioBlob) {
                setIsLoading(true);
                const transcript = await aiService.transcribeAudio(audioBlob);
                if (transcript) {
                    handleSend(transcript);
                } else {
                    const errorMsg = "Meow... I couldn't quite hear that. Could you try again? 😿";
                    setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);

                    if (!isMuted && isMounted.current) {
                        const audioUrl = await aiService.generateSpeech(errorMsg, activeCharacter?.voice || 'alloy');
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
        const audioUrl = await aiService.generateSpeech(text, activeCharacter?.voice || 'alloy');
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
                            {resolvedCharacter?.trait || 'Coach'}
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
                                Feedback
                            </motion.button>
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
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <Globe size={12} />
                                    {translations[i] ? 'Original' : `Translate to ${nativeLang.name || 'Lang'}`}
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
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <BookOpen size={12} title="Explore words" />
                                    Dictionary
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
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <Volume2 size={12} />
                                    Read Aloud
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
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    <Mic2 size={12} />
                                    Shadow
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
                            <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>Suggested Responses</span>
                        </div>
                        <button
                            onClick={() => setShowSuggestions(false)}
                            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                        >
                            Close
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
                                Switch to Typing
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
                                Help me answer
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
                                placeholder="Type a message..."
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
                                <Mic size={14} /> Back to Voice
                            </button>
                            <button
                                onClick={fetchSuggestions}
                                style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Sparkles size={14} /> Help me answer
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
                                {callStatus === 'listening' ? '🎙️ Listening...' : callStatus === 'speaking' ? '🔊 Speaking...' : callStatus === 'thinking' ? '💭 Thinking...' : 'Tap mic to speak'}
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
