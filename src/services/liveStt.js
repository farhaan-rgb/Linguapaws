/* ── Live speech recognition for step mode ──────────────────────────────────
 *
 * The record-and-upload path waits for 0.7 s of silence, then uploads the clip
 * to our server in Singapore, which sends it to Deepgram's pre-recorded API in
 * the US — 2–3 s from the learner stopping to a verdict. This streams the
 * microphone to Deepgram `nova-3` while the learner is still talking, shows
 * what it is hearing as they speak, and lets Deepgram's endpointing say when
 * they have finished.
 *
 * It is a fast path, never the only one. Every way it can fail — no token, a
 * socket that will not open, a language Deepgram does not stream, a transcript
 * that is not in the target's own script, no final within the wait — resolves
 * to "no result", and Steps.jsx grades the clip the recorder was making in
 * parallel through the old upload path instead. The learner never repeats
 * themselves because the fast path fell over.
 *
 * ── Capture: AudioWorklet → 16 kHz linear16 PCM ──
 * Not MediaRecorder timeslices. iOS Safari's MediaRecorder writes fragmented
 * MP4/AAC, which Deepgram's streaming endpoint does not take as a container,
 * and Chrome's WebM/Opus chunks only decode as one continuous stream. Raw PCM
 * is the one format both browsers can produce identically. AudioWorklet is in
 * Chrome 66+ and Safari 14.5+; ScriptProcessorNode is the fallback below that.
 * Down-sampled in the worklet (box-averaged, so it does not alias) to 16 kHz:
 * 32 KB/s on a phone's uplink instead of 96 KB/s at 48 kHz.
 *
 * ── Auth ──
 * GET /api/ai/stt-token (backend/services/sttStream.js). `direct` is a Deepgram
 * temporary token from /v1/auth/grant, passed as the `bearer` websocket
 * subprotocol because a browser cannot set an Authorization header on a
 * websocket — the same thing Deepgram's own browser SDK does (`@deepgram/sdk`
 * 5.15.0, CustomClient: `protocols.push("bearer", token)`, read 2026-10-15).
 * `relay` is a ticket for our own server, which holds the key and pipes bytes.
 */
import { api, BASE_URL } from './api';
import { asrLadder } from '../../shared/asr.js';

export const LIVE = {
    /** Deepgram's silence-after-speech before it marks `speech_final`
     *  (their default is 10 ms). Measured 2026-10-15 on a 0.64 s Kannada word,
     *  streamed in real time from Bangalore, speech end -> speech_final:
     *  100 ms ≈ 640, 200 ms ≈ 780, 300 ms ≈ 850, 500 ms ≈ 1060 ms. 200 leaves
     *  room for a geminate's closure (the dd in Chennagiddeeni) without
     *  splitting the word; the word-count hold below stops a hesitant
     *  multi-word answer being cut at its first pause. */
    endpointingMs: 200,
    /** Word-gap fallback for noisy rooms where endpointing never fires.
     *  1000 ms is Deepgram's minimum. */
    utteranceEndMs: 1000,
    /** After the local VAD or a tap ends the recording: how long to wait for
     *  Deepgram's final before falling back to the upload. VAD fires 0.7 s
     *  after speech ends, so this lands the fallback ~2 s after speech end. */
    finalWaitMs: 1300,
    sampleRate: 16000,
    /** 50 ms per websocket frame. */
    frameSamples: 800,
};

const TOKEN_MARGIN_MS = 15000;
let cached = null;      // { lang, data, expiresAt }
let inflight = null;    // { lang, promise }

const idOf = (lang) => String((typeof lang === 'object' ? lang?.id : lang) || '').toLowerCase().slice(0, 2);

/** True if this device and this language can try the live path at all. */
export function liveSupported(lang) {
    if (typeof window === 'undefined' || !window.WebSocket) return false;
    if (!(window.AudioContext || window.webkitAudioContext)) return false;
    if (window.__LIVE_STT_OFF || localStorage.getItem('linguapaws_live_stt') === 'off') return false;
    return asrLadder(idOf(lang)).some(r => r.engine === 'deepgram');
}

/** Fetch (or reuse) a credential. Called when a speak screen opens, so the tap
 *  does not wait on it. Never throws; resolves null when there is none. */
export function prefetchToken(lang) {
    const id = idOf(lang);
    if (!liveSupported(id)) return Promise.resolve(null);
    if (cached && cached.lang === id && Date.now() < cached.expiresAt - TOKEN_MARGIN_MS) {
        return Promise.resolve(cached.data);
    }
    if (inflight && inflight.lang === id) return inflight.promise;
    const promise = api.get(`/api/ai/stt-token?lang=${encodeURIComponent(id)}`)
        .then((data) => {
            if (!data?.supported || !data.token) return null;
            cached = { lang: id, data, expiresAt: Date.now() + (data.expiresIn || 30) * 1000 };
            return data;
        })
        .catch(() => null)
        .finally(() => { inflight = null; });
    inflight = { lang: id, promise };
    return promise;
}

function socketUrl(cred) {
    const q = new URLSearchParams({
        encoding: 'linear16', sample_rate: String(LIVE.sampleRate), channels: '1',
        interim_results: 'true', endpointing: String(LIVE.endpointingMs),
        utterance_end_ms: String(LIVE.utteranceEndMs), vad_events: 'true',
        /* Same formatting flags the pre-recorded call uses, so the transcript
           reaching romanise() looks the same either way. */
        smart_format: 'true', punctuate: 'true', filler_words: 'false',
    });
    if (cred.mode === 'direct') {
        q.set('model', cred.model);
        q.set('language', cred.language);
        return { url: `${cred.url}?${q}`, protocols: ['bearer', cred.token] };
    }
    q.set('ticket', cred.token);
    const base = BASE_URL || window.location.origin;
    return { url: `${base.replace(/^http/, 'ws')}${cred.path}?${q}`, protocols: undefined };
}

const WORKLET = `
class Pcm16 extends AudioWorkletProcessor {
  constructor(o) {
    super();
    this.step = sampleRate / ${LIVE.sampleRate};
    this.acc = 0; this.cnt = 0; this.pos = 0;
    this.out = new Int16Array(${LIVE.frameSamples}); this.n = 0;
    this.port.onmessage = () => this.flush();
  }
  flush() {
    if (!this.n) return;
    const b = this.out.slice(0, this.n);
    this.port.postMessage(b.buffer, [b.buffer]);
    this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.acc += ch[i]; this.cnt++; this.pos++;
      if (this.pos >= this.step) {
        this.pos -= this.step;
        let s = this.acc / this.cnt; this.acc = 0; this.cnt = 0;
        s = s < -1 ? -1 : s > 1 ? 1 : s;
        this.out[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
        if (this.n === this.out.length) this.flush();
      }
    }
    return true;
  }
}
registerProcessor('pcm16', Pcm16);
`;

/** Make the AudioContext inside the tap's own call stack, before any await:
 *  iOS Safari only lets a context start running from a user gesture. */
export function createLiveContext() {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ctx = new AC();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return ctx;
    } catch { return null; }
}

async function startCapture(ctx, stream, onFrame) {
    const source = ctx.createMediaStreamSource(stream);
    const sink = ctx.createGain();
    sink.gain.value = 0;
    sink.connect(ctx.destination);
    if (ctx.audioWorklet && window.AudioWorkletNode) {
        const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
        try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
        const node = new AudioWorkletNode(ctx, 'pcm16');
        node.port.onmessage = (e) => onFrame(e.data);
        source.connect(node);
        node.connect(sink);
        return {
            flush: () => node.port.postMessage('flush'),
            stop: () => { try { source.disconnect(); node.disconnect(); } catch { /* gone */ } },
        };
    }
    /* Older Safari: same resampling on the main thread. */
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    const step = ctx.sampleRate / LIVE.sampleRate;
    let acc = 0, cnt = 0, pos = 0;
    proc.onaudioprocess = (e) => {
        const ch = e.inputBuffer.getChannelData(0);
        const out = new Int16Array(Math.ceil(ch.length / step) + 1);
        let n = 0;
        for (let i = 0; i < ch.length; i++) {
            acc += ch[i]; cnt++; pos++;
            if (pos >= step) {
                pos -= step;
                const s = Math.max(-1, Math.min(1, acc / cnt)); acc = 0; cnt = 0;
                out[n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
        }
        if (n) onFrame(out.slice(0, n).buffer);
    };
    source.connect(proc);
    proc.connect(sink);
    return {
        flush: () => {},
        stop: () => { try { source.disconnect(); proc.disconnect(); } catch { /* gone */ } },
    };
}

/**
 * Open a live session on an already-open microphone stream.
 *
 *   onPartial(native)      every interim/final update, native script, joined
 *   onEndpoint(result)     Deepgram decided the learner has finished
 *   expectWords            words in the expected answer: an endpoint with
 *                          fewer words heard is a pause, not an end, and is
 *                          held until utterance-end, the local VAD or a tap
 *
 * Returns { finish(), abort(), failed() }. `finish()` resolves to
 * `{ native, speechEndAt, why }` or null — null meaning "use the upload".
 */
export function startLive({ stream, ctx, lang, onPartial, onEndpoint, expectWords = 1 }) {
    let ws = null;
    let capture = null;
    let failed = false;
    let settled = null;           // the result, once there is one
    let waiter = null;            // resolve() for a pending finish()
    let finals = [];
    let interim = '';
    let lastWordEnd = 0;          // seconds of audio sent
    let audioStartAt = 0;         // performance.now() of the first frame
    let heldEndpoint = false;
    let frames = 0;
    const pending = [];
    const t0 = performance.now();

    const text = () => [...finals, interim].join(' ').replace(/\s+/g, ' ').trim();
    const words = () => (finals.join(' ').match(/\S+/g) || []).length;

    const settle = (why, native) => {
        if (settled) return;
        settled = native
            ? { native, why, speechEndAt: audioStartAt ? audioStartAt + lastWordEnd * 1000 : null }
            : { native: null, why };
        teardown();
        if (waiter) { waiter(settled.native ? settled : null); waiter = null; }
        if (why === 'endpoint' || why === 'utterance_end') onEndpoint?.(settled);
    };
    const fail = (why) => {
        if (failed) return;
        failed = true;
        console.info(`[live-stt] fell back to upload: ${why}`);
        settle(why, null);
    };
    const teardown = () => {
        if (capture) { capture.stop(); capture = null; }
        if (ws && ws.readyState === WebSocket.OPEN) {
            try { ws.send(JSON.stringify({ type: 'CloseStream' })); } catch { /* gone */ }
        }
        if (ws) { const w = ws; setTimeout(() => { try { w.close(); } catch { /* gone */ } }, 300); }
        if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    };

    const onMessage = (ev) => {
        let m;
        try { m = JSON.parse(ev.data); } catch { return; }
        if (window.__LIVE_STT_DEBUG) console.info('[live-stt] msg', m.type, m.is_final ? 'final' : '', m.speech_final ? 'speech_final' : '', m.channel?.alternatives?.[0]?.transcript || '', `frames=${frames}`);
        if (m.type === 'Results') {
            const alt = m.channel?.alternatives?.[0] || {};
            const t = String(alt.transcript || '').trim();
            const w = alt.words || [];
            if (w.length) lastWordEnd = Math.max(lastWordEnd, w[w.length - 1].end || 0);
            if (m.is_final) {
                if (t) finals.push(t);
                interim = '';
            } else {
                interim = t;
            }
            onPartial?.(text());
            if (m.from_finalize) return settle('finalize', finals.join(' ').trim() || null);
            if (m.is_final && m.speech_final && finals.length) {
                if (words() >= expectWords) return settle('endpoint', finals.join(' ').trim());
                heldEndpoint = true;
            }
        } else if (m.type === 'UtteranceEnd' && finals.length) {
            settle('utterance_end', finals.join(' ').trim());
        }
    };

    (async () => {
        try {
            if (!ctx) return fail('no AudioContext');
            const cred = await prefetchToken(lang);
            if (settled) return undefined;
            if (!cred) return fail('no token');
            const { url, protocols } = socketUrl(cred);
            ws = protocols ? new WebSocket(url, protocols) : new WebSocket(url);
            ws.binaryType = 'arraybuffer';
            ws.onmessage = onMessage;
            ws.onopen = () => {
                console.info(`[live-stt] ${cred.mode} socket open in ${Math.round(performance.now() - t0)}ms`);
                for (const f of pending.splice(0)) ws.send(f);
            };
            ws.onerror = () => fail('socket error');
            ws.onclose = (e) => { if (!settled) fail(`socket closed ${e.code}`); };
            /* Capture starts at once; frames queue while the handshake runs. */
            capture = await startCapture(ctx, stream, (buf) => {
                if (!audioStartAt) audioStartAt = performance.now();
                frames += 1;
                if (ws.readyState === WebSocket.OPEN) ws.send(buf);
                else if (ws.readyState === WebSocket.CONNECTING) pending.push(buf);
            });
            if (ctx.state !== 'running') {
                await ctx.resume().catch(() => {});
                if (ctx.state !== 'running') return fail('AudioContext not running');
            }
        } catch (err) {
            fail(`setup: ${err?.message || err}`);
        }
        return undefined;
    })();

    return {
        /** The recording has ended (VAD, tap or cap). Resolve with what
         *  Deepgram heard, asking it to flush; null after `finalWaitMs`. */
        finish(waitMs = LIVE.finalWaitMs) {
            if (settled) return Promise.resolve(settled.native ? settled : null);
            if (failed || !ws) { fail('finished before the socket was up'); return Promise.resolve(null); }
            /* Deepgram has already called the end and nothing new has come in
               since: there is nothing to wait for. */
            /* Everything Deepgram has heard is already final and the local VAD
               (or a tap) says the learner has stopped: that is the answer.
               Asking Deepgram to Finalize would only re-send it, a round trip
               later. */
            if (!interim && finals.length) {
                settle(heldEndpoint ? 'endpoint_held' : 'vad_final', finals.join(' ').trim());
                return Promise.resolve(settled);
            }
            capture?.flush();
            /* Stop sending audio — the tail after the learner stopped is silence — and ask for the final. */
            setTimeout(() => {
                if (capture) { capture.stop(); capture = null; }
                if (ws?.readyState === WebSocket.OPEN) {
                    try { ws.send(JSON.stringify({ type: 'Finalize' })); } catch { /* gone */ }
                }
            }, 30);
            return new Promise((resolve) => {
                waiter = resolve;
                setTimeout(() => { if (!settled) fail(`no final within ${waitMs}ms`); }, waitMs);
            });
        },
        abort() { if (!settled) settle('aborted', null); },
        get failed() { return failed; },
    };
}
