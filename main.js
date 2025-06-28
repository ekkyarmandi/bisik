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
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, "assets", "mic-icon.svg"),
  });

  // Set app info for macOS permissions
  if (process.platform === "darwin") {
    app.setName("Voice Transcription");
  }

  mainWindow.loadFile("index.html");

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
      label: "Shortcut: \\ x2",
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
  tray.setToolTip("Voice Transcription - Press \\ x2 to record");

  tray.on("click", () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
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

      event.reply("transcription-result", {
        success: false,
        error: error.message || "Failed to transcribe audio",
      });
    }
  });
}

// Double-tap detection for backslash
let lastBackslashTime = 0;
const doubleTapDelay = 500; // 500ms window for double-tap

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

  // Global backslash shortcut with double-tap detection
  globalShortcut.register("\\", () => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastBackslashTime;

    if (timeDiff < doubleTapDelay && lastBackslashTime > 0) {
      // Double-tap detected
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Send message to trigger recording (window stays in its current state)
        mainWindow.webContents.send("backslash-double-tap");
      }
      lastBackslashTime = 0; // Reset to prevent triple-tap issues
    } else {
      lastBackslashTime = currentTime;
    }
  });

  console.log(
    "Main Process: Global shortcuts registered (Cmd+Shift+H to toggle, Cmd+Shift+T to test, \\ x2 to record)",
  );
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
