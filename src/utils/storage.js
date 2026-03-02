/**
 * Robust localStorage/sessionStorage utilities to prevent SyntaxErrors
 * caused by malformed or 'undefined' string values in JSON.parse.
 */

export const getStoredJSON = (key, fallback = {}, storage = localStorage) => {
    try {
        const item = storage.getItem(key);
        if (!item || item === 'undefined' || item === 'null') return fallback;
        return JSON.parse(item);
    } catch (e) {
        console.warn(`[storage] Error parsing key "${key}":`, e);
        return fallback;
    }
};

export const setStoredJSON = (key, value, storage = localStorage) => {
    try {
        storage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`[storage] Error setting key "${key}":`, e);
    }
};

export const clearAppData = () => {
    localStorage.clear();
    sessionStorage.clear();
};
