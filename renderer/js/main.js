// Main entry point for renderer process
import { showRecordPage } from './components/navigation.js';
import { saveSettings, setupShortcutCapture, updateShortcutInstructions } from './components/settings.js';
import { setupMicButtonHandlers, toggleRecording, startRecording, stopRecording } from './components/recording.js';
import { updateTranscription } from './components/transcription.js';
import { setupIPC, setCallbacks } from './services/ipc.js';
import { handleKeyDown, handleKeyUp, setupWindowBlurHandler } from './utils/keyboard.js';

// Initialize UI - Single DOMContentLoaded handler
document.addEventListener("DOMContentLoaded", () => {
  // Set up IPC callbacks first
  setCallbacks({
    updateTranscription,
    toggleRecording,
    startRecording,
    stopRecording
  });
  // Set up API key auto-save
  const apiKeyInput = document.getElementById("apiKey");
  if (apiKeyInput) {
    apiKeyInput.addEventListener("blur", () => {
      saveSettings();
    });
  }

  // Set up keyboard event listeners
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  // Set up shortcut capture
  setupShortcutCapture();

  // Show record page by default and ensure proper state
  showRecordPage();
  
  // Initialize button states
  const copyButton = document.getElementById("copyButton");
  const clearButton = document.getElementById("clearButton");
  if (copyButton) copyButton.disabled = true;
  if (clearButton) clearButton.disabled = true;
  
  updateShortcutInstructions();
  
  // Set up window blur handler
  setupWindowBlurHandler();
  
  // Set up mic button event handlers
  setupMicButtonHandlers();
  
  // Set up IPC communication
  setupIPC();
});