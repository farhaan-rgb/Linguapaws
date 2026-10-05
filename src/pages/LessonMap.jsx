import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Lock } from 'lucide-react';
import { CURRICULUM, isLanguageAvailable } from '../services/curriculum';
import { api } from '../services/api';
import { resumeIndex, savedStepFor, completedLessonFor } from '../services/lessonResume';
import { buildLessonSteps } from '../services/stepPlan';
import { getReviewSet, REVIEW_SLOTS } from '../services/srs';
import { getLearnMode } from '../utils/learnMode';
import { getStoredJSON } from '../utils/storage';
import { mapHeadline, mapHereLine } from '../services/praise';
import { characters } from '../data/characters';

/* The lesson map: every lesson of the target language on one winding path.

   "Current" is `resumeIndex` — the same function /steps and /chat call when no
   ?scenario= is given — so the map can never disagree with where a lesson
   actually opens. Everything before it is done and replayable; everything after
   it is locked. */

const ROW = 118;          // vertical distance between nodes
const NODE = 72;          // node diameter
const SWING = [0, 0.75, 1, 0.75, 0, -0.75, -1, -0.75]; // the snake, as a fraction of the half-width

/* Screens in a lesson, from the same plan Steps builds. The review triplet is
   cached per lesson once a run starts, so for a lesson in progress on this
   device the count is exact; otherwise the full three review slots are assumed. */
function stepTotalFor(lessons, idx, langName) {
    const lesson = lessons[idx];
    if (!lesson) return 0;
    const cached = getReviewSet(langName, idx);
    const base = buildLessonSteps(lesson, cached, lessons).length;
    return cached ? base : base + REVIEW_SLOTS;
}

function Ring({ fraction, size }) {
    const r = size / 2 - 4;
    const c = 2 * Math.PI * r;
    return (
        <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} aria-hidden="true">
            <defs>
                <linearGradient id="lm-ring" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(168,85,247,0.15)" strokeWidth="6" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#lm-ring)" strokeWidth="6"
                strokeLinecap="round" strokeDasharray={`${c * fraction} ${c}`} />
        </svg>
    );
}

export default function LessonMap() {
    const navigate = useNavigate();
    const targetLang = useMemo(() => getStoredJSON('linguapaws_target_lang', {}), []);
    const langName = targetLang?.name || 'Telugu';
    const lessons = useMemo(
        () => (isLanguageAvailable(langName) ? CURRICULUM[langName] : []) || [],
        [langName],
    );
    const [progress, setProgress] = useState(undefined); // undefined = loading, null = offline
    const hereRef = useRef(null);
    const [width, setWidth] = useState(340);
    const boxRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        api.get('/api/progress')
            .then(p => { if (!cancelled) setProgress(p); })
            .catch(() => { if (!cancelled) setProgress(null); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return undefined;
        const measure = () => setWidth(el.clientWidth || 340);
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [progress]);

    const current = progress === undefined ? 0 : resumeIndex(progress, langName, lessons.length);
    const completed = completedLessonFor(progress, langName);
    /* Finished = before the current lesson, or the last lesson once the record
       says it is done (resume clamps there, so it is both current and done). */
    const allDone = completed !== null && completed >= lessons.length - 1;
    const doneCount = allDone ? lessons.length : current;
    const stepTotal = useMemo(() => stepTotalFor(lessons, current, langName), [lessons, current, langName]);
    const stepIdx = allDone ? 0 : savedStepFor(progress, langName, current, stepTotal);

    useEffect(() => {
        if (progress === undefined || !hereRef.current) return;
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        hereRef.current.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }, [progress]);

    const open = (idx) => {
        localStorage.removeItem('linguapaws_active_character');
        const url = getLearnMode() === 'steps' ? '/steps' : '/chat';
        navigate(`${url}?scenario=${idx}`);
    };

    const head = mapHeadline({ lang: langName, done: doneCount, total: lessons.length });
    const miko = characters.find(c => c.id === 'miko')?.image;
    const half = Math.max(0, width / 2 - NODE / 2 - 34);
    const xOf = (i) => width / 2 + SWING[i % SWING.length] * half;
    const yOf = (i) => 40 + i * ROW;
    const height = yOf(lessons.length - 1) + 90;

    /* One smooth curve through every node centre. */
    const path = lessons.map((_, i) => {
        if (i === 0) return `M ${xOf(0)} ${yOf(0)}`;
        const my = (yOf(i - 1) + yOf(i)) / 2;
        return `C ${xOf(i - 1)} ${my}, ${xOf(i)} ${my}, ${xOf(i)} ${yOf(i)}`;
    }).join(' ');
    const donePathLen = Math.max(0, doneCount);

    return (
        <div className="app-container" style={{ padding: '8px 16px 40px' }}>
            <style>{MAP_STYLES}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <button onClick={() => navigate('/')} aria-label="Back"
                    style={{ background: 'var(--card-bg)', border: 'none', borderRadius: 12, padding: 8,
                             boxShadow: 'var(--shadow-sm)', cursor: 'pointer', display: 'flex' }}>
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, margin: 0 }}>{head.title}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>{head.line}</p>
                </div>
            </div>

            {progress === undefined ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 60 }}>Finding your place…</p>
            ) : (
                <div ref={boxRef} style={{ position: 'relative', height, marginTop: 12 }}>
                    <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
                        <path d={path} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="10" strokeLinecap="round" strokeDasharray="2 16" />
                        {donePathLen > 0 && (
                            <path d={path.split(' C ').slice(0, donePathLen + 1).join(' C ')} fill="none"
                                stroke="url(#lm-path)" strokeWidth="10" strokeLinecap="round" opacity="0.55" />
                        )}
                        <defs>
                            <linearGradient id="lm-path" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {lessons.map((l, i) => {
                        const done = i < current || allDone;
                        const here = i === current && !allDone;
                        const locked = !done && !here;
                        const frac = here && stepIdx > 0 ? stepIdx / stepTotal : 0;
                        const size = here ? NODE + 12 : NODE;
                        return (
                            <div key={i} ref={here ? hereRef : null}
                                style={{ position: 'absolute', left: xOf(i), top: yOf(i), transform: 'translate(-50%, -50%)',
                                         display: 'flex', flexDirection: 'column', alignItems: 'center', width: 150 }}>
                                {here && (
                                    <div className="lm-here" style={{
                                        position: 'absolute', bottom: '100%', marginBottom: -2, display: 'flex',
                                        alignItems: 'center', gap: 6, background: 'white', borderRadius: 999,
                                        padding: '3px 10px 3px 3px', boxShadow: 'var(--shadow-md)', whiteSpace: 'nowrap',
                                        fontSize: 12, fontWeight: 700, color: 'var(--accent-purple)',
                                    }}>
                                        {miko && <img src={miko} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />}
                                        You are here
                                    </div>
                                )}
                                <button
                                    onClick={() => !locked && open(i)}
                                    disabled={locked}
                                    aria-label={`Lesson ${i + 1}: ${l.scenario}${done ? ', done' : here ? ', current' : ', locked'}`}
                                    className={here ? 'lm-node lm-pulse' : 'lm-node'}
                                    style={{
                                        position: 'relative', width: size, height: size, borderRadius: '50%',
                                        border: 'none', padding: 0, cursor: locked ? 'default' : 'pointer',
                                        background: here ? 'white' : done ? 'var(--primary-gradient)' : '#ececf1',
                                        boxShadow: locked ? 'inset 0 -4px 0 rgba(0,0,0,0.06)' : 'var(--shadow-md)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                    {here && <Ring fraction={frac} size={size} />}
                                    <span style={{
                                        fontSize: here ? 34 : 30, lineHeight: 1,
                                        filter: locked ? 'grayscale(1)' : 'none', opacity: locked ? 0.45 : 1,
                                    }}>{l.icon || '📘'}</span>
                                    {(done || locked) && (
                                        <span style={{
                                            position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: '50%',
                                            background: done ? '#fff' : '#d4d4dc', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', boxShadow: 'var(--shadow-sm)',
                                        }}>
                                            {done ? <Check size={14} strokeWidth={3} color="var(--accent-purple)" /> : <Lock size={12} color="#fff" />}
                                        </span>
                                    )}
                                </button>
                                <div style={{
                                    marginTop: 6, textAlign: 'center', fontSize: 12, lineHeight: 1.25,
                                    fontWeight: here ? 700 : 600, color: locked ? '#9a9aa5' : 'var(--text-main)',
                                }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{i + 1}. </span>{l.scenario}
                                    {here && (
                                        <div style={{ fontSize: 11, color: 'var(--accent-purple)', fontWeight: 700, marginTop: 2 }}>
                                            {mapHereLine({ stepIdx, stepTotal })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const MAP_STYLES = `
.lm-node { transition: transform 0.15s ease; }
.lm-node:not(:disabled):active { transform: scale(0.94); }
@keyframes lm-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.35), var(--shadow-md); }
                      50% { box-shadow: 0 0 0 10px rgba(168,85,247,0), var(--shadow-md); } }
.lm-pulse { animation: lm-pulse 2s ease-in-out infinite; }
@keyframes lm-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.lm-here { animation: lm-bob 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .lm-node, .lm-pulse, .lm-here { animation: none !important; transition: none !important; }
}
`;
