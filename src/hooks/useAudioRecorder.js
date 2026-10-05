import { useState, useRef, useCallback } from 'react';

/* ── Hands-free stop (opt-in) ────────────────────────────────────────────────
   Step mode asks for one tap, not two: the recording ends itself when the
   learner has finished speaking. Detection is RMS energy from an AnalyserNode
   on the stream already open for MediaRecorder — no second getUserMedia, no
   model, nothing sent anywhere.

   The thresholds are relative to the room, not absolute, because the failure
   that matters is cutting off a soft-spoken learner mid-word, and a fixed bar
   tuned on a loud laptop mic does exactly that on a quiet phone. The floor is
   the quietest smoothed level seen so far this recording; speech has to clear
   both an absolute minimum and a multiple of that floor. Silence uses a lower
   bar than speech (hysteresis), so the trailing soft syllable of a word — the
   part Indic endings live in — keeps the recording alive rather than ending it.

   Callers that pass no `vad` option get the old two-tap recorder unchanged. */
export const VAD = {
    /** No speech by now: stop, and call it nothing heard. */
    noSpeechMs: 2500,
    /** This much continuous quiet after speech ends the recording. */
    silenceMs: 1000,
    /** Whatever happens, never longer than this. */
    maxMs: 6000,
    /** Above this for `speechHoldMs` counts as speech having started. */
    speechMinRms: 0.010,
    speechOverFloor: 2.5,
    speechHoldMs: 90,
    /** Below this (lower than the speech bar) counts as silence. */
    silenceMinRms: 0.006,
    silenceOverFloor: 1.6,
    /** The room's noise is never taken to be louder than this. */
    floorCap: 0.015,
    tickMs: 30,
};

function startVad(stream, onStop) {
    const timers = [];
    let ctx = null;
    /* Held for the life of the recording on purpose. Nothing else references
       the source node, and Chrome garbage-collects an unreferenced
       MediaStreamAudioSourceNode — after which the analyser reads digital
       silence and every recording ends as "nothing heard". Found in headless
       Chrome with a fake mic: it passed only while a debug line held it. */
    let source = null;
    let finished = false;
    const stop = (reason) => {
        if (finished) return;
        finished = true;
        teardown();
        onStop(reason);
    };
    const teardown = () => {
        timers.forEach(t => { clearInterval(t); clearTimeout(t); });
        if (source) { try { source.disconnect(); } catch { /* already gone */ } source = null; }
        if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    };

    // The hard cap holds even where energy detection cannot run.
    timers.push(setTimeout(() => stop('cap'), VAD.maxMs));

    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) throw new Error('no AudioContext');
        ctx = new AC();
        source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});

        const t0 = performance.now();
        let smooth = null;
        let floor = Infinity;
        let loudFor = 0;
        let spoke = false;
        let lastVoice = 0;
        let ran = false;
        let heardSignal = false;
        timers.push(setInterval(() => {
            const now = performance.now();
            /* A context that never started reads as perfect silence, and
               silence would be reported as "nothing heard" to someone who
               spoke. Without a running context, fall back to the cap and the
               learner's own tap. */
            if (ctx?.state !== 'running') {
                if (!ran && now - t0 > 800) {
                    teardown();
                    timers.push(setTimeout(() => stop('cap'), Math.max(0, VAD.maxMs - (now - t0))));
                }
                return;
            }
            ran = true;
            /* Also keeps the stream reachable from this timer — see `source`. */
            if (stream.getAudioTracks().every(t => t.readyState === 'ended')) return;
            analyser.getFloatTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
            const rms = Math.sqrt(sum / buf.length);
            /* A live microphone always carries some noise. Exact digital zero
               means the analyser is not receiving the stream (seen
               intermittently in headless Chrome), not that the learner is
               quiet — so it never counts as "nothing heard"; the cap and the
               learner's own tap end the recording instead. */
            if (rms > 0) heardSignal = true;
            smooth = smooth == null ? rms : smooth * 0.6 + rms * 0.4;
            floor = Math.min(floor, Math.max(smooth, 0.0005));

            /* Clamped, so a learner already talking when the mic opens (whose
               "floor" is their own voice) still clears the bar. */
            const room = Math.min(floor, VAD.floorCap);
            const speechBar = Math.max(VAD.speechMinRms, room * VAD.speechOverFloor);
            const silenceBar = Math.max(VAD.silenceMinRms, room * VAD.silenceOverFloor);

            if (!spoke) {
                loudFor = smooth > speechBar ? loudFor + VAD.tickMs : 0;
                if (loudFor >= VAD.speechHoldMs) { spoke = true; lastVoice = now; }
                else if (now - t0 > VAD.noSpeechMs && heardSignal) stop('nospeech');
                return;
            }
            if (smooth > silenceBar) lastVoice = now;
            else if (now - lastVoice > VAD.silenceMs) stop('silence');
        }, VAD.tickMs));
    } catch {
        /* Not a real MediaStream (the preview harness), or no Web Audio:
           the cap above still ends the recording. */
        if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    }

    return () => { finished = true; teardown(); };
}

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const mediaRecorder = useRef(null);
    const streamRef = useRef(null);
    const audioChunks = useRef([]);
    const isRecordingRef = useRef(false); // ref-based flag avoids stale closure issues
    const vadStop = useRef(null);

    const prepare = useCallback(async () => {
        if (streamRef.current && streamRef.current.active) return streamRef.current;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            return stream;
        } catch (err) {
            console.error("Error warming up microphone:", err);
            return null;
        }
    }, []);

    /** `opts.vad.onAutoStop(reason)` — reason is 'silence' | 'nospeech' | 'cap'.
     *  The hook does not stop the recorder itself: the caller does, through
     *  the same stopRecording path a tap uses, so there is one way out. */
    const startRecording = useCallback(async (opts = {}) => {
        try {
            // Use existing stream if available and active, otherwise get a new one
            let stream = streamRef.current;
            if (!stream || !stream.active) {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
            }

            // Determine a widely-supported MIME type
            const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
            const mimeType = preferredTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';

            mediaRecorder.current = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            // Request data every 100ms (more frequent than 250ms for better responsiveness)
            mediaRecorder.current.start(100);
            isRecordingRef.current = true;
            setIsRecording(true);
            if (opts.vad?.onAutoStop) {
                vadStop.current = startVad(stream, (reason) => {
                    vadStop.current = null;
                    if (isRecordingRef.current) opts.vad.onAutoStop(reason);
                });
            }
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    }, []);

    const stopRecording = useCallback((shouldStopStream = false) => {
        if (vadStop.current) { vadStop.current(); vadStop.current = null; }
        if (mediaRecorder.current && isRecordingRef.current) {
            isRecordingRef.current = false;
            setIsRecording(false);

            return new Promise((resolve) => {
                const handleStop = () => {
                    mediaRecorder.current.removeEventListener('stop', handleStop);

                    if (shouldStopStream) {
                        const tracks = streamRef.current?.getTracks();
                        if (tracks) tracks.forEach(t => t.stop());
                        streamRef.current = null;
                    }

                    const mimeType = mediaRecorder.current.mimeType || 'audio/webm';
                    const audioBlob = new Blob(audioChunks.current, { type: mimeType });
                    const url = URL.createObjectURL(audioBlob);
                    setAudioUrl(url);
                    resolve(audioBlob);
                };
                mediaRecorder.current.addEventListener('stop', handleStop);

                // Add a small delay before actual stop to catch trailing audio
                setTimeout(() => {
                    if (mediaRecorder.current.state !== 'inactive') {
                        mediaRecorder.current.stop();
                    }
                }, 200);
            });
        }
        return Promise.resolve(null);
    }, []);

    return { isRecording, isRecordingRef, startRecording, stopRecording, prepare, audioUrl };
};


