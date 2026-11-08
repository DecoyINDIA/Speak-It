import { app, BrowserWindow, screen, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { productConfig } from '../../../product.config';

export class WindowManager {
  public hubWindow: BrowserWindow | null = null;
  public barWindow: BrowserWindow | null = null;
  public audioWindow: BrowserWindow | null = null;
  public tray: Tray | null = null;
  private isQuitting = false;

  constructor() {
    app.on('before-quit', () => {
      this.isQuitting = true;
    });
  }

  public createHubWindow(): BrowserWindow {
    if (this.hubWindow && !this.hubWindow.isDestroyed()) {
      this.hubWindow.show();
      this.hubWindow.focus();
      return this.hubWindow;
    }

    const preloadPath = path.join(__dirname, '../preload/hub.js');
    this.hubWindow = new BrowserWindow({
      width: 1180,
      height: 760,
      minWidth: 960,
      minHeight: 640,
      frame: false,
      backgroundColor: '#FAFBF8',
      show: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      this.hubWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/hub/index.html`);
    } else {
      this.hubWindow.loadFile(path.join(__dirname, '../renderer/hub/index.html'));
    }

    this.hubWindow.once('ready-to-show', () => {
      this.hubWindow?.show();
    });

    this.hubWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.hubWindow?.hide();
      }
    });

    return this.hubWindow;
  }

  public createBarWindow(): BrowserWindow {
    if (this.barWindow && !this.barWindow.isDestroyed()) {
      return this.barWindow;
    }

    const preloadPath = path.join(__dirname, '../preload/bar.js');
    this.barWindow = new BrowserWindow({
      width: 320,
      height: 56,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      focusable: false,
      skipTaskbar: true,
      hasShadow: false,
      resizable: false,
      show: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });

    this.barWindow.setAlwaysOnTop(true, 'screen-saver');
    this.barWindow.setIgnoreMouseEvents(true, { forward: true });

    if (process.env.VITE_DEV_SERVER_URL) {
      this.barWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/bar/index.html`);
    } else {
      this.barWindow.loadFile(path.join(__dirname, '../renderer/bar/index.html'));
    }

    return this.barWindow;
  }

  public repositionBarForDisplay(targetHwnd?: number): void {
    if (!this.barWindow || this.barWindow.isDestroyed()) return;

    // Position at bottom center of the active display, 12px above work area
    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursor);
    const workArea = display.workArea;

    const width = 320;
    const height = 56;
    const x = Math.round(workArea.x + (workArea.width - width) / 2);
    const y = Math.round(workArea.y + workArea.height - height - 12);

    this.barWindow.setBounds({ x, y, width, height });
  }

  public createAudioWindow(): BrowserWindow {
    if (this.audioWindow && !this.audioWindow.isDestroyed()) {
      return this.audioWindow;
    }

    const preloadPath = path.join(__dirname, '../preload/audio.js');
    this.audioWindow = new BrowserWindow({
      width: 100,
      height: 100,
      show: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        backgroundThrottling: false,
      },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      this.audioWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/audio/index.html`);
    } else {
      this.audioWindow.loadFile(path.join(__dirname, '../renderer/audio/index.html'));
    }

    return this.audioWindow;
  }

  public createTray(onOpenHub: () => void, onTriggerDictation: () => void): Tray {
    if (this.tray) return this.tray;

    // 16x16 icon placeholder / asset
    const icon = nativeImage.createFromBuffer(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAExJREFUOE9jZKAQMFKon2H4//9/hpmZmaW4FDFSDTDDp4GRkRFZFgZjV4A0w4gxi9C8QqwBxCoj2QC8fkZOM0g1gGgDSAnWkQ5GAHQZJgU9D7k7AAAAAElFTkSuQmCC',
        'base64'
      )
    );

    this.tray = new Tray(icon);
    this.tray.setToolTip(productConfig.displayName);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Open ${productConfig.displayName}`,
        click: () => onOpenHub(),
      },
      {
        label: 'Dictate (Ctrl+Win)',
        click: () => onTriggerDictation(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          this.isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.on('click', () => onOpenHub());

    return this.tray;
  }
}
