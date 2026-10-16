import React, {
    createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Volume2 } from 'lucide-react';

import RichText from './RichText';
import { tipSegments } from '../services/speechScript';
import { glossFor, keyOf, englishFor, ENGLISH_MAX_WORDS } from '../services/wordGloss';
import * as praise from '../services/praise';

/* ── Tap a word for its meaning ──────────────────────────────────────────────
   Every target-language word step mode shows — in a prompt, a tip, a miss
   line, an example, a family card, the reveal, the summary — can be tapped for
   what it means. Which words count as target language is decided by
   `tipSegments`, the same reading read-aloud uses, so the two never disagree
   about what is Kannada and what is English. What a word means comes from
   `glossFor`, which only ever repeats the course. No entry, no underline.

   An unsettled recall screen hides its own answer: `TapHide` names the words a
   tap would give away, and they render as plain text until the screen settles.

   English runs the other way: a word the course has taught a translation for
   ("want", "don't want", "books") is tappable for that translation, with a
   blue underline instead of purple so the learner can see which side they are
   tapping. On an unsettled recall screen an English word whose translation is
   in the answer is *gated*: the popover says so and waits for "Show", and
   showing marks the screen helped (`onHelp`). Every other English word is
   free.

   Some English words are an ending, not a word: "at" in "at one o'clock" is
   the -ge of *gantege*. While the answer is hidden, such a word is tappable
   when the answer carries a taught ending for it (`englishFor` with the
   answer). The popover gives the rule first, which is free, and shows it on
   the answer's own word only on "Show", which is help. */

const TapCtx = createContext(null);
const HideCtx = createContext(null);

/** Words a tap must not give away on this screen, as course keys. `onHelp`
 *  is called when the learner asks an English word for part of the answer;
 *  `helped` says they already have, so the gate is down. */
export function TapHide({ words, onHelp = null, helped = false, children }) {
    const ctx = useContext(TapCtx);
    const lang = ctx?.langName;
    const value = useMemo(() => {
        const hidden = new Set();
        for (const w of words || []) for (const t of keyOf(w).split(' ')) if (t) hidden.add(t);
        /* The answer's words and the stems they are built on: "house" gives
           away *manege* as surely as it gives away *mane*. */
        const gate = new Set(hidden);
        for (const t of hidden) {
            const g = lang ? glossFor(lang, t) : null;
            if (g?.parts?.stem) gate.add(keyOf(g.parts.stem));
        }
        return { hidden, gate, onHelp, helped };
    }, [words, lang, onHelp, helped]);
    return <HideCtx.Provider value={value}>{children}</HideCtx.Provider>;
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
            {open && <Popover key={open.id} open={open} speak={speak} onClose={close} />}
        </TapCtx.Provider>
    );
}

let nextId = 0;

/* The "this gives you part of the answer" gate is asked once per session.
   After the learner has said yes once, a gated word opens straight to the
   answer — still counted as help, and the popover says so. */
const GATE_KEY = 'linguapaws_tap_gate_ok';
const gateAccepted = () => { try { return sessionStorage.getItem(GATE_KEY) === '1'; } catch { return false; } };
const acceptGate = () => { try { sessionStorage.setItem(GATE_KEY, '1'); } catch { /* private mode */ } };

/** One tappable word. A real button, so a focused word's Enter opens it rather
 *  than reaching the screen's Enter handler (which ignores buttons). */
function Word({ text, entry, english = false }) {
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
                background: isOpen ? (english ? 'rgba(59,130,246,0.12)' : 'rgba(168,85,247,0.12)') : 'none',
                border: 'none', padding: 0, margin: 0, borderRadius: 4, cursor: 'pointer',
                textDecorationLine: 'underline', textDecorationStyle: 'dotted',
                textDecorationThickness: '1.5px', textUnderlineOffset: '3px',
                textDecorationColor: english
                    ? 'color-mix(in srgb, var(--accent-blue) 55%, transparent)'
                    : 'color-mix(in srgb, var(--accent-purple) 60%, transparent)',
                WebkitTapHighlightColor: 'transparent',
            }}>
            {text}
        </button>
    );
}

const WORD_RE = /^([^\p{L}]*)([\p{L}'’-]*\p{L})([^\p{L}]*)$/u;

/** Render a run of text, wrapping the words `want(key)` admits that have a
 *  gloss — and, with `english`, any other word or short phrase the course has
 *  taught a translation for. */
function Words({ text, want, english = false, context = null, offset = 0 }) {
    const ctx = useContext(TapCtx);
    const hide = useContext(HideCtx);
    const pieces = String(text).split(/(\s+)/);
    const line = context ?? String(text);
    const out = [];
    let at = offset;
    for (let i = 0; i < pieces.length; at += pieces[i].length, i++) {
        const piece = pieces[i];
        const m = piece.match(WORD_RE);
        if (!m) { out.push(piece); continue; }
        const k = keyOf(m[2]);
        if (want(k)) {
            const entry = hide?.hidden.has(k) ? null : glossFor(ctx.langName, m[2], ctx.lessonNo);
            out.push(entry
                ? <React.Fragment key={i}>{m[1]}<Word text={m[2]} entry={entry} />{m[3]}</React.Fragment>
                : piece);
            continue;
        }
        if (english) {
            /* Longest phrase first, across plain spaces only: "don't want"
               before "want", and never across a full stop. */
            let hit = null;
            for (let n = ENGLISH_MAX_WORDS; n >= 1 && !hit; n--) {
                const ms = [];
                for (let j = 0; j < n; j++) {
                    const mm = pieces[i + 2 * j]?.match(WORD_RE);
                    if (!mm || (j > 0 && mm[1]) || (j < n - 1 && mm[3])) break;
                    ms.push(mm);
                }
                if (ms.length !== n) continue;
                const phrase = ms.map(x => x[2]).join(' ');
                /* "I" the pronoun, never the letter i in "with an i". */
                if (phrase === 'i') continue;
                const entry = englishFor(ctx.langName, phrase, ctx.lessonNo, hide ? [...hide.hidden] : null,
                    sentenceAt(line, at));
                if (entry) hit = { n, ms, phrase, entry };
            }
            if (hit) {
                const { n, ms, phrase, entry } = hit;
                const gated = !!hide && !hide.helped && !!entry.options?.some(o =>
                    keyOf(o.word).split(' ').some(t => hide.gate.has(t)));
                const e = gated ? { ...entry, gated, onHelp: hide.onHelp }
                    : entry.ending ? { ...entry, onHelp: hide?.onHelp, helped: !!hide?.helped } : entry;
                out.push(
                    <React.Fragment key={i}>
                        {ms[0][1]}<Word text={phrase} entry={e} english />{ms[n - 1][3]}
                    </React.Fragment>,
                );
                for (let j = 1; j < 2 * n - 1; j++) at += pieces[i + j - 1].length;
                i += 2 * (n - 1);
                continue;
            }
        }
        out.push(piece);
    }
    return out;
}

/** The sentence of `line` around character `at`: whether "I" means *naanu*
 *  or *nanage* turns on the verb beside it, not on a verb two sentences on. */
function sentenceAt(line, at) {
    const s = String(line);
    let a = at, b = at;
    while (a > 0 && !/[.!?;:\n]/.test(s[a - 1])) a--;
    while (b < s.length && !/[.!?;:\n]/.test(s[b])) b++;
    return s.slice(a, b);
}

/** A string that is all target language: an example, an answer, a family member. */
export function TapPhrase({ text }) {
    const ctx = useContext(TapCtx);
    if (!ctx?.on || !text) return text ?? null;
    return <Words text={text} want={() => true} />;
}

/** A line of plain English — an example's meaning, a family member's gloss. */
export function TapEnglish({ text }) {
    const ctx = useContext(TapCtx);
    if (!ctx?.on || !text) return text ?? null;
    return <Words text={text} want={() => false} english />;
}

/** The question frame every memory check opens with. Tapping "how" or "you"
 *  in it would be noise on every screen. */
const FRAME = /^(\s*How do you say\b)/i;

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
    if (!targets) return <RichText text={text} accent={accent} />;
    const want = (k) => targets.has(k);
    const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
    const frame = parts[0]?.match(FRAME)?.[1] || '';
    if (frame) parts[0] = parts[0].slice(frame.length);
    /* The line without its markdown, and where each part starts in it, so a
       word can be read in its own sentence. */
    const inner = parts.map(part => (part.startsWith('**') && part.endsWith('**') && part.length > 4 ? part.slice(2, -2)
        : part.startsWith('*') && part.endsWith('*') && part.length > 2 ? part.slice(1, -1) : part));
    const plain = frame + inner.join('');
    const starts = [];
    inner.reduce((n, p) => { starts.push(n); return n + p.length; }, frame.length);
    return (
        <>
            {frame}
            {parts.map((part, i) => {
                const words = <Words text={inner[i]} want={want} english context={plain} offset={starts[i]} />;
                if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                    return <strong key={i} style={{ color: accent, fontWeight: 700 }}>{words}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                    return <em key={i} style={{ fontStyle: 'italic' }}>{words}</em>;
                }
                return <React.Fragment key={i}>{words}</React.Fragment>;
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
    /** A gated English word waits for "Show" before it gives anything away. */
    const [shown, setShown] = useState(!entry.gated || gateAccepted());
    /** An ending's rule is free; its form on the answer's word waits for "Show". */
    const [applied, setApplied] = useState(!!entry.helped);
    /* Showing marks the screen helped, which re-lays it out; on a phone that
       nudges the page and fires a scroll, and the popover closed on it — the
       learner had to tap the word again to see what they had asked for. A
       scroll within a moment of opening or showing is that, not the learner. */
    const settleUntil = useRef(Date.now() + 500);
    useEffect(() => {
        if (entry.gated && gateAccepted()) entry.onHelp?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once, as the popover opens
    }, []);

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
    }, [rect, shown, applied]);

    useEffect(() => {
        const down = (e) => {
            if (ref.current?.contains(e.target) || e.target.closest?.('[data-tapword]')) return;
            onClose();
        };
        const key = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('pointerdown', down, true);
        document.addEventListener('keydown', key);
        const moved = () => { if (Date.now() > settleUntil.current) onClose(); };
        window.addEventListener('scroll', moved, true);
        window.addEventListener('resize', moved);
        return () => {
            document.removeEventListener('pointerdown', down, true);
            document.removeEventListener('keydown', key);
            window.removeEventListener('scroll', moved, true);
            window.removeEventListener('resize', moved);
        };
    }, [onClose]);

    const { parts } = entry;
    const label = entry.status === 'taught' ? praise.TAP.fromLesson(entry.lesson) : praise.TAP.notYet;
    const blue = !!entry.english;
    const edge = blue ? 'rgba(59,130,246,0.24)' : 'rgba(168,85,247,0.22)';
    const show = () => {
        settleUntil.current = Date.now() + 600;
        acceptGate();
        setShown(true);
        entry.onHelp?.();
    };
    const showApplied = () => {
        settleUntil.current = Date.now() + 600;
        setApplied(true);
        entry.onHelp?.();
    };
    const ending = entry.ending;
    const speakBtn = (word) => (
        <button type="button" onClick={() => speak?.(word)}
            aria-label={praise.TAP.hear(word)}
            style={{
                width: 34, height: 34, flexShrink: 0, borderRadius: 99, cursor: 'pointer',
                border: 'none', background: 'rgba(168,85,247,0.1)', color: 'var(--accent-purple)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <Volume2 size={16} />
        </button>
    );
    const small = {
        margin: '6px 0 0', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, color: 'var(--text-secondary)',
    };
    return createPortal(
        <div ref={ref} role="dialog" aria-label={blue ? `${entry.phrase}: ${praise.TAP.inLang}`
            : `${entry.word}: ${entry.meaning || parts?.stemMeaning || ''}`}
            style={{
                position: 'fixed', zIndex: 80, left: pos?.left ?? 0, top: pos?.top ?? 0,
                visibility: pos ? 'visible' : 'hidden',
                width: 'max-content', maxWidth: 'min(260px, calc(100vw - 24px))', minWidth: 150,
                boxSizing: 'border-box', padding: '10px 12px 10px 14px', borderRadius: 14,
                background: '#fff', border: `1px solid ${edge}`,
                boxShadow: 'var(--shadow-lg)', textAlign: 'left', color: 'var(--text-main)',
                fontFamily: 'var(--font-main)', fontStyle: 'normal', fontWeight: 400,
                transformOrigin: pos?.up ? 'bottom center' : 'top center',
            }}>
            {pos && (
                <span aria-hidden="true" style={{
                    position: 'absolute', left: pos.arrow - 6, width: 12, height: 12,
                    background: '#fff', transform: 'rotate(45deg)',
                    ...(pos.up
                        ? { bottom: -7, borderRight: `1px solid ${edge}`, borderBottom: `1px solid ${edge}` }
                        : { top: -7, borderLeft: `1px solid ${edge}`, borderTop: `1px solid ${edge}` }),
                }} />
            )}
            {blue && ending && (
                <div style={{ maxWidth: 230 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
                        <RichText accent="var(--accent-blue)" text={praise.TAP.endingRule(entry.phrase, ending.ending)
                            + (ending.example && entry.applied?.form !== keyOf(ending.example.word)
                                ? praise.TAP.endingSame(ending.ending, ending.example.word, ending.example.meaning)
                                : '.')} />
                    </p>
                    {entry.applied && !applied && (
                        <button type="button" onClick={showApplied}
                            style={{
                                marginTop: 8, padding: '6px 16px', borderRadius: 99, cursor: 'pointer',
                                border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.08)',
                                color: 'var(--accent-blue)', fontFamily: 'var(--font-display)',
                                fontWeight: 700, fontSize: 13,
                            }}>{praise.TAP.endingShow}</button>
                    )}
                    {entry.applied && applied && (
                        <>
                            <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.35 }}>
                                <RichText accent="var(--accent-blue)"
                                    text={praise.TAP.endingApplied(entry.applied.stem, entry.applied.form)} />
                            </p>
                            {!entry.helped && (
                                <p style={{ ...small, color: 'var(--accent-blue)' }}>{praise.TAP.helped}</p>
                            )}
                        </>
                    )}
                </div>
            )}
            {blue && !ending && !shown && (
                <div style={{ maxWidth: 220 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>
                        {praise.TAP.gate}
                    </p>
                    <button type="button" onClick={show}
                        style={{
                            marginTop: 8, padding: '6px 16px', borderRadius: 99, cursor: 'pointer',
                            border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.08)',
                            color: 'var(--accent-blue)', fontFamily: 'var(--font-display)',
                            fontWeight: 700, fontSize: 13,
                        }}>{praise.TAP.show}</button>
                </div>
            )}
            {blue && !ending && shown && entry.gated && (
                <p style={{ ...small, margin: '0 0 6px', color: 'var(--accent-blue)' }}>{praise.TAP.helped}</p>
            )}
            {blue && !ending && shown && entry.pronoun && entry.options.map((o, i) => (
                <div key={o.word} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    paddingTop: i ? 6 : 0, marginTop: i ? 6 : 0,
                    borderTop: i ? '1px solid rgba(59,130,246,0.14)' : 'none',
                }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                            margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16,
                            lineHeight: 1.2, wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            {o.word}
                            {o.here && (
                                <span style={{
                                    fontFamily: 'var(--font-main)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4,
                                    textTransform: 'uppercase', color: 'var(--accent-blue)',
                                    background: 'rgba(59,130,246,0.1)', borderRadius: 99, padding: '2px 7px',
                                }}>{praise.TAP.here}</span>
                            )}
                        </p>
                        <p style={{ margin: '1px 0 0', fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, color: 'var(--text-secondary)' }}>
                            {praise.TAP.pronounWhen[o.person]?.[o.role] || o.meaning}
                        </p>
                    </div>
                    {speakBtn(o.word)}
                </div>
            ))}
            {blue && !ending && shown && !entry.pronoun && entry.options.map((o, i) => (
                <div key={o.word} style={{
                    paddingTop: i ? 8 : 0, marginTop: i ? 8 : 0,
                    borderTop: i ? '1px solid rgba(59,130,246,0.14)' : 'none',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                                margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17,
                                lineHeight: 1.2, wordBreak: 'break-word',
                            }}>{o.word}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>
                                {o.meaning}
                            </p>
                        </div>
                        {speakBtn(o.word)}
                    </div>
                    <p style={{ ...small, margin: '4px 0 0' }}>{praise.TAP.fromLesson(o.lesson)}</p>
                </div>
            ))}
            {!blue && (
                <>
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
                    {speakBtn(entry.word)}
                </div>
                {(entry.status !== 'taught' || entry.earlier) && (
                    <p style={small}>{label}</p>
                )}
                </>
            )}
        </div>,
        document.body,
    );
}
