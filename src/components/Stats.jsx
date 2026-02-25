import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Languages, History, GraduationCap } from 'lucide-react';
import { wordTracker } from '../services/wordTracker';
import { useTranslation } from '../hooks/useTranslation';

export default function Stats() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const wordCount = wordTracker.getTotalCount();
    const proficiency = wordTracker.getProficiency();
    const progress = wordTracker.getProgress();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Proficiency Status */}
            <section className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ padding: '6px', background: proficiency.color + '22', borderRadius: '8px', color: proficiency.color }}>
                        <GraduationCap size={18} />
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '700' }}>{t.proficiency_status}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                        {proficiency.icon} {t[proficiency.status.toLowerCase()] || proficiency.status}
                    </h2>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {t.next_tier.replace('{n}', proficiency.nextTier)}
                    </span>
                </div>

                <div className="progress-bar" style={{ height: '8px' }}>
                    <div className="progress-fill" style={{ width: `${progress}%`, backgroundColor: proficiency.color }}></div>
                </div>
            </section>

            {/* Side-by-Side Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Translator Quick Link */}
                <section
                    className="card"
                    onClick={() => navigate('/translator')}
                    style={{
                        margin: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        textAlign: 'center',
                        padding: '16px 12px',
                        background: 'var(--primary-gradient)',
                        color: 'white',
                        border: 'none'
                    }}
                >
                    <Languages size={24} style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '13px', fontWeight: '700' }}>{t.quick_translate}</span>
                </section>

                {/* New Words Learned */}
                <section
                    className="card"
                    onClick={() => navigate('/history')}
                    style={{
                        margin: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        textAlign: 'center',
                        padding: '16px 12px'
                    }}
                >
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>{wordCount}</div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                        {t.new_words}
                    </span>
                </section>
            </div>
        </div>
    );
}
