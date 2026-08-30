import React, { useMemo } from 'react';

/**
 * The particle burst behind a right answer.
 *
 * Three sizes, because a burst that is the same every time stops being a
 * reward after four screens: `power` 1 is a routine correct answer, 2 a streak
 * milestone, 3 the end of the lesson.
 *
 * Deterministic from `seed` — the same answer produces the same burst, so a
 * preview screenshot is reproducible and nothing here needs a stable random
 * source. Renders nothing at all under `prefers-reduced-motion`; the colour and
 * the words carry the moment on their own.
 */

const COLOURS = ['#a855f7', '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];

/* Mulberry-ish: enough spread for confetti, three lines, no dependency. */
const rng = (seed) => {
    let s = (seed * 2654435761) >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const reducedMotion = () => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch { return false; }
};

export default function Burst({ seed = 0, power = 1, originY = '44%' }) {
    const parts = useMemo(() => {
        const r = rng(seed + power * 977);
        const count = power >= 3 ? 54 : power === 2 ? 30 : 16;
        return Array.from({ length: count }, (_, i) => {
            /* Power 3 rains from above the fold; 1 and 2 burst outward from the
               card, biased upward — confetti that only ever falls reads as an
               afterthought, confetti thrown up reads as a reaction. */
            const angle = power >= 3
                ? Math.PI / 2 + (r() - 0.5) * 0.6
                : (i / count) * Math.PI * 2 + (r() - 0.5) * 0.5;
            const reach = (power >= 3 ? 240 + r() * 420 : (power === 2 ? 120 : 78) + r() * 90);
            return {
                dx: Math.cos(angle) * reach * (power >= 3 ? 0.35 : 1),
                dy: Math.sin(angle) * reach * (power >= 3 ? 1 : 0.78) * (power >= 3 ? 1 : -1),
                rot: (r() - 0.5) * 900,
                delay: r() * (power >= 3 ? 0.5 : 0.12),
                dur: 0.75 + r() * (power >= 3 ? 0.9 : 0.5),
                size: 5 + r() * (power >= 3 ? 8 : 6),
                round: r() > 0.55,
                colour: COLOURS[Math.floor(r() * COLOURS.length)],
                startX: power >= 3 ? (r() * 100) : 50,
            };
        });
    }, [seed, power]);

    if (reducedMotion()) return null;

    return (
        <div aria-hidden="true" style={{
            position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 40, overflow: 'hidden',
        }}>
            <style>{`
                @keyframes burst-fly {
                    0%   { transform: translate(-50%,-50%) scale(0.4) rotate(0deg); opacity: 0; }
                    12%  { opacity: 1; }
                    100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy)))
                                      scale(1) rotate(var(--rot)); opacity: 0; }
                }
                @keyframes burst-ring {
                    0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 0.55; }
                    100% { transform: translate(-50%,-50%) scale(2.6);  opacity: 0; }
                }
            `}</style>

            {power >= 2 && (
                <div style={{
                    position: 'absolute', left: '50%', top: originY,
                    width: 180, height: 180, borderRadius: '50%',
                    border: '3px solid rgba(168,85,247,0.5)',
                    animation: 'burst-ring 0.75s cubic-bezier(0.16,1,0.3,1) forwards',
                }} />
            )}

            {parts.map((p, i) => (
                <span key={i} style={{
                    position: 'absolute',
                    left: `${p.startX}%`,
                    top: power >= 3 ? '-6%' : originY,
                    width: p.size, height: p.round ? p.size : p.size * 1.8,
                    borderRadius: p.round ? '50%' : 2,
                    background: p.colour,
                    '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': `${p.rot}deg`,
                    animation: `burst-fly ${p.dur}s cubic-bezier(0.15,0.75,0.3,1) ${p.delay}s forwards`,
                    opacity: 0,
                }} />
            ))}
        </div>
    );
}
