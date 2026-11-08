import { ipcMain, BrowserWindow, shell } from 'electron';
import { validateSender } from './senderValidation';
import { AppDatabase } from '../storage/database';
import { WindowManager } from '../windows/windowManager';
import { logger } from '../logger';
import { checkForUpdatesManual } from '../updater';

export function registerIpcHandlers(db: AppDatabase, windowManager: WindowManager): void {
  // --- Hub Handlers ---
  ipcMain.handle('hub:get-settings', (event) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    return db.getSettings();
  });

  ipcMain.handle('hub:update-settings', (event, partial) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    return db.updateSettings(partial);
  });

  ipcMain.handle('hub:get-secrets-status', (event) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    return db.secrets.getSecretStatus();
  });

  ipcMain.handle('hub:set-secret', (event, provider: string, secret: string) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    db.secrets.setSecret(provider, secret);
    logger.info(`Secret updated for provider: ${provider}`);
    return { ok: true };
  });

  ipcMain.handle('hub:delete-secret', (event, provider: string) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    db.secrets.deleteSecret(provider);
    logger.info(`Secret deleted for provider: ${provider}`);
    return { ok: true };
  });

  ipcMain.handle('hub:get-dictations', (event, limit: number, offset: number, query?: string) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    return db.getDictations(limit, offset, query);
  });

  ipcMain.handle('hub:delete-dictation', (event, uid: string) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    db.deleteDictation(uid);
    return { ok: true };
  });

  ipcMain.handle('hub:get-stats', (event) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    return db.getStats();
  });

  ipcMain.handle('hub:get-dictionary', (event) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    return db.getDictionary();
  });

  ipcMain.handle('hub:add-dictionary-term', (event, term: string, soundsLike?: string) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    db.addDictionaryTerm(term, soundsLike);
    return { ok: true };
  });

  ipcMain.handle('hub:delete-dictionary-term', (event, id: number) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    db.deleteDictionaryTerm(id);
    return { ok: true };
  });

  ipcMain.handle('hub:get-snippets', (event) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    return db.getSnippets();
  });

  ipcMain.handle('hub:add-snippet', (event, trigger: string, expansion: string) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    db.addSnippet(trigger, expansion);
    return { ok: true };
  });

  ipcMain.handle('hub:delete-snippet', (event, id: number) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    db.deleteSnippet(id);
    return { ok: true };
  });

  ipcMain.handle('hub:get-styles', (event) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    return db.getStyles();
  });

  ipcMain.handle('hub:update-style', (event, category: string, tone: string, customInstructions?: string) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    db.updateStyle(category, tone, customInstructions);
    return { ok: true };
  });

  ipcMain.handle('hub:open-logs', (event) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    shell.openPath(logger.getLogDir());
    return { ok: true };
  });

  ipcMain.handle('hub:check-for-updates', async (event) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    return await checkForUpdatesManual();
  });

  // --- Window Control Handlers ---
  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  // --- Bar Window Handlers ---
  ipcMain.on('bar:set-ignore-mouse', (event, ignore: boolean) => {
    if (!validateSender(event, 'bar')) return;
    if (windowManager.barWindow && !windowManager.barWindow.isDestroyed()) {
      windowManager.barWindow.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });
}
