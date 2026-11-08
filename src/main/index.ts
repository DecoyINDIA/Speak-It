import { app, session } from 'electron';
import * as path from 'path';
import { productConfig } from '../../product.config';
import { AppDatabase } from './storage/database';
import { importVoiceDraftData } from './storage/voiceDraftImporter';
import { WindowManager } from './windows/windowManager';
import { registerIpcHandlers } from './ipc';
import { setupPowerMonitoring } from './power';
import { logger } from './logger';

// --- Single Instance Lock ---
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  logger.info('Another instance of SpeakIt is already running. Quitting.');
  app.quit();
}

let db: AppDatabase;
let windowManager: WindowManager;

function initializeDatabase(): AppDatabase {
  const userDataDir = path.join(app.getPath('appData'), productConfig.dataFolderName);
  const dbPath = path.join(userDataDir, productConfig.dbName);
  const database = new AppDatabase(dbPath);

  // Attempt one-time legacy VoiceDraft migration
  const importResult = importVoiceDraftData(database);
  if (importResult.imported) {
    logger.info('Imported legacy VoiceDraft data:', importResult);
  }

  // Initial retention cleanup
  database.runRetention();
  setInterval(() => database.runRetention(), 60 * 60 * 1000); // Hourly retention check

  return database;
}

function configureSecurityHardening(): void {
  // Strict Permission Handler: Only allow 'media' (audio) for the dedicated audio window
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      const url = webContents.getURL();
      if (url.includes('audio')) {
        return callback(true);
      }
    }
    logger.warn(`Denied permission request: ${permission} from ${webContents.getURL()}`);
    callback(false);
  });

  // Block all external navigation and popup windows
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
      const parsed = new URL(navigationUrl);
      if (parsed.protocol !== 'file:' && !navigationUrl.startsWith(process.env.VITE_DEV_SERVER_URL || 'http://localhost:')) {
        event.preventDefault();
        logger.warn(`Blocked navigation to: ${navigationUrl}`);
      }
    });

    contents.setWindowOpenHandler(({ url }) => {
      logger.warn(`Blocked new window creation for: ${url}`);
      return { action: 'deny' };
    });
  });
}

app.whenReady().then(() => {
  logger.info(`${productConfig.displayName} v${productConfig.version} starting up...`);
  db = initializeDatabase();
  windowManager = new WindowManager();

  configureSecurityHardening();
  registerIpcHandlers(db, windowManager);

  // Create windows and tray
  windowManager.createHubWindow();
  windowManager.createBarWindow();
  windowManager.createAudioWindow();
  windowManager.createTray(
    () => windowManager.createHubWindow(),
    () => {
      // Manual trigger for dictation
      logger.info('Dictation triggered via tray menu');
    }
  );

  // Power monitor lifecycle
  setupPowerMonitoring({
    onSuspend: () => {
      // In-flight dictations cancelled
    },
    onResume: () => {
      // Re-verify audio device and helper
    },
    onLock: () => {
      // Hotkeys and active recording released
    },
    onUnlock: () => {
      // Restored
    },
  });

  app.on('second-instance', () => {
    if (windowManager.hubWindow) {
      if (windowManager.hubWindow.isMinimized()) windowManager.hubWindow.restore();
      windowManager.hubWindow.show();
      windowManager.hubWindow.focus();
    }
  });

  app.on('activate', () => {
    windowManager.createHubWindow();
  });
});

app.on('window-all-closed', () => {
  // On Windows, keep app running in tray per PLAN.md
});
