import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    X, Volume2, VolumeX, Lightbulb, MessageCircle, ArrowRight, Check, Flame,
} from 'lucide-react';

import { CURRICULUM, isLanguageAvailable } from '../services/curriculum';
import * as engine from '../services/lessonEngine';
import * as praise from '../services/praise';
import { buildLessonSteps, wordsTaughtBy, stepCaption } from '../services/stepPlan';
import { ensureReviewSet, recordTaughtWord, recordReview } from '../services/srs';
import { getStoredJSON } from '../utils/storage';
import { api } from '../services/api';
import * as fx from '../utils/feedbackFx';
import RichText from '../components/RichText';
import Burst from '../components/Burst';

const MAX_SCENARIO_IDX = 29;
/** 15 successful turns per lesson — the same cycle Chat.jsx walks. */
const CYCLE_SIZE = 15;

/* ── Pieces ─────────────────────────────────────────────────────────────── */

/** Counts a number up to its new value. Used on the paw total and the summary
 *  tiles — a number that lands is a number that gets read. */
function useCountUp(value, ms = 520) {
    const [shown, setShown] = useState(value);
    /* What is on screen right now, not what the last run was aiming at — a
       second award landing mid-count has to carry on from the number the
       learner can see, or it jumps backwards. */
    const from = useRef(value);
    useEffect(() => {
        const start = performance.now();
        const a = from.current, b = value;
        if (a === b) return undefined;
        let raf = 0;
        const tick = (now) => {
            const t = Math.min(Math.max((now - start) / ms, 0), 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const at = Math.round(a + (b - a) * eased);
            from.current = at;
            setShown(at);
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value, ms]);
    return shown;
}

function ProgressRail({ steps, index }) {
    return (
        <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            {steps.map((s, i) => (
                /* Keyed on whether it is filled, so the segment just cleared
                   remounts and plays the fill animation — the small "that one is
                   done" tick that makes the rail feel earned rather than drawn. */
                <div key={`${i}-${i < index}`} style={{
                    flex: 1, height: 6, borderRadius: 99,
                    background: i < index ? 'var(--primary-gradient)'
                        : i === index ? 'var(--accent-purple)' : '#e9e5ef',
                    opacity: i === index ? 0.55 : 1,
                    animation: i === index - 1 ? 'rail-fill 0.45s cubic-bezier(0.22,1,0.36,1)' : 'none',
                }} />
            ))}
        </div>
    );
}

function SpeakButton({ text, onSpeak, size = 38 }) {
    return (
        <button onClick={() => onSpeak(text)} aria-label={`Hear ${text}`}
            style={{
                width: size, height: size, borderRadius: 99, border: 'none', cursor: 'pointer',
                background: 'var(--primary-gradient)', color: '#fff', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <Volume2 size={Math.round(size * 0.45)} />
        </button>
    );
}

/** Paws banked and the current streak. Both are lesson-local and labelled as
 *  such on the summary — there is no server counter behind them, and inventing
 *  a lifetime score the backend cannot keep would be a lie the next session
 *  exposes. */
function ScorePill({ points, combo, gain }) {
    const shown = useCountUp(points);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
            {combo >= 2 && (
                <span key={`c${combo}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    padding: '3px 9px 3px 7px', borderRadius: 99, fontSize: 12, fontWeight: 800,
                    color: '#c2410c', background: 'rgba(249,115,22,0.14)',
                    animation: 'pop-in 0.34s cubic-bezier(0.22,1.4,0.36,1)',
                }}>
                    <Flame size={12} /> {combo}
                </span>
            )}
            <span key={`p${points}`} style={{
                padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 800,
                color: 'var(--accent-purple)', background: 'rgba(168,85,247,0.12)',
                animation: gain ? 'pop-in 0.34s cubic-bezier(0.22,1.4,0.36,1)' : 'none',
            }}>
                🐾 {shown}
            </span>
            {gain && (
                <span key={gain.id} aria-hidden="true" style={{
                    position: 'absolute', right: 4, top: 0, fontSize: 13, fontWeight: 800,
                    color: '#059669', pointerEvents: 'none',
                    animation: 'float-up 0.95s ease-out forwards',
                }}>
                    +{gain.n}
                </span>
            )}
        </div>
    );
}

function MilestoneBanner({ milestone }) {
    if (!milestone) return null;
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex',
            justifyContent: 'center', pointerEvents: 'none',
        }}>
            <div style={{
                margin: '10px 12px', padding: '11px 20px', borderRadius: 99,
                background: 'linear-gradient(90deg,#f97316,#ec4899 55%,#a855f7)',
                color: '#fff', boxShadow: '0 12px 28px -8px rgba(236,72,153,0.65)',
                animation: 'banner-in 0.4s cubic-bezier(0.22,1.3,0.36,1)',
                textAlign: 'center',
            }}>
                <p style={{
                    margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15,
                }}>
                    {milestone.icon} {milestone.title}
                </p>
                <p style={{ margin: '1px 0 0', fontSize: 12, opacity: 0.92 }}>{milestone.blurb}</p>
            </div>
        </div>
    );
}

/** `won` turns the card the learner is looking at into the celebration, rather
 *  than printing the same word a second time underneath it. */
function WordCard({ wordObj, onSpeak, compact = false, won = false }) {
    return (
        <div style={{
            position: 'relative',
            background: won
                ? 'linear-gradient(150deg,#ecfdf5,#f0fdfa 55%,#f5f3ff)'
                : 'linear-gradient(150deg,#faf5ff,#f3f0ff 55%,#eef2ff)',
            border: `1px solid ${won ? 'rgba(16,185,129,0.4)' : 'transparent'}`,
            boxShadow: won ? '0 16px 34px -20px rgba(5,150,105,0.75)' : 'none',
            borderRadius: 'var(--radius-lg)',
            padding: compact ? '12px 16px' : '22px 18px',
            textAlign: 'center',
            transition: 'padding 0.25s, background 0.35s, border-color 0.35s, box-shadow 0.35s',
        }}>
            {won && (
                <span style={{
                    position: 'absolute', top: 12, right: 12, width: 26, height: 26,
                    borderRadius: 99, background: 'linear-gradient(135deg,#10b981,#059669)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'tick-pop 0.45s cubic-bezier(0.22,1.5,0.36,1)',
                }}>
                    <Check size={15} strokeWidth={3.4} />
                </span>
            )}
            <p style={{
                fontFamily: 'var(--font-display)', fontSize: compact ? 20 : 30, fontWeight: 800,
                margin: 0, lineHeight: 1.15, wordBreak: 'break-word', transition: 'font-size 0.25s',
            }}>
                {wordObj.word}
            </p>
            {wordObj.phonetic && !compact && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '6px 0 0', letterSpacing: 0.4 }}>
                    {wordObj.phonetic}
                </p>
            )}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, marginTop: compact ? 8 : 14,
            }}>
                <span style={{
                    background: 'rgba(255,255,255,0.85)', padding: '6px 14px',
                    borderRadius: 99, fontSize: 14, fontWeight: 600,
                }}>
                    {wordObj.meaning}
                </span>
                <SpeakButton text={wordObj.word} onSpeak={onSpeak} size={compact ? 30 : 38} />
            </div>
        </div>
    );
}

function PromptPanel({ children, sub, muted = false }) {
    return (
        <div style={{
            background: muted ? 'rgba(0,0,0,0.025)' : 'linear-gradient(150deg,#faf5ff,#f3f0ff)',
            borderRadius: 'var(--radius-lg)', padding: muted ? '12px 16px' : '22px 18px',
            transition: 'background 0.3s, padding 0.3s',
        }}>
            <p style={{
                fontFamily: 'var(--font-display)', fontSize: muted ? 14 : 19,
                fontWeight: muted ? 600 : 700, margin: 0, lineHeight: 1.45,
                color: muted ? 'var(--text-secondary)' : 'inherit',
            }}>
                {children}
            </p>
            {sub && !muted && (
                <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{sub}</p>
            )}
        </div>
    );
}

/* ── The moment ─────────────────────────────────────────────────────────────
   What a right answer looks like. Three things happen at once, and each one is
   doing a different job:

     the target, set large and spoken   — you produced this, hear it
     a verdict                          — you were right
     a clause naming what you just did  — and here is why that mattered

   The third is the one worth defending. "Perfect!" is a sticker; "A full
   sentence — four words of Telugu" is a fact about the learner that was not
   true five minutes ago, and it is the reason the screen is worth reading
   rather than clicking past.                                                */

function SuccessPanel({ step, reward, onSpeak, phonetic, hero = true }) {
    const meaning = step.kind === 'drill' ? step.drill?.meaning : null;
    return (
        <div style={{
            borderRadius: 'var(--radius-lg)', textAlign: 'center',
            padding: hero ? '20px 18px 18px' : '14px 16px',
            background: hero
                ? 'linear-gradient(155deg,#ecfdf5 0%,#f5f3ff 55%,#eef2ff 100%)'
                : 'rgba(16,185,129,0.07)',
            border: `1px solid ${hero ? 'rgba(16,185,129,0.28)' : 'transparent'}`,
            animation: 'panel-in 0.4s cubic-bezier(0.22,1.2,0.36,1)',
        }}>
            {/* One tick per screen. On a teach step the word card is already
                wearing it. */}
            {hero && (
                <div style={{
                    width: 44, height: 44, borderRadius: 99, margin: '0 auto 12px',
                    background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 10px 22px -8px rgba(5,150,105,0.7)',
                    animation: 'tick-pop 0.45s cubic-bezier(0.22,1.5,0.36,1)',
                }}>
                    <Check size={24} strokeWidth={3.2} />
                </div>
            )}

            {/* On a teach screen the word is already set large in its own card
                a few pixels above; printing it twice is not emphasis, it is
                clutter. There the panel is the verdict alone. */}
            {hero && (
                <>
                    <p style={{
                        margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800,
                        fontSize: step.expected.length > 26 ? 22 : 27, lineHeight: 1.2,
                        background: 'linear-gradient(90deg,#047857,#7c3aed)',
                        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                        wordBreak: 'break-word',
                    }}>
                        {step.expected}
                    </p>
                    {phonetic && (
                        <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--text-secondary)', letterSpacing: 0.4 }}>
                            {phonetic}
                        </p>
                    )}
                    {meaning && (
                        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
                            “{meaning}”
                        </p>
                    )}
                    <button onClick={() => onSpeak(step.expected)}
                        style={{
                            margin: '14px auto 0', display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '8px 16px', borderRadius: 99, border: '1px solid rgba(5,150,105,0.3)',
                            background: 'rgba(255,255,255,0.75)', cursor: 'pointer',
                            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#047857',
                        }}>
                        <Volume2 size={15} /> Hear it again
                    </button>
                </>
            )}

            <div style={hero
                ? { marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(5,150,105,0.16)' }
                : { marginTop: 0 }}>
                {reward?.recovery && (
                    <p style={{
                        margin: '0 0 6px', fontSize: 12, fontWeight: 800, color: '#c2410c',
                        letterSpacing: 0.3,
                    }}>
                        {praise.RECOVERY_LINE}
                    </p>
                )}
                <p style={{
                    margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800,
                    fontSize: 17, color: '#047857',
                }}>
                    {reward?.verdict}
                </p>
                {reward?.achievement && (
                    <p style={{ margin: '4px 0 0', fontSize: 13.5, lineHeight: 1.5 }}>
                        {reward.achievement}
                    </p>
                )}
            </div>
        </div>
    );
}

/** The second miss. Deliberately not red and deliberately not the end of the
 *  screen: the answer is handed over, and the learner is invited to type it
 *  once. A lesson that ends a screen on failure teaches the failure. */
function RevealPanel({ step, line, onSpeak, locked, lockText, setLockText, onLockIn, lockMiss }) {
    const meaning = step.kind === 'drill' ? step.drill?.meaning : null;
    return (
        <div style={{
            borderRadius: 'var(--radius-lg)', padding: '18px', textAlign: 'center',
            background: 'linear-gradient(155deg,#fffbeb 0%,#f5f3ff 100%)',
            border: '1px solid rgba(245,158,11,0.3)',
            animation: 'panel-in 0.4s cubic-bezier(0.22,1.2,0.36,1)',
        }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#b45309' }}>{line}</p>
            <p style={{
                margin: '10px 0 0', fontFamily: 'var(--font-display)', fontWeight: 800,
                fontSize: step.expected.length > 26 ? 21 : 26, lineHeight: 1.2, wordBreak: 'break-word',
            }}>
                {step.expected}
            </p>
            {meaning && (
                <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
                    “{meaning}”
                </p>
            )}
            <button onClick={() => onSpeak(step.expected)}
                style={{
                    margin: '12px auto 0', display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '8px 16px', borderRadius: 99, border: '1px solid rgba(180,83,9,0.25)',
                    background: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#b45309',
                }}>
                <Volume2 size={15} /> Hear it
            </button>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(180,83,9,0.16)' }}>
                {locked ? (
                    <p style={{
                        margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800,
                        fontSize: 15, color: '#047857',
                        animation: 'pop-in 0.34s cubic-bezier(0.22,1.4,0.36,1)',
                    }}>
                        🔒 Locked in. +{praise.LOCK_IN_POINTS} 🐾
                    </p>
                ) : (
                    <>
                        <p style={{ margin: '0 0 9px', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                            Write it out once — that is how it stops being someone else's word.
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                value={lockText}
                                onChange={e => setLockText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') onLockIn(); }}
                                placeholder="Type it here…"
                                style={{
                                    flex: 1, minWidth: 0, padding: '11px 13px', borderRadius: 12,
                                    fontSize: 15, fontFamily: 'var(--font-main)',
                                    border: '1.5px solid rgba(180,83,9,0.25)', background: '#fff',
                                    outline: 'none',
                                }}
                            />
                            <button onClick={onLockIn} disabled={!lockText.trim()}
                                style={{
                                    padding: '0 15px', borderRadius: 12, border: 'none',
                                    background: 'linear-gradient(90deg,#f59e0b,#f97316)', color: '#fff',
                                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13,
                                    cursor: lockText.trim() ? 'pointer' : 'default',
                                    opacity: lockText.trim() ? 1 : 0.45,
                                }}>
                                Lock it in
                            </button>
                        </div>
                        {lockMiss && (
                            <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#b45309' }}>
                                Almost — copy it exactly as it is written above.
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

/* ── One screen ─────────────────────────────────────────────────────────────
   Mounted fresh per step (keyed on the step index), so the answer box, the
   retry count and the revealed answer all reset by remount. No effect needed,
   and no way for one screen's state to bleed into the next.                  */

function StepScreen({ step, lexicon, onSpeak, onSettled, onMiss, onLockIn, onAdvance, isLast }) {
    const inputRef = useRef(null);
    const [answer, setAnswer] = useState('');
    /** answering | retry | correct | revealed */
    const [phase, setPhase] = useState('answering');
    const [misses, setMisses] = useState(0);
    const [note, setNote] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [reward, setReward] = useState(null);
    /** What was actually wrong, from the engine's own diagnosis. */
    const [diagnosis, setDiagnosis] = useState('');
    const [missLine, setMissLine] = useState('');
    const [revealLine, setRevealLine] = useState('');
    const [shake, setShake] = useState(0);
    const [lockText, setLockText] = useState('');
    const [locked, setLocked] = useState(false);
    const [lockMiss, setLockMiss] = useState(false);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const drill = step.kind === 'drill' ? step.drill : null;
    const settled = phase === 'correct' || phase === 'revealed';

    /* Say the answer back the moment it is right. The learner produced it in
       text; hearing it is the half of the reward that text cannot give. Tied to
       the sound switch, so muting the app really does mute it. */
    useEffect(() => {
        if (phase !== 'correct' || !fx.isFxOn()) return undefined;
        const t = setTimeout(() => onSpeak(step.expected), 420);
        return () => clearTimeout(t);
    }, [phase, step.expected, onSpeak]);

    /* "Say 'Hello, I am fine'." already carries its meaning; printing the
       `meaning` field under it repeats the sentence back at the learner. */
    const bare = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const meaningAdds = drill?.meaning && !bare(step.prompt).includes(bare(drill.meaning));

    /* The phonetic reading of what they just produced, where the course has
       one — teach steps do, drills do not. */
    const phonetic = step.kind === 'teach' && step.slice?.length === 1
        ? step.slice[0].phonetic : null;

    const check = useCallback(() => {
        if (settled) return;
        const said = answer.trim();
        if (!said) return;

        const { accepted } = engine.scoreAnswer(said, step.expected, step.variants, lexicon);

        if (accepted) {
            // Forgive the typo, but say what the spelling was — a learner accepted
            // in silence never finds out they had it wrong.
            setNote(engine.spellingNote(said, step.expected, step.variants, lexicon) || '');
            setPhase('correct');
            setReward(onSettled({ correct: true, revealed: false, misses }));
            return;
        }

        const next = misses + 1;
        setMisses(next);
        /* The flame goes out here, not at the end of the screen. A streak that
           survives a miss and only dies on a full reveal is a streak nobody can
           lose, and a counter nobody can lose is not worth having. */
        onMiss();
        /* The engine already knows what went wrong — chat has been saying so
           since round 3, and step mode was throwing it away and printing "Not
           quite" at people who had the right words in the wrong order. */
        /* The engine's diagnosis first; the shape of the answer when it has
           none, so no screen ever says "not quite" and leaves it there. */
        setDiagnosis(engine.explainMiss(said, step.expected, step.variants, lexicon)
            || (drill?.hint ? '' : praise.scaffoldFor(step.expected)));
        // Two misses and the answer is shown. Nothing here traps a learner on a
        // screen they cannot pass.
        if (next >= engine.REVIEW_RETRY_LIMIT) {
            setRevealLine(praise.revealLineFor(step.index));
            setPhase('revealed');
            fx.playMiss();
            onSettled({ correct: false, revealed: true, misses: next });
        } else {
            setMissLine(praise.missLineFor(step.index + next));
            setPhase('retry');
            // A learner who has just missed has earned the hint without asking.
            setShowHint(true);
            setShake(s => s + 1);
            fx.playMiss();
        }
    }, [settled, answer, step, lexicon, misses, onSettled, onMiss, drill]);

    const lockIn = useCallback(() => {
        const said = lockText.trim();
        if (!said || locked) return;
        const { accepted } = engine.scoreAnswer(said, step.expected, step.variants, lexicon);
        if (!accepted) { setLockMiss(true); setShake(s => s + 1); return; }
        setLocked(true);
        setLockMiss(false);
        fx.playLockIn();
        onLockIn();
    }, [lockText, locked, step, lexicon, onLockIn]);

    const tone = phase === 'correct'
        ? { bg: '#ecfdf5', btn: 'linear-gradient(90deg,#059669,#10b981)' }
        : phase === 'revealed'
            /* The footer is tinted to say where the learner is, but the button
               stays the ordinary one. A full-width orange bar for "you did not
               get it" is an alarm, and nothing here is an emergency. */
            ? { bg: '#fffbeb', btn: 'var(--primary-gradient)' }
            : null;

    return (
        <>
            {phase === 'correct' && (
                <Burst seed={step.index} power={reward?.milestone ? 2 : 1} originY="36%" />
            )}

            <div style={{ flex: 1, padding: '0 16px', maxWidth: 500, width: '100%', margin: '0 auto' }}>
                {step.kind === 'teach' && (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {step.slice.map(w => (
                                <WordCard key={w.word} wordObj={w} onSpeak={onSpeak}
                                    won={phase === 'correct'} />
                            ))}
                        </div>
                        {step.slice.some(w => w.teach) && !settled && (
                            <div className="card" style={{ padding: 14, marginTop: 12 }}>
                                {step.slice.filter(w => w.teach).map(w => (
                                    <p key={w.word} style={{ margin: '0 0 6px', fontSize: 14, lineHeight: 1.6 }}>
                                        <RichText text={w.teach.replaceAll('{w}', `**${w.word}**`)} />
                                    </p>
                                ))}
                            </div>
                        )}
                        {!settled && (
                            <p style={{ margin: '16px 0 0', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                                Your turn — say {step.slice.map(w => w.word).join(', then ')}
                            </p>
                        )}
                    </>
                )}

                {step.kind === 'review' && (
                    <PromptPanel muted={settled} sub={step.item.source === 'due' ? 'from an earlier lesson' : null}>
                        {step.prompt}
                    </PromptPanel>
                )}

                {step.kind === 'drill' && (
                    <>
                        <PromptPanel muted={settled} sub={meaningAdds ? drill.meaning : null}>
                            {step.prompt}
                        </PromptPanel>
                        {drill.hint && !settled && (
                            showHint ? (
                                <p style={{
                                    margin: '12px 0 0', fontSize: 13, color: 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    animation: 'pop-in 0.3s ease-out',
                                }}>
                                    <Lightbulb size={14} /> {drill.hint}
                                </p>
                            ) : (
                                <button onClick={() => setShowHint(true)}
                                    style={{
                                        margin: '12px 0 0', background: 'none', border: 'none', padding: 0,
                                        cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                        color: 'var(--accent-purple)',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                    }}>
                                    <Lightbulb size={14} /> Show a hint
                                </button>
                            )
                        )}
                    </>
                )}

                {/* The answer box is replaced by the moment, not crowded under it. */}
                <div style={{ marginTop: 14 }}>
                    {phase === 'correct' && (
                        <SuccessPanel step={step} reward={reward} onSpeak={onSpeak}
                            phonetic={phonetic} hero={step.kind !== 'teach'} />
                    )}

                    {phase === 'revealed' && (
                        <div key={shake} className={shake ? 'nudge' : undefined}>
                            <RevealPanel
                                step={step} line={revealLine} onSpeak={onSpeak}
                                locked={locked} lockText={lockText} setLockText={setLockText}
                                onLockIn={lockIn} lockMiss={lockMiss}
                            />
                        </div>
                    )}

                    {!settled && (
                        <div key={shake} className={shake ? 'nudge' : undefined}>
                            <input
                                ref={inputRef}
                                value={answer}
                                onChange={e => { setAnswer(e.target.value); if (phase === 'retry') setPhase('answering'); }}
                                onKeyDown={e => { if (e.key === 'Enter') check(); }}
                                placeholder={step.kind === 'teach' ? 'Type it back…' : 'Type your answer…'}
                                style={{
                                    width: '100%', padding: '15px 16px',
                                    borderRadius: 'var(--radius-md)', fontSize: 16, fontFamily: 'var(--font-main)',
                                    border: `2px solid ${phase === 'retry' ? '#f59e0b' : 'rgba(168,85,247,0.18)'}`,
                                    background: '#fff', outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s',
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* A miss says what was actually wrong. No red — amber, because
                    the learner has another try and the screen should look like
                    they do. */}
                {phase === 'retry' && (
                    <div style={{
                        margin: '10px 0 0', padding: '11px 13px', borderRadius: 14,
                        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.24)',
                        animation: 'pop-in 0.3s ease-out',
                    }}>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#b45309' }}>
                            {missLine}
                        </p>
                        {diagnosis && (
                            <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.5, color: '#78350f' }}>
                                <RichText text={diagnosis} />
                            </p>
                        )}
                    </div>
                )}

                {/* Spelling and grammar sit below the moment, where they can be
                    read at leisure — not inside the verdict, competing with it. */}
                {phase === 'correct' && (note || drill?.grammarNote) && (
                    <div className="card" style={{ padding: 13, marginTop: 12 }}>
                        {note && (
                            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#b45309' }}>
                                <RichText text={note.trim()} />
                            </p>
                        )}
                        {drill?.grammarNote && (
                            <p style={{ margin: note ? '8px 0 0' : 0, fontSize: 13, lineHeight: 1.6 }}>
                                💡 <RichText text={drill.grammarNote} />
                            </p>
                        )}
                    </div>
                )}

                <div style={{ height: 130 }} />
            </div>

            <div style={{
                position: 'sticky', bottom: 0,
                padding: '14px 16px calc(18px + env(safe-area-inset-bottom))',
                background: tone ? tone.bg : 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(8px)',
                borderTop: tone ? 'none' : '1px solid rgba(0,0,0,0.05)',
                transition: 'background 0.3s',
            }}>
                <div style={{ maxWidth: 500, margin: '0 auto' }}>
                    {phase === 'correct' && reward?.points?.total > 0 && (
                        <p style={{
                            margin: '0 0 9px', fontSize: 12.5, fontWeight: 700, color: '#047857',
                            textAlign: 'center',
                        }}>
                            +{reward.points.base} 🐾
                            {reward.points.bonus > 0 && ` · +${reward.points.bonus} streak bonus`}
                        </p>
                    )}
                    <button
                        onClick={settled ? onAdvance : check}
                        disabled={!settled && !answer.trim()}
                        style={{
                            width: '100%', padding: '15px', borderRadius: 'var(--radius-md)', border: 'none',
                            cursor: (!settled && !answer.trim()) ? 'default' : 'pointer',
                            background: tone ? tone.btn : 'var(--primary-gradient)',
                            color: '#fff', fontWeight: 800, fontSize: 15, fontFamily: 'var(--font-display)',
                            opacity: (!settled && !answer.trim()) ? 0.4 : 1,
                            transition: 'background 0.3s, opacity 0.2s',
                        }}>
                        {settled ? (isLast ? 'See how you did' : 'Continue') : 'Check'}
                    </button>
                </div>
            </div>
        </>
    );
}

/* ── The lesson ─────────────────────────────────────────────────────────── */

export default function Steps() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const targetLang = getStoredJSON('linguapaws_target_lang', {});
    const langName = targetLang?.name;
    const lessons = useMemo(
        () => (isLanguageAvailable(langName) ? CURRICULUM[langName] : []),
        [langName],
    );

    const urlScenario = searchParams.get('scenario');
    const [resolvedIdx, setResolvedIdx] = useState(() => {
        const raw = parseInt(urlScenario ?? '', 10);
        return Number.isNaN(raw) ? null : Math.min(Math.max(raw, 0), MAX_SCENARIO_IDX);
    });

    /* No scenario in the URL: pick up where the learner left off, from the same
       server counter the chat increments. Lesson 1 when offline. */
    useEffect(() => {
        if (resolvedIdx !== null) return;
        let cancelled = false;
        (async () => {
            let idx = 0;
            try {
                const p = await api.get('/api/progress');
                idx = Math.min(Math.floor((p?.successfulRepeats || 0) / CYCLE_SIZE), MAX_SCENARIO_IDX);
            } catch { idx = 0; }
            if (!cancelled) setResolvedIdx(idx);
        })();
        return () => { cancelled = true; };
    }, [resolvedIdx]);

    const scenarioIdx = resolvedIdx ?? 0;
    const lesson = lessons[scenarioIdx];
    const lexicon = useMemo(() => engine.buildLexicon(lessons), [lessons]);

    const [steps, setSteps] = useState([]);
    const [index, setIndex] = useState(0);
    const [banked, setBanked] = useState([]);
    const [unaided, setUnaided] = useState(0);
    const [finished, setFinished] = useState(false);
    /* Every sentence the learner actually produced, for the summary. Not the
       lesson's phrase list — the ones they got out themselves. */
    const [said, setSaid] = useState([]);

    /* ── The reward layer ──
       Streak and paws live here rather than in the screen, because they are the
       one thing that has to survive a screen change — the whole point of a
       streak is that it is longer than the thing in front of you. Held in a ref
       as well as state so `handleSettled` can compute the reward it returns
       synchronously, and the screen never renders a stale streak for a frame. */
    const tally = useRef({ combo: 0, best: 0, points: 0, cleared: 0, stumbled: false });
    const [score, setScore] = useState({ combo: 0, best: 0, points: 0 });
    const [gain, setGain] = useState(null);
    const [milestone, setMilestone] = useState(null);
    const [soundOn, setSoundOn] = useState(fx.isFxOn);

    const step = steps[index] || null;

    /* Build the run: review slots from the SRS queue, everything else straight
       from the curriculum. */
    useEffect(() => {
        let cancelled = false;
        if (!lesson) return undefined;
        (async () => {
            let reviewSet = null;
            try {
                reviewSet = await ensureReviewSet(
                    langName, scenarioIdx, lesson.vocabulary || [],
                    (lesson.phrases || []).flatMap(p => String(p.correct || '').split(/\s+/)),
                );
            } catch { /* offline — the lesson still runs, without review slots */ }
            if (!cancelled) setSteps(buildLessonSteps(lesson, reviewSet, lessons));
        })();
        return () => { cancelled = true; };
    }, [lesson, langName, scenarioIdx, lessons]);

    const speak = useCallback((text) => {
        try {
            const u = new SpeechSynthesisUtterance(text);
            const code = targetLang?.speechCode || targetLang?.code;
            if (code) u.lang = code;
            u.rate = 0.85;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(u);
        } catch { /* no speech synthesis — the phonetic line still carries it */ }
    }, [targetLang]);

    const award = useCallback((n) => {
        tally.current.points += n;
        setScore(s => ({ ...s, points: tally.current.points }));
        setGain({ n, id: Date.now() });
    }, []);

    /** A screen was answered. Tell the SRS, move the shared progress counter,
     *  and hand the screen back everything it needs to celebrate. */
    const handleSettled = useCallback(({ correct, revealed, misses }) => {
        const t = tally.current;
        const wasStumbled = t.stumbled;

        if (correct && step?.kind === 'drill') {
            setSaid(prev => prev.some(x => x.text === step.expected)
                ? prev
                : [...prev, { text: step.expected, meaning: step.drill?.meaning || '' }]);
        }

        if (correct) {
            t.cleared += 1;
            if (misses === 0) {
                t.combo += 1;
                t.best = Math.max(t.best, t.combo);
                setUnaided(n => n + 1);
            }
        }
        t.combo = correct && misses === 0 ? t.combo : 0;
        t.stumbled = !correct || misses > 0;

        if (step?.kind === 'review') {
            recordReview({
                lang: langName, word: step.item.word,
                outcome: engine.gradeOutcome({ correct, misses, revealed }),
                wasCorrect: correct, meaning: step.item.meaning, scenario: scenarioIdx,
            }).catch(() => {});
        }

        /* Both modes move the same counter, so a lesson done in steps leaves the
           learner exactly where the chat would have. */
        if (correct) api.post('/api/progress/increment').catch(() => {});

        setScore({ combo: t.combo, best: t.best, points: t.points });
        if (!correct) return null;

        const hit = praise.milestoneFor(t.combo);
        const points = praise.pointsFor({ correct: true, misses, combo: t.combo });
        award(points.total);

        if (hit) {
            setMilestone(hit);
            setTimeout(() => setMilestone(null), 2300);
            fx.playMilestone();
        } else {
            fx.playCorrect(t.combo);
        }

        return {
            verdict: praise.verdictFor({ misses, cleared: t.cleared - 1 }),
            achievement: praise.achievementFor({ step, lang: langName, combo: t.combo }),
            recovery: wasStumbled && misses === 0,
            points, combo: t.combo, milestone: hit,
        };
    }, [step, langName, scenarioIdx, award]);

    const handleMiss = useCallback(() => {
        tally.current.combo = 0;
        setScore(s => ({ ...s, combo: 0 }));
    }, []);

    const handleLockIn = useCallback(() => award(praise.LOCK_IN_POINTS), [award]);

    const handleAdvance = useCallback(() => {
        wordsTaughtBy(step).forEach(w => {
            setBanked(prev => prev.some(b => b.word === w.word) ? prev : [...prev, w]);
            recordTaughtWord({
                lang: langName, word: w.word, meaning: w.meaning, scenario: scenarioIdx,
            }).catch(() => {});
        });
        if (index + 1 >= steps.length) { setFinished(true); fx.playComplete(); }
        else setIndex(i => i + 1);
    }, [step, index, steps.length, langName, scenarioIdx]);

    const toggleSound = () => {
        const next = !soundOn;
        fx.setFxOn(next);
        setSoundOn(next);
    };

    /* ── Guards ── */
    if (resolvedIdx === null || (lesson && !steps.length)) {
        return (
            <div className="app-container" style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
                <div style={{ fontSize: 38 }}>🐾</div>
                {lesson && (
                    <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>
                        Laying out {lesson.scenario}…
                    </p>
                )}
            </div>
        );
    }

    if (!lesson) {
        return (
            <div className="app-container" style={{ padding: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 36 }}>🐾</p>
                <h2 style={{ fontFamily: 'var(--font-display)' }}>No lesson here yet</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    {langName
                        ? `${langName} has no scenario ${scenarioIdx + 1}.`
                        : 'Pick a language first.'}
                </p>
                <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: 16 }}>
                    Back home
                </button>
            </div>
        );
    }

    /* ── Summary ── */
    if (finished) {
        return (
            <Summary
                lesson={lesson} steps={steps} banked={banked} unaided={unaided} said={said}
                score={score} onSpeak={speak} scenarioIdx={scenarioIdx} navigate={navigate}
            />
        );
    }

    /* ── Running ── */
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <StepStyles />
            <MilestoneBanner milestone={milestone} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 10px' }}>
                <button onClick={() => navigate('/')} aria-label="Leave lesson"
                    style={{
                        width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: 'var(--card-bg)', color: 'var(--text-secondary)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <X size={16} />
                </button>
                <ProgressRail steps={steps} index={index} />
                <button onClick={toggleSound}
                    aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
                    style={{
                        width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: 'var(--card-bg)',
                        color: soundOn ? 'var(--accent-purple)' : 'var(--text-secondary)',
                        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>
            </div>

            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, margin: '0 16px 14px',
            }}>
                <p style={{
                    margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
                    textTransform: 'uppercase', color: 'var(--accent-purple)',
                }}>
                    {stepCaption(steps, index)}
                    {index === steps.length - 1 && ' · last one'}
                </p>
                <ScorePill points={score.points} combo={score.combo} gain={gain} />
            </div>

            {/* Keyed, but deliberately NOT wrapped in AnimatePresence: `mode="wait"`
                holds the outgoing screen on stage until its exit finishes, so a
                learner tapping Continue quickly saw the previous word under the
                new progress bar. Remounting on key change plays the entrance and
                shows the current step immediately. */}
            <div key={index} className="step-in"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <StepScreen
                    step={step}
                    lexicon={lexicon}
                    onSpeak={speak}
                    onSettled={handleSettled}
                    onMiss={handleMiss}
                    onLockIn={handleLockIn}
                    onAdvance={handleAdvance}
                    isLast={index === steps.length - 1}
                />
            </div>
        </div>
    );
}

/* ── The end ────────────────────────────────────────────────────────────────
   Graded on first-try answers, not on completion. Everybody completes — a
   summary that congratulates you for finishing is congratulating you for
   pressing Continue fifteen times.                                          */

function Summary({ lesson, steps, banked, unaided, said, score, onSpeak, scenarioIdx, navigate }) {
    const verdict = praise.summaryFor({
        unaided, total: steps.length, bestCombo: score.best,
    });
    const points = useCountUp(score.points, 900);
    const first = useCountUp(unaided, 900);
    const share = steps.length ? unaided / steps.length : 0;
    const R = 34, C = 2 * Math.PI * R;

    return (
        <div className="app-container" style={{ padding: '16px 16px 40px' }}>
            <StepStyles />
            <Burst seed={scenarioIdx + 7} power={3} />

            <div style={{ textAlign: 'center', paddingTop: 24 }}>
                <div style={{ fontSize: 52, animation: 'tick-pop 0.6s cubic-bezier(0.22,1.4,0.36,1)' }}>
                    {lesson.icon || '🎉'}
                </div>
                <p style={{
                    display: 'inline-block', margin: '10px 0 0', padding: '5px 14px', borderRadius: 99,
                    background: 'var(--primary-gradient)', color: '#fff',
                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12.5,
                    letterSpacing: 0.4,
                }}>
                    {verdict.icon} {verdict.badge}
                </p>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 25, margin: '10px 0 4px' }}>
                    {lesson.scenario}
                </h1>
                <p style={{
                    color: 'var(--text-secondary)', fontSize: 14, margin: '0 auto',
                    maxWidth: 330, lineHeight: 1.5,
                }}>
                    {verdict.line}
                </p>
            </div>

            <section className="card" style={{ padding: 16, marginTop: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                    <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="40" cy="40" r={R} fill="none" stroke="#eee7f7" strokeWidth="9" />
                        <circle cx="40" cy="40" r={R} fill="none" stroke="url(#ringGrad)" strokeWidth="9"
                            strokeLinecap="round" strokeDasharray={C}
                            strokeDashoffset={C * (1 - share)}
                            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)' }} />
                        <defs>
                            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19 }}>
                            {first}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>of {steps.length}</span>
                    </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>First try</p>
                    <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
                        <div>
                            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>
                                🐾 {points}
                            </p>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
                                paws this lesson
                            </p>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>
                                🔥 {score.best}
                            </p>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
                                best streak
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* The thing a learner actually wants at the end of a lesson is not
                a score, it is the evidence: sentences that were not available to
                them twenty minutes ago and are now. */}
            {said.length > 0 && (
                <section className="card" style={{
                    padding: 16,
                    background: 'linear-gradient(150deg,#faf5ff,#eef2ff)',
                    border: '1px solid rgba(168,85,247,0.18)',
                }}>
                    <h3 style={{ fontSize: 15, marginTop: 0, marginBottom: 12 }}>
                        You can say this now
                    </h3>
                    {said.slice(-4).map((line, i) => (
                        <div key={line.text} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
                            borderTop: i ? '1px solid rgba(168,85,247,0.12)' : 'none',
                            animation: 'slide-in 0.45s cubic-bezier(0.22,1,0.36,1) backwards',
                            animationDelay: `${0.07 * i + 0.2}s`,
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                    margin: 0, fontWeight: 700, fontFamily: 'var(--font-display)',
                                    fontSize: 15, lineHeight: 1.35,
                                }}>
                                    {line.text}
                                </p>
                                {line.meaning && (
                                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                                        {line.meaning}
                                    </p>
                                )}
                            </div>
                            <SpeakButton text={line.text} onSpeak={onSpeak} size={32} />
                        </div>
                    ))}
                </section>
            )}

            <section className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: 15, marginTop: 0, marginBottom: 12 }}>
                    Words you met {banked.length ? `· ${banked.length}` : ''}
                </h3>
                {banked.map((w, i) => (
                    <div key={w.word} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                        borderRadius: 12, background: 'rgba(168,85,247,0.05)', marginBottom: 6,
                        animation: 'slide-in 0.45s cubic-bezier(0.22,1,0.36,1) backwards',
                        animationDelay: `${0.06 * i + 0.15}s`,
                    }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 700 }}>{w.word}</p>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                                {w.meaning}
                            </p>
                        </div>
                        <SpeakButton text={w.word} onSpeak={onSpeak} size={34} />
                    </div>
                ))}
            </section>

            <button className="btn-primary" style={{ width: '100%', marginTop: 4 }}
                onClick={() => navigate(`/steps?scenario=${Math.min(scenarioIdx + 1, MAX_SCENARIO_IDX)}`)}>
                Next lesson <ArrowRight size={16} style={{ verticalAlign: -3 }} />
            </button>
            <button onClick={() => navigate(`/chat?scenario=${scenarioIdx}`)}
                style={{
                    width: '100%', marginTop: 10, padding: '13px',
                    borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                    background: 'var(--card-bg)', fontWeight: 700,
                    color: 'var(--accent-purple)', fontFamily: 'var(--font-display)',
                }}>
                <MessageCircle size={15} style={{ verticalAlign: -3 }} /> Practise this scenario in chat
            </button>
            <button onClick={() => navigate('/')}
                style={{
                    width: '100%', marginTop: 8, padding: '11px', border: 'none',
                    background: 'transparent', cursor: 'pointer',
                    color: 'var(--text-secondary)', fontWeight: 600,
                }}>
                Back home
            </button>
        </div>
    );
}

/** Every animation the surface uses, in one place, all of them off under
 *  `prefers-reduced-motion` — the colour and the copy carry the feedback on
 *  their own, and a learner who asked for stillness gets it. */
function StepStyles() {
    return (
        <style>{`
            @keyframes step-in  { from { transform: translateY(10px); } to { transform: none; } }
            @keyframes pop-in   { from { transform: scale(0.9); opacity: 0; } to { transform: none; opacity: 1; } }
            @keyframes panel-in { from { transform: translateY(8px) scale(0.97); opacity: 0; }
                                  to   { transform: none; opacity: 1; } }
            @keyframes tick-pop { 0% { transform: scale(0.2); opacity: 0; }
                                  60% { transform: scale(1.15); opacity: 1; }
                                  100% { transform: scale(1); } }
            @keyframes rail-fill{ from { transform: scaleY(2.2); filter: brightness(1.8); }
                                  to   { transform: none; filter: none; } }
            @keyframes float-up { 0% { transform: translateY(0); opacity: 0; }
                                  20% { opacity: 1; }
                                  100% { transform: translateY(-26px); opacity: 0; } }
            @keyframes banner-in{ from { transform: translateY(-120%); opacity: 0; }
                                  to   { transform: none; opacity: 1; } }
            @keyframes slide-in { from { transform: translateX(-10px); opacity: 0; }
                                  to   { transform: none; opacity: 1; } }
            /* A miss nudges. It does not shake: a violent shake is a slap, and
               this is a learner who typed a word slightly wrong. */
            @keyframes nudge    { 0%,100% { transform: translateX(0); }
                                  25% { transform: translateX(-5px); }
                                  75% { transform: translateX(5px); } }
            .step-in { animation: step-in 0.22s cubic-bezier(0.22,1,0.36,1); }
            .nudge   { animation: nudge 0.28s ease-in-out; }
            @media (prefers-reduced-motion: reduce) {
                .step-in, .nudge, [style*="animation"] { animation: none !important; }
            }
        `}</style>
    );
}
