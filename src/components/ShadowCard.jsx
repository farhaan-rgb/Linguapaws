import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Mic, Square, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../services/api';

/**
 * Inline shadow practice card — shown directly in the chat when the AI
 * triggers a shadowing exercise via <shadow>phrase</shadow> tags.
 */
export default function ShadowCard({ phrase, character }) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { isRecording, startRecording, stopRecording } = useAudioRecorder();
    const audioRef = useRef(new Audio());
    const targetLang = JSON.parse(localStorage.getItem('linguapaws_target_lang') || '{}');

    const [phase, setPhase] = useState('idle'); // idle | recording | analysing | done | skipped
    const [score, setScore] = useState(null);
    const [isPlayingTarget, setIsPlayingTarget] = useState(false);

    if (phase === 'skipped') return null;

    const playTarget = async () => {
        if (isPlayingTarget) return;
        setIsPlayingTarget(true);
        try {
            const url = await api.postAudio('/api/ai/speech', {
                text: phrase,
                voice: character?.voice || 'alloy',
                targetLang: targetLang?.name || null,
            });
            audioRef.current.src = url;
            audioRef.current.onended = () => setIsPlayingTarget(false);
            await audioRef.current.play();
        } catch { setIsPlayingTarget(false); }
    };

    const bufferToBase64 = (buffer) => {
        const bytes = new Uint8Array(buffer);
        const chunkSize = 8192;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    };

    const toggleRecord = async () => {
        if (isRecording) {
            setPhase('analysing');
            const blob = await stopRecording();
            if (!blob) { setPhase('idle'); return; }
            try {
                const buffer = await blob.arrayBuffer();
                const base64 = bufferToBase64(buffer);
                const { text: transcript } = await api.post('/api/ai/transcribe', {
                    audioBase64: base64,
                    mimeType: blob.type || 'audio/webm',
                    language: targetLang?.id || null,
                });
                if (!transcript?.trim()) { setPhase('idle'); return; }
                const feedback = await api.post('/api/ai/pronunciation', {
                    targetText: phrase,
                    transcript,
                    targetLang: targetLang?.name || 'English',
                });
                setScore(feedback.score ?? null);
                setPhase('done');
            } catch { setPhase('idle'); }
        } else {
            setPhase('recording');
            await startRecording();
        }
    };

    const scoreColor = (s) => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';
    const scoreEmoji = (s) => s >= 80 ? '🎉' : s >= 60 ? '👍' : '💪';

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%)',
                border: '1px solid #ddd6fe',
                borderRadius: '16px',
                padding: '14px 16px',
                marginTop: '10px',
                marginLeft: '2px',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '15px' }}>🎙️</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        {t.shadow_this}
                    </span>
                </div>
                <button
                    onClick={() => setPhase('skipped')}
                    style={{ background: 'none', border: 'none', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}
                >
                    {t.skip}
                </button>
            </div>

            {/* Phrase */}
            <p style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', lineHeight: '1.4', marginBottom: '12px' }}>
                "{phrase}"
            </p>

            <AnimatePresence mode="wait">
                {/* Idle / Recording */}
                {(phase === 'idle' || phase === 'recording') && (
                    <motion.div key="record" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {/* Hear button */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={playTarget}
                            disabled={isPlayingTarget || isRecording}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                background: '#f1f5f9', border: 'none', borderRadius: '50px',
                                padding: '7px 14px', fontSize: '12px', fontWeight: '600',
                                color: '#475569', cursor: 'pointer',
                            }}
                        >
                            <Volume2 size={12} />
                            {isPlayingTarget ? t.playing : t.hear}
                        </motion.button>

                        {/* Record button */}
                        <motion.button
                            animate={isRecording ? {
                                scale: [1, 1.1, 1],
                                boxShadow: ['0 0 0px #ef4444', '0 0 14px #ef4444', '0 0 0px #ef4444'],
                            } : {}}
                            transition={{ repeat: Infinity, duration: 1.4 }}
                            whileTap={{ scale: 0.93 }}
                            onClick={toggleRecord}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                background: isRecording ? '#ef4444' : 'linear-gradient(135deg, #a855f7, #3b82f6)',
                                border: 'none', borderRadius: '50px',
                                padding: '7px 14px', fontSize: '12px', fontWeight: '600',
                                color: 'white', cursor: 'pointer',
                            }}
                        >
                            {isRecording ? <Square size={11} fill="white" /> : <Mic size={12} />}
                            {isRecording ? t.stop : t.record}
                        </motion.button>
                    </motion.div>
                )}

                {/* Analysing */}
                {phase === 'analysing' && (
                    <motion.div key="analysing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            style={{ display: 'inline-block', fontSize: '16px' }}>🐾</motion.span>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>{t.analysing}</span>
                    </motion.div>
                )}

                {/* Done */}
                {phase === 'done' && score !== null && (
                    <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <div style={{
                            width: '34px', height: '34px', borderRadius: '50%',
                            background: `${scoreColor(score)}18`, border: `2px solid ${scoreColor(score)}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '800', fontSize: '12px', color: scoreColor(score), flexShrink: 0,
                        }}>
                            {score}
                        </div>
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>
                            {scoreEmoji(score)} {score >= 80 ? t.excellent : score >= 60 ? t.good_effort : t.keep_going}
                        </span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setScore(null); setPhase('idle'); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '11px' }}>
                                <RotateCcw size={13} />
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/shadow', { state: { targetText: phrase, voice: character?.voice || 'alloy' } })}
                                style={{
                                    background: 'none', border: '1px solid #ddd6fe', borderRadius: '20px',
                                    padding: '3px 10px', fontSize: '11px', fontWeight: '600',
                                    color: '#7c3aed', cursor: 'pointer',
                                }}>
                                {t.full_analysis} →
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
