import { ipcMain } from 'electron';
import { DictationStateMachine } from './stateMachine';
import { InsertQueue } from './insertQueue';
import { HelperClient } from '../helper/client';
import { ProviderChain } from '../providers/chain';
import { GroqProvider } from '../providers/groq';
import { GeminiProvider } from '../providers/gemini';
import { LocalWhisperProvider } from '../providers/localWhisper';
import { AppDatabase } from '../storage/database';
import { WindowManager } from '../windows/windowManager';
import { logger } from '../logger';

export class DictationController {
  public stateMachine: DictationStateMachine;
  public insertQueue: InsertQueue;
  public helperClient: HelperClient;
  public providerChain: ProviderChain;
  private db: AppDatabase;
  private windowManager: WindowManager;
  private warmMicTimer?: NodeJS.Timeout;
  private lastLevelEmitTime = 0;

  constructor(db: AppDatabase, windowManager: WindowManager, helperClient?: HelperClient) {
    this.db = db;
    this.windowManager = windowManager;
    this.stateMachine = new DictationStateMachine();
    this.insertQueue = new InsertQueue();
    this.helperClient = helperClient || new HelperClient();

    // Initialize Providers from Settings & Secrets
    const groq = new GroqProvider(
      () => this.db.secrets.getSecret('groq'),
      this.db.getSettings().providers.groq.sttModel,
      this.db.getSettings().providers.groq.llmModel
    );

    const gemini = new GeminiProvider(
      () => this.db.secrets.getSecret('gemini'),
      this.db.getSettings().providers.gemini.sttModel,
      this.db.getSettings().providers.gemini.llmModel
    );

    const offline = new LocalWhisperProvider();

    this.providerChain = new ProviderChain({
      sttProviders: [groq, gemini, offline],
      llmProviders: [groq, gemini],
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    // 1. Helper Events
    this.helperClient.on('ready', () => {
      logger.info('Native helper is ready — registering default hotkey');
      const settings = this.db.getSettings();
      this.helperClient.setHotkeys([
        {
          id: 'primary-dictation',
          keys: settings.general.hotkey,
          mode: settings.general.hotkeyMode,
        },
      ]);
    });

    this.helperClient.on('hotkeyDown', (payload: { id: string; t: number }) => {
      this.handleHotkeyDown(payload.id);
    });

    this.helperClient.on('hotkeyUp', (payload: { id: string; t: number; reason?: string }) => {
      this.stateMachine.onHotkeyUp(payload.reason || 'release');
    });

    this.helperClient.on('hotkeyAborted', () => {
      this.stateMachine.onHotkeyAborted();
      this.updateBarUI({ status: 'idle' });
      this.windowManager.barWindow?.hide();
    });

    this.helperClient.on('escape', () => {
      this.stateMachine.onCancelRequested();
      this.updateBarUI({ status: 'idle' });
      this.windowManager.barWindow?.hide();
    });

    // 2. Audio Host Window Events via IPC
    ipcMain.on('audio:pcm-chunk', (_event, data: { pcmRms: number }) => {
      this.stateMachine.onFirstAudioFrame();

      // Throttle volume bar updates to 30 Hz (approx every 33ms)
      const now = Date.now();
      if (now - this.lastLevelEmitTime >= 33) {
        this.lastLevelEmitTime = now;
        const normalized = Math.max(0, Math.min(1, (data.pcmRms + 60) / 60)); // -60dBFS to 0dBFS
        const bars = this.generateVolumeBars(normalized);
        this.windowManager.barWindow?.webContents.send('bar:volume-levels', bars);
      }
    });

    ipcMain.on('audio:final-recording', async (_event, data: { webmBase64: string; durationMs: number; speechRmsMs: number }) => {
      await this.handleAudioFinalized(data);
    });

    ipcMain.on('audio:error', (_event, err: string) => {
      logger.error('Audio capture error:', err);
      this.stateMachine.onError(err);
      this.updateBarUI({ status: 'error', text: 'Microphone error' });
    });

    // 3. Bar Window User Controls
    ipcMain.on('bar:cancel', () => {
      this.stateMachine.onCancelRequested();
      this.windowManager.barWindow?.hide();
    });

    ipcMain.on('bar:stop', () => {
      this.stateMachine.onStopRequested();
      this.windowManager.audioWindow?.webContents.send('audio:stop-capture');
    });

    // 4. State Machine Transitions
    this.stateMachine.on('transition', (e: { from: string; to: string; payload?: any }) => {
      this.handleStateTransition(e.to, e.payload);
    });
  }

  private handleHotkeyDown(bindingId: string): void {
    if (this.warmMicTimer) {
      clearTimeout(this.warmMicTimer);
      this.warmMicTimer = undefined;
    }

    const settings = this.db.getSettings();
    this.windowManager.repositionBarForDisplay();
    this.windowManager.barWindow?.show();

    this.stateMachine.onHotkeyDown(bindingId, undefined, false);

    // Tell helper to snapshot clipboard immediately in background (§9.4)
    this.helperClient.beginDictation().catch(() => {});

    // Tell audio window to start recording immediately
    this.windowManager.audioWindow?.webContents.send('audio:start-capture', {
      deviceId: settings.general.micDeviceId,
    });
  }

  private handleStateTransition(toState: string, payload?: any): void {
    switch (toState) {
      case 'RECORDING':
        this.updateBarUI({ status: 'listening' });
        break;

      case 'RECORDING_LOCKED':
        this.updateBarUI({ status: 'locked' });
        break;

      case 'TAP_PENDING':
        this.updateBarUI({ status: 'listening', text: 'Double-tap for hands-free' });
        break;

      case 'FINALIZING':
        this.updateBarUI({ status: 'processing' });
        this.windowManager.audioWindow?.webContents.send('audio:stop-capture');
        break;

      case 'TRANSCRIBING':
      case 'CLEANING':
        this.updateBarUI({ status: 'processing' });
        break;

      case 'DONE':
        this.updateBarUI({ status: 'done' });
        setTimeout(() => {
          if (!this.db.getSettings().system.alwaysShowBar) {
            this.windowManager.barWindow?.hide();
          }
        }, 800);
        break;

      case 'CANCELLED':
        this.updateBarUI({ status: 'idle', text: payload?.hint });
        setTimeout(() => {
          if (!this.db.getSettings().system.alwaysShowBar) {
            this.windowManager.barWindow?.hide();
          }
        }, payload?.hint ? 1500 : 200);
        break;

      case 'ERROR':
        this.updateBarUI({ status: 'error', text: payload?.error || 'Failed' });
        break;
    }
  }

  private async handleAudioFinalized(data: { webmBase64: string; durationMs: number; speechRmsMs: number }): Promise<void> {
    this.stateMachine.onAudioFinalized(data.speechRmsMs);

    if (this.stateMachine.state !== 'TRANSCRIBING') {
      return;
    }

    const audioBuffer = Buffer.from(data.webmBase64, 'base64');
    const settings = this.db.getSettings();

    // Query active context from native helper (§9.1)
    let context: any = {};
    try {
      context = await this.helperClient.getContext(settings.privacy.contextAwareness, 300);
    } catch {}

    const appCategory = this.db.getCategoryForApp(context.exe, context.urlHost);
    const style = this.db.getStyles().find((s) => s.category === appCategory) || {
      category: 'other',
      tone: 'Casual',
    };

    const glossary = this.db.getDictionary().map((d) => d.term);
    const snippets = this.db.getSnippets().map((s) => ({
      id: s.id || 0,
      trigger: s.trigger,
      expansion: s.expansion,
    }));
    const soundsLikeMap = this.db
      .getDictionary()
      .filter((d) => d.sounds_like)
      .map((d) => ({ term: d.term, soundsLike: d.sounds_like! }));

    try {
      this.stateMachine.onTranscriptionDone();

      const pipelineResult = await this.providerChain.executePipeline({
        audioBuffer,
        mimeType: 'audio/webm',
        tone: style.tone,
        customInstructions: style.custom_instructions,
        outputLanguage: settings.general.outputLanguage,
        context: {
          appExe: context.exe,
          preText: settings.privacy.contextAwareness ? context.preText : undefined,
        },
        glossary,
        snippets,
        soundsLikeMap,
      });

      this.stateMachine.onCleaningDone();

      // Enqueue paste via InsertQueue
      const insertResult = await this.insertQueue.enqueue({
        id: `dict-${Date.now()}`,
        text: pipelineResult.finalInsertedText,
        expectHwnd: context.hwnd,
        pressEnter: settings.system.pressEnterCommand,
        execute: async () => {
          this.stateMachine.onInsertStarting();
          const pasteRes = await this.helperClient.paste(
            pipelineResult.finalInsertedText,
            context.hwnd,
            'auto',
            settings.system.pressEnterCommand
          );
          return { outcome: pasteRes.outcome, reason: pasteRes.reason };
        },
      });

      this.stateMachine.onInsertCompleted(insertResult.outcome);

      // Record in SQLite
      const uid = `dict-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      this.db.insertDictation({
        uid,
        created_at: Date.now(),
        status: insertResult.outcome === 'pasted' ? 'done' : (insertResult.outcome as any),
        raw_text: pipelineResult.rawTranscript,
        clean_text: pipelineResult.cleanedText,
        inserted_text: pipelineResult.finalInsertedText,
        app_exe: context.exe,
        url_host: context.urlHost,
        category: appCategory,
        language: settings.general.inputLanguage,
        words: pipelineResult.words,
        speech_ms: data.durationMs,
        stt_provider: pipelineResult.sttProvider,
        stt_ms: pipelineResult.sttMs,
        llm_provider: pipelineResult.llmProvider,
        llm_ms: pipelineResult.llmMs,
        total_ms: pipelineResult.totalMs,
        paste_method: 'auto',
        paste_outcome: insertResult.outcome,
      });

      // Update Hub window
      this.windowManager.hubWindow?.webContents.send('hub:dictation-updated', { uid });

      // Start warm mic timer (20s default) per ADR-14
      if (settings.system.micWarmWindowSeconds > 0) {
        this.warmMicTimer = setTimeout(() => {
          // Warm window closed
        }, settings.system.micWarmWindowSeconds * 1000);
      }
    } catch (err: any) {
      logger.error('Pipeline execution failed:', err?.message || err);
      this.stateMachine.onError(err?.message || 'Pipeline failed');
    }
  }

  private updateBarUI(state: { status: any; text?: string; reason?: string }): void {
    this.windowManager.barWindow?.webContents.send('bar:state-change', state);
  }

  private generateVolumeBars(volumeNorm: number): number[] {
    // 9 symmetrical bars around center (index 4 is highest)
    const weights = [0.25, 0.45, 0.7, 0.9, 1.0, 0.9, 0.7, 0.45, 0.25];
    return weights.map((w) => Math.max(3, Math.round(3 + volumeNorm * 19 * w)));
  }

  public async start(): Promise<void> {
    await this.helperClient.start();
  }

  public stop(): void {
    if (this.warmMicTimer) clearTimeout(this.warmMicTimer);
    this.helperClient.stop();
  }
}
