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
import {
    mapHeadline, mapHereLine, mapUnitLabel, mapCheckpointTag, mapFinishLine, MAP_HERE,
} from '../services/praise';
import { characters } from '../data/characters';

/* The lesson map: every lesson of the target language on one winding trail.

   "Current" is `resumeIndex` — the same function /steps and /chat call when no
   ?scenario= is given — so the map can never disagree with where a lesson
   actually opens. Everything before it is done and replayable; everything after
   it is locked.

   Layout: nodes swing left and right per SWING; each lesson's name sits *beside*
   its node on the side facing the middle of the screen. The curve meets every
   node vertically, so the band at node height is always clear of the trail,
   and the stretch between two nodes stays free for the trail and its paw
   prints. Review lessons are checkpoints — square tiles — and close a unit; the
   next unit opens with a sign across the trail. */

const ROW = 116;          // vertical distance between nodes
const NODE = 68;          // node diameter
const BANNER = 60;        // extra height where a unit sign sits
const TOP = 52;           // first node centre
const SWING = [0, 0.75, 1, 0.75, 0, -0.75, -1, -0.75]; // the snake, as a fraction of the half-width
const SCENERY = ['🌿', '🐟', '🧶', '🌸', '🍃', '🐾'];

/* Script names, for the header. The pickers store `native` on the language
   object; this covers a stored object from before they did. */
const NATIVE = {
    Hindi: 'हिन्दी', Telugu: 'తెలుగు', Kannada: 'ಕನ್ನಡ', Tamil: 'தமிழ்', Bengali: 'বাংলা',
    Marathi: 'मराठी', Malayalam: 'മലയാളം', Urdu: 'اردو', Punjabi: 'ਪੰਜਾਬੀ', Odiya: 'ଓଡ଼ିଆ',
    Gujarati: 'ગુજરાતી',
};

const isCheckpoint = (lesson) => /review|capstone/i.test(lesson?.scenario || '');

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
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(168,85,247,0.15)" strokeWidth="6" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#lm-grad)" strokeWidth="6"
                strokeLinecap="round" strokeDasharray={`${c * fraction} ${c}`} />
        </svg>
    );
}

/* A paw print, toes up, centred on the origin. */
function PawShape({ fill }) {
    return (
        <g fill={fill}>
            <ellipse cx="0" cy="2.2" rx="3.6" ry="3" />
            <circle cx="-3.6" cy="-2.4" r="1.4" />
            <circle cx="-1.25" cy="-4.2" r="1.4" />
            <circle cx="1.25" cy="-4.2" r="1.4" />
            <circle cx="3.6" cy="-2.4" r="1.4" />
        </g>
    );
}

/* Point and heading on the cubic between two node centres. Both control points
   sit at the vertical midpoint, so y eases and x swings. */
function onCurve(a, b, t) {
    const my = (a.y + b.y) / 2;
    const u = 1 - t;
    const x = u * u * u * a.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t * t * t * b.x;
    const y = u * u * u * a.y + 3 * u * u * t * my + 3 * u * t * t * my + t * t * t * b.y;
    const dx = 3 * u * u * 0 + 6 * u * t * (b.x - a.x) + 3 * t * t * 0;
    const dy = 3 * u * u * (my - a.y) + 3 * t * t * (b.y - my);
    return { x, y, angle: Math.atan2(dy, dx) * 180 / Math.PI };
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

    const n = lessons.length;
    const last = n - 1;
    const head = mapHeadline({ lang: langName, done: doneCount, total: n });
    const miko = characters.find(c => c.id === 'miko')?.image;
    const native = targetLang?.native || NATIVE[langName] || '';

    /* Units: a checkpoint closes one, unless it is the last lesson. */
    const unitEnds = lessons.map((l, i) => i).filter(i => i < last && isCheckpoint(lessons[i]));
    const unitOf = (i) => unitEnds.filter(c => c < i).length;
    const unitCount = unitEnds.length + 1;
    const unitNow = unitOf(Math.min(current, last)) + 1;

    const half = Math.max(0, width / 2 - NODE / 2 - 18);
    const xOf = (i) => width / 2 + SWING[i % SWING.length] * half;
    const yOf = (i) => TOP + i * ROW + unitOf(i) * BANNER;
    const pt = (i) => ({ x: xOf(i), y: yOf(i) });
    const height = yOf(last) + 150;

    /* Which side of its node a lesson's name goes: toward the middle. A centred
       node takes the side the trail does not leave toward. */
    const sideOf = (i) => {
        const s = SWING[i % SWING.length];
        if (s !== 0) return s > 0 ? 'left' : 'right';
        return SWING[(i + 1) % SWING.length] > 0 ? 'left' : 'right';
    };

    const seg = (i) => {
        const a = pt(i - 1), b = pt(i), my = (a.y + b.y) / 2;
        return `C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
    };
    const pathTo = (k) => (n ? [`M ${xOf(0)} ${yOf(0)}`, ...lessons.slice(1, k + 1).map((_, j) => seg(j + 1))].join(' ') : '');
    const fullPath = pathTo(last);
    const donePath = doneCount > 0 ? pathTo(Math.min(doneCount, last)) : '';

    /* Paw prints on the walked part of the trail, between nodes. */
    const paws = [];
    for (let i = 1; i <= Math.min(doneCount, last); i++) {
        [0.36, 0.5, 0.64].forEach((t, k) => {
            const p = onCurve(pt(i - 1), pt(i), t);
            const side = k % 2 ? 1 : -1;
            const rad = (p.angle + 90) * Math.PI / 180;
            paws.push({ x: p.x + Math.cos(rad) * 4 * side, y: p.y + Math.sin(rad) * 4 * side, rot: p.angle + 90, key: `${i}-${k}` });
        });
    }

    /* Scenery where both ends of a stretch sit on one side: the other side is open. */
    const scenery = [];
    lessons.forEach((_, i) => {
        if (i === 0 || i > last) return;
        const m = (i - 1) % SWING.length;
        if (m !== 1 && m !== 5) return;
        const y = (yOf(i - 1) + yOf(i)) / 2;
        scenery.push({ x: m === 1 ? width * 0.12 : width * 0.88, y, glyph: SCENERY[scenery.length % SCENERY.length] });
    });

    const fillPct = n ? Math.round((doneCount / n) * 100) : 0;

    return (
        <div className="app-container" style={{ padding: '8px 16px 40px', overflowX: 'hidden' }}>
            <style>{MAP_STYLES}</style>

            {/* ── Header ─────────────────────────────────────────────── */}
            <header style={{
                position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-lg)',
                background: 'var(--primary-gradient)', color: 'white', padding: '12px 14px 14px',
                boxShadow: '0 12px 24px -10px rgba(124,58,237,0.55)',
            }}>
                <svg width="150" height="120" viewBox="0 0 150 120" aria-hidden="true"
                    style={{ position: 'absolute', right: -18, bottom: -26, opacity: 0.13 }}>
                    <g transform="translate(40 70) rotate(-20) scale(5)"><PawShape fill="white" /></g>
                    <g transform="translate(112 34) rotate(-10) scale(3.4)"><PawShape fill="white" /></g>
                </svg>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button onClick={() => navigate('/')} aria-label="Back" className="lm-back"
                        style={{ background: 'rgba(255,255,255,0.22)', border: 'none', borderRadius: 12, padding: 7,
                                 cursor: 'pointer', display: 'flex', color: 'white' }}>
                        <ArrowLeft size={20} />
                    </button>
                    {unitCount > 1 && (
                        <span style={{
                            fontSize: 11, fontWeight: 700, letterSpacing: 0.4, padding: '4px 10px', borderRadius: 999,
                            background: 'rgba(255,255,255,0.2)',
                        }}>Unit {unitNow} of {unitCount}</span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.85 }}>
                            {head.kicker}
                        </div>
                        <h1 style={{
                            fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1.1, margin: '2px 0 0',
                            display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap',
                        }}>
                            {head.title}
                            {native && native !== head.title && (
                                <span style={{ fontSize: 17, fontWeight: 600, opacity: 0.8 }}>{native}</span>
                            )}
                        </h1>
                    </div>
                    {miko && (
                        <img src={miko} alt="" className="lm-miko" style={{
                            width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                            border: '3px solid white', boxShadow: '0 6px 14px rgba(0,0,0,0.18)', transform: 'rotate(-6deg)',
                        }} />
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                    <div role="progressbar" aria-valuemin={0} aria-valuemax={n} aria-valuenow={doneCount}
                        aria-label={`${doneCount} of ${n} lessons`}
                        style={{ position: 'relative', flex: 1, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.25)' }}>
                        <div style={{ width: `${fillPct}%`, height: '100%', borderRadius: 999, background: 'white' }} />
                        <svg width="20" height="20" viewBox="-8 -8 16 16" aria-hidden="true" style={{
                            position: 'absolute', top: -5, left: `calc(${fillPct}% - 10px)`,
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
                        }}>
                            <circle r="7.5" fill="white" />
                            <g transform="scale(0.95)"><PawShape fill="var(--accent-purple)" /></g>
                        </svg>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
                        {doneCount}<span style={{ opacity: 0.75, fontSize: 13 }}> / {n}</span>
                    </span>
                </div>
                <p style={{ fontSize: 13, margin: '8px 0 0', opacity: 0.95, lineHeight: 1.35 }}>{head.line}</p>
            </header>

            {/* ── The trail ──────────────────────────────────────────── */}
            {progress === undefined ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 60 }}>Finding your place…</p>
            ) : (
                <div ref={boxRef} style={{ position: 'relative', height, marginTop: 18 }}>
                    <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
                        <defs>
                            <linearGradient id="lm-grad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                            <linearGradient id="lm-trail" x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                        </defs>
                        {/* the road: a soft verge, a pale surface, a dashed centre line */}
                        <path d={fullPath} fill="none" stroke="rgba(168,85,247,0.12)" strokeWidth="34" strokeLinecap="round" />
                        <path d={fullPath} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="24" strokeLinecap="round" />
                        <path d={fullPath} fill="none" stroke="rgba(120,110,150,0.22)" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 10" />
                        {donePath && (
                            <path d={donePath} fill="none" stroke="url(#lm-trail)" strokeWidth="24" strokeLinecap="round" opacity="0.9" />
                        )}
                        {paws.map(p => (
                            <g key={p.key} transform={`translate(${p.x} ${p.y}) rotate(${p.rot}) scale(0.95)`} opacity="0.9">
                                <PawShape fill="white" />
                            </g>
                        ))}
                    </svg>

                    {scenery.map((s, k) => (
                        <span key={k} aria-hidden="true" className="lm-scenery" style={{
                            position: 'absolute', left: s.x, top: s.y, transform: 'translate(-50%, -50%)',
                            fontSize: 20, opacity: 0.45, pointerEvents: 'none', animationDelay: `${(k % 4) * 0.7}s`,
                        }}>{s.glyph}</span>
                    ))}

                    {unitEnds.map((c, k) => {
                        const label = mapUnitLabel({ unit: k + 2, from: c + 2, to: unitEnds[k + 1] !== undefined ? unitEnds[k + 1] + 1 : n });
                        const unlocked = c + 1 <= current || allDone;
                        return (
                            <div key={`u${c}`} style={{
                                position: 'absolute', left: 0, right: 0, top: yOf(c) + (ROW + BANNER) / 2,
                                transform: 'translateY(-50%)', display: 'flex', justifyContent: 'center', pointerEvents: 'none',
                            }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999,
                                    background: unlocked ? 'var(--primary-gradient)' : 'white',
                                    color: unlocked ? 'white' : 'var(--text-secondary)',
                                    boxShadow: unlocked ? '0 6px 14px -6px rgba(124,58,237,0.6)' : 'var(--shadow-sm)',
                                    border: unlocked ? 'none' : '1.5px dashed #d4d4dc',
                                }}>
                                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>{label.title}</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>{label.line}</span>
                                </div>
                            </div>
                        );
                    })}

                    {lessons.map((l, i) => {
                        const done = i < current || allDone;
                        const here = i === current && !allDone;
                        const locked = !done && !here;
                        const check = isCheckpoint(l) || i === last;
                        const frac = here && stepIdx > 0 ? stepIdx / stepTotal : 0;
                        const size = (here ? NODE + 10 : NODE) + (check ? 6 : 0);
                        const x = xOf(i);
                        const side = sideOf(i);
                        /* Room for the name: from the node's edge to the box edge on its side. */
                        const room = Math.min(here ? 190 : 170, (side === 'left' ? x : width - x) - size / 2 - 12);
                        const glyph = i === last ? '🏆' : l.icon;
                        const shape = check ? '30%' : '50%';
                        const bg = here ? 'white' : done ? 'var(--primary-gradient)' : '#ececf1';
                        return (
                            <React.Fragment key={i}>
                                <button
                                    ref={here ? hereRef : null}
                                    onClick={() => !locked && open(i)}
                                    disabled={locked}
                                    aria-label={`Lesson ${i + 1}: ${l.scenario}${done ? ', done' : here ? ', current' : ', locked'}`}
                                    className={here ? 'lm-node lm-pulse' : 'lm-node'}
                                    style={{
                                        position: 'absolute', left: x - size / 2, top: yOf(i) - size / 2,
                                        width: size, height: size, borderRadius: shape,
                                        border: check && !done && !here ? '2px dashed #cfcfda' : 'none',
                                        padding: 0, cursor: locked ? 'default' : 'pointer', background: bg,
                                        '--lm-lip': locked ? '#d9d9e3' : here ? '#e4d4fb' : '#6d4ad8',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transform: check ? 'rotate(0deg)' : undefined,
                                    }}>
                                    {here && !check && <Ring fraction={frac} size={size} />}
                                    {here && check && frac > 0 && (
                                        <span style={{
                                            position: 'absolute', left: 10, right: 10, bottom: 8, height: 5, borderRadius: 99,
                                            background: 'rgba(168,85,247,0.15)', overflow: 'hidden',
                                        }}>
                                            <span style={{ display: 'block', height: '100%', width: `${frac * 100}%`, background: 'var(--primary-gradient)' }} />
                                        </span>
                                    )}
                                    {glyph ? (
                                        <span style={{
                                            fontSize: here ? 32 : 28, lineHeight: 1,
                                            filter: locked ? 'grayscale(1)' : 'none', opacity: locked ? 0.45 : 1,
                                        }}>{glyph}</span>
                                    ) : (
                                        /* No icon of its own: the lesson's number, not another 📘. */
                                        <span style={{
                                            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: here ? 28 : 25, lineHeight: 1,
                                            color: here ? 'var(--accent-purple)' : done ? 'white' : '#b4b4c0',
                                            textShadow: done ? '0 2px 0 rgba(0,0,0,0.12)' : 'none',
                                        }}>{i + 1}</span>
                                    )}
                                    {(done || locked) && (
                                        <span style={{
                                            position: 'absolute', right: -3, bottom: -3, width: 22, height: 22, borderRadius: '50%',
                                            background: done ? '#fff' : '#c9c9d4', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', boxShadow: 'var(--shadow-sm)',
                                        }}>
                                            {done ? <Check size={13} strokeWidth={3} color="var(--accent-purple)" /> : <Lock size={11} color="#fff" />}
                                        </span>
                                    )}
                                </button>

                                {/* The name, beside the node on the side facing the middle. */}
                                <div className={here ? 'lm-here' : undefined} style={{
                                    position: 'absolute', top: yOf(i), transform: 'translateY(-50%)',
                                    ...(side === 'left' ? { right: width - x + size / 2 + 12 } : { left: x + size / 2 + 12 }),
                                    maxWidth: Math.max(90, room), width: 'max-content',
                                    textAlign: side === 'left' ? 'right' : 'left',
                                    ...(here ? {
                                        background: 'white', borderRadius: 14, padding: '8px 11px',
                                        boxShadow: '0 8px 20px -6px rgba(124,58,237,0.35)', border: '1.5px solid rgba(168,85,247,0.25)',
                                    } : {}),
                                }}>
                                    {here && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
                                            justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
                                            fontSize: 11, fontWeight: 800, color: 'var(--accent-purple)', letterSpacing: 0.3,
                                        }}>
                                            {miko && <img src={miko} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />}
                                            {MAP_HERE}
                                        </div>
                                    )}
                                    {check && (
                                        <div style={{
                                            fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase',
                                            color: locked ? '#a8a8b3' : 'var(--accent-blue)', marginBottom: 1,
                                        }}>{mapCheckpointTag({ last: i === last })}</div>
                                    )}
                                    <div style={{
                                        fontSize: 13, lineHeight: 1.25, fontWeight: here ? 800 : 700,
                                        color: locked ? '#9a9aa5' : 'var(--text-main)',
                                    }}>
                                        <span style={{ color: locked ? '#b4b4c0' : 'var(--text-secondary)', fontWeight: 600, fontSize: 11 }}>
                                            Lesson {i + 1}
                                        </span>
                                        <br />
                                        {l.scenario}
                                    </div>
                                    {here && (
                                        <div style={{ fontSize: 11, color: 'var(--accent-purple)', fontWeight: 700, marginTop: 3 }}>
                                            {mapHereLine({ stepIdx, stepTotal })}
                                        </div>
                                    )}
                                </div>
                            </React.Fragment>
                        );
                    })}

                    {/* The finish line, under the last lesson. */}
                    {n > 0 && (
                        <div style={{
                            position: 'absolute', left: 0, right: 0, top: yOf(last) + NODE / 2 + 34,
                            display: 'flex', justifyContent: 'center',
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px 7px 8px', borderRadius: 999,
                                background: allDone ? 'var(--primary-gradient)' : 'white', color: allDone ? 'white' : 'var(--text-secondary)',
                                boxShadow: 'var(--shadow-sm)', fontSize: 12, fontWeight: 700, maxWidth: '100%',
                            }}>
                                <span aria-hidden="true" className="lm-flag" style={{
                                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                                    backgroundImage: 'conic-gradient(#1a1a1a 25%, white 0 50%, #1a1a1a 0 75%, white 0)',
                                    backgroundSize: '11px 11px', border: '2px solid white', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
                                }} />
                                {mapFinishLine({ lang: langName, done: doneCount, total: n })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* All motion on the map lives here, and all of it stops under reduced motion. */
const MAP_STYLES = `
.lm-node {
  box-shadow: inset 0 -5px 0 var(--lm-lip), 0 8px 16px -6px rgba(80,40,160,0.35);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.lm-node:disabled { box-shadow: inset 0 -5px 0 var(--lm-lip); }
.lm-node:not(:disabled):hover { transform: translateY(-2px); }
.lm-node:not(:disabled):active {
  transform: translateY(2px);
  box-shadow: inset 0 -2px 0 var(--lm-lip), 0 3px 6px -2px rgba(80,40,160,0.35);
}
@keyframes lm-pulse {
  0%, 100% { box-shadow: inset 0 -5px 0 var(--lm-lip), 0 0 0 0 rgba(168,85,247,0.4), 0 8px 16px -6px rgba(80,40,160,0.35); }
  50% { box-shadow: inset 0 -5px 0 var(--lm-lip), 0 0 0 12px rgba(168,85,247,0), 0 8px 16px -6px rgba(80,40,160,0.35); }
}
.lm-pulse { animation: lm-pulse 2s ease-in-out infinite; }
@keyframes lm-bob { 0%, 100% { margin-top: 0; } 50% { margin-top: -3px; } }
.lm-here { animation: lm-bob 2.4s ease-in-out infinite; }
@keyframes lm-sway { 0%, 100% { rotate: -6deg; } 50% { rotate: 6deg; } }
.lm-scenery { animation: lm-sway 5s ease-in-out infinite; }
.lm-back:active { transform: scale(0.94); }
@media (prefers-reduced-motion: reduce) {
  .lm-node, .lm-pulse, .lm-here, .lm-scenery, .lm-back { animation: none !important; transition: none !important; }
  .lm-node:not(:disabled):hover, .lm-node:not(:disabled):active { transform: none; }
}
`;
