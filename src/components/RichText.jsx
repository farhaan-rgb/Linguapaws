import React from 'react';

/**
 * The curriculum writes its teaching lines in a light markdown — `**word**` for
 * the target-language term, `*italics*` for glosses — and Chat.jsx renders it
 * inside the message bubble. The step screens need the same text, so the same
 * two marks are honoured here rather than leaking asterisks onto a card.
 */
export default function RichText({ text, accent = 'var(--accent-purple)' }) {
    if (!text) return null;
    const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <strong key={i} style={{ color: accent, fontWeight: 700 }}>
                            {part.slice(2, -2)}
                        </strong>
                    );
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <em key={i} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</em>;
                }
                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
        </>
    );
}
