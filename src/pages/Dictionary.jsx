import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Book, Star, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { aiService } from '../services/ai';

export default function Dictionary() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const text = searchParams.get('text') || location.state?.text;

    const [definitions, setDefinitions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!text) {
            navigate('/chat');
            return;
        }

        const fetchDefinitions = async () => {
            setIsLoading(true);
            const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
            aiService.init(apiKey);
            const data = await aiService.getDefinitions(text);
            if (data && Array.isArray(data)) {
                setDefinitions(data);
            }
            setIsLoading(false);
        };

        fetchDefinitions();
    }, [text, navigate]);

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
                <p style={{ fontSize: '15px', color: 'var(--text-main)', fontStyle: 'italic' }}>"{text}"</p>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {definitions.map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="card"
                            style={{ padding: '12px 16px' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div>
                                    <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-purple)' }}>{item.word}</h3>
                                    <span style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.partOfSpeech}</span>
                                </div>
                                <Star size={18} color="#fbbf24" fill="#fbbf24" />
                            </div>
                            <p style={{ fontSize: '15px', lineHeight: '1.5', marginBottom: '12px', color: 'var(--text-main)' }}>
                                {item.definition}
                            </p>
                            <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '12px', fontSize: '14px', borderLeft: '3px solid #eee' }}>
                                <span style={{ fontWeight: '700', color: '#666', marginRight: '6px' }}>Example:</span>
                                <span style={{ color: '#444' }}>{item.example}</span>
                            </div>
                        </motion.div>
                    ))}
                    {definitions.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <p style={{ color: '#999' }}>No specific key words found in this message. Miko thinks you know them all! 🐾</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
