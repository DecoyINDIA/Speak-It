import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { HelperClient } from '../../src/main/helper/client';
import { AppDatabase } from '../../src/main/storage/database';
import { ProviderChain } from '../../src/main/providers/chain';
import { STTProvider, LLMProvider } from '../../src/main/providers/types';

describe('E3 Release Gate: Real-Process Soak Test', () => {
  const exePath = path.resolve(__dirname, '../../native/helper/SpeakItHelper.exe');
  let client: HelperClient;
  let db: AppDatabase;

  beforeAll(async () => {
    if (fs.existsSync(exePath)) {
      client = new HelperClient(exePath);
      await client.start();
    }
    db = new AppDatabase(':memory:');
  });

  afterAll(() => {
    if (client) {
      client.stop();
    }
  });

  it('runs 25 real-process helper & provider cycles without stuck states or leaks', async () => {
    if (!fs.existsSync(exePath)) {
      if (process.env.SPEAKIT_SKIP_SOAK === '1') return;
      throw new Error(`Native helper not found at ${exePath}; build it or set SPEAKIT_SKIP_SOAK=1 to skip explicitly`);
    }

    const mockStt: STTProvider = {
      name: 'mock-stt',
      isAvailable: () => true,
      transcribe: async () => ({
        text: 'This is a real-process soak test dictation.',
        rawTranscript: 'This is a real-process soak test dictation.',
        language: 'en',
        provider: 'mock-stt',
        durationMs: 3000,
        words: 7,
      }),
    };

    const mockLlm: LLMProvider = {
      name: 'mock-llm',
      isAvailable: () => true,
      cleanup: async (raw) => ({
        cleanedText: raw,
        provider: 'mock-llm',
      }),
    };

    const chain = new ProviderChain({
      sttProviders: [mockStt],
      llmProviders: [mockLlm],
    });

    const initialHeap = process.memoryUsage().heapUsed;
    const testCycles = 25;

    for (let i = 0; i < testCycles; i++) {
      // 1. Ping helper
      const ping = await client.ping();
      expect(ping.ok).toBe(true);

      // 2. Snapshot context & clipboard
      const context = await client.getContext(false, 300);
      expect(typeof context.hwnd).toBe('number');

      await client.beginDictation(context.hwnd);

      // 3. Provider pipeline execution
      const result = await chain.executePipeline({
        audioBuffer: Buffer.from('dummy-audio-bytes'),
        mimeType: 'audio/webm',
        tone: 'natural',
        outputLanguage: 'as_spoken',
        context: { appExe: context.exe },
      });
      expect(result.rawTranscript).toContain('soak test');

      // 4. Record to SQLite database
      db.insertDictation({
        uid: `soak-${i}-${Date.now()}`,
        created_at: Date.now(),
        status: 'done',
        raw_text: result.rawTranscript,
        clean_text: result.cleanedText,
        inserted_text: result.finalInsertedText,
        words: result.words,
        speech_ms: 1500,
        stt_provider: result.sttProvider,
        paste_outcome: 'pasted',
      });
    }

    const stats = db.getStats();
    expect(stats.totalDictations).toBe(testCycles);

    // Verify heap growth < 50MB
    const finalHeap = process.memoryUsage().heapUsed;
    const heapGrowthMb = (finalHeap - initialHeap) / (1024 * 1024);
    expect(heapGrowthMb).toBeLessThan(50);
  });
});
