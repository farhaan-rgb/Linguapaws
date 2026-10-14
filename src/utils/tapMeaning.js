/* "Tap words for meaning" in step mode: on unless the learner turned it off.
   Stored like the read-aloud switch beside it. */
const TAP_KEY = 'linguapaws_tap_meaning';

export const isTapOn = () => {
    try { return localStorage.getItem(TAP_KEY) !== 'off'; } catch { return true; }
};
export const setTapOn = (on) => {
    try { localStorage.setItem(TAP_KEY, on ? 'on' : 'off'); } catch { /* private mode */ }
};
