import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Book, Star, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { aiService } from '../services/ai';
import { getStoredJSON } from '../utils/storage';

export default function Dictionary() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const text = searchParams.get('text') || location.state?.text;

    const [definitions, setDefinitions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const nativeLang = getStoredJSON('linguapaws_native_lang', {});
    const targetLang = getStoredJSON('linguapaws_target_lang', {});
    const nativeLangName = nativeLang?.name || 'English';
    const targetLangName = targetLang?.name || 'English';

    useEffect(() => {
        if (!text) {
            navigate('/chat');
            return;
        }

        const fetchDefinitions = async () => {
            setIsLoading(true);
            const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
            aiService.init(apiKey);
            const data = await aiService.getDefinitions(text, targetLangName, nativeLangName);
            if (data && Array.isArray(data)) {
                setDefinitions(data);
            }
            setIsLoading(false);
        };

        fetchDefinitions();
    }, [text, navigate]);

    const renderMessageContent = (content) => {
        if (!content) return null;
        // Strip out the phonetic and word tags before rendering
        const cleanContent = content.replace(/<phonetic>(.*?)<\/phonetic>/gi, '')
            .replace(/<word>(.*?)<\/word>/gi, '$1')
            .replace(/<shadow>(.*?)<\/shadow>/gs, '$1');

        const parts = cleanContent.split(/(\*\*.*?\*\*|\*[^*]+\*)/g);
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

    return (
        <div className="app-container" style={{ minHeight: '100vh', padding: '8px 16px', display: 'flex', flexDirection: 'column' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                    <ChevronLeft size={28} />
                </button>
                <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Word Explorer 📖</h1>
            </header>

            <section className="card" style={{ marginBottom: '12px', borderLeft: '4px solid var(--accent-purple)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>From message:</span>
                <p style={{ fontSize: '15px', color: 'var(--text-main)', fontStyle: 'italic', lineHeight: '1.5' }}>
                    "{renderMessageContent(text)}"
                </p>
            </section>

            {isLoading ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        style={{ fontSize: '48px' }}
                    >
                        🎡
                    </motion.div>
                    <p style={{ color: 'var(--text-secondary)' }}>Miko is looking up the words... 🐾</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px' }}>
                    {definitions.map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="card"
                            style={{ padding: '16px' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                <div>
                                    <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-purple)' }}>{item.word}</h3>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>{item.partOfSpeech}</span>
                                        {item.phonetic && (
                                            <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: '500' }}>
                                                {item.phonetic}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Star size={18} color="#fbbf24" fill={i === 0 ? "#fbbf24" : "none"} />
                            </div>

                            <p style={{ fontSize: '15px', lineHeight: '1.5', margin: '12px 0', color: 'var(--text-main)' }}>
                                {item.definition}
                            </p>

                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', fontSize: '14px', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <span style={{ fontWeight: '800', color: '#64748b' }}>Example:</span>
                                    <span style={{ color: '#334155', flex: 1, lineHeight: '1.4' }}>{renderMessageContent(item.example)}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {definitions.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <p style={{ color: '#94a3b8', fontSize: '15px' }}>No specific key words found in this message. Miko thinks you know them all! 🐾</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
