const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, clipboard, screen } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const net = require('net');
const nativeHelperManager = require('./nativeHelperManager');

let mainWindow = null;
let indicatorWindow = null;
let appTray = null;
let isRecording = false;
let currentHotkey = 'Alt+Space';
let hotkeyMode = 'push_to_talk'; // 'push_to_talk' or 'toggle'
let apiPort = 3000;

function getFreePort(startingPort = 3000) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => {
      resolve(getFreePort(startingPort + 1));
    });
    server.listen(startingPort, () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });
  });
}

// Create the main dashboard/settings window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 920,
    height: 720,
    show: false, // Start hidden, toggle from tray/hotkey
    resizable: true,
    backgroundColor: '#0f1011',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'renderer', 'logo.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

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
    width: 280,
    height: 60,
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
  positionIndicatorDefault();
}

function positionIndicatorDefault() {
  if (!indicatorWindow) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const x = Math.floor((width - 280) / 2);
  const y = Math.floor(height - 110);
  indicatorWindow.setPosition(x, y);
}

function positionIndicatorNearCaret(caret) {
  if (!indicatorWindow) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const indWidth = 280;
  const indHeight = 60;

  if (caret && caret.x > 0 && caret.y > 0) {
    let x = Math.floor(caret.x - indWidth / 2);
    let y = Math.floor(caret.y + (caret.h || 20) + 12);

    if (x < 12) x = 12;
    if (x + indWidth > screenWidth - 12) x = screenWidth - indWidth - 12;

    if (y + indHeight > screenHeight - 12) {
      // Position above caret if near bottom edge
      y = Math.max(12, caret.y - indHeight - 12);
    }
    indicatorWindow.setPosition(x, y);
  } else {
    positionIndicatorDefault();
  }
}

// Create System Tray Icon
function createTray() {
  appTray = new Tray(path.join(__dirname, 'renderer', 'tray-icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'VoiceDraft Dashboard', click: () => toggleMainWindow() },
    { type: 'separator' },
    { label: 'Record / Dictate', accelerator: currentHotkey, click: () => triggerRecordingToggle() },
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

// Parse hotkey string into components
function parseHotkey(hotkeyStr) {
  const parts = (hotkeyStr || 'Alt+Space').split('+').map(p => p.trim());
  let key = 'Space';
  const modifiers = [];

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'alt') modifiers.push('Alt');
    else if (lower === 'ctrl' || lower === 'control') modifiers.push('Ctrl');
    else if (lower === 'shift') modifiers.push('Shift');
    else if (lower === 'win' || lower === 'meta' || lower === 'cmd') modifiers.push('Win');
    else key = part;
  }

  return { key, modifiers };
}

// Sync hotkey configuration with native helper or globalShortcut
function syncHotkey(hotkeyStr, mode) {
  currentHotkey = hotkeyStr || currentHotkey;
  if (mode) hotkeyMode = mode;

  const { key, modifiers } = parseHotkey(currentHotkey);

  if (nativeHelperManager.isReady) {
    nativeHelperManager.setHotkey({
      key,
      modifiers,
      mode: hotkeyMode,
      swallow: true
    }).catch(err => {
      console.warn('[HotkeySync] Helper setHotkey warning:', err);
    });
  } else {
    // Fallback to electron globalShortcut for toggle mode
    try {
      globalShortcut.unregisterAll();
      const registered = globalShortcut.register(currentHotkey, () => {
        triggerRecordingToggle();
      });
      if (!registered) {
        console.error(`Failed to register global hotkey: ${currentHotkey}`);
      }
    } catch (e) {
      console.error('Error in globalShortcut registration fallback:', e);
    }
  }
}

function triggerRecordingToggle() {
  if (mainWindow) {
    mainWindow.webContents.send('recording-hotkey-pressed');
  }
}

// Fallback PowerShell paste
function simulatePasteOnWindows(text) {
  const oldText = clipboard.readText();
  clipboard.writeText(text);

  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms;
    [System.Windows.Forms::SendKeys]::SendWait('^v');
  `;
  
  exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, ' ')}"`, (error) => {
    if (error) {
      console.error('Error simulating paste keystroke:', error);
    }
    setTimeout(() => {
      clipboard.writeText(oldText);
    }, 600);
  });
}

// Execute fast native paste or fallback
async function executePaste(text, mode = 'auto') {
  if (process.platform === 'win32' && nativeHelperManager.isReady) {
    try {
      const res = await nativeHelperManager.paste(text, mode);
      console.log(`[FastPaste] Success: ${res.latencyMs}ms via ${res.method} to ${res.targetApp}`);
      return res;
    } catch (err) {
      console.warn('[FastPaste] Native helper failed, falling back:', err);
    }
  }

  if (process.platform === 'win32') {
    simulatePasteOnWindows(text);
  } else {
    clipboard.writeText(text);
  }
}

// Set up native helper events
function setupNativeHelper() {
  nativeHelperManager.on('ready', async (info) => {
    console.log('[NativeHelper] Online, version:', info.version);
    syncHotkey(currentHotkey, hotkeyMode);
  });

  // Push-to-Talk Down (Start Recording)
  nativeHelperManager.on('hotkey-down', async () => {
    console.log('[NativeHelper] Push-to-Talk DOWN');
    
    // Position indicator at caret before showing
    try {
      const ctx = await nativeHelperManager.getContext();
      if (ctx && ctx.caret) {
        positionIndicatorNearCaret(ctx.caret);
      }
    } catch (_) {
      positionIndicatorDefault();
    }

    if (indicatorWindow) {
      indicatorWindow.showInactive();
      indicatorWindow.webContents.send('update-state', 'listening');
    }

    if (mainWindow) {
      mainWindow.webContents.send('start-recording', { trigger: 'ptt' });
    }
  });

  // Push-to-Talk Up (Stop Recording & Paste)
  nativeHelperManager.on('hotkey-up', () => {
    console.log('[NativeHelper] Push-to-Talk UP');
    if (indicatorWindow) {
      indicatorWindow.webContents.send('update-state', 'processing');
    }

    if (mainWindow) {
      mainWindow.webContents.send('stop-recording', { trigger: 'ptt' });
    }
  });

  // Toggle mode press
  nativeHelperManager.on('hotkey-press', async () => {
    console.log('[NativeHelper] Toggle HOTKEY PRESS');
    triggerRecordingToggle();
  });
}

// IPC Handlers
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-api-url', () => `http://localhost:${apiPort}/api`);

ipcMain.handle('get-context', async () => {
  if (nativeHelperManager.isReady) {
    try {
      return await nativeHelperManager.getContext();
    } catch (err) {
      console.warn('Error fetching native context:', err);
    }
  }
  return { app: '', title: '', url: '', caret: { x: 0, y: 0, w: 0, h: 0 }, preText: '', postText: '' };
});

ipcMain.handle('copy-selection', async () => {
  if (nativeHelperManager.isReady) {
    try {
      return await nativeHelperManager.copySelection();
    } catch (err) {
      console.warn('Error copying native selection:', err);
    }
  }
  return { status: 'error', text: '', length: 0 };
});

ipcMain.handle('position-indicator-at-caret', async () => {
  if (nativeHelperManager.isReady) {
    try {
      const ctx = await nativeHelperManager.getContext();
      if (ctx && ctx.caret) {
        positionIndicatorNearCaret(ctx.caret);
        return ctx.caret;
      }
    } catch (_) {}
  }
  positionIndicatorDefault();
  return null;
});

ipcMain.on('set-recording-state', (event, recording) => {
  isRecording = recording;
  if (isRecording) {
    if (indicatorWindow) {
      indicatorWindow.showInactive();
      indicatorWindow.webContents.send('update-state', 'listening');
    }
  } else {
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

ipcMain.on('show-indicator-state', (event, state, meta) => {
  if (indicatorWindow) {
    if (!indicatorWindow.isVisible()) {
      indicatorWindow.showInactive();
    }
    indicatorWindow.webContents.send('update-state', state, meta);
  }
});

ipcMain.on('execute-paste', async (event, text, mode) => {
  await executePaste(text, mode);
});

ipcMain.on('update-hotkey', (event, newHotkey) => {
  syncHotkey(newHotkey, hotkeyMode);
  if (appTray) {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'VoiceDraft Dashboard', click: () => toggleMainWindow() },
      { type: 'separator' },
      { label: 'Record / Dictate', accelerator: newHotkey, click: () => triggerRecordingToggle() },
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

ipcMain.on('set-hotkey-mode', (event, mode) => {
  hotkeyMode = mode || 'push_to_talk';
  syncHotkey(currentHotkey, hotkeyMode);
});

// Forward audio volume levels to indicator pill for live visualizer
ipcMain.on('audio-level', (event, level) => {
  if (indicatorWindow && indicatorWindow.isVisible()) {
    indicatorWindow.webContents.send('audio-level', level);
  }
});

// App lifecycle hooks
app.whenReady().then(async () => {
  apiPort = await getFreePort(3000);
  process.env.PORT = String(apiPort);

  // Start local backend server
  const backendPath = app.isPackaged 
    ? path.join(__dirname, 'backend-dist', 'server.js')
    : path.join(__dirname, '..', 'backend', 'dist', 'server.js');
    
  try {
    require(backendPath);
    console.log(`[VoiceDraft] Local backend server running on port ${apiPort}`);
  } catch (error) {
    console.error('[VoiceDraft] Failed to start backend server:', error);
  }

  createMainWindow();
  createIndicatorWindow();
  createTray();

  // Setup & spawn native helper
  setupNativeHelper();
  nativeHelperManager.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  nativeHelperManager.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
