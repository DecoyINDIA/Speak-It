import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { ModelDownloadManager, SUPPORTED_MODELS } from '../../src/main/providers/downloadManager';
import { LocalCleanupProvider } from '../../src/main/providers/localCleanup';
import { WhisperServerProcess } from '../../src/main/providers/whisperServerProcess';

describe('Offline Engine & Model Management (Milestone M6)', () => {
  const testDir = path.resolve(__dirname, 'test-models');
  let downloadManager: ModelDownloadManager;

  beforeEach(() => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    downloadManager = new ModelDownloadManager(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {}
    }
  });

  it('has valid catalog of multilingual models with sha256 checksums', () => {
    expect(SUPPORTED_MODELS['ggml-model-whisper-small.bin']).toBeDefined();
    expect(SUPPORTED_MODELS['ggml-model-whisper-small.bin'].isMultilingual).toBe(true);
    expect(SUPPORTED_MODELS['ggml-model-whisper-small.bin'].sha256).toBeDefined();
    expect(SUPPORTED_MODELS['ggml-model-whisper-large-v3-turbo.bin'].isMultilingual).toBe(true);
  });

  it('verifies model SHA-256 hash correctly', async () => {
    const filename = 'test-model.bin';
    const filePath = path.join(testDir, filename);
    const content = 'mock-model-binary-weights';
    fs.writeFileSync(filePath, content, 'utf-8');

    // SHA-256 of 'mock-model-binary-weights'
    const crypto = await import('crypto');
    const expectedHash = crypto.createHash('sha256').update(content).digest('hex');

    const isValid = await downloadManager.verifyModelSha256(filename, expectedHash);
    expect(isValid).toBe(true);

    const isInvalid = await downloadManager.verifyModelSha256(filename, '0000000000000000000000000000000000000000000000000000000000000000');
    expect(isInvalid).toBe(false);
  });

  it('local cleanup skips LLM on short utterances (<= 3 words)', async () => {
    const provider = new LocalCleanupProvider('http://127.0.0.1:11434/v1', 'llama3.2', true);
    const res = await provider.cleanup('Hello world thanks', {
      tone: 'Casual',
      outputLanguage: 'as_spoken',
    });
    expect(res.skipped).toBe(true);
    expect(res.cleanedText).toBe('Hello world thanks');
  });

  it('whisper server process manages idle timer and loopback port', () => {
    const server = new WhisperServerProcess('path/to/model.bin', 9123, 10);
    expect(server.getPort()).toBe(9123);
    expect(server.isRunning()).toBe(false);

    server.resetIdleTimer();
    server.stop();
    expect(server.isRunning()).toBe(false);
  });
});
