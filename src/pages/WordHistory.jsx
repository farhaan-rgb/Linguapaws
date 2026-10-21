import React, { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../services/api';
import { CURRICULUM, lessonCount } from '../services/curriculum';
import { getStoredJSON } from '../utils/storage';
import { proficiencyOf, readCache, writeCache, wordState, lessonLabel } from '../services/homeStats';

/* The words this learner has been taught in the current language (LearnedWord,
   via GET /api/progress/vocab), each with its lesson and where it sits on the
   review schedule. This used to list words *typed in chat* from wordTracker,
   which step mode never fed. */

const STATES = {
    due: { label: 'Due for review', color: '#f59e0b' },
    learning: { label: 'Learning', color: '#3b82f6' },
    strong: { label: 'Strong', color: '#10b981' },
};
const FILTERS = ['all', 'due', 'learning', 'strong'];

export default function WordHistory() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const lang = getStoredJSON('linguapaws_target_lang', {})?.name || null;
    const [vocab, setVocab] = useState(() => readCache('vocab', lang));
    const [filter, setFilter] = useState('all');
    const summary = readCache('home_stats', lang);
    const proficiency = proficiencyOf(summary, lessonCount(lang));

    useEffect(() => {
        if (!lang) return undefined;
        let live = true;
        api.get(`/api/progress/vocab?lang=${encodeURIComponent(lang)}`)
            .then((fresh) => {
                const slim = {
                    total: fresh.total,
                    words: (fresh.words || []).map(w => ({
                        word: w.word, meaning: w.meaning, scenario: w.scenario, box: w.box, dueAt: w.dueAt,
                    })),
                };
                writeCache('vocab', lang, slim);
                if (live) setVocab(slim);
            })
            .catch(() => { /* keep the cached list */ });
        return () => { live = false; };
    }, [lang]);

    const lessons = (lang && CURRICULUM[lang]) || [];
    const words = (vocab?.words || []).map(w => ({ ...w, state: wordState(w), lesson: lessonLabel(w, lessons) }));
    const counts = { all: words.length, due: 0, learning: 0, strong: 0 };
    for (const w of words) counts[w.state] += 1;
    const shown = filter === 'all' ? words : words.filter(w => w.state === filter);

    return (
        <div className="app-container" style={{ minHeight: '100vh', padding: '8px 16px' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                    <ChevronLeft size={24} />
                </button>
                <h1 style={{ fontSize: '24px' }}>{t.word_history_title}</h1>
            </header>

            <section className="card" style={{ background: proficiency.color, color: 'white', padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '4px' }}>{proficiency.icon}</div>
                <span style={{ fontSize: '12px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {t.current_rank.replace('{n}', t[proficiency.status.toLowerCase()] || proficiency.status)}
                </span>
                <h2 style={{ fontSize: '48px', fontWeight: '800', margin: '4px 0' }}>{words.length}</h2>
                <p style={{ fontSize: '13px', opacity: 0.9 }}>
                    {lang ? `words learned in ${lang}` : 'words learned'}
                    {counts.due > 0 ? ` · ${counts.due} due for review` : ''}
                </p>
            </section>

            {words.length > 0 ? (
                <section className="card" style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {FILTERS.map(f => {
                            const on = filter === f;
                            return (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    style={{
                                        border: '1px solid ' + (on ? 'var(--accent-purple)' : '#e5e7eb'),
                                        background: on ? 'var(--accent-purple)' : 'white',
                                        color: on ? 'white' : 'var(--text-secondary)',
                                        borderRadius: '99px', padding: '5px 12px',
                                        fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                    }}
                                >
                                    {f === 'all' ? 'All' : STATES[f].label.split(' ')[0]} {counts[f]}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {shown.map(w => (
                            <div key={w.word} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                gap: '12px', padding: '10px 4px', borderBottom: '1px solid #f1f1f1',
                            }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: '700', fontSize: '16px' }}>{w.word}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{w.meaning || '—'}</div>
                                    {w.lesson && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>{w.lesson}</div>}
                                </div>
                                <span style={{
                                    flexShrink: 0, fontSize: '11px', fontWeight: '700',
                                    color: STATES[w.state].color, background: STATES[w.state].color + '1a',
                                    padding: '3px 9px', borderRadius: '99px', whiteSpace: 'nowrap',
                                }}>
                                    {STATES[w.state].label}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            ) : (
                <section className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>🫧</div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#1a1a1a' }}>
                        {t.no_words}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                        Words you learn in lessons show up here, with when each one is next due for review.
                    </p>
                    <button
                        onClick={() => navigate('/lessons')}
                        style={{
                            background: 'linear-gradient(90deg, #a855f7 0%, #3b82f6 100%)',
                            color: 'white', border: 'none', padding: '12px 28px', borderRadius: '99px',
                            fontWeight: '600', fontSize: '15px', cursor: 'pointer',
                        }}
                    >
                        Go to lessons
                    </button>
                </section>
            )}
        </div>
    );
}
