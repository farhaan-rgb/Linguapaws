import { api } from './api';

class WordTracker {
    constructor() {
        this.storageKey = 'linguapaws_words';
        this.words = this.load();
        this.save(); // Persist sanitized data immediately (clears old bad entries)
    }

    // Only accept purely alphabetic English words with 4+ characters
    isValidWord(word) {
        return /^[a-z]{4,}$/.test(word);
    }

    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return {};
            const data = JSON.parse(saved);
            if (typeof data !== 'object' || data === null) return {};
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                if (!/^[a-z]{4,}$/.test(key)) continue;
                if (typeof value === 'number' && !isNaN(value)) {
                    sanitized[key] = value;
                } else if (typeof value === 'object' && value !== null && typeof value.count === 'number') {
                    sanitized[key] = value.count;
                } else {
                    const parsed = parseInt(value, 10);
                    sanitized[key] = isNaN(parsed) ? 1 : parsed;
                }
            }
            return sanitized;
        } catch {
            return {};
        }
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.words));
    }

    addWord(word) {
        const normalized = word.toLowerCase().trim();
        if (!this.isValidWord(normalized)) return;

        // Update local cache immediately (keeps UI fast)
        this.words[normalized] = (this.words[normalized] || 0) + 1;
        this.save();

        // Sync to backend in background (fire-and-forget)
        api.post('/api/words', { word: normalized }).catch(() => {
            // Silently ignore — local data is still saved
        });
    }

    /**
     * Fetch all words from the backend and overwrite the local cache.
     * Call this on app startup or when navigating to the Word History page.
     */
    async syncFromBackend() {
        try {
            const words = await api.get('/api/words');
            // words = [{ text, count }, ...]
            const fresh = {};
            for (const { text, count } of words) {
                if (this.isValidWord(text)) fresh[text] = count;
            }
            this.words = fresh;
            this.save();
        } catch {
            // Silently fall back to local cache
        }
    }

    getWords() {
        return Object.entries(this.words)
            .map(([text, count]) => ({ text, count }))
            .sort((a, b) => b.count - a.count);
    }

    getTotalCount() {
        return Object.keys(this.words).length;
    }

    getProficiency() {
        const count = this.getTotalCount();
        if (count <= 5) return { status: 'Newbie', nextTier: 6, icon: '🐣', color: '#94a3b8' };
        if (count <= 20) return { status: 'Beginner', nextTier: 21, icon: '🐥', color: '#10b981' };
        if (count <= 50) return { status: 'Learner', nextTier: 51, icon: '📖', color: '#3b82f6' };
        if (count <= 100) return { status: 'Confident', nextTier: 101, icon: '🦁', color: '#6366f1' };
        if (count <= 200) return { status: 'Fluent', nextTier: 201, icon: '🦸', color: '#8b5cf6' };
        if (count <= 500) return { status: 'Expert', nextTier: 501, icon: '🎓', color: '#ec4899' };
        return { status: 'Master', nextTier: null, icon: '👑', color: '#f59e0b' };
    }

    getProgress() {
        const count = this.getTotalCount();
        const prof = this.getProficiency();
        if (!prof.nextTier) return 100;
        const tiers = [0, 6, 21, 51, 101, 201, 501];
        const currentTierIndex = tiers.findIndex(t => t === prof.nextTier) - 1;
        const currentTierStart = tiers[currentTierIndex];
        const range = prof.nextTier - currentTierStart;
        const progress = ((count - currentTierStart) / range) * 100;
        return Math.min(100, Math.max(0, progress));
    }
}

export const wordTracker = new WordTracker();
