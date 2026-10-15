/* ── Live speech recognition: credentials and the relay ─────────────────────
 *
 * Step mode used to hear a spoken answer in three serial legs: wait 0.7 s of
 * silence, upload the whole clip to this server, have this server send it to
 * Deepgram's pre-recorded API. 2–3 s from the learner stopping to a verdict.
 * Streaming moves all of that inside the time the learner is talking: audio
 * goes to Deepgram as it is spoken, and Deepgram's own endpointing says when
 * the answer is over.
 *
 * The browser cannot hold the real DEEPGRAM_API_KEY, so it needs something
 * short-lived. Two shapes, chosen per request:
 *
 *  1. `direct` — a Deepgram temporary token from `POST /v1/auth/grant`
 *     (https://developers.deepgram.com/guides/fundamentals/token-based-authentication,
 *     checked 2026-10-15): a JWT valid for `ttl_seconds` (default 30, max
 *     3600) that can only *open* a /listen connection — an open socket
 *     outlives it. The browser connects straight to Deepgram with it.
 *
 *  2. `relay` — when the grant is refused, a ticket signed with our own
 *     JWT_SECRET, which opens a websocket to THIS server; the server opens the
 *     Deepgram socket with the real key and pipes bytes both ways.
 *
 * Why two: the key in backend/.env on 2026-10-15 answers `/v1/auth/grant` with
 * `403 FORBIDDEN "Insufficient permissions."` — the grant needs a key with
 * Member role or above, and this key's only scope is `account:write` (probed
 * via GET /v1/auth/token). A Member key in DEEPGRAM_API_KEY switches every
 * learner onto `direct` with no code change; until then the relay keeps the
 * feature working rather than shipping something that silently never runs.
 * The refusal is cached for ten minutes so a refused grant does not cost each
 * tap the ~0.9 s it takes to be refused.
 */
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const { asrLadder } = require('../../shared/asr.js');

const TOKEN_TTL_S = 120;
const DG_LISTEN = 'wss://api.deepgram.com/v1/listen';

/* Modest, per user: a lesson is ~15 screens and a token serves every tap made
   inside its two minutes, so thirty in five minutes is generous for a learner
   and small for a script. In memory — one Render instance. */
const RATE = { windowMs: 5 * 60 * 1000, max: 30 };
const issued = new Map();
function rateLimited(userId) {
    const now = Date.now();
    const recent = (issued.get(userId) || []).filter(t => now - t < RATE.windowMs);
    if (recent.length >= RATE.max) { issued.set(userId, recent); return true; }
    recent.push(now);
    issued.set(userId, recent);
    return false;
}

let grantRefusedUntil = 0;

async function deepgramGrant() {
    if (Date.now() < grantRefusedUntil) return null;
    try {
        const r = await fetch('https://api.deepgram.com/v1/auth/grant', {
            method: 'POST',
            headers: {
                Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ttl_seconds: TOKEN_TTL_S }),
            signal: AbortSignal.timeout(3000),
        });
        if (!r.ok) {
            const body = await r.text().catch(() => '');
            console.warn(`[stt-token] Deepgram /v1/auth/grant refused (${r.status} ${body.slice(0, 120)}); `
                + 'using the relay for 10 min. A key with Member role makes the browser connect directly.');
            grantRefusedUntil = Date.now() + 10 * 60 * 1000;
            return null;
        }
        const j = await r.json();
        return j.access_token ? { token: j.access_token, ttl: j.expires_in || TOKEN_TTL_S } : null;
    } catch (err) {
        console.warn('[stt-token] grant failed:', err.message);
        return null;
    }
}

/** GET /api/ai/stt-token?lang=kn — behind requireAuth. */
async function sttTokenHandler(req, res) {
    const lang = String(req.query.lang || '').toLowerCase().slice(0, 2);
    /* Only Deepgram streams. A language Deepgram does not cover gets an explicit
       no, and the client keeps the record-and-upload path, which knows the
       other engines. Probed 2026-10-15: nova-3 streaming opens for en hi te kn
       ta bn gu mr pa ur and rejects ml and or with 400 "No such
       model/language/tier combination" — the same set as pre-recorded. */
    const rung = asrLadder(lang).find(r => r.engine === 'deepgram');
    if (!rung || !process.env.DEEPGRAM_API_KEY) return res.json({ supported: false });
    const userId = String(req.user._id);
    if (rateLimited(userId)) return res.status(429).json({ error: 'Too many speech sessions; try again shortly' });

    const grant = await deepgramGrant();
    if (grant) {
        return res.json({
            supported: true, mode: 'direct', url: DG_LISTEN, token: grant.token,
            model: rung.model, language: rung.code, expiresIn: grant.ttl,
        });
    }
    const ticket = jwt.sign({ sub: userId, lang: rung.code, model: rung.model, kind: 'stt' },
        process.env.JWT_SECRET, { expiresIn: TOKEN_TTL_S });
    return res.json({
        supported: true, mode: 'relay', path: '/api/ai/stt-stream', token: ticket,
        model: rung.model, language: rung.code, expiresIn: TOKEN_TTL_S,
    });
}

/* Only these reach Deepgram from the browser's query string; model and
   language come from the signed ticket, not the client. */
const PASS = ['encoding', 'sample_rate', 'channels', 'interim_results', 'endpointing',
    'utterance_end_ms', 'vad_events', 'smart_format', 'punctuate', 'filler_words'];
const MAX_SESSION_MS = 20000;
const openByUser = new Map();

/** Attach the relay to the HTTP server: wss://host/api/ai/stt-stream?ticket=… */
function attachSttRelay(server) {
    const wss = new WebSocket.Server({ noServer: true, maxPayload: 256 * 1024 });
    server.on('upgrade', (req, socket, head) => {
        const url = new URL(req.url, 'http://x');
        if (url.pathname !== '/api/ai/stt-stream') return; // not ours
        let claims;
        try {
            claims = jwt.verify(url.searchParams.get('ticket') || '', process.env.JWT_SECRET);
            if (claims.kind !== 'stt') throw new Error('wrong ticket kind');
        } catch {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            return socket.destroy();
        }
        if ((openByUser.get(claims.sub) || 0) >= 2) {
            socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
            return socket.destroy();
        }
        wss.handleUpgrade(req, socket, head, (client) => relay(client, claims, url.searchParams));
    });
}

function relay(client, claims, params) {
    openByUser.set(claims.sub, (openByUser.get(claims.sub) || 0) + 1);
    const q = new URLSearchParams({ model: claims.model, language: claims.lang });
    for (const k of PASS) if (params.has(k)) q.set(k, params.get(k));
    const upstream = new WebSocket(`${DG_LISTEN}?${q}`, {
        headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` },
    });
    const queue = [];
    let closed = false;
    const done = (why) => {
        if (closed) return;
        closed = true;
        clearTimeout(cap);
        openByUser.set(claims.sub, Math.max(0, (openByUser.get(claims.sub) || 1) - 1));
        try { client.close(1000, why); } catch { /* gone */ }
        try { upstream.close(); } catch { /* gone */ }
    };
    const cap = setTimeout(() => done('cap'), MAX_SESSION_MS);

    /* Audio that arrives during the Deepgram handshake (~0.8 s measured) is
       queued, not dropped: the learner may already be talking. */
    client.on('message', (data, isBinary) => {
        const msg = isBinary ? data : data.toString();
        if (upstream.readyState === WebSocket.OPEN) upstream.send(msg);
        else queue.push(msg);
    });
    upstream.on('open', () => { for (const m of queue.splice(0)) upstream.send(m); });
    upstream.on('message', (data) => {
        if (client.readyState === WebSocket.OPEN) client.send(data.toString());
    });
    upstream.on('unexpected-response', (_req, r) => {
        console.warn(`[stt-stream] Deepgram refused the stream: ${r.statusCode}`);
        done('upstream refused');
    });
    upstream.on('error', (err) => { console.warn('[stt-stream] upstream error:', err.message); done('upstream error'); });
    upstream.on('close', () => done('upstream closed'));
    client.on('close', () => {
        /* The browser hung up: tell Deepgram to flush and close cleanly. */
        if (upstream.readyState === WebSocket.OPEN) {
            try { upstream.send(JSON.stringify({ type: 'CloseStream' })); } catch { /* gone */ }
        }
        done('client closed');
    });
    client.on('error', () => done('client error'));
}

module.exports = { sttTokenHandler, attachSttRelay };
