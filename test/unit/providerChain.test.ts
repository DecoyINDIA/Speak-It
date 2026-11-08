import { describe, it, expect, vi } from 'vitest';
import { ProviderChain } from '../../src/main/providers/chain';
import { STTProvider, LLMProvider } from '../../src/main/providers/types';
import * as net from '../../src/main/net';

describe('Provider Chain & Execution Pipeline (§8.1, §8.2, §8.4)', () => {
  it('falls back to second STT provider when the first fails or returns 429', async () => {
    const failingSTT: STTProvider = {
      name: 'groq',
      isAvailable: () => true,
      transcribe: vi.fn().mockRejectedValue(new Error('Groq 429 Rate limit exceeded')),
    };

    const succeedingSTT: STTProvider = {
      name: 'gemini',
      isAvailable: () => true,
      transcribe: vi.fn().mockResolvedValue({
        text: 'Backup transcription from Gemini',
        rawTranscript: 'Backup transcription from Gemini',
        provider: 'gemini',
      }),
    };

    const dummyLLM: LLMProvider = {
      name: 'gemini',
      isAvailable: () => true,
      cleanup: vi.fn().mockResolvedValue({
        cleanedText: 'Backup transcription from Gemini.',
        provider: 'gemini',
      }),
    };

    const chain = new ProviderChain({
      sttProviders: [failingSTT, succeedingSTT],
      llmProviders: [dummyLLM],
    });

    const result = await chain.executePipeline({
      audioBuffer: Buffer.from('dummy-audio'),
      mimeType: 'audio/webm',
      tone: 'Formal',
      outputLanguage: 'as_spoken',
    });

    expect(failingSTT.transcribe).toHaveBeenCalled();
    expect(succeedingSTT.transcribe).toHaveBeenCalled();
    expect(result.sttProvider).toBe('gemini');
    expect(result.finalInsertedText).toBe('Backup transcription from Gemini.');
  });

  it('short-circuits to offline provider when net.isOnline() is false', async () => {
    vi.spyOn(net, 'isOnline').mockReturnValue(false);

    const cloudSTT: STTProvider = {
      name: 'groq',
      isAvailable: () => true,
      transcribe: vi.fn(),
    };

    const offlineSTT: STTProvider = {
      name: 'offline',
      isAvailable: () => true,
      transcribe: vi.fn().mockResolvedValue({
        text: 'Offline transcription',
        rawTranscript: 'Offline transcription',
        provider: 'offline',
      }),
    };

    const chain = new ProviderChain({
      sttProviders: [cloudSTT, offlineSTT],
      llmProviders: [],
    });

    const result = await chain.executePipeline({
      audioBuffer: Buffer.from('dummy-audio'),
      mimeType: 'audio/webm',
      tone: 'Casual',
      outputLanguage: 'as_spoken',
    });

    expect(cloudSTT.transcribe).not.toHaveBeenCalled();
    expect(offlineSTT.transcribe).toHaveBeenCalled();
    expect(result.sttProvider).toBe('offline');

    vi.restoreAllMocks();
  });

  it('expands whole-utterance snippet verbatim and skips LLM', async () => {
    const stt: STTProvider = {
      name: 'groq',
      isAvailable: () => true,
      transcribe: vi.fn().mockResolvedValue({
        text: 'my email address',
        rawTranscript: 'my email address',
        provider: 'groq',
      }),
    };

    const llm: LLMProvider = {
      name: 'groq',
      isAvailable: () => true,
      cleanup: vi.fn(),
    };

    const chain = new ProviderChain({
      sttProviders: [stt],
      llmProviders: [llm],
    });

    const result = await chain.executePipeline({
      audioBuffer: Buffer.from('dummy-audio'),
      mimeType: 'audio/webm',
      tone: 'Casual',
      outputLanguage: 'as_spoken',
      snippets: [
        {
          id: 1,
          trigger: 'my email address',
          expansion: 'subhamjena.j@gmail.com',
        },
      ],
    });

    expect(llm.cleanup).not.toHaveBeenCalled();
    expect(result.llmProvider).toBe('snippet-verbatim');
    expect(result.finalInsertedText).toBe('subhamjena.j@gmail.com');
  });

  it('replaces inline snippet markers and applies sounds-like glossary replacements', async () => {
    const stt: STTProvider = {
      name: 'groq',
      isAvailable: () => true,
      transcribe: vi.fn().mockResolvedValue({
        text: 'send to my email address and check with Antigravity',
        rawTranscript: 'send to my email address and check with Antigravity',
        provider: 'groq',
      }),
    };

    const llm: LLMProvider = {
      name: 'groq',
      isAvailable: () => true,
      cleanup: vi.fn().mockResolvedValue({
        cleanedText: 'Send to {{snip:1}} and check with Anti gravity.',
        provider: 'groq',
      }),
    };

    const chain = new ProviderChain({
      sttProviders: [stt],
      llmProviders: [llm],
    });

    const result = await chain.executePipeline({
      audioBuffer: Buffer.from('dummy-audio'),
      mimeType: 'audio/webm',
      tone: 'Casual',
      outputLanguage: 'as_spoken',
      snippets: [
        {
          id: 1,
          trigger: 'my email address',
          expansion: 'subhamjena.j@gmail.com',
        },
      ],
      soundsLikeMap: [
        {
          term: 'Antigravity',
          soundsLike: 'Anti gravity',
        },
      ],
    });

    expect(result.cleanedText).toContain('subhamjena.j@gmail.com');
    expect(result.cleanedText).toContain('Antigravity');
  });
});
