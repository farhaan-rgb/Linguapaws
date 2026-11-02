/* Feature switches.
 *
 * CHAT_ENABLED — the free-form tutor chat (/chat, character "friends", voice
 * calls, the step/chat mode toggle on Home, "Practise this scenario in chat").
 * Switched off: every lesson is delivered in step mode and /chat redirects to
 * the lesson map. All chat code, Chat.jsx and the backend routes are kept.
 *
 * To turn chat back on, set this to true. Nothing else needs to change —
 * every entry point, the mode toggle and the /chat route key off this one
 * constant, so true restores the previous behaviour exactly. */
export const CHAT_ENABLED = false;
