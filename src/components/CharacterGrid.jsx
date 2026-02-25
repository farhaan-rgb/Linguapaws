import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, X, Trash2 } from 'lucide-react';
import { characters as defaultCharacters } from '../data/characters';
import { aiService } from '../services/ai';
import { useTranslation } from '../hooks/useTranslation';

export default function CharacterGrid({ onSelectCharacter }) {
    const { t } = useTranslation();
    const [customCharacters, setCustomCharacters] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCharName, setNewCharName] = useState('');
    const [newCharDesc, setNewCharDesc] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [longPressChar, setLongPressChar] = useState(null);
    const longPressTimer = React.useRef(null);

    const FACE_MAP = {
        'aarav': '/src/assets/characters/aarav.png',
        'meera': '/src/assets/characters/meera.png',
        'arjun': '/src/assets/characters/arjun.png',
        'zoya': '/src/assets/characters/zoya.png',
        'kabir': '/src/assets/characters/kabir.png',
        'deepak': '/src/assets/characters/deepak.png',
        'custom_male_1': '/src/assets/characters/custom/male_1.png',
        'custom_male_2': '/src/assets/characters/custom/male_2.png',
        'custom_female_1': '/src/assets/characters/custom/female_1.png',
        'custom_female_2': '/src/assets/characters/custom/female_2.png',
        'global_female_1': '/src/assets/characters/global_female_1.jpg',
        'global_male_1': '/src/assets/characters/global_male_1.jpg',
        'global_female_2': '/src/assets/characters/global_female_2.jpg',
        'global_male_2': '/src/assets/characters/global_male_2.jpg',
        'global_female_3': '/src/assets/characters/global_female_3.jpg',
        'global_male_3': '/src/assets/characters/global_male_3.jpg',
        'generic_male': '👨',
        'generic_female': '👩'
    };

    useEffect(() => {
        const saved = localStorage.getItem('linguapaws_custom_characters');
        if (saved) {
            setCustomCharacters(JSON.parse(saved));
        }
    }, []);

    const allCharacters = [...customCharacters, ...defaultCharacters].filter(c => c.id !== 'miko');

    const handleAddCharacter = async (e) => {
        e.preventDefault();
        if (!newCharName || !newCharDesc) return;

        setIsGenerating(true);
        try {
            // Collect face types already in use by all characters (default + custom) to avoid duplicates
            const usedFaceTypes = [
                ...defaultCharacters.filter(c => c.id !== 'miko').map(c => c.id), // default characters use their id as face type
                ...customCharacters.map(c => c.faceType).filter(Boolean)
            ];
            const data = await aiService.generateCharacter(newCharName, newCharDesc, usedFaceTypes);
            const newChar = {
                id: `custom_${Date.now()}`,
                name: newCharName,
                region: 'Friend',
                faceType: data.faceType || null,
                image: (data.faceType && FACE_MAP[data.faceType]?.startsWith('/')) ? FACE_MAP[data.faceType] : null,
                icon: (data.faceType && !FACE_MAP[data.faceType]?.startsWith('/')) ? FACE_MAP[data.faceType] : (data.icon || '👤'),
                color: '#f1f5f9',
                voice: data.voice || 'alloy',
                trait: newCharDesc.substring(0, 30) + (newCharDesc.length > 30 ? '...' : ''),
                prompt: data.prompt,
                greetings: data.greetings || [
                    `Hi! I'm ${newCharName}. So glad to meet you!`,
                    `Hey there! Ready for some English practice?`,
                    `Hello! I'm looking forward to our chat.`
                ]
            };

            const updated = [newChar, ...customCharacters];
            setCustomCharacters(updated);
            localStorage.setItem('linguapaws_custom_characters', JSON.stringify(updated));
            setIsModalOpen(false);
            setNewCharName('');
            setNewCharDesc('');
            setError('');
        } catch (err) {
            console.error("Failed to generate friend:", err);
            setError("Oops! My creative energy is low. Please try again!");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteCharacter = (id) => {
        const updated = customCharacters.filter(c => c.id !== id);
        setCustomCharacters(updated);
        localStorage.setItem('linguapaws_custom_characters', JSON.stringify(updated));
        setLongPressChar(null);
    };

    const handleTouchStart = (char) => {
        if (!char.id.toString().startsWith('custom_')) return;
        longPressTimer.current = setTimeout(() => {
            setLongPressChar(char);
        }, 700); // 700ms for long press
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    return (
        <section className="card" style={{ marginTop: '0px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                    <h3 style={{ fontSize: '15px', marginBottom: '0px' }}>{t.practice_friends}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {t.friends_desc}
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        background: 'var(--primary-gradient)',
                        color: 'white',
                        border: 'none',
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                    }}
                >
                    <Plus size={18} />
                </button>
            </div>

            <div style={{
                display: 'flex',
                gap: '16px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                {allCharacters.map(char => (
                    <motion.div
                        key={char.id}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.95 }}
                        onMouseDown={() => handleTouchStart(char)}
                        onMouseUp={handleTouchEnd}
                        onMouseLeave={handleTouchEnd}
                        onTouchStart={() => handleTouchStart(char)}
                        onTouchEnd={handleTouchEnd}
                        onClick={() => {
                            if (!longPressChar) onSelectCharacter(char);
                        }}
                        style={{
                            flex: '0 0 auto',
                            width: '100px',
                            cursor: 'pointer',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: char.color,
                            borderRadius: '24px',
                            margin: '0 auto 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                            border: '1px solid rgba(0,0,0,0.05)',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            {char.image ? (
                                <img src={char.image} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                char.icon
                            )}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', display: 'block' }}>
                            {char.name}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                            {t[`${char.id}_trait`] || char.trait}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {t[char.region.toLowerCase()] || char.region}
                        </span>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.4)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '24px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            style={{
                                background: 'white',
                                borderRadius: '24px',
                                padding: '24px',
                                width: '100%',
                                maxWidth: '400px',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '800' }}>{t.create_friend}</h3>
                                <button onClick={() => { setIsModalOpen(false); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            {error && (
                                <div style={{
                                    padding: '10px',
                                    background: '#fee2e2',
                                    color: '#ef4444',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    marginBottom: '16px',
                                    textAlign: 'center'
                                }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleAddCharacter}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#64748b' }}>{t.friend_name}</label>
                                    <input
                                        value={newCharName}
                                        onChange={e => setNewCharName(e.target.value)}
                                        placeholder="e.g., Rohan"
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#64748b' }}>{t.friend_personality}</label>
                                    <textarea
                                        value={newCharDesc}
                                        onChange={e => setNewCharDesc(e.target.value)}
                                        placeholder="e.g., A funny historian from Delhi who loves cricket."
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', minHeight: '80px', resize: 'none' }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isGenerating || !newCharName || !newCharDesc}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        background: 'var(--primary-gradient)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '16px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        opacity: (isGenerating || !newCharName || !newCharDesc) ? 0.6 : 1
                                    }}
                                >
                                    {isGenerating ? (
                                        <>{t.generating}</>
                                    ) : (
                                        <>
                                            <Sparkles size={18} />
                                            {t.bring_to_life}
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {longPressChar && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 2000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '24px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            style={{
                                background: 'white',
                                borderRadius: '32px',
                                padding: '32px',
                                width: '100%',
                                maxWidth: '340px',
                                textAlign: 'center',
                                boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
                            }}
                        >
                            <div style={{
                                width: '80px',
                                height: '80px',
                                background: longPressChar.color,
                                borderRadius: '24px',
                                margin: '0 auto 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '32px',
                                overflow: 'hidden'
                            }}>
                                {longPressChar.image ? (
                                    <img src={longPressChar.image} alt={longPressChar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    longPressChar.icon
                                )}
                            </div>

                            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: '#1e293b' }}>
                                Goodbye, {longPressChar.name}?
                            </h3>
                            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
                                Are you sure you want to remove this friend? You'll lose your conversation history.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    onClick={() => handleDeleteCharacter(longPressChar.id)}
                                    style={{
                                        padding: '16px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '16px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Remove Friend
                                </button>
                                <button
                                    onClick={() => setLongPressChar(null)}
                                    style={{
                                        padding: '16px',
                                        background: '#f1f5f9',
                                        color: '#64748b',
                                        border: 'none',
                                        borderRadius: '16px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Keep Them
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
