// Constants and configuration
export const DEFAULT_SHORTCUT = { 
  mode: "double-tap",
  key: "\\", 
  code: "Backslash",
  doubleTap: true, 
  display: "Double-tap \\",
  allowSingleModifier: false
};

export const DOUBLE_TAP_DELAY = 500; // 500ms window for double-tap detection
export const MINIMUM_RECORDING_DURATION = 500; // Minimum 0.5 seconds

export const TOAST_TYPES = {
  ERROR: 'error',
  SUCCESS: 'success',
  INFO: 'info'
};

export const TOAST_ICONS = {
  error: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
  success: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>'
};