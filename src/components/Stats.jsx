import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Languages, GraduationCap } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../services/api';
import { lessonCount } from '../services/curriculum';
import { getStoredJSON } from '../utils/storage';
import { proficiencyOf, readCache, writeCache } from '../services/homeStats';

const targetLangName = () => getStoredJSON('linguapaws_target_lang', {})?.name || null;

/* The current target language, re-read when another screen changes it. */
function useTargetLang() {
    const [lang, setLang] = React.useState(targetLangName);
    React.useEffect(() => {
        const sync = () => setLang(targetLangName());
        window.addEventListener('storage', sync);
        window.addEventListener('linguapaws-language-changed', sync);
        return () => {
            window.removeEventListener('storage', sync);
            window.removeEventListener('linguapaws-language-changed', sync);
        };
    }, []);
    return lang;
}

/* Last cached summary for this language straight away, then the server's.
   Never blocks the page: a failed fetch leaves the cached numbers up. */
function useSummary(lang) {
    const [state, setState] = React.useState(() => ({ lang, summary: readCache('home_stats', lang) }));
    const summary = state.lang === lang ? state.summary : readCache('home_stats', lang);
    React.useEffect(() => {
        let live = true;
        setState({ lang, summary: readCache('home_stats', lang) });
        if (!lang) return undefined;
        api.get(`/api/progress/summary?lang=${encodeURIComponent(lang)}`)
            .then((fresh) => {
                writeCache('home_stats', lang, fresh);
                if (live) setState({ lang, summary: fresh });
            })
            .catch(() => { /* keep the cached numbers */ });
        return () => { live = false; };
    }, [lang]);
    return summary;
}

export default function Stats() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const lang = useTargetLang();
    const summary = useSummary(lang);
    const proficiency = proficiencyOf(summary, lessonCount(lang));
    const progress = proficiency.progress;
    const wordCount = summary?.words ?? 0;

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
                    {proficiency.nextLine && (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                            {proficiency.nextLine}
                        </span>
                    )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {proficiency.detail}
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
