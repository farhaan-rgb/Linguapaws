/**
 * Central API client for the LinguaPaws backend.
 * Automatically attaches the JWT from localStorage to every request.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getToken = () => localStorage.getItem('linguapaws_token');

const headers = (extra = {}) => ({
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    ...extra,
});

async function handleResponse(res) {
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res;
}

export const api = {
    async get(path) {
        const res = await fetch(`${BASE_URL}${path}`, { headers: headers() });
        return handleResponse(res).then(r => r.json());
    },

    async post(path, body) {
        const res = await fetch(`${BASE_URL}${path}`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(body),
        });
        return handleResponse(res).then(r => r.json());
    },

    async put(path, body) {
        const res = await fetch(`${BASE_URL}${path}`, {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify(body),
        });
        return handleResponse(res).then(r => r.json());
    },

    async delete(path) {
        const res = await fetch(`${BASE_URL}${path}`, {
            method: 'DELETE',
            headers: headers(),
        });
        return handleResponse(res).then(r => r.json());
    },

    /** For endpoints that return raw binary (e.g. TTS audio). Returns a Blob URL. */
    async postAudio(path, body) {
        const res = await fetch(`${BASE_URL}${path}`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const errText = await res.text();
            console.error(`[api.postAudio] ${res.status} from ${path}:`, errText);
            throw new Error(`HTTP ${res.status}: ${errText}`);
        }
        const blob = await res.blob();
        if (blob.size === 0) {
            console.error('[api.postAudio] received empty blob from', path);
            throw new Error('Empty audio response');
        }
        return URL.createObjectURL(blob);
    },
};
