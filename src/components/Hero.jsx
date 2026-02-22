import { motion } from 'framer-motion';
import { characters } from '../data/characters';

export default function Hero({ onStartChat }) {
    return (
        <section className="card" style={{ textAlign: 'center', padding: '12px' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '15px' }}>Engage with your Coach</h3>

            <div className="glass-card" style={{ marginBottom: '12px', padding: '8px' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'white',
                    borderRadius: '20px',
                    margin: '0 auto 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    overflow: 'hidden'
                }}>
                    <img
                        src={characters.find(c => c.id === 'miko')?.image}
                        alt="Miko"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
                <h4 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '2px' }}>Purrsonal Coach</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4' }}>
                    Miko listens, nudges, and celebrates your new words.
                </p>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '8px' }}>
                Real conversations, real progress.
            </p>

            <motion.button
                className="btn-primary"
                style={{ padding: '12px 24px', fontSize: '16px' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStartChat}
            >
                Start the Purr-chat
            </motion.button>
        </section>
    );
}
