import React from 'react';
import * as praise from '../services/praise';

/* The pieces that show a learner their own skills: a mark (direction, never a
   number) and a short list of labelled skills. The results card and the lesson
   map use them now; a full "My skills" page should too, so a skill reads the
   same everywhere. Which skills, and which mark, is decided in
   services/skillProgress.js — these only draw. Amber for "tricky", never red. */

const TONE = {
    up: { color: '#6d28d9', background: 'rgba(168,85,247,0.12)' },
    new: { color: '#1d4ed8', background: 'rgba(59,130,246,0.12)' },
    tricky: { color: '#b45309', background: 'rgba(245,158,11,0.14)' },
};

export function SkillMark({ mark }) {
    const m = praise.SKILL_MARK[mark];
    if (!m) return null;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99,
            fontSize: 11.5, fontWeight: 700, lineHeight: 1.5, ...TONE[mark],
        }}>
            <span aria-hidden="true">{m.arrow}</span>{m.text}
        </span>
    );
}

/** Rows of `{ skillId, label, mark? }`. `animate` staggers them in (off under reduced motion). */
export function SkillList({ items, animate = false }) {
    return (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map((s, i) => (
                <li key={s.skillId} style={{
                    padding: '8px 0', borderTop: i ? '1px solid rgba(168,85,247,0.12)' : 'none',
                    ...(animate ? {
                        animation: 'slide-in 0.45s cubic-bezier(0.22,1,0.36,1) backwards',
                        animationDelay: `${0.08 * i + 0.3}s`,
                    } : {}),
                }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: 'var(--text-main)' }}>
                        {s.label}
                    </p>
                    {s.mark && <div style={{ marginTop: 4 }}><SkillMark mark={s.mark} /></div>}
                </li>
            ))}
        </ul>
    );
}

const TREND_TONE = {
    up: TONE.up,
    steady: { color: '#475569', background: 'rgba(100,116,139,0.1)' },
    wobbly: TONE.tricky,
};

/** Which way the last few answers lean (skillProgress.trendOf), as a pill. */
export function TrendMark({ trend }) {
    const m = praise.SKILL_TREND[trend];
    if (!m) return null;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99,
            fontSize: 11.5, fontWeight: 700, lineHeight: 1.5, whiteSpace: 'nowrap', ...TREND_TONE[trend],
        }}>
            <span aria-hidden="true">{m.arrow}</span>{m.text}
        </span>
    );
}

/* The last answers as dots, oldest first: filled = right, soft = partly,
   an amber ring = missed. Direction over time without a number. */
export function RecentDots({ recent = [] }) {
    if (!recent.length) return null;
    const right = recent.filter(x => x >= 0.75).length;
    const label = `${praise.SKILLS_PAGE.recent}: ${right * 2 >= recent.length ? 'mostly right' : 'some misses'}`;
    return (
        <span role="img" aria-label={label} title={praise.SKILLS_PAGE.recent}
            style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
            {recent.map((x, i) => (
                <span key={i} style={{
                    width: 7, height: 7, borderRadius: '50%', boxSizing: 'border-box',
                    ...(x >= 0.75 ? { background: 'var(--accent-purple)' }
                        : x >= 0.25 ? { background: 'rgba(168,85,247,0.35)' }
                            : { border: '1.5px solid #f59e0b' }),
                }} />
            ))}
        </span>
    );
}
