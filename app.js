let mediaRecorder;
let recordedChunks = [];
let screenStream;

async function startRecording() {
    // Check for getDisplayMedia support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert("Screen recording is not supported on this device.");
        return;
    }

    try {
        // Request permissions for screen capture
        screenStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: true, 
            audio: true // Include if you want to capture audio
        });

        // Initialize MediaRecorder
        mediaRecorder = new MediaRecorder(screenStream, { mimeType: 'video/webm' });

        mediaRecorder.ondataavailable = function (event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = function () {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'screen-recording.webm'; // Change to .mp4 if necessary
            a.click();
            URL.revokeObjectURL(url);
            recordedChunks = []; // Reset recorded chunks
            updateMessage("Recording saved successfully!");
        };

        mediaRecorder.start();

        // Update button states
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        updateMessage("Recording...");

    } catch (err) {
        console.error("Error accessing display media: ", err);
        alert("Failed to start screen recording: " + err.message);
    }
}

function stopRecording() {
    mediaRecorder.stop();
    screenStream.getTracks().forEach(track => track.stop());

    // Update button states
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    updateMessage("Recording stopped.");
}

function updateMessage(msg) {
    document.getElementById('message').innerText = msg;
}
