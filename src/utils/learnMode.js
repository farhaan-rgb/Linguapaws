/** Which surface a lesson is delivered through. Kept out of the component file
 *  so fast-refresh still works on the toggle itself. */

export const MODE_KEY = 'linguapaws_learn_mode';

/** 'steps' walks a lesson one screen at a time; 'chat' is the original tutor. */
export const getLearnMode = () =>
    localStorage.getItem(MODE_KEY) === 'steps' ? 'steps' : 'chat';

export const setLearnMode = (mode) => {
    localStorage.setItem(MODE_KEY, mode === 'steps' ? 'steps' : 'chat');
};
