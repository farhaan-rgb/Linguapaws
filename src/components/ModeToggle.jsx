import React from 'react';
import { GraduationCap, MessageCircle } from 'lucide-react';

const OPTIONS = [
    { id: 'steps', label: 'Step by step', Icon: GraduationCap,
      blurb: 'One word or task per screen, typed back.' },
    { id: 'chat',  label: 'Chat',         Icon: MessageCircle,
      blurb: 'One conversation with your tutor, the original way.' },
];

export default function ModeToggle({ mode, onChange }) {
    const active = OPTIONS.find(o => o.id === mode) || OPTIONS[1];
    return (
        <section className="card" style={{ padding: 14 }}>
            <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                margin: '0 4px 9px',
            }}>
                <p style={{
                    margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
                    textTransform: 'uppercase', color: 'var(--text-secondary)',
                }}>
                    How you learn
                </p>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--accent-purple)' }}>
                    Switch anytime
                </p>
            </div>

            <div style={{
                position: 'relative', display: 'flex', padding: 4,
                borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.045)',
            }}>
                <div style={{
                    position: 'absolute', top: 4, bottom: 4, left: 4,
                    width: 'calc(50% - 4px)', borderRadius: 12, background: '#fff',
                    boxShadow: 'var(--shadow-sm)',
                    transform: mode === 'steps' ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.28s cubic-bezier(0.22,1,0.36,1)',
                }} />
                {OPTIONS.map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => onChange(id)}
                        style={{
                            position: 'relative', flex: 1, padding: '10px 4px', border: 'none',
                            background: 'transparent', cursor: 'pointer',
                            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                            color: mode === id ? 'var(--accent-purple)' : 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            transition: 'color 0.2s',
                        }}>
                        <Icon size={15} /> {label}
                    </button>
                ))}
            </div>

            <p style={{
                margin: '10px 4px 0', fontSize: 12, textAlign: 'center',
                color: 'var(--text-secondary)',
            }}>
                {active.blurb}
            </p>
        </section>
    );
}
