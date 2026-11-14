import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { AppSettings, SettingsSchema, defaultSettings } from './settingsSchema';
import { SecretStore } from './secretStore';
import { loadEnterprisePolicy, EnterprisePolicy } from './registryPolicy';

export interface DictationRecord {
  id?: number;
  uid: string;
  created_at: number;
  status: 'done' | 'copied_only' | 'blocked' | 'failed' | 'cancelled';
  raw_text?: string;
  clean_text?: string;
  inserted_text?: string;
  app_exe?: string;
  url_host?: string;
  category?: string;
  language?: string;
  words?: number;
  speech_ms?: number;
  stt_provider?: string;
  stt_ms?: number;
  llm_provider?: string;
  llm_ms?: number;
  total_ms?: number;
  paste_method?: string;
  paste_outcome?: string;
  error_code?: string;
  audio_path?: string;
}

export interface DictionaryEntry {
  id?: number;
  term: string;
  sounds_like?: string;
  source?: string;
  uses?: number;
  created_at: number;
}

export interface SnippetEntry {
  id?: number;
  trigger: string;
  expansion: string;
  uses?: number;
  created_at: number;
}

export class AppDatabase {
  public db: Database.Database;
  public secrets: SecretStore;
  private dbPath: string;

  constructor(dbPath: string = ':memory:') {
    this.dbPath = dbPath;
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.initSchema();
    this.secrets = new SecretStore(this.db);
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at INTEGER NOT NULL
      );
    `);

    const hasInit = this.db.prepare('SELECT 1 FROM _migrations WHERE name = ?').get('001_init');
    if (!hasInit) {
      this.applyMigration('001_init', `
        CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE secrets  (provider TEXT PRIMARY KEY, blob BLOB NOT NULL);

        CREATE TABLE dictations (
          id INTEGER PRIMARY KEY,
          uid TEXT NOT NULL UNIQUE,
          created_at INTEGER NOT NULL,
          status TEXT NOT NULL,
          raw_text TEXT,
          clean_text TEXT,
          inserted_text TEXT,
          app_exe TEXT,
          url_host TEXT,
          category TEXT,
          language TEXT,
          words INTEGER,
          speech_ms INTEGER,
          stt_provider TEXT,
          stt_ms INTEGER,
          llm_provider TEXT,
          llm_ms INTEGER,
          total_ms INTEGER,
          paste_method TEXT,
          paste_outcome TEXT,
          error_code TEXT,
          audio_path TEXT
        );

        CREATE INDEX idx_dictations_created ON dictations(created_at DESC);

        CREATE VIRTUAL TABLE dictations_fts USING fts5(
          clean_text,
          raw_text,
          content='dictations',
          content_rowid='id'
        );

        CREATE TRIGGER dictations_ai AFTER INSERT ON dictations BEGIN
          INSERT INTO dictations_fts(rowid, clean_text, raw_text)
          VALUES (new.id, new.clean_text, new.raw_text);
        END;

        CREATE TRIGGER dictations_ad AFTER DELETE ON dictations BEGIN
          INSERT INTO dictations_fts(dictations_fts, rowid, clean_text, raw_text)
          VALUES ('delete', old.id, old.clean_text, old.raw_text);
        END;

        CREATE TRIGGER dictations_au AFTER UPDATE ON dictations BEGIN
          INSERT INTO dictations_fts(dictations_fts, rowid, clean_text, raw_text)
          VALUES ('delete', old.id, old.clean_text, old.raw_text);
          INSERT INTO dictations_fts(rowid, clean_text, raw_text)
          VALUES (new.id, new.clean_text, new.raw_text);
        END;

        CREATE TABLE dictionary (
          id INTEGER PRIMARY KEY,
          term TEXT NOT NULL UNIQUE COLLATE NOCASE,
          sounds_like TEXT,
          source TEXT NOT NULL DEFAULT 'manual',
          uses INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE snippets (
          id INTEGER PRIMARY KEY,
          trigger TEXT NOT NULL UNIQUE COLLATE NOCASE,
          expansion TEXT NOT NULL,
          uses INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE styles (
          category TEXT PRIMARY KEY,
          tone TEXT NOT NULL,
          custom_instructions TEXT
        );

        CREATE TABLE app_categories (
          match TEXT PRIMARY KEY,
          category TEXT NOT NULL
        );
      `);

      // Seed default styles
      const insertStyle = this.db.prepare('INSERT OR IGNORE INTO styles (category, tone, custom_instructions) VALUES (?, ?, ?)');
      insertStyle.run('personal', 'Casual', 'Friendly, informal tone with emojis where appropriate');
      insertStyle.run('work', 'Formal', 'Clear, professional, concise workplace communication');
      insertStyle.run('email', 'Formal', 'Structured business email format');
      insertStyle.run('other', 'Casual', 'Natural, clear speech transcript');

      // Seed default app categories
      const insertCat = this.db.prepare('INSERT OR IGNORE INTO app_categories (match, category) VALUES (?, ?)');
      insertCat.run('exe:slack.exe', 'personal');
      insertCat.run('exe:teams.exe', 'work');
      insertCat.run('exe:outlook.exe', 'email');
      insertCat.run('host:mail.google.com', 'email');
    }
  }

  private applyMigration(name: string, sql: string): void {
    if (this.dbPath !== ':memory:' && fs.existsSync(this.dbPath)) {
      try {
        fs.copyFileSync(this.dbPath, `${this.dbPath}.bak-${name}`);
      } catch {
        // Ignore backup failure in dev/memory
      }
    }
    const run = this.db.transaction(() => {
      this.db.exec(sql);
      this.db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(name, Date.now());
    });
    run();
  }

  // --- Settings ---
  public getSettings(): AppSettings {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get('app_settings') as { value: string } | undefined;
    let settings = defaultSettings;
    if (row) {
      try {
        const parsed = JSON.parse(row.value);
        settings = SettingsSchema.parse(parsed);
      } catch {
        settings = defaultSettings;
      }
    }

    const policy = loadEnterprisePolicy();
    if (policy.isManaged) {
      if (policy.offlineOnly) {
        settings.providers.chain = ['offline'];
      }
      if (policy.allowedProviders) {
        const allowed = policy.allowedProviders;
        settings.providers.chain = settings.providers.chain.filter(p => allowed.includes(p.toLowerCase()));
      }
      if (policy.forcedRetentionDays !== undefined) {
        settings.privacy.retentionDays = policy.forcedRetentionDays;
      }
    }
    return settings;
  }

  public getEnterprisePolicy(): EnterprisePolicy {
    return loadEnterprisePolicy();
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const merged = {
      ...current,
      ...partial,
      general: { ...current.general, ...partial.general },
      system: { ...current.system, ...partial.system },
      providers: { ...current.providers, ...partial.providers },
      privacy: { ...current.privacy, ...partial.privacy },
    };
    const validated = SettingsSchema.parse(merged);
    this.db.prepare(`
      INSERT INTO settings (key, value) VALUES ('app_settings', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(JSON.stringify(validated));
    return validated;
  }

  // --- Dictations ---
  public insertDictation(d: DictationRecord): number {
    const policy = loadEnterprisePolicy();
    if (policy.disableHistory) {
      return 0; // History disabled by enterprise organization policy
    }

    const stmt = this.db.prepare(`
      INSERT INTO dictations (
        uid, created_at, status, raw_text, clean_text, inserted_text,
        app_exe, url_host, category, language, words, speech_ms,
        stt_provider, stt_ms, llm_provider, llm_ms, total_ms,
        paste_method, paste_outcome, error_code, audio_path
      ) VALUES (
        @uid, @created_at, @status, @raw_text, @clean_text, @inserted_text,
        @app_exe, @url_host, @category, @language, @words, @speech_ms,
        @stt_provider, @stt_ms, @llm_provider, @llm_ms, @total_ms,
        @paste_method, @paste_outcome, @error_code, @audio_path
      )
    `);
    const info = stmt.run({
      uid: d.uid,
      created_at: d.created_at || Date.now(),
      status: d.status,
      raw_text: d.raw_text || null,
      clean_text: d.clean_text || null,
      inserted_text: d.inserted_text || null,
      app_exe: d.app_exe || null,
      url_host: d.url_host || null,
      category: d.category || 'other',
      language: d.language || null,
      words: d.words || (d.clean_text ? d.clean_text.trim().split(/\s+/).length : 0),
      speech_ms: d.speech_ms || 0,
      stt_provider: d.stt_provider || null,
      stt_ms: d.stt_ms || 0,
      llm_provider: d.llm_provider || null,
      llm_ms: d.llm_ms || 0,
      total_ms: d.total_ms || 0,
      paste_method: d.paste_method || null,
      paste_outcome: d.paste_outcome || null,
      error_code: d.error_code || null,
      audio_path: d.audio_path || null,
    });
    return info.lastInsertRowid as number;
  }

  public updateDictation(uid: string, fields: Partial<DictationRecord>): void {
    const sets: string[] = [];
    const values: Record<string, unknown> = { uid };

    for (const [key, val] of Object.entries(fields)) {
      if (key !== 'id' && key !== 'uid') {
        sets.push(`${key} = @${key}`);
        values[key] = val;
      }
    }

    if (sets.length === 0) return;

    this.db.prepare(`UPDATE dictations SET ${sets.join(', ')} WHERE uid = @uid`).run(values);
  }

  public getDictations(limit: number = 100, offset: number = 0, searchQuery?: string): DictationRecord[] {
    if (searchQuery && searchQuery.trim()) {
      // Clean search query for FTS5 (escape special chars)
      const sanitized = searchQuery.trim().replace(/['"*]/g, ' ') + '*';
      const stmt = this.db.prepare(`
        SELECT d.* FROM dictations d
        JOIN dictations_fts f ON d.id = f.rowid
        WHERE dictations_fts MATCH ?
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
      `);
      return stmt.all(sanitized, limit, offset) as DictationRecord[];
    }

    return this.db.prepare(`
      SELECT * FROM dictations ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset) as DictationRecord[];
  }

  public deleteDictation(uid: string): void {
    const row = this.db.prepare('SELECT audio_path FROM dictations WHERE uid = ?').get(uid) as { audio_path?: string } | undefined;
    if (row && row.audio_path && fs.existsSync(row.audio_path)) {
      try {
        fs.unlinkSync(row.audio_path);
      } catch {
        // ignore
      }
    }
    this.db.prepare('DELETE FROM dictations WHERE uid = ?').run(uid);
  }

  public getStats(): { totalWords: number; avgWpm: number; dayStreak: number; totalDictations: number } {
    const row = this.db.prepare(`
      SELECT 
        COALESCE(SUM(words), 0) as totalWords,
        COALESCE(AVG(CASE WHEN speech_ms > 0 THEN (words * 60000.0 / speech_ms) ELSE NULL END), 0) as avgWpm,
        COUNT(id) as totalDictations
      FROM dictations
      WHERE status = 'done'
    `).get() as { totalWords: number; avgWpm: number; totalDictations: number };

    // Calculate daily streak
    const dates = this.db.prepare(`
      SELECT DISTINCT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch', 'localtime') as day
      FROM dictations
      WHERE status = 'done'
      ORDER BY day DESC
    `).all() as { day: string }[];

    let streak = 0;
    if (dates.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const yesterdayDate = new Date(Date.now() - 86400000);
      const yesterday = yesterdayDate.toISOString().slice(0, 10);

      let currentExpected = dates[0].day === today ? today : (dates[0].day === yesterday ? yesterday : null);

      if (currentExpected) {
        for (const entry of dates) {
          if (entry.day === currentExpected) {
            streak++;
            const dt: Date = new Date(currentExpected);
            dt.setDate(dt.getDate() - 1);
            currentExpected = dt.toISOString().slice(0, 10);
          } else {
            break;
          }
        }
      }
    }

    return {
      totalWords: Math.round(row.totalWords || 0),
      avgWpm: Math.round(row.avgWpm || 0),
      dayStreak: streak,
      totalDictations: row.totalDictations || 0,
    };
  }

  // --- Anonymized Stats Export (§BG2) ---
  public getAnonymizedStats(appVersion = '0.9.0-beta.1'): Record<string, unknown> {
    const counts = this.db.prepare(`
      SELECT status, COUNT(id) as cnt 
      FROM dictations 
      GROUP BY status
    `).all() as { status: string; cnt: number }[];

    const statusCounts: Record<string, number> = {
      done: 0,
      copied_only: 0,
      blocked: 0,
      failed: 0,
      cancelled: 0,
    };
    let total = 0;
    for (const c of counts) {
      statusCounts[c.status] = c.cnt;
      total += c.cnt;
    }

    const providerRows = this.db.prepare(`
      SELECT stt_provider, COUNT(id) as cnt
      FROM dictations
      WHERE stt_provider IS NOT NULL
      GROUP BY stt_provider
    `).all() as { stt_provider: string; cnt: number }[];
    const providerBreakdown: Record<string, number> = {};
    for (const p of providerRows) {
      providerBreakdown[p.stt_provider] = p.cnt;
    }

    const pasteRows = this.db.prepare(`
      SELECT paste_outcome, COUNT(id) as cnt
      FROM dictations
      WHERE paste_outcome IS NOT NULL
      GROUP BY paste_outcome
    `).all() as { paste_outcome: string; cnt: number }[];
    const pasteBreakdown: Record<string, number> = {};
    for (const p of pasteRows) {
      pasteBreakdown[p.paste_outcome] = p.cnt;
    }

    const latencies = this.db.prepare(`
      SELECT total_ms FROM dictations
      WHERE total_ms IS NOT NULL AND total_ms > 0
      ORDER BY total_ms ASC
    `).all() as { total_ms: number }[];
    const medianLatencyMs = latencies.length > 0
      ? latencies[Math.floor(latencies.length / 2)].total_ms
      : 0;

    const stats = this.getStats();
    const successRatePct = total > 0 ? Math.round(((statusCounts.done + statusCounts.copied_only) / total) * 100) : 0;

    const onboardingSetting = this.db.prepare('SELECT value FROM settings WHERE key = ?').get('onboarding_step_reached') as { value: string } | undefined;
    const onboardingStep = onboardingSetting ? parseInt(onboardingSetting.value, 10) : 4;

    return {
      version: appVersion,
      platform: `${process.platform} ${process.arch}`,
      summary: {
        totalDictations: total,
        successfulDictations: statusCounts.done,
        copiedOnly: statusCounts.copied_only,
        blocked: statusCounts.blocked,
        failed: statusCounts.failed,
        cancelled: statusCounts.cancelled,
        successRatePct,
        totalWords: stats.totalWords,
        avgWpm: stats.avgWpm,
        medianLatencyMs,
      },
      providerBreakdown,
      pasteOutcomeBreakdown: pasteBreakdown,
      onboardingStepReached: onboardingStep,
      generatedAt: new Date().toISOString(),
    };
  }

  public setOnboardingStepReached(step: number): void {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('onboarding_step_reached', String(step));
  }

  // --- Retention & Audio Cleanup ---
  public runRetention(): { deletedDictations: number; deletedAudioFiles: number } {
    const settings = this.getSettings();
    let deletedDictations = 0;
    let deletedAudioFiles = 0;

    if (settings.privacy.retentionDays > 0) {
      const cutoff = Date.now() - (settings.privacy.retentionDays * 86400000);
      const toDelete = this.db.prepare('SELECT uid, audio_path FROM dictations WHERE created_at < ?').all(cutoff) as { uid: string; audio_path?: string }[];
      
      for (const item of toDelete) {
        if (item.audio_path && fs.existsSync(item.audio_path)) {
          try {
            fs.unlinkSync(item.audio_path);
            deletedAudioFiles++;
          } catch {}
        }
        this.db.prepare('DELETE FROM dictations WHERE uid = ?').run(item.uid);
        deletedDictations++;
      }
    }

    // Keep only last 20 audio files if keepAudio is true, or 0 if false
    const keepCount = settings.privacy.keepAudio ? 20 : 0;
    const oldAudioRows = this.db.prepare(`
      SELECT uid, audio_path FROM dictations
      WHERE audio_path IS NOT NULL
      ORDER BY created_at DESC
      LIMIT -1 OFFSET ?
    `).all(keepCount) as { uid: string; audio_path: string }[];

    for (const row of oldAudioRows) {
      if (row.audio_path && fs.existsSync(row.audio_path)) {
        try {
          fs.unlinkSync(row.audio_path);
          deletedAudioFiles++;
        } catch {}
      }
      this.db.prepare('UPDATE dictations SET audio_path = NULL WHERE uid = ?').run(row.uid);
    }

    return { deletedDictations, deletedAudioFiles };
  }

  // --- Dictionary CRUD ---
  public getDictionary(): DictionaryEntry[] {
    return this.db.prepare('SELECT * FROM dictionary ORDER BY term ASC').all() as DictionaryEntry[];
  }

  public addDictionaryTerm(term: string, sounds_like?: string): void {
    const trimmed = term.trim();
    if (!trimmed) return;
    this.db.prepare(`
      INSERT INTO dictionary (term, sounds_like, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(term) DO UPDATE SET sounds_like = excluded.sounds_like
    `).run(trimmed, sounds_like ? sounds_like.trim() : null, Date.now());
  }

  public deleteDictionaryTerm(id: number): void {
    this.db.prepare('DELETE FROM dictionary WHERE id = ?').run(id);
  }

  public incrementDictionaryUse(term: string): void {
    this.db.prepare('UPDATE dictionary SET uses = uses + 1 WHERE term = ? COLLATE NOCASE').run(term);
  }

  // --- Snippets CRUD ---
  public getSnippets(): SnippetEntry[] {
    return this.db.prepare('SELECT * FROM snippets ORDER BY trigger ASC').all() as SnippetEntry[];
  }

  public addSnippet(trigger: string, expansion: string): void {
    const t = trigger.trim();
    const e = expansion.trim();
    if (!t || !e) return;
    this.db.prepare(`
      INSERT INTO snippets (trigger, expansion, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(trigger) DO UPDATE SET expansion = excluded.expansion
    `).run(t, e, Date.now());
  }

  public deleteSnippet(id: number): void {
    this.db.prepare('DELETE FROM snippets WHERE id = ?').run(id);
  }

  public incrementSnippetUse(trigger: string): void {
    this.db.prepare('UPDATE snippets SET uses = uses + 1 WHERE trigger = ? COLLATE NOCASE').run(trigger);
  }

  // --- Styles ---
  public getStyles(): { category: string; tone: string; custom_instructions?: string }[] {
    return this.db.prepare('SELECT * FROM styles').all() as { category: string; tone: string; custom_instructions?: string }[];
  }

  public updateStyle(category: string, tone: string, custom_instructions?: string): void {
    this.db.prepare(`
      INSERT INTO styles (category, tone, custom_instructions)
      VALUES (?, ?, ?)
      ON CONFLICT(category) DO UPDATE SET tone = excluded.tone, custom_instructions = excluded.custom_instructions
    `).run(category, tone, custom_instructions || null);
  }

  public getCategoryForApp(exeName?: string, host?: string): string {
    if (host) {
      const match = this.db.prepare('SELECT category FROM app_categories WHERE match = ?').get(`host:${host}`) as { category: string } | undefined;
      if (match) return match.category;
    }
    if (exeName) {
      const match = this.db.prepare('SELECT category FROM app_categories WHERE match = ?').get(`exe:${exeName.toLowerCase()}`) as { category: string } | undefined;
      if (match) return match.category;
    }
    return 'other';
  }

  public vacuum(): void {
    this.db.exec('VACUUM');
  }

  public close(): void {
    this.db.close();
  }
}
