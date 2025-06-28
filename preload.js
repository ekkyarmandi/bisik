// Preload script for secure IPC communication
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Send messages to main process
  send: (channel, data) => {
    const validChannels = ['transcribe-audio', 'update-global-shortcut'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // Receive messages from main process
  on: (channel, callback) => {
    const validChannels = [
      'transcription-result',
      'toggle-recording',
      'start-recording-hold',
      'stop-recording-hold',
      'backslash-double-tap',
      'play-mic-sound',
      'test-shortcut',
      'request-saved-shortcut'
    ];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  // Remove all listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});