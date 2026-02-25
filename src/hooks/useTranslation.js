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
            return null;
        }
    };

    const currentLang = getStoredJSON('linguapaws_native_lang');
    const currentLevel = getStoredJSON('linguapaws_level');

    // Keep native UI for zero and basic levels only
    // Switch to English for conversational/fluent or if specifically configured
    const isNativeEligible = !currentLevel ||
        currentLevel.id === 'zero' ||
        currentLevel.id === 'basic';

    // Default to 'en' only if they are fluent OR we have no native language info
    const langId = (isNativeEligible && currentLang?.id) ? currentLang.id : 'en';

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
