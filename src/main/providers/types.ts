export interface TranscriptionResult {
  text: string;
  rawTranscript: string;
  language?: string;
  durationMs?: number;
  provider: string;
}

export interface CleanupResult {
  cleanedText: string;
  provider: string;
  skipped?: boolean;
}

export interface STTProvider {
  name: string;
  transcribe(audioBuffer: Buffer, mimeType: string, options?: { language?: string; glossary?: string[] }): Promise<TranscriptionResult>;
  isAvailable(): boolean;
}

export interface LLMProvider {
  name: string;
  cleanup(rawTranscript: string, options: { tone: string; customInstructions?: string; outputLanguage: 'as_spoken' | 'en'; appExe?: string; preText?: string; glossary?: string[]; snippets?: { id: number; trigger: string }[] }): Promise<CleanupResult>;
  isAvailable(): boolean;
}
