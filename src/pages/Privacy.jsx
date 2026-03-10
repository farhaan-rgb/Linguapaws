import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const Privacy = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-main)',
            color: 'var(--text-primary)',
            padding: '24px',
            fontFamily: 'var(--font-main)'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    maxWidth: '800px',
                    margin: '0 auto'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(-1)}
                        style={{
                            background: 'white',
                            border: '1px solid var(--border-color)',
                            padding: '10px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <ArrowLeft size={20} color="var(--text-primary)" />
                    </motion.button>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-display)', margin: 0 }}>Privacy Policy</h1>
                </div>

                <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    padding: '32px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    lineHeight: '1.6'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: 'var(--accent-purple)' }}>
                        <ShieldCheck size={24} />
                        <span style={{ fontWeight: '600' }}>Your privacy is our priority.</span>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        *Last Updated: March 10, 2026*
                    </p>

                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>1. Data Collection</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            We collect your name and email address via Google OAuth to create and manage your learning progress. This data allows you to sync your language levels and history across different devices.
                        </p>
                    </section>

                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>2. Audio Processing</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Linguapaws uses microphone access for speech-to-text features. Voice recordings are processed by third-party services (including OpenAI and Deepgram) to provide real-time transcription and pronunciation feedback. Audio data is used for functional purposes and is not stored permanently on our servers.
                        </p>
                    </section>

                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>3. Usage Data</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            We track your language learning progress, including completed phrases, vocabulary mastery, and proficiency levels, to personalize your curriculum and provide a better learning experience.
                        </p>
                    </section>

                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>4. Third-Party Services</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Functional data is shared with the following partners:
                            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                                <li><strong>Google Cloud TTS:</strong> To generate authentic native-speaker audio.</li>
                                <li><strong>OpenAI/Deepgram:</strong> To transcribe and evaluate your speech.</li>
                            </ul>
                            No personally identifiable information is sold to third parties.
                        </p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>5. Data Deletion</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            You have the right to access, modify, or delete your personal data at any time. To request account deletion, please contact us via the feedback section in the app or at farhaan.vvc@gmail.com.
                        </p>
                    </section>
                </div>

                <div style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    © 2026 Linguapaws. Purr-fectly private. 🐾
                </div>
            </motion.div>
        </div>
    );
};

export default Privacy;
