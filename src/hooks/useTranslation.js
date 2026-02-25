import { useMemo } from 'react';
import { UI_TRANSLATIONS } from '../constants/translations';

export const useTranslation = () => {
    // Safely parse localStorage items
    const getStoredJSON = (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error(`Error parsing localStorage key "${key}":`, e);
            // Fall back to raw string (older data or non-JSON writes)
            return localStorage.getItem(key);
        }
    };

    const currentLang = getStoredJSON('linguapaws_native_lang');
    const currentLevel = getStoredJSON('linguapaws_level');

    const normalizeLangId = (lang) => {
        if (!lang) return null;
        if (typeof lang === 'string') {
            const s = lang.trim().toLowerCase();
            const map = {
                hi: 'hi', hindi: 'hi', 'हिन्दी': 'hi', 'हिंदी': 'hi',
                bn: 'bn', bengali: 'bn', 'বাংলা': 'bn',
                te: 'te', telugu: 'te', 'తెలుగు': 'te',
                mr: 'mr', marathi: 'mr', 'मराठी': 'mr',
                ta: 'ta', tamil: 'ta', 'தமிழ்': 'ta',
                ur: 'ur', urdu: 'ur', 'اردو': 'ur',
                kn: 'kn', kannada: 'kn', 'ಕನ್ನಡ': 'kn',
                gu: 'gu', gujarati: 'gu', 'ગુજરાતી': 'gu',
                ml: 'ml', malayalam: 'ml', 'മലയാളം': 'ml',
                pa: 'pa', punjabi: 'pa', 'ਪੰਜਾਬੀ': 'pa',
            };
            return map[s] || null;
        }
        if (lang.id) return lang.id;
        if (lang.name) return normalizeLangId(lang.name);
        if (lang.native) return normalizeLangId(lang.native);
        return null;
    };

    const normalizeLevelId = (level) => {
        if (!level) return null;
        if (typeof level === 'string') {
            const s = level.trim().toLowerCase();
            const map = {
                zero: 'zero',
                beginner: 'zero',
                none: 'zero',
                basic: 'basic',
                conversational: 'conversational',
                fluent: 'fluent',
            };
            return map[s] || null;
        }
        if (level.id) return level.id;
        if (level.label) return normalizeLevelId(level.label);
        return null;
    };

    // Keep native UI for zero and basic levels only
    // Switch to English for conversational/fluent or if specifically configured
    const normalizedLevelId = normalizeLevelId(currentLevel);
    const isNativeEligible = !normalizedLevelId ||
        normalizedLevelId === 'zero' ||
        normalizedLevelId === 'basic';

    // Default to 'en' only if they are fluent OR we have no native language info
    const normalizedLangId = normalizeLangId(currentLang);
    const langId = (isNativeEligible && normalizedLangId) ? normalizedLangId : 'en';

    const t = useMemo(() => {
        const translations = UI_TRANSLATIONS[langId] || {};
        const englishFallback = UI_TRANSLATIONS['en'] || {};

        return new Proxy(translations, {
            get: (target, key) => {
                if (typeof key !== 'string') return target[key];

                // 1. Try selected language
                if (key in target) return target[key];

                // 2. Try English fallback
                if (langId !== 'en' && key in englishFallback) {
                    return englishFallback[key];
                }

                // 3. Return the key itself
                return key;
            }
        });
    }, [langId]);

    return { t, langId, isBeginner: isNativeEligible };
};
