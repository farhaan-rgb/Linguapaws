import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { wordTracker } from '../services/wordTracker';

export default function WordHistory() {
    const navigate = useNavigate();
    const [allWords, setAllWords] = useState([]);
    const [totalWords, setTotalWords] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);

    // Sync from backend on mount, then refresh local state
    useEffect(() => {
        wordTracker.syncFromBackend().then(() => {
            const words = wordTracker.getWords();
            const raw = words.map(w => ({ text: String(w.text || ''), count: Number(w.count) || 1 }));
            setAllWords(raw);
            setTotalWords(wordTracker.getTotalCount());
        });
        // Also show local data immediately while syncing
        const localWords = wordTracker.getWords().map(w => ({ text: String(w.text || ''), count: Number(w.count) || 1 }));
        setAllWords(localWords);
        setTotalWords(wordTracker.getTotalCount());
    }, []);

    const topWords = allWords.slice(0, 3);
    const otherWords = allWords.slice(3);

    const proficiency = wordTracker.getProficiency();

    return (
        <div className="app-container" style={{ minHeight: '100vh', padding: '8px 16px' }}>
            {/* Header */}
            <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                    <ChevronLeft size={24} />
                </button>
                <h1 style={{ fontSize: '24px' }}>Word History</h1>
            </header>

            {/* Stats Summary */}
            <section className="card" style={{ background: proficiency.color, color: 'white', padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '4px' }}>{proficiency.icon}</div>
                <span style={{ fontSize: '12px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px' }}>Current Rank: {proficiency.status}</span>
                <h2 style={{ fontSize: '48px', fontWeight: '800', margin: '4px 0' }}>{totalWords}</h2>
                <p style={{ fontSize: '13px', opacity: 0.9 }}>Words you've successfully used in chat</p>
            </section>

            {/* Word Cloud or Empty State */}
            {allWords.length > 0 ? (
                <>
                    {/* Word Cloud */}
                    <section className="card" style={{ padding: '12px 16px' }}>
                        <h3 style={{ fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                            <span style={{ fontSize: '18px' }}>🫧</span> Vocabulary Bubbles
                        </h3>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            alignContent: 'center',
                            height: '280px',
                            padding: '16px',
                            background: 'linear-gradient(135deg, #f8faff 0%, #ffffff 100%)',
                            borderRadius: '20px',
                            border: '1px solid #eef2ff',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            {allWords.map((word, i) => {
                                const colors = [
                                    '#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b',
                                    '#10b981', '#06b6d4', '#6366f1', '#f43f5e'
                                ];
                                const randomColor = colors[i % colors.length];
                                const maxSize = allWords.length > 30 ? 18 : allWords.length > 15 ? 22 : 28;
                                const minSize = allWords.length > 30 ? 10 : 12;
                                const weight = Math.min(maxSize, minSize + (word.count * 3));

                                return (
                                    <motion.span
                                        key={word.text}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        whileHover={{ scale: 1.2, zIndex: 10 }}
                                        style={{
                                            fontSize: `${weight}px`,
                                            fontWeight: '700',
                                            color: 'white',
                                            backgroundColor: randomColor,
                                            padding: `${weight > 18 ? 6 : 4}px ${weight > 18 ? 14 : 10}px`,
                                            borderRadius: '50px',
                                            cursor: 'default',
                                            display: 'inline-block',
                                            boxShadow: `0 4px 10px ${randomColor}33`,
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {word.text}
                                    </motion.span>
                                );
                            })}
                        </div>
                    </section>
                </>
            ) : (
                /* Empty State */
                <section className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>🫧</div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#1a1a1a' }}>
                        No words yet!
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                        Words you use in chat with characters will appear here as bubbles. Start a conversation to grow your vocabulary!
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            background: 'linear-gradient(90deg, #a855f7 0%, #3b82f6 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 28px',
                            borderRadius: '99px',
                            fontWeight: '600',
                            fontSize: '15px',
                            cursor: 'pointer',
                        }}
                    >
                        Start Chatting 🐾
                    </button>
                </section>
            )}

            {/* List Section */}
            <section className="card" style={{ padding: '12px 16px' }}>
                <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>Top Mastered Words</h3>

                {topWords.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {topWords.map((word, i) => (
                            <div key={word.text} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 16px',
                                background: '#f8f9fa',
                                borderRadius: '16px',
                                border: '1px solid #eee'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '20px' }}>{['🥇', '🥈', '🥉'][i]}</span>
                                    <span style={{ fontWeight: '600', fontSize: '16px' }}>{word.text}</span>
                                </div>
                                <span style={{ fontSize: '12px', color: '#666' }}>Used {Number(word.count)}x</span>
                            </div>
                        ))}

                        {otherWords.length > 0 && (
                            <>
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            style={{ overflowY: 'auto', maxHeight: '300px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}
                                        >
                                            {otherWords.map(word => (
                                                <div key={word.text} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    padding: '10px 16px',
                                                    borderBottom: '1px solid #f1f1f1'
                                                }}>
                                                    <span style={{ fontSize: '15px' }}>{word.text}</span>
                                                    <span style={{ fontSize: '12px', color: '#999' }}>{Number(word.count)}x</span>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--accent-purple)',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        padding: '12px',
                                        cursor: 'pointer',
                                        textAlign: 'center'
                                    }}
                                >
                                    {isExpanded ? 'Show less' : `View ${otherWords.length} more words`}
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <p style={{ color: '#999', fontSize: '14px' }}>History is empty. Keep practicing! 🐾</p>
                )}
            </section>
        </div>
    );
}
