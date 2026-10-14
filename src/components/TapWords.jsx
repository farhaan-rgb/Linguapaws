import React, {
    createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Volume2 } from 'lucide-react';

import RichText from './RichText';
import { tipSegments } from '../services/speechScript';
import { glossFor, keyOf } from '../services/wordGloss';
import * as praise from '../services/praise';

/* ── Tap a word for its meaning ──────────────────────────────────────────────
   Every target-language word step mode shows — in a prompt, a tip, a miss
   line, an example, a family card, the reveal, the summary — can be tapped for
   what it means. Which words count as target language is decided by
   `tipSegments`, the same reading read-aloud uses, so the two never disagree
   about what is Kannada and what is English. What a word means comes from
   `glossFor`, which only ever repeats the course. No entry, no underline.

   An unsettled recall screen hides its own answer: `TapHide` names the words a
   tap would give away, and they render as plain text until the screen settles. */

const TapCtx = createContext(null);
const HideCtx = createContext(null);

/** Words a tap must not give away on this screen, as course keys. */
export function TapHide({ words, children }) {
    const set = useMemo(() => {
        const s = new Set();
        for (const w of words || []) for (const t of keyOf(w).split(' ')) if (t) s.add(t);
        return s;
    }, [words]);
    return <HideCtx.Provider value={set}>{children}</HideCtx.Provider>;
}

export function TapWordsProvider({ langName, lessonNo, on, speak, resetKey, children }) {
    const [state, setOpen] = useState(null);   // { entry, rect, id, at }
    const close = useCallback(() => setOpen(null), []);
    /* Moving to the next screen, or switching the feature off, closes it. */
    const open = on && state?.at === resetKey ? state : null;
    const value = useMemo(() => ({
        on: !!on && !!langName, langName, lessonNo, speak,
        openId: open?.id ?? null,
        toggle: (entry, el, id) => setOpen(o => (o?.id === id && o?.at === resetKey ? null
            : { entry, rect: el.getBoundingClientRect(), id, at: resetKey })),
    }), [on, langName, lessonNo, speak, open, resetKey]);
    return (
        <TapCtx.Provider value={value}>
            {children}
            {open && <Popover open={open} speak={speak} onClose={close} />}
        </TapCtx.Provider>
    );
}

let nextId = 0;

/** One tappable word. A real button, so a focused word's Enter opens it rather
 *  than reaching the screen's Enter handler (which ignores buttons). */
function Word({ text, entry }) {
    const ctx = useContext(TapCtx);
    const id = useMemo(() => `tw${nextId++}`, []);
    const isOpen = ctx.openId === id;
    return (
        <button type="button" data-tapword="1" className="tap-word"
            aria-expanded={isOpen}
            aria-label={`${text}: meaning`}
            /* Keep the answer box focused, and a phone keyboard up. */
            onMouseDown={e => e.preventDefault()}
            onClick={e => { e.stopPropagation(); ctx.toggle(entry, e.currentTarget, id); }}
            style={{
                font: 'inherit', color: 'inherit', letterSpacing: 'inherit',
                background: isOpen ? 'rgba(168,85,247,0.12)' : 'none',
                border: 'none', padding: 0, margin: 0, borderRadius: 4, cursor: 'pointer',
                textDecorationLine: 'underline', textDecorationStyle: 'dotted',
                textDecorationThickness: '1.5px', textUnderlineOffset: '3px',
                textDecorationColor: 'color-mix(in srgb, var(--accent-purple) 60%, transparent)',
                WebkitTapHighlightColor: 'transparent',
            }}>
            {text}
        </button>
    );
}

/** Render a run of text, wrapping the words `want(key)` admits that have a gloss. */
function Words({ text, want }) {
    const ctx = useContext(TapCtx);
    const hidden = useContext(HideCtx);
    return String(text).split(/(\s+)/).map((piece, i) => {
        const m = piece.match(/^([^\p{L}]*)([\p{L}'’-]*\p{L})([^\p{L}]*)$/u);
        if (!m) return piece;
        const k = keyOf(m[2]);
        if (!want(k) || hidden?.has(k)) return piece;
        const entry = glossFor(ctx.langName, m[2], ctx.lessonNo);
        if (!entry) return piece;
        return (
            <React.Fragment key={i}>
                {m[1]}<Word text={m[2]} entry={entry} />{m[3]}
            </React.Fragment>
        );
    });
}

/** A string that is all target language: an example, an answer, a family member. */
export function TapPhrase({ text }) {
    const ctx = useContext(TapCtx);
    if (!ctx?.on || !text) return text ?? null;
    return <Words text={text} want={() => true} />;
}

/** A teaching line in the course's light markdown, as RichText renders it —
 *  with the words `tipSegments` reads as target language made tappable. */
export function TapText({ text, accent = 'var(--accent-purple)' }) {
    const ctx = useContext(TapCtx);
    const on = !!ctx?.on;
    const lang = ctx?.langName;
    const targets = useMemo(() => {
        if (!on || !text) return null;
        const s = new Set();
        for (const seg of tipSegments(lang, text)) {
            if (seg.target) for (const t of keyOf(seg.text).split(' ')) if (t) s.add(t);
        }
        return s;
    }, [on, lang, text]);
    if (!targets || !targets.size) return <RichText text={text} accent={accent} />;
    const want = (k) => targets.has(k);
    const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                    return (
                        <strong key={i} style={{ color: accent, fontWeight: 700 }}>
                            <Words text={part.slice(2, -2)} want={want} />
                        </strong>
                    );
                }
                if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                    return <em key={i} style={{ fontStyle: 'italic' }}><Words text={part.slice(1, -1)} want={want} /></em>;
                }
                return <React.Fragment key={i}><Words text={part} want={want} /></React.Fragment>;
            })}
        </>
    );
}

/* Anchored to the word, on whichever side keeps it off the answer box: a word
   above the box opens upward, one below it opens downward. Only when there is
   no room on that side does it flip. */
function Popover({ open, speak, onClose }) {
    const ref = useRef(null);
    const [pos, setPos] = useState(null);
    const { entry, rect } = open;

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const vw = window.innerWidth, vh = window.innerHeight;
        const h = el.offsetHeight, w = el.offsetWidth;
        const box = document.querySelector('input[data-answer-box], input[data-lock-box]')?.getBoundingClientRect();
        const roomUp = rect.top - 10 > h;
        const roomDown = vh - rect.bottom - 10 > h;
        let up = box ? rect.bottom <= box.top + 1 : !roomDown;
        if (up && !roomUp) up = false;
        if (!up && !roomDown && roomUp) up = true;
        const cx = rect.left + rect.width / 2;
        const left = Math.min(Math.max(cx - w / 2, 12), vw - w - 12);
        setPos({ up, left, top: up ? rect.top - h - 9 : rect.bottom + 9, arrow: Math.min(Math.max(cx - left, 16), w - 16) });
    }, [rect]);

    useEffect(() => {
        const down = (e) => {
            if (ref.current?.contains(e.target) || e.target.closest?.('[data-tapword]')) return;
            onClose();
        };
        const key = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('pointerdown', down, true);
        document.addEventListener('keydown', key);
        window.addEventListener('scroll', onClose, true);
        window.addEventListener('resize', onClose);
        return () => {
            document.removeEventListener('pointerdown', down, true);
            document.removeEventListener('keydown', key);
            window.removeEventListener('scroll', onClose, true);
            window.removeEventListener('resize', onClose);
        };
    }, [onClose]);

    const { parts } = entry;
    const label = entry.status === 'taught' ? praise.TAP.fromLesson(entry.lesson) : praise.TAP.notYet;
    return createPortal(
        <div ref={ref} role="dialog" aria-label={`${entry.word}: ${entry.meaning || parts?.stemMeaning || ''}`}
            style={{
                position: 'fixed', zIndex: 80, left: pos?.left ?? 0, top: pos?.top ?? 0,
                visibility: pos ? 'visible' : 'hidden',
                width: 'max-content', maxWidth: 'min(260px, calc(100vw - 24px))', minWidth: 150,
                boxSizing: 'border-box', padding: '10px 12px 10px 14px', borderRadius: 14,
                background: '#fff', border: '1px solid rgba(168,85,247,0.22)',
                boxShadow: 'var(--shadow-lg)', textAlign: 'left', color: 'var(--text-main)',
                fontFamily: 'var(--font-main)', fontStyle: 'normal', fontWeight: 400,
                transformOrigin: pos?.up ? 'bottom center' : 'top center',
            }}>
            {pos && (
                <span aria-hidden="true" style={{
                    position: 'absolute', left: pos.arrow - 6, width: 12, height: 12,
                    background: '#fff', transform: 'rotate(45deg)',
                    ...(pos.up
                        ? { bottom: -7, borderRight: '1px solid rgba(168,85,247,0.22)', borderBottom: '1px solid rgba(168,85,247,0.22)' }
                        : { top: -7, borderLeft: '1px solid rgba(168,85,247,0.22)', borderTop: '1px solid rgba(168,85,247,0.22)' }),
                }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                        margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17,
                        lineHeight: 1.2, wordBreak: 'break-word',
                    }}>{entry.word}</p>
                    {entry.meaning && (
                        <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>
                            {entry.meaning}
                        </p>
                    )}
                    {parts && (
                        <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                            <b style={{ color: 'var(--text-main)' }}>{parts.stem}</b> “{parts.stemMeaning}”
                            {' + '}<b style={{ color: 'var(--text-main)' }}>{parts.ending}</b>
                            {parts.endingMeans ? `, ${parts.endingMeans}` : ''}
                        </p>
                    )}
                </div>
                <button type="button" onClick={() => speak?.(entry.word)}
                    aria-label={praise.TAP.hear(entry.word)}
                    style={{
                        width: 34, height: 34, flexShrink: 0, borderRadius: 99, cursor: 'pointer',
                        border: 'none', background: 'rgba(168,85,247,0.1)', color: 'var(--accent-purple)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <Volume2 size={16} />
                </button>
            </div>
            {(entry.status !== 'taught' || entry.earlier) && (
                <p style={{
                    margin: '6px 0 0', fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                    color: 'var(--text-secondary)',
                }}>{label}</p>
            )}
        </div>,
        document.body,
    );
}
