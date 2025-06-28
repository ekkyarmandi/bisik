// IPC communication service
import { getCustomShortcut, saveCustomShortcut, getActiveMode } from '../utils/storage.js';
import { showToast } from '../utils/toast.js';
import { TOAST_TYPES } from '../utils/constants.js';

let isHoldingKey = false;

// Store callback functions that will be set later
let updateTranscriptionCallback = null;
let toggleRecordingCallback = null;
let startRecordingCallback = null;
let stopRecordingCallback = null;

export function setCallbacks(callbacks) {
  updateTranscriptionCallback = callbacks.updateTranscription;
  toggleRecordingCallback = callbacks.toggleRecording;
  startRecordingCallback = callbacks.startRecording;
  stopRecordingCallback = callbacks.stopRecording;
}

export function setupIPC() {
  // Listen for transcription results
  window.electronAPI.on("transcription-result", (result) => {
    if (result.success) {
      if (updateTranscriptionCallback) updateTranscriptionCallback(result.text);
    } else {
      handleTranscriptionError(result.error);
    }
  });

  // Listen for recording control messages from main process
  window.electronAPI.on("toggle-recording", () => {
    const recordPage = document.getElementById("recordPage");
    if (recordPage && !recordPage.classList.contains("hidden")) {
      const shortcut = getCustomShortcut();
      const mode = shortcut.mode || 'toggle';
      
      if (mode === 'hold' && document.hasFocus()) {
        if (!isHoldingKey && toggleRecordingCallback) {
          toggleRecordingCallback();
        }
      } else if (toggleRecordingCallback) {
        toggleRecordingCallback();
      }
    }
  });

  window.electronAPI.on("start-recording-hold", () => {
    const recordPage = document.getElementById("recordPage");
    if (recordPage && !recordPage.classList.contains("hidden") && !window.isRecording && startRecordingCallback) {
      startRecordingCallback();
    }
  });

  window.electronAPI.on("stop-recording-hold", () => {
    const recordPage = document.getElementById("recordPage");
    if (recordPage && !recordPage.classList.contains("hidden") && window.isRecording && stopRecordingCallback) {
      stopRecordingCallback();
    }
  });

  // Legacy support
  window.electronAPI.on("backslash-double-tap", () => {
    const recordPage = document.getElementById("recordPage");
    if (recordPage && !recordPage.classList.contains("hidden") && toggleRecordingCallback) {
      toggleRecordingCallback();
    }
  });

  // Listen for play-mic-sound message from main process
  window.electronAPI.on("play-mic-sound", () => {
    window.micOnSound.play().catch((e) => console.log("Could not play paste sound:", e));
  });

  // Listen for test shortcut
  window.electronAPI.on("test-shortcut", () => {
    console.log("Test shortcut received - IPC communication working");
  });

  // Send saved shortcut to main process on request
  window.electronAPI.on("request-saved-shortcut", () => {
    const shortcut = getCustomShortcut();
    window.electronAPI.send("update-global-shortcut", shortcut);
  });
}

export function updateGlobalShortcut(shortcut) {
  window.electronAPI.send("update-global-shortcut", shortcut);
}

export function sendAudioForTranscription(audioBlob) {
  const reader = new FileReader();
  reader.onload = function () {
    const arrayBuffer = reader.result;
    const apiKey = localStorage.getItem("openai_api_key");
    const activeMode = getActiveMode();
    const prompt = activeMode ? activeMode.prompt : "";
    window.electronAPI.send("transcribe-audio", { audioBuffer: arrayBuffer, apiKey: apiKey, prompt: prompt });
  };
  reader.readAsArrayBuffer(audioBlob);
}

function handleTranscriptionError(error) {
  let errorTitle = 'Transcription Error';
  let errorMessage = error;
  
  if (error.includes('Audio file might be corrupted')) {
    errorTitle = 'Audio Error';
    errorMessage = 'The recording might be too short or corrupted. Try recording for at least 1 second.';
  } else if (error.includes('API key')) {
    errorTitle = 'API Key Error';
    errorMessage = 'Please check your OpenAI API key in settings.';
  } else if (error.includes('Could not access microphone')) {
    errorTitle = 'Microphone Error';
    errorMessage = 'Unable to access microphone. Please check permissions.';
  } else if (error.includes('quota')) {
    errorTitle = 'Quota Exceeded';
    errorMessage = 'Your OpenAI API quota has been exceeded.';
  } else if (error.includes('rate limit')) {
    errorTitle = 'Rate Limited';
    errorMessage = 'Too many requests. Please wait a moment and try again.';
  }
  
  showToast(TOAST_TYPES.ERROR, errorTitle, errorMessage, 7000);
  console.error('Transcription error:', error);
}

// Re-export for other modules
export function setIsHoldingKey(value) {
  isHoldingKey = value;
}

export function getIsHoldingKey() {
  return isHoldingKey;
}