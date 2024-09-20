let mediaRecorder;
let recordedChunks = [];
let screenStream;

async function startRecording() {
    try {
        // Request permissions for screen capture
        screenStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: true, 
            audio: true // Include this if you want to capture audio
        });

        // Initialize MediaRecorder to record the stream
        mediaRecorder = new MediaRecorder(screenStream, { mimeType: 'video/webm' });

        // Collect data chunks when available
        mediaRecorder.ondataavailable = function (event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        // When the recording stops, trigger file saving
        mediaRecorder.onstop = function () {
            const blob = new Blob(recordedChunks, {
                type: 'video/webm' // Change this if you want a different format
            });
            const url = URL.createObjectURL(blob);

            // Create a download link and trigger click
            const a = document.createElement('a');
            a.href = url;
            a.download = 'screen-recording.webm'; // You can change the extension here
            a.click();

            // Revoke the object URL after download to free up memory
            URL.revokeObjectURL(url);

            // Reset recorded chunks
            recordedChunks = [];
        };

        // Start recording the screen stream
        mediaRecorder.start();

        // Update button states
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;

    } catch (err) {
        console.error("Error accessing display media: ", err);
        alert("Failed to start screen recording: " + err.message);
    }
}

function stopRecording() {
    // Stop the MediaRecorder and the screen stream
    mediaRecorder.stop();
    screenStream.getTracks().forEach(track => track.stop());

    // Update button states
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}
