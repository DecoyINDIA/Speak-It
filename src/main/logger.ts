import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private logDir: string;
  private currentLogFile: string;
  private maxFileSize = 2 * 1024 * 1024; // 2 MB
  private maxFiles = 5;

  constructor(logDir?: string) {
    this.logDir = logDir || (process.env.APPDATA ? path.join(process.env.APPDATA, 'SpeakIt', 'logs') : path.join(process.cwd(), 'logs'));
    if (!fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch {}
    }
    this.currentLogFile = path.join(this.logDir, 'speakit.log');
  }

  public getLogDir(): string {
    return this.logDir;
  }

  private sanitize(message: string): string {
    // Redact API keys and authorization tokens (e.g. gsk_..., AIza...)
    return message
      .replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED_GROQ_KEY]')
      .replace(/AIza[a-zA-Z0-9_-]+/g, '[REDACTED_GEMINI_KEY]')
      .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]')
      .replace(/token=[a-zA-Z0-9._-]+/gi, 'token=[REDACTED]');
  }

  private rotateIfNeeded(): void {
    try {
      if (!fs.existsSync(this.currentLogFile)) return;
      const stat = fs.statSync(this.currentLogFile);
      if (stat.size >= this.maxFileSize) {
        // Shift existing rotated logs: .4 -> deleted, .3 -> .4, etc.
        for (let i = this.maxFiles - 1; i >= 1; i--) {
          const src = path.join(this.logDir, `speakit.${i}.log`);
          const dst = path.join(this.logDir, `speakit.${i + 1}.log`);
          if (fs.existsSync(src)) {
            if (i === this.maxFiles - 1) {
              fs.unlinkSync(src);
            } else {
              fs.renameSync(src, dst);
            }
          }
        }
        const firstRotated = path.join(this.logDir, 'speakit.1.log');
        fs.renameSync(this.currentLogFile, firstRotated);
      }
    } catch {}
  }

  public write(level: LogLevel, message: string, meta?: unknown): void {
    const timestamp = new Date().toISOString();
    const sanitizedMsg = this.sanitize(message);
    const metaStr = meta ? ` ${this.sanitize(typeof meta === 'object' ? JSON.stringify(meta) : String(meta))}` : '';
    const line = `[${timestamp}] [${level.toUpperCase()}] ${sanitizedMsg}${metaStr}\n`;

    // Console output for development
    if (level === 'error') {
      console.error(line.trim());
    } else if (level === 'warn') {
      console.warn(line.trim());
    } else {
      console.log(line.trim());
    }

    try {
      this.rotateIfNeeded();
      fs.appendFileSync(this.currentLogFile, line, 'utf-8');
    } catch {}
  }

  public debug(msg: string, meta?: unknown): void {
    this.write('debug', msg, meta);
  }

  public info(msg: string, meta?: unknown): void {
    this.write('info', msg, meta);
  }

  public warn(msg: string, meta?: unknown): void {
    this.write('warn', msg, meta);
  }

  public error(msg: string, meta?: unknown): void {
    this.write('error', msg, meta);
  }
}

export const logger = new Logger();
