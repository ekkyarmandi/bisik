// Local storage management utilities
import { DEFAULT_SHORTCUT } from './constants.js';

export function saveApiKey(apiKey) {
  if (apiKey) {
    localStorage.setItem("openai_api_key", apiKey);
  }
}

export function getApiKey() {
  return localStorage.getItem("openai_api_key");
}

export function getCustomShortcut() {
  const saved = localStorage.getItem("custom_shortcut");
  return saved ? JSON.parse(saved) : DEFAULT_SHORTCUT;
}

export function saveCustomShortcut(shortcut) {
  localStorage.setItem("custom_shortcut", JSON.stringify(shortcut));
}

export function getModes() {
  const modes = localStorage.getItem("transcription_modes");
  return modes ? JSON.parse(modes) : [];
}

export function saveModes(modes) {
  localStorage.setItem("transcription_modes", JSON.stringify(modes));
}

export function getActiveMode() {
  const activeModeId = localStorage.getItem("active_mode_id");
  const modes = getModes();
  return modes.find((mode) => mode.id === activeModeId) || null;
}

export function setActiveMode(modeId) {
  localStorage.setItem("active_mode_id", modeId);
}