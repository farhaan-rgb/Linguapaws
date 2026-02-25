import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Share2, Languages, ChevronLeft, Mic, Square, Keyboard, History } from 'lucide-react';
import { aiService } from '../services/ai';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useTranslation } from '../hooks/useTranslation';

export default function Translator() {
    const navigate = useNavigate();
    const { isRecording, startRecording, stopRecording } = useAudioRecorder();
    const { t } = useTranslation();
    const [inputText, setInputText] = useState('');
    const [translation, setTranslation] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [mode, setMode] = useState('voice'); // 'voice' or 'text'

    const [lastInput, setLastInput] = useState('');
    const [detectedLang, setDetectedLang] = useState('');

    const nativeLang = JSON.parse(localStorage.getItem('linguapaws_native_lang') || '{"name": "any language", "code": "auto"}');
    const nativeLangName = nativeLang?.name || 'any language';
    const exampleMap = {
        hi: 'Aaj din kya hai?',
        te: 'Ninna nuvvu ekkadiki vellavu?',
        mr: 'Aaj kay divas aahe?',
        bn: 'Aj kon din?',
        ta: 'Inru entha naal?',
        kn: 'Ivattu yenu dina?',
        gu: 'Aaje kyano divas che?',
        ml: 'Innu ethra divasam?',
        pa: 'Aj ki din hai?',
        ur: 'Aaj ka din kya hai?',
    };
    const exampleText = exampleMap[nativeLang?.id] || 'Aaj kya din hai?';

    const handleTranslateAction = async (content) => {
        if (!content.trim()) return;
        setLastInput(content);
        setIsTranslating(true);
        try {
            // Force "to English" mode for this page
            const data = await aiService.translate(content, 'English', nativeLangName);
            if (data && typeof data === 'object') {
                setTranslation(data.translation);
                setDetectedLang(data.detectedLanguage);
            } else {
                setTranslation(data);
                setDetectedLang('');
            }
        } catch (error) {
            console.error("Translation error:", error);
        } finally {
            setIsTranslating(false);
        }
    };

    const handleVoiceToggle = async () => {
        if (isRecording) {
            const audioBlob = await stopRecording();
            if (audioBlob) {
                setIsTranslating(true);
                const transcript = await aiService.transcribeAudio(audioBlob);
                if (transcript) {
                    setInputText(transcript);
                    await handleTranslateAction(transcript);
                }
                setIsTranslating(false);
            }
        } else {
            setTranslation('');
            await startRecording();
        }
    };

    const handleShare = async () => {
        if (!translation) return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Linguapaws Translation',
                    text: `English: ${translation}\n(${nativeLang.name}: ${inputText})`,
                    url: window.location.origin
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(translation);
            alert('Translation copied to clipboard!');
        }
    };

    return (
        <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '10px 0' }}>
                <button onClick={() => navigate('/')} style={{ background: 'white', border: '1px solid #e2e8f0', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                    <ChevronLeft size={24} />
                </button>
                <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>{t.translator_title}</h1>
            </header>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Status Card */}
                <div style={{ background: 'white', padding: '16px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '10px', background: '#f5f3ff', borderRadius: '14px', color: '#7c3aed' }}>
                        <Languages size={20} />
                    </div>
                    <div>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>{t.translating_from}</span>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>{nativeLangName} → English</h3>
                    </div>
                </div>

                {/* Translation Display Area */}
                <AnimatePresence mode="wait">
                    {translation ? (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ background: 'var(--primary-gradient)', padding: '24px', borderRadius: '32px', color: 'white', position: 'relative', boxShadow: '0 20px 40px rgba(139, 92, 246, 0.2)' }}
                        >
                            <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', opacity: 0.7, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                                    {t.original_label} ({detectedLang && detectedLang.toLowerCase() !== nativeLangName.toLowerCase() && nativeLangName !== 'any language' ? `${t.detected_label}: ${detectedLang}` : nativeLangName}):
                                </span>
                                <p style={{ fontSize: '16px', fontWeight: '500', opacity: 0.9 }}>"{lastInput}"</p>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', opacity: 0.8, textTransform: 'uppercase' }}>{t.english_translation_label}</span>
                            </div>
                            <p style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px', lineHeight: '1.4' }}>"{translation}"</p>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={handleShare}
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', padding: '12px', borderRadius: '16px', color: 'white', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                                >
                                    <Share2 size={18} /> {t.share_translation}
                                </button>
                                <button
                                    onClick={() => { setTranslation(''); setInputText(''); setMode('voice'); }}
                                    style={{ background: 'rgba(255,255,255,0.2)', border: 'none', padding: '12px', borderRadius: '16px', color: 'white', cursor: 'pointer' }}
                                >
                                    <History size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="input"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '30px' }}
                        >
                            {mode === 'voice' ? (
                                <>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                                            {isRecording ? t.listening : t.speak_in.replace('{n}', nativeLangName)}
                                        </p>
                                        <p style={{ color: '#94a3b8', fontSize: '13px' }}>{t.convert_to_english}</p>
                                    </div>

                                    <motion.button
                                        animate={isRecording ? { scale: [1, 1.1, 1], boxShadow: ['0 0 0px #ef4444', '0 0 30px #ef4444', '0 0 0px #ef4444'] } : {}}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        onClick={handleVoiceToggle}
                                        style={{
                                            width: '120px',
                                            height: '120px',
                                            borderRadius: '50%',
                                            background: isRecording ? '#ef4444' : 'var(--primary-gradient)',
                                            border: 'none',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: '0 12px 40px rgba(139, 92, 246, 0.4)'
                                        }}
                                    >
                                        {isRecording ? <Square size={48} fill="white" /> : <Mic size={54} />}
                                    </motion.button>

                                    <button
                                        onClick={() => setMode('text')}
                                        style={{ background: 'white', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: '20px', color: '#64748b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <Keyboard size={18} /> {t.switch_to_typing}
                                    </button>
                                </>
                            ) : (
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <textarea
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            placeholder={t.type_in_example
                                                .replace('{n}', nativeLangName)
                                                .replace('{ex}', exampleText)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    if (inputText.trim()) {
                                                        handleTranslateAction(inputText);
                                                    }
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '20px',
                                                borderRadius: '24px',
                                                border: '2px solid #e2e8f0',
                                                background: 'white',
                                                fontSize: '18px',
                                                minHeight: '160px',
                                                resize: 'none',
                                                outline: 'none',
                                                lineHeight: '1.5',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                        />
                                        <button
                                            onClick={() => handleTranslateAction(inputText)}
                                            disabled={isTranslating || !inputText.trim()}
                                            style={{
                                                position: 'absolute',
                                                right: '16px',
                                                bottom: '16px',
                                                width: '50px',
                                                height: '50px',
                                                borderRadius: '16px',
                                                background: inputText.trim() ? 'var(--primary-gradient)' : '#e2e8f0',
                                                border: 'none',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                                            }}
                                        >
                                            <Send size={24} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setMode('voice')}
                                        style={{ alignSelf: 'center', background: 'none', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <Mic size={18} /> {t.back_to_voice}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {isTranslating && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            style={{ width: '40px', height: '40px', border: '4px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%' }}
                        />
                        <span style={{ fontWeight: '700', color: '#1e293b' }}>{t.translating_with_ai}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
