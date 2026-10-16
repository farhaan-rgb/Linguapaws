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
