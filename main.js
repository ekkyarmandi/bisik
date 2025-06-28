const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  globalShortcut,
  clipboard,
} = require("electron");
const path = require("path");
const fs = require("fs");
const OpenAI = require("openai");
const { exec } = require("child_process");
require("dotenv").config();

let mainWindow;
let tray;
let openai;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    show: false, // Start hidden for background operation
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "assets", "mic-icon.svg"),
  });

  // Set app info for macOS permissions
  if (process.platform === "darwin") {
    app.setName("Voice Transcription");
  }

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  // Request saved shortcut after window loads
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.send("request-saved-shortcut");
  });

  mainWindow.on("minimize", (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

let currentShortcutDisplay = "Double-tap \\";

function createTray() {
  // Use template images for automatic dark/light mode support
  const lightIconPath = path.join(__dirname, "assets", "tray-icon-light.png");

  let trayIcon = nativeImage.createFromPath(lightIconPath);

  // Set as template for automatic dark/light mode switching
  if (!trayIcon.isEmpty()) {
    trayIcon.setTemplateImage(true);
  } else {
    // Fallback if icon not found
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  updateTrayMenu();

  tray.on("click", () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

function updateTrayMenu() {
  if (!tray) return;
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Voice Transcription - Running",
      enabled: false,
    },
    {
      type: "separator",
    },
    {
      label: "Show App",
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: `Shortcut: ${currentShortcutDisplay}`,
      enabled: false,
    },
    {
      type: "separator",
    },
    {
      label: "Quit",
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`Voice Transcription - Press ${currentShortcutDisplay} to record`);
}

function initializeOpenAI() {
  // This function is now optional since we get API key from UI
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    return true;
  }
  return false;
}

function setupIPC() {
  // Handle shortcut updates from renderer
  ipcMain.on("update-global-shortcut", (event, shortcut) => {
    registerRecordingShortcut(shortcut);
    
    // Update tray display
    currentShortcutDisplay = shortcut.display || "Custom shortcut";
    updateTrayMenu();
  });

  ipcMain.on("transcribe-audio", async (event, data) => {
    try {
      const { audioBuffer, apiKey, prompt } = data;

      if (!apiKey) {
        event.reply("transcription-result", {
          success: false,
          error:
            "API key not provided. Please enter your OpenAI API key in settings.",
        });
        return;
      }

      // Create OpenAI instance with the provided API key
      const openaiInstance = new OpenAI({
        apiKey: apiKey,
      });

      // Save audio buffer to temporary file in the system temp directory
      const tempFilePath = path.join(
        app.getPath("temp"),
        "whisper_temp_audio.webm",
      );
      fs.writeFileSync(tempFilePath, Buffer.from(audioBuffer));

      // Create a readable stream for the OpenAI API
      const audioFile = fs.createReadStream(tempFilePath);

      // Prepare transcription options
      const transcriptionOptions = {
        file: audioFile,
        model: "gpt-4o-transcribe",
        response_format: "text",
      };

      // Add prompt if provided
      if (prompt && prompt.trim()) {
        transcriptionOptions.prompt = prompt;
      }

      // Call OpenAI Whisper API
      const transcriptionResponse =
        await openaiInstance.audio.transcriptions.create(transcriptionOptions);

      // Handle the response - it might be an object or a string
      const transcriptionText =
        typeof transcriptionResponse === "string"
          ? transcriptionResponse
          : transcriptionResponse.text || transcriptionResponse;

      // Clean up temporary file
      fs.unlinkSync(tempFilePath);

      // Auto-copy to clipboard and paste immediately
      clipboard.writeText(transcriptionText.trim());

      // Auto-paste the transcribed text after a short delay
      setTimeout(() => {
        if (process.platform === "darwin") {
          // macOS: Use osascript to simulate Cmd+V
          exec(
            'osascript -e \'tell application "System Events" to keystroke "v" using command down\'',
            (error, stdout, stderr) => {
              if (error) {
                console.error("Auto-paste error:", error);
              }
            },
          );
        } else {
          // Windows/Linux: Use xdotool or similar
          exec("xdotool key ctrl+v", (error, stdout, stderr) => {
            if (error) {
              console.error("Auto-paste error:", error);
            }
          });
        }
      }, 100);

      event.reply("transcription-result", {
        success: true,
        text: transcriptionText,
      });
    } catch (error) {
      console.error("Transcription error:", error);

      // Clean up temporary file if it exists
      const tempFilePath = path.join(
        app.getPath("temp"),
        "whisper_temp_audio.webm",
      );
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      // Extract more detailed error information
      let errorMessage = error.message || "Failed to transcribe audio";
      
      // Check for specific OpenAI API errors
      if (error.status === 400) {
        if (error.code === 'invalid_value' && error.param === 'file') {
          errorMessage = "Audio file might be corrupted or too short. Try recording for at least 1 second.";
        }
      } else if (error.status === 401) {
        errorMessage = "Invalid API key. Please check your OpenAI API key in settings.";
      } else if (error.status === 429) {
        errorMessage = "Rate limit exceeded. Please wait a moment and try again.";
      } else if (error.status === 402) {
        errorMessage = "OpenAI API quota exceeded. Please check your account.";
      }

      event.reply("transcription-result", {
        success: false,
        error: errorMessage,
      });
    }
  });
}

// Double-tap detection for shortcuts
let lastShortcutTime = 0;
const doubleTapDelay = 500; // 500ms window for double-tap
let currentRecordingShortcut = null;
let holdCheckInterval = null; // Store interval globally to clear it properly

function setupGlobalShortcuts() {
  globalShortcut.register("CommandOrControl+Shift+H", () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });

  // Add a test shortcut to verify global shortcuts work
  globalShortcut.register("CommandOrControl+Shift+T", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("test-shortcut");
    }
  });

  // Register default recording shortcut
  registerRecordingShortcut({ 
    mode: "double-tap",
    key: "\\",
    code: "Backslash",
    doubleTap: true,
    display: "Double-tap \\",
    allowSingleModifier: false
  });

  console.log(
    "Main Process: Global shortcuts registered (Cmd+Shift+H to toggle, Cmd+Shift+T to test)",
  );
}

function unregisterRecordingShortcut() {
  // Clear any hold-to-record interval
  if (holdCheckInterval) {
    clearInterval(holdCheckInterval);
    holdCheckInterval = null;
  }
  
  if (currentRecordingShortcut) {
    try {
      globalShortcut.unregister(currentRecordingShortcut);
      console.log("Unregistered shortcut:", currentRecordingShortcut);
    } catch (e) {
      console.error("Error unregistering shortcut:", e);
    }
    currentRecordingShortcut = null;
  }
}

function registerRecordingShortcut(shortcut) {
  // First unregister any existing recording shortcut
  unregisterRecordingShortcut();

  // Build the accelerator string
  const accelerator = buildAccelerator(shortcut);
  if (!accelerator) return;

  try {
    const mode = shortcut.mode || 'toggle';
    
    if (mode === 'hold') {
      // For hold-to-record, global shortcuts work as toggle since we can't detect key release
      // When app is focused, the renderer process will handle hold detection
      const registered = globalShortcut.register(accelerator, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          // Always send toggle-recording for global shortcuts
          // The renderer will handle the hold logic when focused
          mainWindow.webContents.send("toggle-recording");
        }
      });
      
      if (registered) {
        currentRecordingShortcut = accelerator;
        console.log("Registered hold-to-record shortcut:", accelerator);
        console.log("Note: Hold-to-record works properly when app is focused. When minimized, it works as toggle.");
      }
    } else if (mode === 'double-tap') {
      // Handle double-tap logic
      const registered = globalShortcut.register(accelerator, () => {
        const currentTime = Date.now();
        const timeDiff = currentTime - lastShortcutTime;

        if (timeDiff < doubleTapDelay && lastShortcutTime > 0) {
          // Double-tap detected
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("toggle-recording");
          }
          lastShortcutTime = 0; // Reset to prevent triple-tap issues
        } else {
          lastShortcutTime = currentTime;
        }
      });
      
      if (registered) {
        currentRecordingShortcut = accelerator;
        console.log("Registered double-tap shortcut:", accelerator);
      }
    } else {
      // Default toggle mode
      const registered = globalShortcut.register(accelerator, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("toggle-recording");
        }
      });
      
      if (registered) {
        currentRecordingShortcut = accelerator;
        console.log("Registered toggle shortcut:", accelerator);
      }
    }
  } catch (e) {
    console.error("Error registering shortcut:", e);
  }
}

function buildAccelerator(shortcut) {
  const parts = [];
  
  // Check if this is a single modifier key
  if (shortcut.allowSingleModifier) {
    // Handle single modifier keys
    if (shortcut.key === "Meta" || shortcut.key === "Command") return "Cmd";
    if (shortcut.key === "Control") return "Ctrl";
    if (shortcut.key === "Alt" || shortcut.key === "Option") return "Alt";
    if (shortcut.key === "Shift") return "Shift";
  }
  
  // Add modifiers
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.cmd) parts.push("Cmd");
  if (shortcut.alt) parts.push("Alt");
  if (shortcut.shift) parts.push("Shift");
  
  // Add the key
  let key = shortcut.key;
  
  // Handle special keys
  if (key === " ") key = "Space";
  else if (key === "ArrowUp") key = "Up";
  else if (key === "ArrowDown") key = "Down";
  else if (key === "ArrowLeft") key = "Left";
  else if (key === "ArrowRight") key = "Right";
  else if (key === "Tab") key = "Tab";
  else if (key === "Enter") key = "Return";
  else if (key === "Escape") key = "Esc";
  else if (key === "Backspace") key = "Backspace";
  else if (key === "Delete") key = "Delete";
  else if (key.length === 1) key = key.toUpperCase();
  
  // Don't add modifier keys as the main key
  if (!["Control", "Meta", "Command", "Alt", "Option", "Shift"].includes(shortcut.key)) {
    parts.push(key);
  }
  
  return parts.join("+");
}

app.whenReady().then(() => {
  if (!initializeOpenAI()) {
    console.warn(
      "OpenAI API not initialized. Please add OPENAI_API_KEY to your .env file",
    );
  }

  createWindow();
  createTray();
  setupIPC();
  setupGlobalShortcuts();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
