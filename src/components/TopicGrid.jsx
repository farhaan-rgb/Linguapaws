import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { CURRICULUM } from '../services/curriculum';

export default function TopicGrid({ onSelectTopic }) {
    const { t } = useTranslation();
    const targetLang = JSON.parse(localStorage.getItem('linguapaws_target_lang') || '{}');
    const safeLang = CURRICULUM[targetLang?.name] ? targetLang?.name : 'Telugu';
    
    // Dynamically derive topics from CURRICULUM
    const scenarios = CURRICULUM[safeLang] || [];
    const topics = scenarios.map((s, idx) => ({
        id: idx,
        name: s.scenario,
        icon: s.icon || '🧩', // Fallback icon
        color: s.color || '#f1f5f9' // Fallback color
    })).slice(0, 15); // Show first 15 for now to keep it tidy

    return (
        <section className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ paddingRight: 24 }}>
                <h3 style={{ fontSize: '15px', marginBottom: '2px' }}>{t.choose_topic || 'Choose a Scenario'}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>
                    Pick a specific scenario to practice!
                </p>
            </div>

            <div style={{
                display: 'flex',
                gap: '24px',
                overflowX: 'auto',
                paddingBottom: '20px',
                paddingRight: '24px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
            }}>
                <style>
                    {`div::-webkit-scrollbar { display: none; }`}
                </style>
                {topics.map(topic => (
                    <div
                        key={topic.id}
                        onClick={() => onSelectTopic(topic)}
                        style={{
                            cursor: 'pointer',
                            flex: '0 0 auto',
                            width: '85px',
                            textAlign: 'center'
                        }}
                    >
                        <div className="topic-icon" style={{
                            backgroundColor: topic.color,
                            margin: '0 auto 12px',
                            width: '72px',
                            height: '72px',
                            fontSize: '32px'
                        }}>
                            {topic.icon}
                        </div>
                        <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            display: 'block',
                            lineHeight: '1.3',
                            color: 'var(--text-main)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {topic.name}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
