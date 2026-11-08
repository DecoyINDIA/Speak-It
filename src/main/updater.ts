import { autoUpdater } from 'electron-updater';
import { logger } from './logger';

export function setupAutoUpdater(): void {
  // Only run updater in packaged production builds
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for application updates...');
  });

  autoUpdater.on('update-available', (info) => {
    logger.info(`Update available: v${info.version}`);
  });

  autoUpdater.on('update-not-available', () => {
    logger.info('Application is up to date.');
  });

  autoUpdater.on('error', (err) => {
    logger.warn('Auto-updater error:', err?.message || err);
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info(`Update v${info.version} downloaded; will install on restart.`);
  });

  // Initial check & interval every 6 hours per §14
  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }, 6 * 60 * 60 * 1000);
}

export async function checkForUpdatesManual(): Promise<{ status: 'available' | 'latest' | 'dev' | 'error'; version?: string }> {
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    return { status: 'dev' };
  }
  try {
    const res = await autoUpdater.checkForUpdates();
    if (res && res.updateInfo && res.updateInfo.version) {
      return { status: 'available', version: res.updateInfo.version };
    }
    return { status: 'latest' };
  } catch (err: any) {
    return { status: 'error', version: err?.message || 'Check failed' };
  }
}
