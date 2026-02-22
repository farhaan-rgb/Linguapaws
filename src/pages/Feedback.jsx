import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, CheckCircle2, AlertCircle, Lightbulb, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { aiService } from '../services/ai';

export default function Feedback() {
    const navigate = useNavigate();
    const location = useLocation();
    const text = location.state?.text || "";

    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState(null);

    useEffect(() => {
        const fetchFeedback = async () => {
            if (!text) {
                setLoading(false);
                return;
            }

            const feedback = await aiService.getFeedback(text);
            setAnalysis(feedback);
            setLoading(false);
        };

        fetchFeedback();
    }, [text]);

    if (!text) {
        return (
            <div className="app-container" style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '24px' }}>😿</div>
                <h2 style={{ marginBottom: '16px' }}>No text to analyze!</h2>
                <button
                    onClick={() => navigate(-1)}
                    className="primary-button"
                    style={{ width: 'auto', padding: '12px 24px' }}
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="app-container" style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '40px' }}>
            {/* Header */}
            <header style={{
                padding: '20px 24px',
                background: 'white',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <ChevronLeft size={24} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', background: '#dcfce7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                        ✍️
                    </div>
                    <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Writing Feedback</h1>
                </div>
            </header>

            <main style={{ padding: '24px' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: 'var(--accent-purple)', borderRadius: '50%' }}
                        />
                        <p style={{ marginTop: '16px', color: '#64748b', fontWeight: '600' }}>Miko is grading your paw-work... 🐾</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Summary Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: 'white',
                                borderRadius: '24px',
                                padding: '24px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <Sparkles size={20} color="#8b5cf6" />
                                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Coach Miko Says:</h3>
                            </div>
                            <p style={{ color: '#475569', lineHeight: '1.6', fontSize: '16px', fontStyle: 'italic' }}>
                                "{analysis?.encouragement || "Great effort! Let's look at how we can make this even better. 🐾"}"
                            </p>
                        </motion.div>

                        {/* Comparison Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            style={{
                                background: 'white',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                            <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original</span>
                                <p style={{ marginTop: '8px', fontSize: '16px', color: '#64748b' }}>{analysis?.original}</p>
                            </div>
                            <div style={{ padding: '24px', background: '#f0fdf4' }}>
                                <span style={{ color: '#166534', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 size={14} /> Corrected
                                </span>
                                <p style={{ marginTop: '12px', fontSize: '18px', color: '#14532d', fontWeight: '600', lineHeight: '1.5' }}>
                                    {analysis?.corrected}
                                </p>
                            </div>
                        </motion.div>

                        {/* Errors List */}
                        {analysis?.errors && analysis.errors.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', paddingLeft: '8px' }}>Pointe-rs & Corrections</h4>
                                {analysis.errors.map((err, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + (i * 0.1) }}
                                        style={{
                                            background: 'white',
                                            borderRadius: '20px',
                                            padding: '20px',
                                            display: 'flex',
                                            gap: '16px',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                        }}
                                    >
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            background: '#fef2f2',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <AlertCircle size={20} color="#ef4444" />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '800', color: '#ef4444' }}>{err.error}</span>
                                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>→</span>
                                                <span style={{ fontSize: '14px', fontWeight: '800', color: '#10b981' }}>{err.correction}</span>
                                            </div>
                                            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.4' }}>{err.explanation}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Suggestions */}
                        {analysis?.suggestions && analysis.suggestions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                style={{
                                    background: '#eff6ff',
                                    borderRadius: '24px',
                                    padding: '24px',
                                    border: '1px solid #dbeafe'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <Lightbulb size={20} color="#3b82f6" />
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e40af' }}>Pro Tips</h3>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {analysis.suggestions.map((sug, i) => (
                                        <li key={i} style={{ color: '#1e40af', fontSize: '14px', lineHeight: '1.5' }}>{sug}</li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
