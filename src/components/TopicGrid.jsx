import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

const topics = [
    { id: 'weather', name: 'Weather', icon: '☀️', color: '#e0f2fe' },
    { id: 'news', name: 'Current Affairs', icon: '🗞️', color: '#f1f5f9' },
    { id: 'chai', name: 'Chai Sutta chronicles', icon: '☕', color: '#fef3c7' },
    { id: 'travel', name: 'Travel Stories', icon: '✈️', color: '#dcfce7' },
    { id: 'food', name: 'Foodie Vibes', icon: '🍕', color: '#ffedd5' },
    { id: 'tech', name: 'Tech Talk', icon: '💻', color: '#ede9fe' },
    { id: 'music', name: 'Music Beats', icon: '🎵', color: '#fae8ff' },
    { id: 'sports', name: 'Play Time', icon: '⚽', color: '#f0fdf4' },
    { id: 'fashion', name: 'Style Check', icon: '👗', color: '#fff1f2' },
    { id: 'nature', name: 'Nature Walk', icon: '🌿', color: '#ecfdf5' },
];

export default function TopicGrid({ onSelectTopic }) {
    const { t } = useTranslation();
    return (
        <section className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ paddingRight: 24 }}>
                <h3 style={{ fontSize: '15px', marginBottom: '2px' }}>{t.choose_topic}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>
                    {t.topic_desc}
                </p>
            </div>

            <div style={{
                display: 'flex',
                gap: '24px',
                overflowX: 'auto',
                paddingBottom: '20px',
                paddingRight: '24px',
                scrollbarWidth: 'none', // Hide scrollbar for clean look
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
                            fontWeight: '500',
                            display: 'block',
                            lineHeight: '1.3',
                            color: 'var(--text-main)'
                        }}>
                            {t[topic.id] || topic.name}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
