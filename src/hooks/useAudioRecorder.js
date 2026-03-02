import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const mediaRecorder = useRef(null);
    const streamRef = useRef(null);
    const audioChunks = useRef([]);
    const isRecordingRef = useRef(false); // ref-based flag avoids stale closure issues

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

    const startRecording = useCallback(async () => {
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
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    }, []);

    const stopRecording = useCallback((shouldStopStream = false) => {
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

    return { isRecording, startRecording, stopRecording, prepare, audioUrl };
};
