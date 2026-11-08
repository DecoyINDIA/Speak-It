import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AppDatabase } from '../../src/main/storage/database';
import { importVoiceDraftData } from '../../src/main/storage/voiceDraftImporter';

describe('Storage & Database Engine', () => {
  let db: AppDatabase;
  const testDbPath = path.join(__dirname, 'test-speakit.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    db = new AppDatabase(testDbPath);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  });

  it('initializes schema and default settings', () => {
    const settings = db.getSettings();
    expect(settings.general.hotkey).toEqual(['Control', 'Meta']);
    expect(settings.general.hotkeyMode).toBe('ptt');
    expect(settings.privacy.contextAwareness).toBe(false);
  });

  it('updates and persists settings round-trip under zod schema', () => {
    db.updateSettings({
      general: {
        hotkey: ['F13'],
        hotkeyMode: 'toggle',
        doubleTapHandsFree: false,
        micDeviceId: 'mic-1',
        inputLanguage: 'en',
        outputLanguage: 'en',
        theme: 'dark',
      },
    });

    const updated = db.getSettings();
    expect(updated.general.hotkey).toEqual(['F13']);
    expect(updated.general.theme).toBe('dark');
  });

  it('stores secrets encrypted and not in plaintext', () => {
    const secretKey = 'gsk_super_secret_groq_api_key_12345';
    db.secrets.setSecret('groq', secretKey);

    expect(db.secrets.hasSecret('groq')).toBe(true);
    expect(db.secrets.getSecret('groq')).toBe(secretKey);

    // Verify stored blob in SQLite is NOT plaintext
    const rawRow = db.db.prepare('SELECT blob FROM secrets WHERE provider = ?').get('groq') as { blob: Buffer };
    expect(rawRow.blob).toBeInstanceOf(Buffer);
    expect(rawRow.blob.toString('utf-8')).not.toContain(secretKey);
    expect(rawRow.blob.toString('utf-8')).not.toContain('super_secret');
  });

  it('FTS stays consistent after insert, update, delete, and VACUUM', () => {
    // 1. Insert
    const id1 = db.insertDictation({
      uid: 'uid-1',
      created_at: Date.now() - 5000,
      status: 'done',
      raw_text: 'hello world from speech',
      clean_text: 'Hello world from speech.',
      words: 4,
    });
    expect(id1).toBeGreaterThan(0);

    let search = db.getDictations(10, 0, 'speech');
    expect(search.length).toBe(1);
    expect(search[0].uid).toBe('uid-1');

    // 2. Update
    db.updateDictation('uid-1', {
      clean_text: 'Quantum physics is fascinating.',
      raw_text: 'quantum physics is fascinating',
    });

    // Old word should no longer match
    search = db.getDictations(10, 0, 'speech');
    expect(search.length).toBe(0);

    // New word should match
    search = db.getDictations(10, 0, 'quantum');
    expect(search.length).toBe(1);
    expect(search[0].clean_text).toBe('Quantum physics is fascinating.');

    // 3. VACUUM
    db.vacuum();

    search = db.getDictations(10, 0, 'quantum');
    expect(search.length).toBe(1);

    // 4. Delete
    db.deleteDictation('uid-1');
    search = db.getDictations(10, 0, 'quantum');
    expect(search.length).toBe(0);
  });

  it('calculates home stats card metrics accurately', () => {
    db.insertDictation({
      uid: 'uid-stat-1',
      created_at: Date.now(),
      status: 'done',
      clean_text: 'One two three four five',
      words: 5,
      speech_ms: 2000, // 150 wpm
    });

    const stats = db.getStats();
    expect(stats.totalWords).toBe(5);
    expect(stats.avgWpm).toBe(150);
    expect(stats.dayStreak).toBe(1);
  });

  it('imports legacy VoiceDraft db.json correctly', () => {
    const legacyPath = path.join(__dirname, 'test-legacy-db.json');
    fs.writeFileSync(
      legacyPath,
      JSON.stringify({
        history: [
          {
            id: 'legacy-1',
            text: 'Legacy voice note',
            cleanedText: 'Legacy voice note.',
            timestamp: new Date().toISOString(),
            app: 'notepad.exe',
            duration: 1.5,
          },
        ],
        dictionary: [{ word: 'Antigravity', replacement: 'Antigravity' }],
        settings: {
          geminiApiKey: 'AIzaSy_legacy_secret_key_999',
        },
      }),
      'utf-8'
    );

    const importResult = importVoiceDraftData(db, legacyPath);
    expect(importResult.imported).toBe(true);
    expect(importResult.historyCount).toBe(1);
    expect(importResult.dictionaryCount).toBe(1);
    expect(importResult.hasApiKey).toBe(true);

    // Verify secret was moved to encrypted secrets
    expect(db.secrets.getSecret('gemini')).toBe('AIzaSy_legacy_secret_key_999');

    // Verify history exists
    const dictations = db.getDictations(10);
    expect(dictations.some((d) => d.uid === 'legacy-1')).toBe(true);

    // Verify dictionary exists
    const dict = db.getDictionary();
    expect(dict.some((d) => d.term === 'Antigravity')).toBe(true);

    fs.unlinkSync(legacyPath);
  });
});
