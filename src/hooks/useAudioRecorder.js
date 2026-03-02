import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const isRecordingRef = useRef(false); // ref-based flag avoids stale closure issues

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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

            // Request data every 250ms so chunks accumulate even for short recordings
            mediaRecorder.current.start(250);
            isRecordingRef.current = true;
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorder.current && isRecordingRef.current) {
            isRecordingRef.current = false;
            setIsRecording(false);

            return new Promise((resolve) => {
                const handleStop = () => {
                    mediaRecorder.current.removeEventListener('stop', handleStop);

                    // Stop all tracks so the browser releases the mic indicator
                    const tracks = mediaRecorder.current.stream?.getTracks();
                    if (tracks) tracks.forEach(t => t.stop());

                    const mimeType = mediaRecorder.current.mimeType || 'audio/webm';
                    const audioBlob = new Blob(audioChunks.current, { type: mimeType });
                    const url = URL.createObjectURL(audioBlob);
                    setAudioUrl(url);
                    resolve(audioBlob);
                };
                mediaRecorder.current.addEventListener('stop', handleStop);
                mediaRecorder.current.stop();
            });
        }
        return Promise.resolve(null);
    }, []);

    return { isRecording, startRecording, stopRecording, audioUrl };
};
