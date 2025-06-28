// Keyboard event handling utilities
import { getCustomShortcut } from './storage.js';
import { getIsCapturingShortcut } from '../components/settings.js';
import { toggleRecording, startRecording, stopRecording, setIsHoldingKey, getIsHoldingKey } from '../components/recording.js';
import { DOUBLE_TAP_DELAY } from './constants.js';

let lastKeyTime = 0;

export function handleKeyDown(event) {
  // Don't trigger shortcuts while capturing a new shortcut
  if (getIsCapturingShortcut()) return;
  
  // Don't handle if we're typing in an input field (except when it's the shortcut capture field)
  const activeElement = document.activeElement;
  if (activeElement && activeElement.tagName && 
      (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') &&
      activeElement.id !== 'recordShortcut') {
    return;
  }
  
  const shortcut = getCustomShortcut();
  const mode = shortcut.mode || 'toggle';
  
  // Check if the current key matches the custom shortcut
  const keyMatches = (event.key === shortcut.key || event.code === shortcut.code);
  const modifiersMatch = 
    (event.ctrlKey === (shortcut.ctrl || false)) &&
    (event.metaKey === (shortcut.cmd || false)) &&
    (event.altKey === (shortcut.alt || false)) &&
    (event.shiftKey === (shortcut.shift || false));
  
  if (keyMatches && modifiersMatch) {
    const recordPage = document.getElementById("recordPage");
    if (!recordPage || recordPage.classList.contains("hidden")) return;
    
    event.preventDefault();
    
    if (mode === 'hold') {
      // Hold-to-record mode
      if (!getIsHoldingKey() && !window.isRecording && !event.repeat) {
        console.log("Hold-to-record: Starting recording", { key: event.key, code: event.code });
        setIsHoldingKey(true);
        startRecording();
      }
    } else if (mode === 'double-tap') {
      // Double-tap mode
      if (!event.repeat) {
        const currentTime = Date.now();
        const timeDiff = currentTime - lastKeyTime;
        
        if (timeDiff < DOUBLE_TAP_DELAY && lastKeyTime > 0) {
          // Double-tap detected
          toggleRecording();
          lastKeyTime = 0; // Reset to prevent triple-tap issues
        } else {
          lastKeyTime = currentTime;
        }
      }
    } else {
      // Toggle mode (default)
      if (!event.repeat) {
        toggleRecording();
      }
    }
  }
}

export function handleKeyUp(event) {
  if (getIsCapturingShortcut()) return;
  
  // For hold mode, we need to detect key release
  const shortcut = getCustomShortcut();
  const mode = shortcut.mode || 'toggle';
  
  if (mode === 'hold' && getIsHoldingKey() && window.isRecording) {
    // Simplified key matching - check if the main key or any modifier was released
    const keyMatches = (event.key === shortcut.key || event.code === shortcut.code);
    
    // Check if any required modifier was released
    const modifierReleased = 
      (shortcut.ctrl && event.key === 'Control') ||
      (shortcut.cmd && (event.key === 'Meta' || event.key === 'Command')) ||
      (shortcut.alt && (event.key === 'Alt' || event.key === 'Option')) ||
      (shortcut.shift && event.key === 'Shift');
    
    // Stop recording if the main key or any required modifier was released
    if (keyMatches || modifierReleased) {
      console.log("Hold-to-record: Stopping recording", {
        key: event.key,
        code: event.code,
        keyMatches,
        modifierReleased,
        holdDuration: Date.now() - Date.now()
      });
      
      event.preventDefault();
      setIsHoldingKey(false);
      stopRecording();
    }
  }
}

export function setupWindowBlurHandler() {
  window.addEventListener('blur', () => {
    const shortcut = getCustomShortcut();
    if (shortcut.mode === 'hold' && getIsHoldingKey() && window.isRecording) {
      console.log("Window lost focus during hold-to-record, stopping recording");
      setIsHoldingKey(false);
      stopRecording();
    }
  });
}