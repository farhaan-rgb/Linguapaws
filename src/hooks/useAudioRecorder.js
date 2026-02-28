import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const mimeTypeRef = useRef(null);
    const streamRef = useRef(null);

    const startRecording = useCallback(async () => {
        try {
            if (typeof MediaRecorder === 'undefined') {
                throw new Error('MediaRecorder is not supported in this browser.');
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const preferredTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/ogg',
                'audio/mp4',
            ];
            const supported = preferredTypes.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
            mimeTypeRef.current = supported || null;
            mediaRecorder.current = new MediaRecorder(stream, supported ? { mimeType: supported } : undefined);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: mimeTypeRef.current || 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((track) => track.stop());
                    streamRef.current = null;
                }
            };

            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorder.current && isRecording) {
            return new Promise((resolve) => {
                const handleStop = () => {
                    if (!audioChunks.current.length) {
                        mediaRecorder.current.removeEventListener('stop', handleStop);
                        resolve(null);
                        return;
                    }
                    const audioBlob = new Blob(audioChunks.current, { type: mimeTypeRef.current || 'audio/webm' });
                    mediaRecorder.current.removeEventListener('stop', handleStop);
                    resolve(audioBlob);
                };
                mediaRecorder.current.addEventListener('stop', handleStop, { once: true });
                try {
                    mediaRecorder.current.requestData();
                } catch { /* ignore */ }
                mediaRecorder.current.stop();
                setIsRecording(false);
            });
        }
        return null;
    }, [isRecording]);

    return { isRecording, startRecording, stopRecording, audioUrl };
};
