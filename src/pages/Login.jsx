import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [isSigningIn, setIsSigningIn] = useState(false);

    useEffect(() => {
        // Warm up backend to reduce cold-start login failures
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        fetch(`${baseUrl}/health`).catch(() => { });
    }, []);

    const signInWithRetry = async (credentialResponse, retries = 2) => {
        try {
            return await signIn(credentialResponse);
        } catch (err) {
            if (retries <= 0) throw err;
            await new Promise(r => setTimeout(r, 600 * (3 - retries)));
            return signInWithRetry(credentialResponse, retries - 1);
        }
    };

    const handleSuccess = async (credentialResponse) => {
        try {
            setIsSigningIn(true);
            setError(null);
            if (!credentialResponse?.credential) {
                throw new Error('Missing Google credential.');
            }
            const signInPromise = signInWithRetry(credentialResponse);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Sign-in timed out. Please try again.')), 15000);
            });
            await Promise.race([signInPromise, timeoutPromise]);
            navigate('/');
        } catch (err) {
            setError(err?.message || 'Sign-in failed. Please try again.');
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleError = () => {
        setError('Sign-in failed. Please try again.');
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            position: 'relative',
        }}>
            <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                    width: '100%',
                    maxWidth: '400px',
                    background: 'white',
                    borderRadius: '32px',
                    padding: '48px 36px',
                    boxShadow: '0 20px 60px rgba(168, 85, 247, 0.12), 0 8px 24px rgba(0,0,0,0.06)',
                    border: '1px solid rgba(168, 85, 247, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '28px',
                    textAlign: 'center',
                }}
            >
                {/* Logo & Branding */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                >
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '24px',
                        background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '36px',
                        boxShadow: '0 8px 24px rgba(168, 85, 247, 0.35)',
                    }}>
                        🐾
                    </div>
                    <div>
                        <h1 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '28px',
                            fontWeight: '800',
                            background: 'linear-gradient(90deg, #a855f7, #3b82f6)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>
                            LinguaPaws
                        </h1>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Learn any language your way
                        </p>
                    </div>
                </motion.div>

                {/* Divider */}
                <div style={{
                    width: '100%',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)',
                }} />

                {/* Sign-in prompt */}
                <div>
                    <h2 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '20px',
                        fontWeight: '700',
                        color: 'var(--text-main)',
                        marginBottom: '8px',
                    }}>
                        Welcome back! 👋
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Sign in to continue your language learning journey with Miko and friends.
                    </p>
                </div>

                {/* Google Sign-in Button */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <GoogleLogin
                        onSuccess={handleSuccess}
                        onError={handleError}
                        shape="pill"
                        size="large"
                        text="signin_with"
                        logo_alignment="left"
                        width="320"
                        disabled={isSigningIn}
                    />
                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ fontSize: '13px', color: '#ef4444' }}
                        >
                            {error}
                        </motion.p>
                    )}
                    {isSigningIn && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ fontSize: '13px', color: '#64748b' }}
                        >
                            Signing you in...
                        </motion.p>
                    )}
                </div>

                {/* Footer note */}
                <p style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.6' }}>
                    By signing in, you agree to use this app for learning languages.<br />
                    No data is shared with third parties.
                </p>
            </motion.div>

            {/* Background blobs */}
            <motion.div
                animate={{ scale: [1, 1.05, 1], opacity: [0.08, 0.13, 0.08] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    position: 'fixed', top: '-120px', right: '-120px',
                    width: '400px', height: '400px', borderRadius: '50%',
                    background: '#a855f7', filter: 'blur(80px)', zIndex: -1,
                }}
            />
            <motion.div
                animate={{ scale: [1, 1.05, 1], opacity: [0.08, 0.12, 0.08] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                style={{
                    position: 'fixed', bottom: '-120px', left: '-120px',
                    width: '400px', height: '400px', borderRadius: '50%',
                    background: '#3b82f6', filter: 'blur(80px)', zIndex: -1,
                }}
            />
        </div>
    );
}
