let mediaRecorder;
let recordedChunks = [];
let screenStream;
let micStream;
let audioContext;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const messageEl = document.getElementById('message');
const micToggle = document.getElementById('micToggle');

/**
 * Gets the best supported MIME type for recording.
 */
function getSupportedMimeType() {
    const types = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
    ];
    return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

async function startRecording() {
    // Check for getDisplayMedia support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        updateMessage("Error: Screen recording is not supported on this browser.");
        return;
    }

    try {
        // 1. Request screen capture (with system audio hint)
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: { systemAudio: "include" }
        });

        const videoTrack = screenStream.getVideoTracks()[0];
        let finalAudioTrack = null;

        // 2. Handle Microphone if enabled
        if (micToggle && micToggle.checked) {
            try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const micTrack = micStream.getAudioTracks()[0];
                const systemAudioTrack = screenStream.getAudioTracks()[0];

                if (systemAudioTrack) {
                    // Mix both system and mic audio
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const systemSource = audioContext.createMediaStreamSource(new MediaStream([systemAudioTrack]));
                    const micSource = audioContext.createMediaStreamSource(new MediaStream([micTrack]));
                    const destination = audioContext.createMediaStreamDestination();

                    systemSource.connect(destination);
                    micSource.connect(destination);

                    finalAudioTrack = destination.stream.getAudioTracks()[0];
                } else {
                    // Only mic audio is available
                    finalAudioTrack = micTrack;
                }
            } catch (micErr) {
                console.warn("Microphone access denied or failed:", micErr);
                updateMessage("Note: Microphone recording failed. Using system audio only.");
                finalAudioTrack = screenStream.getAudioTracks()[0];
            }
        } else {
            // Only system audio
            finalAudioTrack = screenStream.getAudioTracks()[0];
        }

        // 3. Construct the combined stream
        const tracks = [videoTrack];
        if (finalAudioTrack) tracks.push(finalAudioTrack);
        const combinedStream = new MediaStream(tracks);

        // Detect supported MIME type
        const mimeType = getSupportedMimeType();
        if (!mimeType) {
            throw new Error("No supported video MIME types found in this browser.");
        }

        console.log(`Using MIME type: ${mimeType}`);

        // Initialize MediaRecorder
        mediaRecorder = new MediaRecorder(combinedStream, { mimeType });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const fileExt = mimeType.includes('mp4') ? 'mp4' : 'webm';

            a.href = url;
            a.download = `screen-recording-${Date.now()}.${fileExt}`;
            a.click();

            // Cleanup
            setTimeout(() => {
                URL.revokeObjectURL(url);
                recordedChunks = [];
            }, 100);

            updateMessage("Recording saved successfully!");
        };

        // Handle stream ending
        videoTrack.onended = () => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                stopRecording();
            }
        };

        mediaRecorder.start();

        // Update UI
        startBtn.disabled = true;
        stopBtn.disabled = false;
        if (micToggle) micToggle.disabled = true;
        updateMessage("Recording...");

    } catch (err) {
        console.error("Error starting recording:", err);
        updateMessage(`Error: ${err.message}`);
        cleanup();
        startBtn.disabled = false;
        stopBtn.disabled = true;
        if (micToggle) micToggle.disabled = false;
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    cleanup();
    startBtn.disabled = false;
    stopBtn.disabled = true;
    if (micToggle) micToggle.disabled = false;
    updateMessage("Recording stopped.");
}

function cleanup() {
    if (screenStream) screenStream.getTracks().forEach(track => track.stop());
    if (micStream) micStream.getTracks().forEach(track => track.stop());
    if (audioContext && audioContext.state !== 'closed') audioContext.close();
    screenStream = null;
    micStream = null;
    audioContext = null;
}

function updateMessage(msg) {
    if (messageEl) {
        messageEl.innerText = msg;
        messageEl.style.color = msg.startsWith('Error') ? 'red' : (msg.startsWith('Note') ? 'orange' : '#333');
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    if (startBtn) startBtn.addEventListener('click', startRecording);
    if (stopBtn) stopBtn.addEventListener('click', stopRecording);
});
