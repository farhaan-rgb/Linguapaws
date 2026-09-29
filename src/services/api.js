/**
 * Central API client for the LinguaPaws backend.
 * Automatically attaches the JWT from localStorage to every request.
 */

/* Same origin once deployed: the backend serves this bundle, so a relative
   path reaches its own API and there is no second domain to authorise, no CORS
   to configure and nothing to re-point when the deployment URL changes. Only
   local development needs an absolute base, where Vite is on 5173 and the API
   on 5000. `VITE_API_URL` still wins when it is set, for a split deployment. */
export const BASE_URL = import.meta.env.VITE_API_URL
    || (import.meta.env.DEV ? 'http://localhost:5000' : '');

const getToken = () => localStorage.getItem('linguapaws_token');

const headers = (extra = {}) => ({
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    ...extra,
});

const fetchWithTimeout = (url, options = {}, ms = 60000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

async function handleResponse(res) {
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res;
}

export const api = {
    async get(path) {
        const res = await fetchWithTimeout(`${BASE_URL}${path}`, { headers: headers() });
        return handleResponse(res).then(r => r.json());
    },

    async post(path, body) {
        const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(body),
        });
        return handleResponse(res).then(r => r.json());
    },

    async put(path, body) {
        const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify(body),
        });
        return handleResponse(res).then(r => r.json());
    },

    async delete(path) {
        const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
            method: 'DELETE',
            headers: headers(),
        });
        return handleResponse(res).then(r => r.json());
    },

    /** For endpoints that return raw binary (e.g. TTS audio). Returns a Blob URL. */
    async postAudio(path, body) {
        const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
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
