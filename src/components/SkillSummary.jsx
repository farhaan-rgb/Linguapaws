import React from 'react';
import { SKILLS_PAGE as P, skillsOverviewFor, missSlipGloss } from '../services/praise';

/* The picture at the top of "My skills": how am I doing, before what level is
   each word.
 *
 * Two visuals, not one, and deliberately not symmetrical:
 *
 *   The strip is a mastery distribution. The skill model carries evidence in
 *   both directions, so a strip can honestly have a good end and a bad end.
 *
 *   The slip bars are a miss profile, and nothing anywhere ever records that
 *   the learner did NOT make a spelling mistake (MISS-TAXONOMY.md). A kind
 *   with no bar is no evidence, never a strength — so these bars are headed
 *   by their own denominator ("21 mistakes Miko could put a name to") and are
 *   drawn at all only once there are enough of them to mean something.
 *   Manufacturing one chart with a good end and a bad end out of the two
 *   would be inventing a symmetry the data does not have.
 *
 * Which of the three states the slip half is in is decided by
 * skillProgress.missBoard, which is MISS-TAXONOMY.md's own standing-weakness
 * rule and nothing invented here. This file only draws.
 *
 * Amber for a miss, never red — the same rule the lesson screens hold. */

const FILL = {
    strong: '#7c3aed',
    learning: '#3b82f6',
    tricky: '#f59e0b',
    /* Hatched, not a fourth colour: "not judged yet" is a different sort of
       thing from the three verdicts, and the texture says so without it. */
    unknown: 'repeating-linear-gradient(45deg, #e2e8f0 0 4px, #f4f4f6 4px 8px)',
};
const ORDER = ['strong', 'learning', 'tricky', 'unknown'];

const styles = `
@keyframes ss-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.ss-grow { animation: ss-grow 0.55s cubic-bezier(0.22,1,0.36,1) both; transform-origin: left center; }
@media (prefers-reduced-motion: reduce) { .ss-grow { animation: none !important; } }
`;

/** The mastery strip: everything reached, in the page's own four groups. */
function MasteryStrip({ counts }) {
    const total = ORDER.reduce((s, k) => s + (counts[k] || 0), 0);
    if (!total) return null;
    const shown = ORDER.filter(k => counts[k] > 0);
    const label = shown.map(k => `${counts[k]} ${P.groups[k].title.toLowerCase()}`).join(', ');
    return (
        <div style={{ marginTop: 10 }}>
            <div role="img" aria-label={label} style={{
                display: 'flex', height: 14, borderRadius: 99, overflow: 'hidden',
                background: '#f1f1f4', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
            }}>
                {shown.map((k, i) => (
                    <div key={k} className="ss-grow" style={{
                        flex: `${counts[k]} 0 auto`, minWidth: 8, background: FILL[k],
                        borderRight: i < shown.length - 1 ? '2px solid white' : 'none',
                        animationDelay: `${0.05 * i}s`,
                    }} />
                ))}
            </div>
            <ul style={{
                listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: '6px 10px', margin: '10px 0 0', padding: 0,
            }}>
                {ORDER.filter(k => counts[k] > 0).map(k => (
                    <li key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, minWidth: 0 }}>
                        <span aria-hidden="true" style={{
                            width: 11, height: 11, borderRadius: 3, flexShrink: 0, background: FILL[k],
                            boxShadow: k === 'unknown' ? 'inset 0 0 0 1px rgba(0,0,0,0.08)' : 'none',
                        }} />
                        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{counts[k]}</strong>
                        <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {P.groups[k].title}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** One kind of miss: its share as a bar, its count written on the end. */
function SlipRow({ row, lead, max, i }) {
    const pct = Math.max(4, Math.round((row.count / max) * 100));
    return (
        <li style={{ marginTop: i ? 12 : 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: lead ? 700 : 600 }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                               color: lead ? '#b45309' : 'var(--text-secondary)' }}>{row.count}</span>
            </div>
            <div aria-hidden="true" style={{ height: 8, borderRadius: 99, background: 'rgba(245,158,11,0.13)', marginTop: 5 }}>
                <div className="ss-grow" style={{
                    width: `${pct}%`, height: '100%', borderRadius: 99,
                    background: lead ? '#f59e0b' : 'rgba(245,158,11,0.5)',
                    animationDelay: `${0.05 * i}s`,
                }} />
            </div>
            {lead && (
                <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
                    {missSlipGloss(row.kind)}
                    {row.recentWords.length > 0 && <>{' '}
                        <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-main)' }}>
                            {P.overview.lately(row.recentWords)}
                        </span>
                    </>}
                </p>
            )}
        </li>
    );
}

const MAX_BARS = 5;

/**
 * `counts` — the four group sizes from skillProgress.skillBoard.
 * `miss`   — skillProgress.missBoard(profile), or null while it loads.
 */
export default function SkillSummary({ counts, miss }) {
    const met = ORDER.reduce((s, k) => s + (counts[k] || 0), 0);
    if (!met) return null;
    const m = miss || { total: 0, rows: [], standing: null, enough: false };
    const sentence = skillsOverviewFor({
        strong: counts.strong, learning: counts.learning, tricky: counts.tricky,
        slip: m.standing, misses: m.total, enough: m.enough,
    });
    const bars = m.rows.slice(0, MAX_BARS);
    const max = bars.length ? bars[0].count : 1;

    return (
        <section className="card" style={{ padding: '14px 16px', marginTop: 14 }}>
            <style>{styles}</style>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17 }}>{P.overview.title}</h2>
            {sentence && (
                <p style={{ margin: '6px 0 0', fontSize: 14.5, lineHeight: 1.45, color: 'var(--text-main)' }}>{sentence}</p>
            )}

            <MasteryStrip counts={counts} />
            <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--text-secondary)' }}>{P.overview.met(met)}</p>

            {m.total > 0 && (
                <div style={{ marginTop: 14, borderTop: '1px solid rgba(168,85,247,0.14)', paddingTop: 12 }}>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 15 }}>{P.overview.slipTitle}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-secondary)' }}>{P.overview.slipOf(m.total)}</p>
                    {/* Under PATTERN_MIN the shares are noise, so the counts are
                        written out and no bar is drawn around them. */}
                    {m.enough ? (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                            {bars.map((r, i) => <SlipRow key={r.kind} row={r} lead={r === m.standing} max={max} i={i} />)}
                        </ul>
                    ) : (
                        <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                            {m.rows.map((r, i) => (
                                <React.Fragment key={r.kind}>
                                    {i > 0 && ' · '}
                                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{r.label}</span>{' '}
                                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.count}</span>
                                </React.Fragment>
                            ))}
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}
