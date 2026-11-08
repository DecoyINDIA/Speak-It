import * as fs from 'fs';
import * as path from 'path';
import { AppDatabase } from './database';

export interface LegacyImportResult {
  imported: boolean;
  historyCount: number;
  dictionaryCount: number;
  hasApiKey: boolean;
}

export function importVoiceDraftData(db: AppDatabase, customLegacyPath?: string): LegacyImportResult {
  const defaultPath = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'VoiceDraft', 'db.json')
    : null;
  const legacyFilePath = customLegacyPath || defaultPath;

  const result: LegacyImportResult = {
    imported: false,
    historyCount: 0,
    dictionaryCount: 0,
    hasApiKey: false,
  };

  if (!legacyFilePath || !fs.existsSync(legacyFilePath)) {
    return result;
  }

  // Check if already imported
  const alreadyImported = db.db.prepare('SELECT value FROM settings WHERE key = ?').get('legacy_imported_voicedraft');
  if (alreadyImported) {
    return result;
  }

  try {
    const raw = fs.readFileSync(legacyFilePath, 'utf-8');
    const data = JSON.parse(raw);

    const tx = db.db.transaction(() => {
      // 1. History
      if (Array.isArray(data.history)) {
        for (const item of data.history) {
          const uid = item.id || `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          db.insertDictation({
            uid,
            created_at: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
            status: 'done',
            raw_text: item.rawText || item.text || '',
            clean_text: item.cleanedText || item.text || '',
            inserted_text: item.cleanedText || item.text || '',
            app_exe: item.app || 'unknown',
            speech_ms: item.duration ? Math.round(item.duration * 1000) : 0,
            words: (item.cleanedText || item.text || '').trim().split(/\s+/).filter(Boolean).length,
            stt_provider: 'legacy-import',
          });
          result.historyCount++;
        }
      }

      // 2. Dictionary
      if (Array.isArray(data.dictionary)) {
        for (const term of data.dictionary) {
          if (typeof term === 'string') {
            db.addDictionaryTerm(term);
            result.dictionaryCount++;
          } else if (term && typeof term === 'object') {
            db.addDictionaryTerm(term.word || term.term || '', term.replacement || term.sounds_like || '');
            result.dictionaryCount++;
          }
        }
      }

      // 3. API Key from settings
      if (data.settings && data.settings.geminiApiKey && typeof data.settings.geminiApiKey === 'string' && data.settings.geminiApiKey.trim()) {
        db.secrets.setSecret('gemini', data.settings.geminiApiKey.trim());
        result.hasApiKey = true;
      }

      // 4. Mark imported
      db.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('legacy_imported_voicedraft', 'true');
    });

    tx();
    result.imported = true;
  } catch (err) {
    console.error('Failed to import legacy VoiceDraft db.json:', err);
  }

  return result;
}
