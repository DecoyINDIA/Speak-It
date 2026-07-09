const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, clipboard } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow = null;
let indicatorWindow = null;
let appTray = null;
let isRecording = false;
let currentHotkey = 'Alt+Space';

// Create the main dashboard/settings window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    show: false, // Start hidden, toggle from tray/hotkey
    resizable: true,
    backgroundColor: '#0f1011',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'renderer', 'logo.png') // Fallback if icon doesn't exist
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Prevent window from closing, hide it instead to keep app running in tray
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

// Create the floating recording indicator overlay
function createIndicatorWindow() {
  indicatorWindow = new BrowserWindow({
    width: 250,
    height: 70,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  indicatorWindow.loadFile(path.join(__dirname, 'renderer', 'indicator.html'));
  
  // Position window at bottom-center of the screen
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  const x = Math.floor((width - 250) / 2);
  const y = Math.floor(height - 100);
  
  indicatorWindow.setPosition(x, y);
}

// Create System Tray Icon
function createTray() {
  // Use a simple square icon or colored dot for the tray
  // In development, we can create a simple canvas icon or load a default png
  appTray = new Tray(path.join(__dirname, 'renderer', 'tray-icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'VoiceDraft Dashboard', click: () => toggleMainWindow() },
    { type: 'separator' },
    { label: 'Record / Toggle Dictation', accelerator: currentHotkey, click: () => triggerRecordingToggle() },
    { type: 'separator' },
    { label: 'Settings', click: () => {
      showMainWindow();
      mainWindow.webContents.send('navigate-to', 'settings');
    }},
    { label: 'Quit VoiceDraft', click: () => {
      app.isQuitting = true;
      app.quit();
    }}
  ]);

  appTray.setToolTip('VoiceDraft — AI Voice Writing');
  appTray.setContextMenu(contextMenu);

  // Double-click tray to toggle dashboard
  appTray.on('double-click', () => {
    toggleMainWindow();
  });
}

function showMainWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function toggleMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

// Register global shortcut for recording
function registerHotkey(hotkeyStr) {
  try {
    globalShortcut.unregisterAll();
    
    currentHotkey = hotkeyStr || 'Alt+Space';
    
    const registered = globalShortcut.register(currentHotkey, () => {
      triggerRecordingToggle();
    });

    if (!registered) {
      console.error(`Failed to register global hotkey: ${currentHotkey}`);
      if (mainWindow) {
        mainWindow.webContents.send('hotkey-registration-error', currentHotkey);
      }
    } else {
      console.log(`Global hotkey registered: ${currentHotkey}`);
    }
  } catch (error) {
    console.error('Error registering global hotkey:', error);
  }
}

// Notify renderer to start/stop recording
function triggerRecordingToggle() {
  if (mainWindow) {
    mainWindow.webContents.send('recording-hotkey-pressed');
  }
}

// Execute simulated keystroke paste on Windows
function simulatePasteOnWindows(text) {
  const oldText = clipboard.readText();
  clipboard.writeText(text);

  // Send Ctrl+V key combination using System.Windows.Forms in PowerShell.
  // This is highly reliable on Windows and requires zero native modules.
  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms;
    [System.Windows.Forms::SendKeys]::SendWait('^v');
  `;
  
  exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, ' ')}"`, (error) => {
    if (error) {
      console.error('Error simulating paste keystroke:', error);
    }
    // Wait for target application to digest paste before restoring clipboard
    setTimeout(() => {
      clipboard.writeText(oldText);
    }, 800);
  });
}

// IPC Handlers
ipcMain.handle('get-platform', () => process.platform);

ipcMain.on('set-recording-state', (event, recording) => {
  isRecording = recording;
  if (isRecording) {
    if (indicatorWindow) {
      indicatorWindow.showInactive();
      indicatorWindow.webContents.send('update-state', 'listening');
    }
  } else {
    // If we stopped recording, transition to processing in the indicator
    if (indicatorWindow) {
      indicatorWindow.webContents.send('update-state', 'processing');
    }
  }
});

ipcMain.on('hide-indicator', () => {
  if (indicatorWindow) {
    indicatorWindow.hide();
  }
});

ipcMain.on('show-indicator-state', (event, state) => {
  if (indicatorWindow) {
    if (!indicatorWindow.isVisible()) {
      indicatorWindow.showInactive();
    }
    indicatorWindow.webContents.send('update-state', state);
  }
});

ipcMain.on('execute-paste', (event, text) => {
  if (process.platform === 'win32') {
    simulatePasteOnWindows(text);
  } else {
    // Fallback copy to clipboard on macOS/Linux for Phase 1
    clipboard.writeText(text);
    if (mainWindow) {
      mainWindow.webContents.send('notification', {
        title: 'Copied to Clipboard',
        body: 'Auto-paste is Windows-only in MVP. Text copied successfully!'
      });
    }
  }
});

ipcMain.on('update-hotkey', (event, newHotkey) => {
  registerHotkey(newHotkey);
  // Re-create tray menu with new hotkey accelerator text
  if (appTray) {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'VoiceDraft Dashboard', click: () => toggleMainWindow() },
      { type: 'separator' },
      { label: 'Record / Toggle Dictation', accelerator: newHotkey, click: () => triggerRecordingToggle() },
      { type: 'separator' },
      { label: 'Settings', click: () => {
        showMainWindow();
        mainWindow.webContents.send('navigate-to', 'settings');
      }},
      { label: 'Quit VoiceDraft', click: () => {
        app.isQuitting = true;
        app.quit();
      }}
    ]);
    appTray.setContextMenu(contextMenu);
  }
});

// App lifecycle hooks
app.whenReady().then(() => {
  createMainWindow();
  createIndicatorWindow();
  createTray();
  registerHotkey(currentHotkey);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
