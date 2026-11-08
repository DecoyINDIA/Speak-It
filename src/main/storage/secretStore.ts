import { safeStorage } from 'electron';
import * as crypto from 'crypto';
import type Database from 'better-sqlite3';

export class SecretStore {
  private db: Database.Database;
  private testKey: Buffer;

  constructor(db: Database.Database) {
    this.db = db;
    // Machine/test key fallback for environments where Electron safeStorage is unavailable (e.g. CLI/vitest)
    this.testKey = crypto.scryptSync('speakit-fallback-salt', 'salt', 32);
  }

  public setSecret(provider: string, secretValue: string): void {
    if (!secretValue) {
      this.deleteSecret(provider);
      return;
    }

    let encryptedBlob: Buffer;
    if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
      encryptedBlob = safeStorage.encryptString(secretValue);
    } else {
      // Fallback AES-256-GCM for node/test environment
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.testKey, iv);
      const enc = Buffer.concat([cipher.update(secretValue, 'utf-8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      encryptedBlob = Buffer.concat([Buffer.from([0xAA]), iv, tag, enc]);
    }

    const stmt = this.db.prepare(`
      INSERT INTO secrets (provider, blob) VALUES (?, ?)
      ON CONFLICT(provider) DO UPDATE SET blob = excluded.blob
    `);
    stmt.run(provider, encryptedBlob);
  }

  public getSecret(provider: string): string | null {
    const row = this.db.prepare('SELECT blob FROM secrets WHERE provider = ?').get(provider) as { blob: Buffer } | undefined;
    if (!row || !row.blob) {
      return null;
    }

    const buf = row.blob;
    if (buf.length > 0 && buf[0] === 0xAA) {
      // Encrypted with fallback
      try {
        const iv = buf.subarray(1, 13);
        const tag = buf.subarray(13, 29);
        const enc = buf.subarray(29);
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.testKey, iv);
        decipher.setAuthTag(tag);
        return decipher.update(enc).toString('utf-8') + decipher.final('utf-8');
      } catch {
        return null;
      }
    }

    if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(buf);
      } catch {
        return null;
      }
    }

    return null;
  }

  public hasSecret(provider: string): boolean {
    const row = this.db.prepare('SELECT 1 FROM secrets WHERE provider = ?').get(provider);
    return !!row;
  }

  public deleteSecret(provider: string): void {
    this.db.prepare('DELETE FROM secrets WHERE provider = ?').run(provider);
  }

  public getSecretStatus(): Record<string, boolean> {
    const rows = this.db.prepare('SELECT provider FROM secrets').all() as { provider: string }[];
    const result: Record<string, boolean> = {};
    for (const row of rows) {
      result[row.provider] = true;
    }
    return result;
  }
}
