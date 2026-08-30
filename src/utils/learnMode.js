/** Which surface a lesson is delivered through. Kept out of the component file
 *  so fast-refresh still works on the toggle itself. */

export const MODE_KEY = 'linguapaws_learn_mode';

/** 'steps' walks a lesson one screen at a time; 'chat' is the original tutor. */
export const getLearnMode = () =>
    localStorage.getItem(MODE_KEY) === 'steps' ? 'steps' : 'chat';

export const setLearnMode = (mode) => {
    localStorage.setItem(MODE_KEY, mode === 'steps' ? 'steps' : 'chat');
};

/* ── How a lesson is answered ──────────────────────────────────────────────
   Same idea, one level down: the surface is chosen once and remembered, so a
   learner who answers out loud is not asked to choose again on every screen.
   Deliberately a separate key from the surface — someone can walk the steps
   and still want to speak them.                                             */

export const ANSWER_KEY = 'linguapaws_answer_mode';

/** 'type' writes the answer; 'speak' says it and the transcript lands in the
 *  same box, still editable. Typing is reachable in both — there is no state
 *  of this app where a broken microphone can trap somebody on a screen. */
export const getAnswerMode = () =>
    localStorage.getItem(ANSWER_KEY) === 'speak' ? 'speak' : 'type';

export const setAnswerMode = (mode) => {
    localStorage.setItem(ANSWER_KEY, mode === 'speak' ? 'speak' : 'type');
};
