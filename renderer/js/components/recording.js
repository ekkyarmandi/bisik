// Recording component
import { getCustomShortcut, getActiveMode } from '../utils/storage.js';
import { showToast } from '../utils/toast.js';
import { sendAudioForTranscription } from '../services/ipc.js';
import { clearTranscription } from './transcription.js';
import { MINIMUM_RECORDING_DURATION, TOAST_TYPES } from '../utils/constants.js';

// Recording state
window.isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = 0;
let isHoldingKey = false;
let holdStartTime = 0;

// Audio feedback
window.micOnSound = new Audio("../sounds/mic-on.wav");
// Handle missing audio file gracefully
window.micOnSound.addEventListener('error', () => {
  console.warn('Audio file not found: ../sounds/mic-on.wav');
});

export function updateActiveModeIndicator() {
  const activeMode = getActiveMode();
  const indicator = document.getElementById("activeModeIndicator");
  
  if (activeMode) {
    indicator.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-green-500"></div>
        <span class="text-gray-600">Mode:</span>
        <span class="font-medium text-gray-800">${activeMode.name}</span>
      </div>
    `;
  } else {
    indicator.innerHTML = `
      <div class="flex items-center gap-2 text-gray-500">
        <div class="w-2 h-2 rounded-full bg-gray-300"></div>
        <span>No active mode</span>
      </div>
    `;
  }
}

export function toggleRecording() {
  const shortcut = getCustomShortcut();
  const mode = shortcut.mode || 'toggle';
  
  if (mode === 'hold') {
    if (window.isRecording) {
      isHoldingKey = false;
      stopRecording();
    } else {
      isHoldingKey = true;
      holdStartTime = Date.now();
      startRecording();
    }
  } else {
    if (window.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }
}

export async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const recordingDuration = Date.now() - recordingStartTime;
      
      if (recordingDuration < MINIMUM_RECORDING_DURATION) {
        showToast(TOAST_TYPES.INFO, 'Recording Too Short', 'Please record for at least 0.5 seconds', 3000);
        return;
      }
      
      const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      sendAudioForTranscription(audioBlob);
    };

    mediaRecorder.start();
    window.isRecording = true;
    recordingStartTime = Date.now();
    updateRecordButton();
    clearTranscription();
    updateActiveModeIndicator();

    // Play mic activation sound
    window.micOnSound.play().catch((e) => console.log("Could not play sound:", e));
  } catch (error) {
    console.error("Error starting recording:", error);
    window.isRecording = false;
    updateRecordButton();
    
    let errorMessage = "Could not access microphone";
    if (error.name === 'NotAllowedError') {
      errorMessage = "Microphone access denied. Please check your permissions.";
    } else if (error.name === 'NotFoundError') {
      errorMessage = "No microphone found. Please connect a microphone.";
    } else if (error.name === 'NotReadableError') {
      errorMessage = "Microphone is already in use by another application.";
    }
    
    showToast(TOAST_TYPES.ERROR, 'Microphone Error', errorMessage);
  }
}

export function stopRecording() {
  if (mediaRecorder && window.isRecording) {
    // Play mic deactivation sound immediately when stopping
    window.micOnSound.play().catch((e) => console.log("Could not play deactivate sound:", e));
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    window.isRecording = false;
    updateRecordButton();
  }
}

function updateRecordButton() {
  const button = document.getElementById("micButton");
  const icon = document.getElementById("micIcon");

  if (window.isRecording) {
    button.classList.remove("bg-gray-600", "hover:bg-red-500", "hover:scale-105");
    button.classList.add("bg-red-500", "recording");
    // Change to mic-off icon when recording
    icon.innerHTML =
      '<path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>';
  } else {
    button.classList.remove("bg-red-500", "recording");
    button.classList.add("bg-gray-600", "hover:bg-red-500", "hover:scale-105");
    // Change back to mic-on icon when not recording
    icon.innerHTML = '<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.93V21h2v-3.07c3.39-.5 6-3.4 6-6.93h-2z"/>';
  }
}

export function setupMicButtonHandlers() {
  const micButton = document.getElementById('micButton');
  if (micButton) {
    let isMouseDown = false;
    
    micButton.addEventListener('mousedown', (e) => {
      const shortcut = getCustomShortcut();
      if (shortcut.mode === 'hold' && !window.isRecording) {
        isMouseDown = true;
        isHoldingKey = true;
        holdStartTime = Date.now();
        startRecording();
        e.preventDefault();
      } else if (shortcut.mode !== 'hold') {
        toggleRecording();
      }
    });
    
    micButton.addEventListener('mouseup', (e) => {
      const shortcut = getCustomShortcut();
      if (shortcut.mode === 'hold' && isMouseDown && window.isRecording) {
        isMouseDown = false;
        isHoldingKey = false;
        stopRecording();
        e.preventDefault();
      }
    });
    
    micButton.addEventListener('mouseleave', (e) => {
      const shortcut = getCustomShortcut();
      if (shortcut.mode === 'hold' && isMouseDown && window.isRecording) {
        isMouseDown = false;
        isHoldingKey = false;
        stopRecording();
      }
    });
    
    // Handle touch events for mobile/touch devices
    micButton.addEventListener('touchstart', (e) => {
      const shortcut = getCustomShortcut();
      if (shortcut.mode === 'hold' && !window.isRecording) {
        isMouseDown = true;
        isHoldingKey = true;
        holdStartTime = Date.now();
        startRecording();
        e.preventDefault();
      } else if (shortcut.mode !== 'hold') {
        toggleRecording();
      }
    });
    
    micButton.addEventListener('touchend', (e) => {
      const shortcut = getCustomShortcut();
      if (shortcut.mode === 'hold' && isMouseDown && window.isRecording) {
        isMouseDown = false;
        isHoldingKey = false;
        stopRecording();
        e.preventDefault();
      }
    });
  }
}

// Export hold state management
export function setIsHoldingKey(value) {
  isHoldingKey = value;
}

export function getIsHoldingKey() {
  return isHoldingKey;
}

export function getHoldStartTime() {
  return holdStartTime;
}

// Make toggleRecording available globally for onclick handlers
window.toggleRecording = toggleRecording;