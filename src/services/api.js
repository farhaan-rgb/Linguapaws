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

/**
 * A failed request, with the one fact a caller needs to say something useful:
 * `kind`.
 *
 * Every failure used to arrive as a bare `Error` carrying `body.error` or
 * `HTTP <status>`, and a request that never reached a server at all arrived as
 * whatever `fetch` happened to reject with — a `TypeError` reading "Failed to
 * fetch". Nothing downstream could tell "the backend is not running" from "the
 * model returned a 502" from "the token has expired", so Ask Miko said *Try
 * again in a moment* to all three. On the day the backend process was simply
 * not running, that told Farhaan to retry something that could never succeed.
 *
 *   offline  no reply at all: nothing listening, no network, DNS, CORS
 *   timeout  the request was aborted by `fetchWithTimeout`
 *   auth     401/403 — the token is missing, invalid or expired
 *   rate     429
 *   server   5xx, including the 502 the AI routes return on a model failure
 *   request  any other 4xx — a bad body, usually a bug on this side
 *
 * `message` is unchanged from before: the server's own `error` field when
 * there is one. Existing callers that match on it keep working.
 */
export class ApiError extends Error {
    constructor(message, { kind = 'server', status = 0, path = '' } = {}) {
        super(message);
        this.name = 'ApiError';
        this.kind = kind;
        this.status = status;
        this.path = path;
    }
}

export const API_ERROR_KINDS = ['offline', 'timeout', 'auth', 'rate', 'server', 'request'];

const kindForStatus = (status) => (status === 401 || status === 403 ? 'auth'
    : status === 429 ? 'rate'
    : status >= 500 ? 'server'
        : 'request');

/** One request, with every failure turned into an ApiError. */
async function send(path, options = {}) {
    let res;
    try {
        res = await fetchWithTimeout(`${BASE_URL}${path}`, options);
    } catch (err) {
        /* `fetch` rejects for two reasons here and they want opposite things
           from the learner: our own abort, which is worth retrying, and "the
           browser could not reach the host", which is not. */
        const timedOut = err?.name === 'AbortError';
        throw new ApiError(timedOut ? 'Request timed out' : 'Cannot reach the server',
            { kind: timedOut ? 'timeout' : 'offline', path });
    }
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(body.error || `HTTP ${res.status}`,
            { kind: kindForStatus(res.status), status: res.status, path });
    }
    return res;
}

export const api = {
    async get(path) {
        const res = await send(path, { headers: headers() });
        return res.json();
    },

    async post(path, body) {
        const res = await send(path, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(body),
        });
        return res.json();
    },

    async put(path, body) {
        const res = await send(path, {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify(body),
        });
        return res.json();
    },

    async delete(path) {
        const res = await send(path, {
            method: 'DELETE',
            headers: headers(),
        });
        return res.json();
    },

    /** For endpoints that return raw binary (e.g. TTS audio). Returns a Blob URL. */
    async postAudio(path, body) {
        let res;
        try {
            res = await fetchWithTimeout(`${BASE_URL}${path}`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify(body),
            });
        } catch (err) {
            const timedOut = err?.name === 'AbortError';
            throw new ApiError(timedOut ? 'Request timed out' : 'Cannot reach the server',
                { kind: timedOut ? 'timeout' : 'offline', path });
        }
        if (!res.ok) {
            const errText = await res.text();
            console.error(`[api.postAudio] ${res.status} from ${path}:`, errText);
            throw new ApiError(`HTTP ${res.status}: ${errText}`,
                { kind: kindForStatus(res.status), status: res.status, path });
        }
        const blob = await res.blob();
        if (blob.size === 0) {
            console.error('[api.postAudio] received empty blob from', path);
            throw new Error('Empty audio response');
        }
        return URL.createObjectURL(blob);
    },
};
