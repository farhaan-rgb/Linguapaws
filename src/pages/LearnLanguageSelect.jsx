import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { getStoredJSON } from '../utils/storage';

const NATIVE_LANGUAGES = [
    { id: 'hi', name: 'Hindi', native: 'हिन्दी', landmark: '🕌', landmarkName: 'Taj Mahal, Agra' },
    { id: 'en', name: 'English', native: 'English', landmark: '🗽', landmarkName: 'Statue of Liberty, New York' },
    { id: 'bn', name: 'Bengali', native: 'বাংলা', landmark: '🌉', landmarkName: 'Howrah Bridge, Kolkata' },
    { id: 'te', name: 'Telugu', native: 'తెలుగు', landmark: '🏛️', landmarkName: 'Charminar, Hyderabad' },
    { id: 'mr', name: 'Marathi', native: 'मराठी', landmark: '🗼', landmarkName: 'Gateway of India, Mumbai' },
    { id: 'ta', name: 'Tamil', native: 'தமிழ்', landmark: '🛕', landmarkName: 'Meenakshi Temple, Madurai' },
    { id: 'ur', name: 'Urdu', native: 'اردو', landmark: '🕌', landmarkName: 'Badshahi Mosque, Lahore' },
    { id: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', landmark: '🏰', landmarkName: 'Mysore Palace, Mysore' },
    { id: 'or', name: 'Odiya', native: 'ଓଡ଼ିଆ', landmark: '🛕', landmarkName: 'Sun Temple, Konark' },
    { id: 'ml', name: 'Malayalam', native: 'മലയാളം', landmark: '⛵', landmarkName: 'Kerala Backwaters' },
];

const PUNJABI = { id: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', landmark: '🏢', landmarkName: 'Golden Temple, Amritsar' };

export default function LearnLanguageSelect() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [selected, setSelected] = useState(null);
    const nativeLang = getStoredJSON('linguapaws_native_lang', {});
    const languages = [
        ...NATIVE_LANGUAGES.filter(l => l.id !== nativeLang?.id),
        PUNJABI,
    ];

    const handleSelect = (lang) => {
        setSelected(lang.id);
        localStorage.setItem('linguapaws_target_lang', JSON.stringify(lang));
        api.put('/api/settings', { targetLang: lang }).catch(() => { });
        setTimeout(() => { navigate('/level-select'); }, 350);
    };

    return (
        <div className="app-container" style={{ minHeight: '100vh', padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '6px' }}>{t.learn_lang_title}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>{t.learn_lang_desc}</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', flex: 1 }}>
                {languages.map((lang) => (
                    <motion.div
                        key={lang.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSelect(lang)}
                        style={{
                            padding: '18px 12px',
                            background: 'white',
                            borderRadius: '20px',
                            border: selected === lang.id ? '2px solid var(--accent-purple)' : '1px solid #eee',
                            boxShadow: selected === lang.id
                                ? '0 4px 16px rgba(168, 85, 247, 0.15)'
                                : '0 4px 12px rgba(0,0,0,0.03)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '16px',
                            background: selected === lang.id
                                ? 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(59,130,246,0.12))'
                                : '#f8f9fa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '26px',
                            marginBottom: '2px',
                        }}>
                            {lang.landmark}
                        </div>

                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a1a' }}>{lang.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{lang.native}</div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
