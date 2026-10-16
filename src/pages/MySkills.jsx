import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Dumbbell } from 'lucide-react';
import { api } from '../services/api';
import { CURRICULUM, isLanguageAvailable } from '../services/curriculum';
import { completedLessonFor } from '../services/lessonResume';
import { skillBoard, focusSkills, TYPE_ORDER, MAX_SHOWN } from '../services/skillProgress';
import { examplesFor } from '../services/examples';
import { normalizeLatin } from '../services/lessonEngine';
import { getStoredJSON } from '../utils/storage';
import { TrendMark, RecentDots } from '../components/SkillFocus';
import { SKILLS_PAGE as P, skillsSummaryFor } from '../services/praise';
import { characters } from '../data/characters';

/* "My skills": every skill the learner has reached, grouped Strong / Getting
   there / To work on, by type within each. Which skill goes where is
   skillProgress.skillBoard; this page only draws. Strong leads, because it is
   true and it is the reason to keep going. "To work on" shows the three Miko
   is practising next and keeps the rest behind a quiet button — a learner
   with twenty tricky skills needs to know which three, not that it is twenty.
   No mastery number appears anywhere. */

const fetchModel = (lang) => Promise.race([
    api.get(`/api/progress/skills?lang=${encodeURIComponent(lang)}`),
    new Promise((resolve) => setTimeout(() => resolve(null), 6000)),
]).then(r => (Array.isArray(r) ? r : null)).catch(() => null);

/* A word skill's headword in the lesson that teaches it, for one example. */
function exampleFor(lessons, row) {
    if (row.type !== 'word') return null;
    const li = row.lesson - 1;
    const key = row.skillId.slice(2).replace(/-/g, '');
    const v = (lessons[li]?.vocabulary || []).find(w => normalizeLatin(w.word).replace(/[^a-z0-9]/g, '') === key);
    if (!v) return null;
    return examplesFor(lessons, li, v.word, { max: 1 })[0] || null;
}

function SkillRow({ row, lessons, first }) {
    const [open, setOpen] = useState(false);
    const ex = open ? exampleFor(lessons, row) : null;
    return (
        <li style={{ borderTop: first ? 'none' : '1px solid rgba(168,85,247,0.12)' }}>
            <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="ms-row"
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'inherit',
                    font: 'inherit',
                }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{row.label}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                        {row.trend && <TrendMark trend={row.trend} />}
                        <RecentDots recent={row.recent} />
                    </span>
                </span>
                <ChevronDown size={16} aria-hidden="true" style={{
                    flexShrink: 0, color: 'var(--text-secondary)',
                    transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
                }} />
            </button>
            {open && (
                <div style={{ padding: '0 0 10px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <p style={{ margin: 0 }}>{P.taught(row.lesson, lessons[row.lesson - 1]?.scenario)}</p>
                    {ex && (
                        <p style={{ margin: '4px 0 0' }}>
                            <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>{ex.correct}</strong>
                            {ex.meaning ? ` — ${ex.meaning}` : ''}
                        </p>
                    )}
                </div>
            )}
        </li>
    );
}

/* One group's rows, split by type under small plain headings. */
function ByType({ rows, lessons, trend = true }) {
    const types = TYPE_ORDER.filter(t => rows.some(r => r.type === t));
    return types.map(t => (
        <div key={t} style={{ marginTop: 8 }}>
            {types.length > 1 && (
                <h4 style={{
                    margin: '6px 0 0', fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
                    textTransform: 'uppercase', color: 'var(--text-secondary)',
                }}>{P.types[t]}</h4>
            )}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {rows.filter(r => r.type === t).map((r, i) => (
                    <SkillRow key={r.skillId} row={trend ? r : { ...r, trend: null, recent: [] }} lessons={lessons} first={i === 0} />
                ))}
            </ul>
        </div>
    ));
}

const DOT = { strong: '#7c3aed', learning: '#3b82f6', tricky: '#f59e0b' };

function Group({ kind, rows, lessons, children }) {
    if (!rows.length) return null;
    const g = P.groups[kind];
    return (
        <section className="card" style={{ padding: '14px 16px', marginTop: 14 }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', background: DOT[kind] }} />
                {g.title}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>{g.line}</p>
            {children || <ByType rows={rows} lessons={lessons} />}
        </section>
    );
}

export default function MySkills() {
    const navigate = useNavigate();
    const lang = useMemo(() => getStoredJSON('linguapaws_target_lang', {})?.name || 'Telugu', []);
    const lessons = useMemo(() => (isLanguageAvailable(lang) ? CURRICULUM[lang] : []) || [], [lang]);
    const [model, setModel] = useState(undefined);     // undefined loading, null failed
    const [completed, setCompleted] = useState(null);
    const [allTricky, setAllTricky] = useState(false);

    const load = useCallback(() => {
        setModel(undefined);
        Promise.all([fetchModel(lang), api.get('/api/progress').catch(() => null)]).then(([m, p]) => {
            setCompleted(completedLessonFor(p, lang));
            setModel(m);
        });
    }, [lang]);
    useEffect(() => { load(); }, [load]);

    /* Reached = finished lessons plus the one being worked on. Unknown
       progress (offline) falls back to the whole course: the model itself
       only holds skills the learner has answered. */
    const finished = completed === null ? Infinity : completed + 1;
    const board = model ? skillBoard({ lang, model, reached: finished + 1 }) : null;
    const focus = model ? focusSkills({ lang, model, finished }) : { items: [] };
    /* The three being practised lead "To work on", so the button and the list agree. */
    const tricky = board ? [
        ...focus.items.map(f => board.tricky.find(r => r.skillId === f.skillId)).filter(Boolean),
        ...board.tricky.filter(r => !focus.items.some(f => f.skillId === r.skillId)),
    ] : [];
    const shownTricky = allTricky ? tricky : tricky.slice(0, MAX_SHOWN);
    const judged = board ? board.strong.length + board.learning.length + board.tricky.length : 0;
    const miko = characters.find(c => c.id === 'miko')?.image;

    const practise = () => {
        localStorage.removeItem('linguapaws_active_character');
        navigate(`/steps?practice=1&focus=${focus.items.map(i => i.skillId).join(',')}`);
    };

    const notice = (title, line, action) => (
        <section className="card" style={{ padding: 18, marginTop: 14, textAlign: 'center' }}>
            {miko && <img src={miko} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: 'var(--shadow-sm)' }} />}
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, margin: '8px 0 4px' }}>{title}</h2>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{line}</p>
            {action}
        </section>
    );

    return (
        <div className="app-container" style={{ padding: '8px 16px 40px' }}>
            <style>{`
                .ms-row:focus-visible { outline: 2px solid var(--accent-purple); outline-offset: 2px; border-radius: 8px; }
                @media (prefers-reduced-motion: reduce) { .ms-row svg { transition: none !important; } }
            `}</style>
            <header style={{
                borderRadius: 'var(--radius-lg)', background: 'var(--primary-gradient)', color: 'white',
                padding: '12px 14px 16px', boxShadow: '0 12px 24px -10px rgba(124,58,237,0.55)',
            }}>
                <button onClick={() => navigate(-1)} aria-label="Back"
                    style={{ background: 'rgba(255,255,255,0.22)', border: 'none', borderRadius: 12, padding: 7,
                             cursor: 'pointer', display: 'flex', color: 'white' }}>
                    <ArrowLeft size={20} />
                </button>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.85, marginTop: 10 }}>
                    {lang}
                </div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1.1, margin: '2px 0 0' }}>{P.title}</h1>
                {board && judged > 0 && (
                    <p style={{ fontSize: 13.5, margin: '8px 0 0', opacity: 0.95, lineHeight: 1.4 }}>
                        {skillsSummaryFor({ strong: board.strong.length, learning: board.learning.length, next: focus.items.length })}
                    </p>
                )}
            </header>

            {model === undefined && (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 40 }}>Looking at your answers…</p>
            )}
            {model === null && notice(P.failed.title, P.failed.line, (
                <button className="btn-primary" onClick={load} style={{ marginTop: 12 }}>{P.failed.button}</button>
            ))}
            {board && judged === 0 && notice(P.empty.title, P.empty.line)}

            {board && judged > 0 && (<>
                {focus.items.length > 0 && (
                    <button className="btn-primary" onClick={practise} style={{ width: '100%', marginTop: 14 }}>
                        <Dumbbell size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
                        {focus.items.length === 1 ? 'Practise the one to work on' : `Practise the ${focus.items.length} to work on`}
                    </button>
                )}
                <Group kind="strong" rows={board.strong} lessons={lessons} />
                <Group kind="learning" rows={board.learning} lessons={lessons} />
                <Group kind="tricky" rows={tricky} lessons={lessons}>
                    <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
                        {shownTricky.map((r, i) => <SkillRow key={r.skillId} row={r} lessons={lessons} first={i === 0} />)}
                    </ul>
                    {tricky.length > MAX_SHOWN && (
                        <button onClick={() => setAllTricky(a => !a)}
                            style={{ marginTop: 6, background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer',
                                     color: 'var(--accent-purple)', fontWeight: 700, fontSize: 13 }}>
                            {allTricky ? P.showFewer : P.showOthers(tricky.length - MAX_SHOWN)}
                        </button>
                    )}
                </Group>
            </>)}

            {board && board.unknown.length > 0 && (
                <details className="card" style={{ padding: '12px 16px', marginTop: 14 }}>
                    <summary style={{ cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
                        {P.groups.unknown.title} · {board.unknown.length}
                    </summary>
                    <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>{P.groups.unknown.line}</p>
                    <ByType rows={board.unknown} lessons={lessons} trend={false} />
                </details>
            )}
        </div>
    );
}
