import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Globe, Check, ChevronDown, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';

const LANGUAGES = [
    { id: 'hi', name: 'Hindi', native: 'हिन्दी', landmark: '🕌', landmarkName: 'Taj Mahal, Agra' },
    { id: 'bn', name: 'Bengali', native: 'বাংলা', landmark: '🌉', landmarkName: 'Howrah Bridge, Kolkata' },
    { id: 'te', name: 'Telugu', native: 'తెలుగు', landmark: '🏛️', landmarkName: 'Charminar, Hyderabad' },
    { id: 'mr', name: 'Marathi', native: 'मराठी', landmark: '🗼', landmarkName: 'Gateway of India, Mumbai' },
    { id: 'ta', name: 'Tamil', native: 'தமிழ்', landmark: '🛕', landmarkName: 'Meenakshi Temple, Madurai' },
    { id: 'ur', name: 'Urdu', native: 'اردو', landmark: '🕌', landmarkName: 'Badshahi Mosque, Lahore' },
    { id: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', landmark: '🏰', landmarkName: 'Mysore Palace, Mysore' },
    { id: 'gu', name: 'Gujarati', native: 'ગુજરાતી', landmark: '🌊', landmarkName: 'Rann of Kutch, Gujarat' },
    { id: 'ml', name: 'Malayalam', native: 'മലയാളം', landmark: '⛵', landmarkName: 'Kerala Backwaters' },
    { id: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', landmark: '🛕', landmarkName: 'Golden Temple, Amritsar' },
];

const LEVELS = [
    { id: 'zero', icon: '🌱', label: 'Beginner', sub: 'Little to no English' },
    { id: 'basic', icon: '🌿', label: 'Basic', sub: 'Some words and simple sentences' },
    { id: 'conversational', icon: '🌳', label: 'Conversational', sub: 'Can manage basic exchanges' },
    { id: 'fluent', icon: '⭐', label: 'Fluent', sub: 'Comfortable in English' },
];

export default function Settings() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [selectedLang, setSelectedLang] = useState(null);
    const [showLangPicker, setShowLangPicker] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState(null); // { id, label, appDetected }
    const [showLevelPicker, setShowLevelPicker] = useState(false);

    useEffect(() => {
        // Load from backend (source of truth), fallback to localStorage
        api.get('/api/settings').then(data => {
            if (data.nativeLang?.id) {
                const matched = LANGUAGES.find(l => l.id === data.nativeLang.id) || data.nativeLang;
                setSelectedLang(matched);
                localStorage.setItem('linguapaws_native_lang', JSON.stringify(data.nativeLang));
            } else {
                const savedLang = localStorage.getItem('linguapaws_native_lang');
                if (savedLang) {
                    const parsed = JSON.parse(savedLang);
                    setSelectedLang(LANGUAGES.find(l => l.id === parsed.id) || parsed);
                }
            }
            if (data.englishLevel?.id) {
                setSelectedLevel(data.englishLevel);
                localStorage.setItem('linguapaws_level', JSON.stringify(data.englishLevel));
            } else {
                const savedLevel = localStorage.getItem('linguapaws_level');
                if (savedLevel) setSelectedLevel(JSON.parse(savedLevel));
            }
        }).catch(() => {
            // Fallback to localStorage if backend unreachable
            const savedLang = localStorage.getItem('linguapaws_native_lang');
            if (savedLang) {
                const parsed = JSON.parse(savedLang);
                setSelectedLang(LANGUAGES.find(l => l.id === parsed.id) || parsed);
            }
            const savedLevel = localStorage.getItem('linguapaws_level');
            if (savedLevel) setSelectedLevel(JSON.parse(savedLevel));
        });
    }, []);

    const handleSelect = (lang) => {
        setSelectedLang(lang);
        localStorage.setItem('linguapaws_native_lang', JSON.stringify(lang));
        window.dispatchEvent(new Event('linguapaws-language-changed'));
        setShowLangPicker(false);
        api.put('/api/settings', { nativeLang: lang }).catch(() => { });
    };

    const handleLevelSelect = (level) => {
        const levelData = { id: level.id, label: level.label, appDetected: false };
        setSelectedLevel(levelData);
        setShowLevelPicker(false);
        localStorage.setItem('linguapaws_level', JSON.stringify(levelData));
        window.dispatchEvent(new Event('linguapaws-language-changed'));
        api.put('/api/settings', { englishLevel: levelData }).catch(() => { });
    };

    return (
        <div className="app-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
            {/* Header */}
            <header style={{
                padding: '16px 20px',
                background: 'white',
                borderBottom: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                position: 'sticky',
                top: 0,
                zIndex: 10,
            }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <ChevronLeft size={24} />
                </button>
                <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>{t.settings_title}</h1>
            </header>

            <div style={{ padding: '20px' }}>

                {/* ── Native Language ── */}
                <section style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Globe size={16} color="var(--accent-purple)" />
                        <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            {t.native_lang_section}
                        </h2>
                    </div>

                    {/* Current language card */}
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        border: '1px solid #f0e8ff',
                    }}>
                        {selectedLang ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(59,130,246,0.1))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '26px',
                                    flexShrink: 0,
                                }}>
                                    {selectedLang.landmark || '🌐'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '700', fontSize: '17px', color: '#1e293b' }}>{selectedLang.name}</div>
                                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>{selectedLang.native}</div>
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowLangPicker(v => !v)}
                                    style={{
                                        background: showLangPicker ? 'var(--accent-purple)' : '#f1f5f9',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '8px 14px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: showLangPicker ? 'white' : '#64748b',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}
                                >
                                    Change
                                    <motion.span
                                        animate={{ rotate: showLangPicker ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ display: 'flex' }}
                                    >
                                        <ChevronDown size={14} />
                                    </motion.span>
                                </motion.button>
                            </div>
                        ) : (
                            <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '8px 0' }}>
                                {t.no_lang_set}
                            </div>
                        )}

                        {/* Language picker */}
                        <AnimatePresence>
                            {showLangPicker && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '16px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {LANGUAGES.map((lang) => (
                                            <motion.button
                                                key={lang.id}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={() => handleSelect(lang)}
                                                style={{
                                                    padding: '12px 16px',
                                                    borderRadius: '14px',
                                                    background: selectedLang?.id === lang.id ? 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(59,130,246,0.08))' : '#f8fafc',
                                                    border: selectedLang?.id === lang.id ? '1.5px solid rgba(168,85,247,0.3)' : '1px solid transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                }}
                                            >
                                                <span style={{ fontSize: '22px' }}>{lang.landmark}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{lang.name}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{lang.native}</div>
                                                </div>
                                                {selectedLang?.id === lang.id && (
                                                    <div style={{
                                                        width: '22px', height: '22px', borderRadius: '50%',
                                                        background: 'var(--accent-purple)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        <Check size={13} color="white" strokeWidth={3} />
                                                    </div>
                                                )}
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                {/* ── English Level ── */}
                <section style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Zap size={16} color="var(--accent-purple)" />
                        <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            {t.english_level_section}
                        </h2>
                    </div>

                    <div style={{ background: 'white', borderRadius: '20px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f0e8ff' }}>
                        {selectedLevel ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '28px' }}>
                                        {LEVELS.find(l => l.id === selectedLevel.id)?.icon || '🌿'}
                                    </span>
                                    <div>
                                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#1e293b' }}>
                                            {LEVELS.find(l => l.id === selectedLevel.id)?.label || selectedLevel.label}
                                        </div>
                                        {selectedLevel.appDetected ? (
                                            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '600', marginTop: '2px' }}>
                                                {t.detected_by_ai}
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                                {t.set_by_user}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowLevelPicker(v => !v)}
                                    style={{
                                        background: showLevelPicker ? 'var(--accent-purple)' : '#f1f5f9',
                                        border: 'none', borderRadius: '12px', padding: '8px 14px',
                                        fontSize: '13px', fontWeight: '600',
                                        color: showLevelPicker ? 'white' : '#64748b',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                    }}
                                >
                                    {t.change}
                                    <motion.span animate={{ rotate: showLevelPicker ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ display: 'flex' }}>
                                        <ChevronDown size={14} />
                                    </motion.span>
                                </motion.button>
                            </div>
                        ) : (
                            <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '8px 0' }}>
                                {t.no_level_set}
                            </div>
                        )}

                        <AnimatePresence>
                            {showLevelPicker && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}
                                >
                                    <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '16px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {LEVELS.map((level) => (
                                            <motion.button
                                                key={level.id} whileTap={{ scale: 0.99 }}
                                                onClick={() => handleLevelSelect(level)}
                                                style={{
                                                    padding: '12px 16px', borderRadius: '14px',
                                                    background: selectedLevel?.id === level.id ? 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(59,130,246,0.08))' : '#f8fafc',
                                                    border: selectedLevel?.id === level.id ? '1.5px solid rgba(168,85,247,0.3)' : '1px solid transparent',
                                                    display: 'flex', alignItems: 'center', gap: '12px',
                                                    cursor: 'pointer', textAlign: 'left',
                                                }}
                                            >
                                                <span style={{ fontSize: '22px' }}>{level.icon}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{level.label}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{level.sub}</div>
                                                </div>
                                                {selectedLevel?.id === level.id && (
                                                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Check size={13} color="white" strokeWidth={3} />
                                                    </div>
                                                )}
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#cbd5e1' }}>LinguaPaws v1.0.0 🐾</p>
                </div>
            </div>
        </div>
    );
}
