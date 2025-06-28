// Settings component
import { saveApiKey, getApiKey, getCustomShortcut, saveCustomShortcut, DEFAULT_SHORTCUT } from '../utils/storage.js';
import { updateGlobalShortcut } from '../services/ipc.js';

let isCapturingShortcut = false;
let currentKeys = new Set();

export function saveSettings() {
  const apiKey = document.getElementById("apiKey").value;
  saveApiKey(apiKey);
}

export function loadSettings() {
  const apiKey = getApiKey();
  if (apiKey) {
    document.getElementById("apiKey").value = apiKey;
  }
  loadShortcutSettings();
}

export function loadShortcutSettings() {
  const shortcut = getCustomShortcut();
  const input = document.getElementById("recordShortcut");
  if (input) {
    input.value = shortcut.display;
  }
  
  // Load recording mode
  updateRecordingModeUI();
  
  // Load single modifier setting
  const singleModCheckbox = document.getElementById("allowSingleModifier");
  if (singleModCheckbox) {
    singleModCheckbox.checked = shortcut.allowSingleModifier || false;
  }
}

export function setRecordingMode(mode) {
  const shortcut = getCustomShortcut();
  shortcut.mode = mode;
  shortcut.doubleTap = (mode === 'double-tap');
  saveCustomShortcut(shortcut);
  updateRecordingModeUI();
}

export function updateRecordingModeUI() {
  const shortcut = getCustomShortcut();
  const mode = shortcut.mode || 'toggle';
  
  // Update button states
  document.querySelectorAll('.recording-mode-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Set active button
  if (mode === 'toggle') {
    document.getElementById('modeToggle').classList.add('active');
    document.getElementById('modeDescription').textContent = 'Press once to start, press again to stop';
  } else if (mode === 'hold') {
    document.getElementById('modeHold').classList.add('active');
    document.getElementById('modeDescription').textContent = 'Hold key down to record, release to stop (works best when app is focused)';
  } else if (mode === 'double-tap') {
    document.getElementById('modeDoubleTap').classList.add('active');
    document.getElementById('modeDescription').textContent = 'Double-tap quickly to start/stop recording';
  }
}

export function updateSingleModifierSetting() {
  const checked = document.getElementById('allowSingleModifier').checked;
  const shortcut = getCustomShortcut();
  shortcut.allowSingleModifier = checked;
  saveCustomShortcut(shortcut);
}

export function resetToDefaultShortcut() {
  saveCustomShortcut(DEFAULT_SHORTCUT);
  updateGlobalShortcut(DEFAULT_SHORTCUT);
  loadShortcutSettings();
  updateShortcutInstructions();
}

export function updateShortcutInstructions() {
  const shortcut = getCustomShortcut();
  const instructionElements = document.querySelectorAll('[data-shortcut-instruction]');
  instructionElements.forEach(el => {
    el.textContent = `Shortcut: ${shortcut.display}`;
  });
}

export function setupShortcutCapture() {
  const input = document.getElementById("recordShortcut");
  if (!input) return;

  input.addEventListener("focus", () => {
    isCapturingShortcut = true;
    currentKeys.clear();
    input.value = "Press keys...";
    input.classList.add("bg-blue-50");
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (isCapturingShortcut) {
        isCapturingShortcut = false;
        input.classList.remove("bg-blue-50");
        currentKeys.clear();
        loadShortcutSettings();
      }
    }, 200);
  });

  let lastKeyEvent = null;
  
  input.addEventListener("keydown", (e) => {
    if (!isCapturingShortcut) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const key = e.key;
    const code = e.code;
    
    // Handle Enter to save shortcut
    if (key === "Enter" && lastKeyEvent) {
      const existingShortcut = getCustomShortcut();
      const shortcut = {
        mode: existingShortcut.mode || 'toggle',
        key: lastKeyEvent.key,
        code: lastKeyEvent.code,
        ctrl: lastKeyEvent.ctrlKey,
        cmd: lastKeyEvent.metaKey,
        alt: lastKeyEvent.altKey,
        shift: lastKeyEvent.shiftKey,
        doubleTap: existingShortcut.mode === 'double-tap',
        display: input.value,
        allowSingleModifier: existingShortcut.allowSingleModifier
      };
      
      saveCustomShortcut(shortcut);
      updateGlobalShortcut(shortcut);
      isCapturingShortcut = false;
      input.classList.remove("bg-blue-50");
      currentKeys.clear();
      lastKeyEvent = null;
      input.blur();
      updateShortcutInstructions();
      return;
    }
    
    // Handle Escape to cancel
    if (key === "Escape") {
      isCapturingShortcut = false;
      lastKeyEvent = null;
      input.blur();
      return;
    }
    
    // Skip Enter and Escape for capture
    if (key !== "Enter" && key !== "Escape") {
      currentKeys.add({ key, code });
      
      lastKeyEvent = {
        key: key,
        code: code,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey
      };
      
      input.value = formatShortcutDisplay(e);
    }
  });

  input.addEventListener("keyup", (e) => {
    if (!isCapturingShortcut) return;
    
    const key = e.key;
    currentKeys.forEach(k => {
      if (k.key === key) currentKeys.delete(k);
    });
  });
}

function formatShortcutDisplay(event) {
  const parts = [];
  if (event.ctrlKey || event.metaKey) parts.push(process.platform === "darwin" ? "Cmd" : "Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  
  let key = event.key;
  if (key === " ") key = "Space";
  else if (key === "\\") key = "\\";
  else if (key.length === 1) key = key.toUpperCase();
  
  parts.push(key);
  return parts.join("+");
}

// Export for shortcut capture state
export function getIsCapturingShortcut() {
  return isCapturingShortcut;
}

// Make functions available globally for onclick handlers
window.setRecordingMode = setRecordingMode;
window.updateSingleModifierSetting = updateSingleModifierSetting;
window.resetToDefaultShortcut = resetToDefaultShortcut;
window.saveSettings = saveSettings;