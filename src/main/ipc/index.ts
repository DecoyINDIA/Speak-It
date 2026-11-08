import { ipcMain, BrowserWindow, shell } from 'electron';
import { validateSender } from './senderValidation';
import { AppDatabase } from '../storage/database';
import { WindowManager } from '../windows/windowManager';
import { logger } from '../logger';
import { checkForUpdatesManual } from '../updater';
import { productConfig } from '../../../product.config';
import { runHardwareBenchmark } from '../providers/hardwareBenchmark';

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

  ipcMain.handle('hub:get-hardware-profile', (event) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    return runHardwareBenchmark();
  });

  ipcMain.handle('hub:get-managed-policy', (event) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    return db.getEnterprisePolicy();
  });

  ipcMain.handle('hub:get-anonymized-stats', (event) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    return db.getAnonymizedStats(productConfig.version);
  });

  ipcMain.handle('hub:set-onboarding-step', (event, step: number) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    db.setOnboardingStepReached(step);
    return { ok: true };
  });

  ipcMain.handle('hub:open-feedback-issue', (event, context?: { outcome?: string; error?: string; provider?: string }) => {
    if (!validateSender(event, 'hub')) throw new Error('Unauthorized IPC sender');
    const osInfo = `${process.platform} ${process.arch}`;
    const version = productConfig.version;
    const body = encodeURIComponent(
      `### Feedback / Issue Report\n\n` +
      `- **App Version:** ${version}\n` +
      `- **OS / Environment:** ${osInfo}\n` +
      `- **Provider:** ${context?.provider || 'default'}\n` +
      `- **Outcome:** ${context?.outcome || 'User feedback'}\n` +
      `- **Error Details:** ${context?.error || 'None'}\n\n` +
      `### What happened?\n<!-- Describe what you experienced here (never include sensitive speech) -->\n\n` +
      `### Expected behavior\n<!-- What did you expect to happen? -->\n`
    );
    const title = encodeURIComponent(`[Feedback] ${context?.error ? `Error: ${context.error}` : 'User Feedback'}`);
    shell.openExternal(`${productConfig.repoUrl}/issues/new?title=${title}&body=${body}`);
    return { ok: true };
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

  ipcMain.on('bar:open-feedback-issue', (event, reason?: string) => {
    if (!validateSender(event, 'bar')) return;
    const osInfo = `${process.platform} ${process.arch}`;
    const version = productConfig.version;
    const body = encodeURIComponent(
      `### Feedback / Dictation Error Report\n\n` +
      `- **App Version:** ${version}\n` +
      `- **OS / Environment:** ${osInfo}\n` +
      `- **Error Reason:** ${reason || 'Dictation failed'}\n\n` +
      `### What happened?\n<!-- Describe what you experienced here -->\n`
    );
    const title = encodeURIComponent(`[Bug] Dictation failed: ${reason || 'Error'}`);
    shell.openExternal(`${productConfig.repoUrl}/issues/new?title=${title}&body=${body}`);
  });
}
