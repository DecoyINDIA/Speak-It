import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', '..', 'db.json');

export interface DictationRecord {
  id: string;
  text: string;
  rawTranscript: string;
  timestamp: string;
  wordCount: number;
  mode: string;
  durationMs: number;
}

export interface DictionaryTerm {
  id: string;
  term: string;
  soundsLike?: string;
  casingRule?: string;
  createdAt: string;
}

export interface UserSettings {
  hotkey: string;
  defaultMode: string;
  autoPaste: boolean;
  reviewBeforePaste: boolean;
  historyEnabled: boolean;
}

interface DatabaseSchema {
  history: DictationRecord[];
  dictionary: DictionaryTerm[];
  settings: UserSettings;
}

const DEFAULT_SETTINGS: UserSettings = {
  hotkey: 'Alt+Space',
  defaultMode: 'default',
  autoPaste: true,
  reviewBeforePaste: false,
  historyEnabled: true
};

const DEFAULT_SCHEMA: DatabaseSchema = {
  history: [],
  dictionary: [],
  settings: DEFAULT_SETTINGS
};

class LocalDatabase {
  private data: DatabaseSchema = { ...DEFAULT_SCHEMA };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
        this.data = JSON.parse(fileContent);
        // Ensure default settings are merged if missing
        this.data.settings = { ...DEFAULT_SETTINGS, ...this.data.settings };
      } else {
        this.save();
      }
    } catch (error) {
      console.error('Error loading local database, resetting to default:', error);
      this.data = { ...DEFAULT_SCHEMA };
      this.save();
    }
  }

  private save() {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving local database:', error);
    }
  }

  // Settings
  getSettings(): UserSettings {
    return this.data.settings;
  }

  updateSettings(settings: Partial<UserSettings>): UserSettings {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
    return this.data.settings;
  }

  // Dictionary
  getDictionary(): DictionaryTerm[] {
    return this.data.dictionary;
  }

  addDictionaryTerm(term: Omit<DictionaryTerm, 'id' | 'createdAt'>): DictionaryTerm {
    const newTerm: DictionaryTerm = {
      id: Math.random().toString(36).substring(2, 9),
      ...term,
      createdAt: new Date().toISOString()
    };
    // Avoid duplicates by term
    const exists = this.data.dictionary.some(d => d.term.toLowerCase() === term.term.toLowerCase());
    if (exists) {
      this.data.dictionary = this.data.dictionary.filter(d => d.term.toLowerCase() !== term.term.toLowerCase());
    }
    this.data.dictionary.push(newTerm);
    this.save();
    return newTerm;
  }

  deleteDictionaryTerm(id: string): boolean {
    const initialLen = this.data.dictionary.length;
    this.data.dictionary = this.data.dictionary.filter(item => item.id !== id);
    if (this.data.dictionary.length < initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // History
  getHistory(): DictationRecord[] {
    return this.data.history;
  }

  addHistoryRecord(record: Omit<DictationRecord, 'id' | 'timestamp'>): DictationRecord | null {
    if (!this.data.settings.historyEnabled) {
      return null;
    }
    const newRecord: DictationRecord = {
      id: Math.random().toString(36).substring(2, 9),
      ...record,
      timestamp: new Date().toISOString()
    };
    this.data.history.unshift(newRecord); // Add to the top
    // Limit history to 50 records as per MVP spec
    if (this.data.history.length > 50) {
      this.data.history = this.data.history.slice(0, 50);
    }
    this.save();
    return newRecord;
  }

  clearHistory() {
    this.data.history = [];
    this.save();
  }
}

export const db = new LocalDatabase();
