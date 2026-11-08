import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../logger';

export class WhisperServerProcess {
  private process: ChildProcess | null = null;
  private port: number;
  private modelPath: string;
  private exePath: string;
  private idleTimer?: NodeJS.Timeout;
  private idleUnloadMinutes: number;

  constructor(modelPath: string, port = 8080, idleUnloadMinutes = 10) {
    this.modelPath = modelPath;
    this.port = port;
    this.idleUnloadMinutes = idleUnloadMinutes;
    this.exePath = process.env.APPDATA
      ? path.join(process.env.APPDATA, 'SpeakIt', 'bin', 'whisper-server.exe')
      : path.join(process.cwd(), 'bin', 'whisper-server.exe');
  }

  public getPort(): number {
    return this.port;
  }

  public isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  public async ensureRunning(): Promise<boolean> {
    this.resetIdleTimer();

    if (this.isRunning()) {
      return true;
    }

    if (!fs.existsSync(this.exePath)) {
      logger.info(`whisper-server binary not found at ${this.exePath}`);
      return false;
    }

    if (!fs.existsSync(this.modelPath)) {
      logger.warn(`whisper model file not found at ${this.modelPath}`);
      return false;
    }

    logger.info(`Starting whisper-server.exe on 127.0.0.1:${this.port}...`);

    try {
      this.process = spawn(this.exePath, ['--model', this.modelPath, '--port', this.port.toString(), '--host', '127.0.0.1'], {
        windowsHide: true,
      });

      this.process.on('exit', (code) => {
        logger.info(`whisper-server.exe exited with code ${code}`);
        this.process = null;
      });

      // Await startup health check ping
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 200));
        try {
          const res = await fetch(`http://127.0.0.1:${this.port}/health`);
          if (res.ok) {
            logger.info('whisper-server is healthy and ready for inference');
            return true;
          }
        } catch {}
      }

      return true;
    } catch (err: any) {
      logger.error('Failed to spawn whisper-server.exe:', err?.message || err);
      return false;
    }
  }

  public resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.idleUnloadMinutes > 0) {
      this.idleTimer = setTimeout(() => {
        logger.info(`whisper-server idle for ${this.idleUnloadMinutes} min — unloading to save memory`);
        this.stop();
      }, this.idleUnloadMinutes * 60 * 1000);
    }
  }

  public stop(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.process) {
      try {
        this.process.kill();
      } catch {}
      this.process = null;
    }
  }
}
