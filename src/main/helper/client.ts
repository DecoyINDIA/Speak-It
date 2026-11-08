import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import {
  HelperMessageEnvelope,
  HelloResponse,
  SetHotkeysResponse,
  ContextResponse,
  PasteResponse,
  SimpleOkResponse,
  HotkeyBinding,
  PasteMethod,
} from '../../../shared/types/helperProtocol';
import { logger } from '../logger';

export class HelperClient extends EventEmitter {
  private helperProcess: ChildProcess | null = null;
  private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void; timer: NodeJS.Timeout }>();
  private exePath: string;
  private isAlive = false;
  private isStopping = false;
  private restartAttempts = 0;
  private pingInterval?: NodeJS.Timeout;

  constructor(customExePath?: string) {
    super();
    this.exePath =
      customExePath ||
      path.join(__dirname, '../../native/helper/SpeakItHelper.exe');
  }

  public async start(): Promise<void> {
    if (!fs.existsSync(this.exePath)) {
      logger.warn(`Helper executable not found at: ${this.exePath}`);
      return;
    }

    try {
      this.helperProcess = spawn(this.exePath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      this.isAlive = true;
      this.restartAttempts = 0;

      let buffer = '';
      this.helperProcess.stdout?.on('data', (chunk) => {
        buffer += chunk.toString('utf-8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            this.handleIncomingLine(trimmed);
          }
        }
      });

      this.helperProcess.on('exit', (code) => {
        this.isAlive = false;
        logger.warn(`SpeakItHelper exited with code ${code}`);
        this.handleProcessExit();
      });

      // 5-second ping interval (§9.1)
      this.pingInterval = setInterval(() => {
        if (this.isAlive) {
          this.ping().catch(() => {});
        }
      }, 5000);

      // Verify connection with hello
      await this.hello();
    } catch (err: any) {
      logger.error('Failed to spawn SpeakItHelper:', err?.message || err);
      this.handleProcessExit();
    }
  }

  private handleIncomingLine(line: string): void {
    try {
      const msg: HelperMessageEnvelope = JSON.parse(line);

      // 1. Response to pending request
      if (msg.id && this.pendingRequests.has(msg.id)) {
        const req = this.pendingRequests.get(msg.id)!;
        clearTimeout(req.timer);
        this.pendingRequests.delete(msg.id);
        req.resolve(msg.payload);
        return;
      }

      // 2. Unsolicited Helper Event
      if (msg.type) {
        this.emit(msg.type, msg.payload);
      }
    } catch (err) {
      logger.error('Failed to parse line from helper:', line);
    }
  }

  private handleProcessExit(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);

    // Reject all pending requests
    for (const [id, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timer);
      req.reject(new Error('SpeakItHelper process terminated'));
    }
    this.pendingRequests.clear();

    if (this.isStopping) {
      return;
    }

    // Restart with backoff (1, 2, 4, 8, 10s up to 5 tries) per §9.1
    if (this.restartAttempts < 5) {
      const delays = [1000, 2000, 4000, 8000, 10000];
      const delay = delays[this.restartAttempts] || 10000;
      this.restartAttempts++;
      logger.info(`Restarting SpeakItHelper in ${delay}ms (attempt ${this.restartAttempts}/5)...`);
      setTimeout(() => this.start(), delay);
    } else {
      logger.error('SpeakItHelper failed to restart after 5 attempts.');
      this.emit('helperFailed');
    }
  }

  public sendCommand<T>(type: string, payload: any = {}, timeoutMs = 3000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.helperProcess || !this.isAlive) {
        return reject(new Error('SpeakItHelper is not running'));
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`SpeakItHelper command timed out: ${type}`));
        }
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      const envelope: HelperMessageEnvelope = {
        v: 1,
        id,
        type,
        payload,
      };

      try {
        this.helperProcess.stdin?.write(JSON.stringify(envelope) + '\n');
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  // --- Strongly Typed Helper Commands ---
  public hello(): Promise<HelloResponse> {
    return this.sendCommand<HelloResponse>('hello');
  }

  public ping(): Promise<SimpleOkResponse> {
    return this.sendCommand<SimpleOkResponse>('ping', {}, 1000);
  }

  public setHotkeys(bindings: HotkeyBinding[]): Promise<SetHotkeysResponse> {
    return this.sendCommand<SetHotkeysResponse>('setHotkeys', { bindings });
  }

  public beginDictation(expectHwnd?: number): Promise<SimpleOkResponse> {
    return this.sendCommand<SimpleOkResponse>('beginDictation', { expectHwnd });
  }

  public getContext(wantPreText = false, maxChars = 300): Promise<ContextResponse> {
    return this.sendCommand<ContextResponse>('getContext', { wantPreText, maxChars }, 150); // 150ms deadline per §9.1
  }

  public paste(
    text: string,
    expectHwnd?: number,
    method: PasteMethod = 'auto',
    pressEnter = false
  ): Promise<PasteResponse> {
    return this.sendCommand<PasteResponse>('paste', { text, expectHwnd, method, pressEnter }, 3000);
  }

  public endDictation(): Promise<SimpleOkResponse> {
    return this.sendCommand<SimpleOkResponse>('endDictation');
  }

  public setRecordingKeysActive(active: boolean): Promise<SimpleOkResponse> {
    return this.sendCommand<SimpleOkResponse>('setRecordingKeysActive', { active });
  }

  public setOtherAudioMuted(muted: boolean): Promise<SimpleOkResponse> {
    return this.sendCommand<SimpleOkResponse>('setOtherAudioMuted', { muted });
  }

  public stop(): void {
    this.isStopping = true;
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.helperProcess && this.isAlive) {
      try {
        this.sendCommand('shutdown', {}, 500).catch(() => {});
        this.helperProcess.kill();
      } catch {}
    }
    this.isAlive = false;
  }
}
