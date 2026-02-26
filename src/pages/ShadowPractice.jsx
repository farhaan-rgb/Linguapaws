import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Volume2, Mic, Square, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { api } from '../services/api';

export default function ShadowPractice() {
    const navigate = useNavigate();
    const { state } = useLocation();
    const targetText = state?.targetText || '';
    const voice = state?.voice || 'alloy';
    const targetLang = JSON.parse(localStorage.getItem('linguapaws_target_lang') || '{}');

    const { isRecording, startRecording, stopRecording } = useAudioRecorder();
    const audioRef = useRef(new Audio());

    const [phase, setPhase] = useState('ready'); // ready | recording | analysing | result | error
    const [result, setResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isPlayingTarget, setIsPlayingTarget] = useState(false);

    // Safe base64 conversion for large audio blobs (avoids stack overflow from spread)
    const bufferToBase64 = (buffer) => {
        const bytes = new Uint8Array(buffer);
        const chunkSize = 8192;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    };

    const playTarget = async () => {
        if (isPlayingTarget) return;
        setIsPlayingTarget(true);
        try {
            const url = await api.postAudio('/api/ai/speech', { text: targetText, voice });
            audioRef.current.src = url;
            audioRef.current.onended = () => setIsPlayingTarget(false);
            await audioRef.current.play();
        } catch {
            setIsPlayingTarget(false);
        }
    };

    const toggleRecord = async () => {
        if (isRecording) {
            setPhase('analysing');
            const blob = await stopRecording();
            if (!blob) { setPhase('ready'); return; }

            try {
                // 1. Transcribe — use chunked base64 to avoid stack overflow
                const buffer = await blob.arrayBuffer();
                const base64 = bufferToBase64(buffer);
                const { text: transcript } = await api.post('/api/ai/transcribe', {
                    audioBase64: base64,
                    mimeType: blob.type || 'audio/webm',
                });

                if (!transcript?.trim()) {
                    setErrorMsg("Couldn't hear anything — please try again in a quieter environment.");
                    setPhase('error');
                    return;
                }

                // 2. Analyse pronunciation
                const feedback = await api.post('/api/ai/pronunciation', {
                    targetText,
                    transcript,
                    targetLang: targetLang?.name || 'English',
                });
                setResult({ ...feedback, transcript });
                setPhase('result');
            } catch (err) {
                console.error('Shadow analysis error:', err);
                setErrorMsg(err.message || 'Something went wrong. Please try again.');
                setPhase('error');
            }
        } else {
            audioRef.current.pause();
            setPhase('recording');
            await startRecording();
        }
    };

    const retry = () => {
        setResult(null);
        setPhase('ready');
    };

    const scoreColor = (score) => {
        if (score >= 80) return '#10b981';
        if (score >= 60) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div className="app-container" style={{ minHeight: '100vh', padding: '0', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{
                padding: '14px 20px',
                background: 'white',
                borderBottom: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
            }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h1 style={{ fontSize: '17px', fontWeight: '800', color: '#1e293b' }}>Shadow Practice</h1>
                    <p style={{ fontSize: '12px', color: '#94a3b8' }}>Listen → Repeat → Get feedback</p>
                </div>
            </header>

            <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Target sentence card */}
                <section style={{
                    background: 'linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)',
                    borderRadius: '24px',
                    padding: '24px',
                    border: '1px solid #e0e7ff',
                }}>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                        Target phrase
                    </p>
                    <p style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', lineHeight: '1.4', marginBottom: '20px' }}>
                        "{targetText}"
                    </p>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={playTarget}
                        disabled={isPlayingTarget}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: isPlayingTarget ? '#c4b5fd' : '#7c3aed',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50px',
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                        }}
                    >
                        <Volume2 size={16} />
                        {isPlayingTarget ? 'Playing...' : 'Hear it'}
                    </motion.button>
                </section>

                {/* Recording / Analysing / Result */}
                <AnimatePresence mode="wait">

                    {/* Ready + Recording */}
                    {(phase === 'ready' || phase === 'recording') && (
                        <motion.div
                            key="record"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '12px' }}
                        >
                            <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center' }}>
                                {phase === 'recording' ? '🎙️ Recording... tap to stop' : 'Now say the phrase aloud'}
                            </p>
                            <motion.button
                                animate={isRecording ? {
                                    scale: [1, 1.08, 1],
                                    boxShadow: ['0 0 0px #ef4444', '0 0 24px #ef4444', '0 0 0px #ef4444'],
                                } : {}}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                whileTap={{ scale: 0.93 }}
                                onClick={toggleRecord}
                                style={{
                                    width: '88px',
                                    height: '88px',
                                    borderRadius: '50%',
                                    background: isRecording ? '#ef4444' : 'linear-gradient(135deg, #a855f7, #3b82f6)',
                                    border: 'none',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)',
                                }}
                            >
                                {isRecording ? <Square size={32} fill="white" /> : <Mic size={36} />}
                            </motion.button>
                            <p style={{ fontSize: '12px', color: '#cbd5e1' }}>
                                Tip: Speak naturally at a normal pace
                            </p>
                        </motion.div>
                    )}

                    {/* Analysing */}
                    {phase === 'analysing' && (
                        <motion.div
                            key="analysing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '24px' }}
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                                style={{ fontSize: '36px' }}
                            >
                                🐾
                            </motion.div>
                            <p style={{ fontSize: '15px', color: '#64748b', fontWeight: '600' }}>Analysing your pronunciation...</p>
                        </motion.div>
                    )}

                    {/* Error */}
                    {phase === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '12px' }}
                        >
                            <div style={{
                                background: '#fff7ed',
                                border: '1px solid #fed7aa',
                                borderRadius: '20px',
                                padding: '20px',
                                textAlign: 'center',
                                width: '100%',
                            }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>😿</div>
                                <p style={{ fontWeight: '700', fontSize: '15px', color: '#c2410c', marginBottom: '6px' }}>Oops!</p>
                                <p style={{ fontSize: '13px', color: '#78716c', lineHeight: '1.5' }}>{errorMsg}</p>
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setErrorMsg(''); setPhase('ready'); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                                    color: 'white', border: 'none', borderRadius: '50px',
                                    padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                                }}
                            >
                                <RotateCcw size={14} /> Try Again
                            </motion.button>
                        </motion.div>
                    )}

                    {/* Result */}
                    {phase === 'result' && result && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                        >
                            {/* Score */}
                            <div style={{
                                background: 'white',
                                borderRadius: '20px',
                                padding: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                border: '1px solid #f1f5f9',
                            }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: `${scoreColor(result.score)}18`,
                                    border: `3px solid ${scoreColor(result.score)}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <span style={{ fontSize: '20px', fontWeight: '800', color: scoreColor(result.score) }}>
                                        {result.score}
                                    </span>
                                </div>
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#1e293b' }}>
                                        {result.score >= 80 ? '🎉 Excellent!' : result.score >= 60 ? '👍 Good effort!' : '💪 Keep practising!'}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                                        {result.encouragement}
                                    </div>
                                </div>
                            </div>

                            {/* What you said */}
                            <div style={{
                                background: 'white',
                                borderRadius: '20px',
                                padding: '16px 20px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                                border: '1px solid #f1f5f9',
                            }}>
                                <p style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                                    You said
                                </p>
                                <p style={{ fontSize: '15px', color: '#475569', fontStyle: 'italic' }}>"{result.transcript}"</p>
                            </div>

                            {/* Word-by-word breakdown */}
                            <div style={{
                                background: 'white',
                                borderRadius: '20px',
                                padding: '16px 20px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                                border: '1px solid #f1f5f9',
                            }}>
                                <p style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
                                    Word breakdown
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {result.words?.map((w, i) => (
                                        <div key={i} style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '12px',
                                            padding: '10px 14px',
                                            borderRadius: '14px',
                                            background: w.correct ? '#f0fdf4' : '#fff7ed',
                                            border: `1px solid ${w.correct ? '#bbf7d0' : '#fed7aa'}`,
                                        }}>
                                            {w.correct
                                                ? <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '1px' }} />
                                                : <XCircle size={18} color="#f97316" style={{ flexShrink: 0, marginTop: '1px' }} />
                                            }
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: '700', fontSize: '15px', color: '#1e293b' }}>{w.target}</span>
                                                    {!w.correct && w.heard && (
                                                        <span style={{ fontSize: '12px', color: '#f97316' }}>→ you said "{w.heard}"</span>
                                                    )}
                                                </div>
                                                {!w.correct && w.tip && (
                                                    <p style={{ fontSize: '12px', color: '#78716c', marginTop: '4px', lineHeight: '1.4' }}>
                                                        💡 {w.tip}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={retry}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: '16px',
                                        background: '#f1f5f9',
                                        border: 'none',
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        color: '#475569',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    <RotateCcw size={16} /> Try again
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => navigate(-1)}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: '16px',
                                        background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                                        border: 'none',
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        color: 'white',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Done ✓
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
