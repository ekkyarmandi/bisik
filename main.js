const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
require('dotenv').config();

let mainWindow;
let tray;
let openai;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', 'mic-icon.svg')
  });

  // Set app info for macOS permissions
  if (process.platform === 'darwin') {
    app.setName('Voice Transcription');
  }

  mainWindow.loadFile('index.html');

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'mic-icon.svg');
  let trayIcon = nativeImage.createFromPath(iconPath);
  
  // Resize for tray if needed
  if (!trayIcon.isEmpty()) {
    trayIcon = trayIcon.resize({ width: 22, height: 22 });
  }
  
  if (trayIcon.isEmpty()) {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Voice Transcription App');

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

function initializeOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not found in environment variables');
    return false;
  }
  
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  return true;
}

function setupIPC() {
  ipcMain.on('transcribe-audio', async (event, audioBuffer) => {
    try {
      if (!openai) {
        event.reply('transcription-result', {
          success: false,
          error: 'OpenAI not initialized. Please check your API key.'
        });
        return;
      }

      // Save audio buffer to temporary file
      const tempFilePath = path.join(__dirname, 'temp_audio.webm');
      fs.writeFileSync(tempFilePath, Buffer.from(audioBuffer));

      // Create a readable stream for the OpenAI API
      const audioFile = fs.createReadStream(tempFilePath);

      // Call OpenAI Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'text',
      });

      // Clean up temporary file
      fs.unlinkSync(tempFilePath);

      event.reply('transcription-result', {
        success: true,
        text: transcription
      });

    } catch (error) {
      console.error('Transcription error:', error);
      
      // Clean up temporary file if it exists
      const tempFilePath = path.join(__dirname, 'temp_audio.webm');
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      event.reply('transcription-result', {
        success: false,
        error: error.message || 'Failed to transcribe audio'
      });
    }
  });
}

function setupGlobalShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

app.whenReady().then(() => {
  if (!initializeOpenAI()) {
    console.warn('OpenAI API not initialized. Please add OPENAI_API_KEY to your .env file');
  }
  
  createWindow();
  createTray();
  setupIPC();
  setupGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});