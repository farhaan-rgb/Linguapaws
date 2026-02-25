import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { t } = useTranslation();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSignOut = () => {
        setShowMenu(false);
        signOut();
        navigate('/login');
    };

    return (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            {/* Left: App identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                }}>
                    🐾
                </div>
                <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: '800',
                    fontSize: '20px',
                    background: 'linear-gradient(90deg, #a855f7, #3b82f6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}>
                    LinguaPaws
                </span>
            </div>

            {/* Right: Settings + User avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                    onClick={() => navigate('/settings')}
                    style={{
                        background: 'white',
                        border: '1px solid #eee',
                        padding: '8px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Settings size={18} />
                </button>

                <div ref={menuRef} style={{ position: 'relative' }}>
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setShowMenu((v) => !v)}
                        style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '2px solid rgba(168, 85, 247, 0.4)',
                            cursor: 'pointer',
                            padding: 0,
                            background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                            boxShadow: '0 2px 8px rgba(168, 85, 247, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '15px',
                        }}
                    >
                        <img
                            src={user.picture}
                            alt={user.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    </motion.button>

                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '46px',
                                    background: 'white',
                                    borderRadius: '16px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                                    border: '1px solid #f0e8ff',
                                    minWidth: '190px',
                                    zIndex: 100,
                                    overflow: 'hidden',
                                }}
                            >
                                <div style={{ padding: '14px 16px', borderBottom: '1px solid #f5f5f5' }}>
                                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a1a1a' }}>{user.name}</div>
                                    <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{user.email}</div>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        color: '#ef4444',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        textAlign: 'left',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fff5f5'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                    <LogOut size={16} />
                                    {t.sign_out}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
