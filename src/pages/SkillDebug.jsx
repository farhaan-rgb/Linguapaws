import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchSkills } from '../services/srs';
import { skillsFor } from '../services/skills';
import { getStoredJSON } from '../utils/storage';

/* Hidden debug view for adaptive phase 1: the signed-in learner's skill model,
   weakest first. No link points here — open /debug/skills (?lang=Telugu,
   ?weak=1). Not learner-facing; plain on purpose. */
const LEVEL_COLOUR = { weak: '#b45309', learning: '#475569', strong: '#15803d', new: '#94a3b8' };

export default function SkillDebug() {
    const [params] = useSearchParams();
    const lang = params.get('lang') || getStoredJSON('linguapaws_target_lang', {})?.name || 'Kannada';
    const weakOnly = params.get('weak') === '1';
    const [rows, setRows] = useState(null);
    useEffect(() => {
        let live = true;
        fetchSkills(lang, { weak: weakOnly }).then(r => { if (live) setRows(r); });
        return () => { live = false; };
    }, [lang, weakOnly]);
    const taxonomy = useMemo(() => skillsFor(lang), [lang]);
    const cell = { padding: '4px 8px', borderBottom: '1px solid #e2e8f0', fontSize: 13, textAlign: 'left' };

    return (
        <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto' }}>
            <h2 style={{ margin: '0 0 4px' }}>Skill model — {lang}</h2>
            <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: 13 }}>
                {taxonomy.size} skills in the course · {rows ? rows.length : '…'} with evidence
                {weakOnly ? ' (weak only)' : ''}. Weak = evidence ≥ 1 and mastery &lt; 0.5. See ADAPTIVE.md.
            </p>
            {rows && !rows.length && <p>No evidence yet for {lang}.</p>}
            {rows && rows.length > 0 && (
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                        <tr>{['Skill', 'Type', 'Lesson', 'Level', 'Mastery', 'Evidence', 'Screens', 'Recent', 'Last seen']
                            .map(h => <th key={h} style={{ ...cell, fontWeight: 600 }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                        {rows.map(r => {
                            const s = taxonomy.get(r.skillId);
                            return (
                                <tr key={r.skillId}>
                                    <td style={cell} title={r.skillId}>{s?.label || r.skillId}</td>
                                    <td style={cell}>{s?.type || '?'}</td>
                                    <td style={cell}>{s?.lesson ?? ''}</td>
                                    <td style={{ ...cell, color: LEVEL_COLOUR[r.level], fontWeight: 600 }}>{r.level}</td>
                                    <td style={cell}>{Number(r.mastery).toFixed(2)}</td>
                                    <td style={cell}>{Number(r.evidence).toFixed(2)}</td>
                                    <td style={cell}>{r.attempts}</td>
                                    <td style={cell}>{(r.recent || []).map(x => x.toFixed(1)).join(' ')}</td>
                                    <td style={cell}>{r.lastSeen ? new Date(r.lastSeen).toLocaleString() : ''}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
