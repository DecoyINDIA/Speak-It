import { STTProvider, LLMProvider, TranscriptionResult, CleanupResult } from './types';
import { usageTracker } from './usageTracker';
import { buildCleanupPrompt, validateCleanedOutput } from '../dictation/prompt';
import { logger } from '../logger';

export class GroqProvider implements STTProvider, LLMProvider {
  public name = 'groq';
  private getApiKey: () => string | null;
  private sttModel: string;
  private llmModel: string;

  constructor(getApiKey: () => string | null, sttModel = 'whisper-large-v3-turbo', llmModel = 'llama-3.3-70b-versatile') {
    this.getApiKey = getApiKey;
    this.sttModel = sttModel;
    this.llmModel = llmModel;
  }

  public isAvailable(): boolean {
    const key = this.getApiKey();
    return !!key && usageTracker.isAvailable('groq');
  }

  public async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    options?: { language?: string; glossary?: string[] }
  ): Promise<TranscriptionResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Groq API key not configured');

    const durationSec = Math.round(audioBuffer.length / 4000); // approximate audio seconds
    usageTracker.recordRequest('groq', durationSec);

    // Timeout formula per §8.1: 3s + 1s per 100KB uploaded + 0.1 * audio seconds
    const timeoutMs = Math.round(3000 + (audioBuffer.length / 102400) * 1000 + durationSec * 100);

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', this.sttModel);
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0');

    if (options?.language && options.language !== 'auto') {
      formData.append('language', options.language);
    }
    if (options?.glossary && options.glossary.length > 0) {
      formData.append('prompt', `Glossary: ${options.glossary.slice(0, 50).join(', ')}.`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get('retry-after') || '60', 10);
          usageTracker.setCooldown('groq', retryAfter);
        }
        const errText = await res.text();
        throw new Error(`Groq STT failed (${res.status}): ${errText}`);
      }

      const data = await res.json() as any;
      const text = data.text || '';

      // Check hallucination / silence guard: no_speech_prob > 0.6 on all segments
      if (Array.isArray(data.segments) && data.segments.length > 0) {
        const allSilent = data.segments.every((s: any) => s.no_speech_prob > 0.6);
        if (allSilent) {
          logger.info('Groq returned segments with no_speech_prob > 0.6 — treating as empty');
          return { text: '', rawTranscript: '', provider: 'groq' };
        }
      }

      return {
        text: text.trim(),
        rawTranscript: text.trim(),
        language: data.language,
        durationMs: data.duration ? Math.round(data.duration * 1000) : undefined,
        provider: 'groq',
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  public async cleanup(
    rawTranscript: string,
    options: {
      tone: string;
      customInstructions?: string;
      outputLanguage: 'as_spoken' | 'en';
      appExe?: string;
      preText?: string;
      glossary?: string[];
      snippets?: { id: number; trigger: string }[];
    }
  ): Promise<CleanupResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Groq API key not configured');

    // Rule ADR-8: Skip LLM cleanup if 3 words or fewer
    const words = rawTranscript.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 3) {
      return { cleanedText: rawTranscript.trim(), provider: 'groq', skipped: true };
    }

    const { systemPrompt, userPrompt } = buildCleanupPrompt({
      rawTranscript,
      tone: options.tone,
      customInstructions: options.customInstructions,
      outputLanguage: options.outputLanguage,
      appExe: options.appExe,
      preText: options.preText,
      contextAwareness: !!options.preText,
      glossary: options.glossary,
      snippets: options.snippets,
    });

    // Timeout formula per §8.1: 4s + 1s per 1,000 input chars
    const timeoutMs = Math.round(4000 + (userPrompt.length / 1000) * 1000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.llmModel,
          temperature: 0,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get('retry-after') || '60', 10);
          usageTracker.setCooldown('groq', retryAfter);
        }
        const err = await res.text();
        throw new Error(`Groq LLM failed (${res.status}): ${err}`);
      }

      const data = await res.json() as any;
      const cleaned = data.choices?.[0]?.message?.content?.trim() || '';

      const validation = validateCleanedOutput(rawTranscript, cleaned);
      if (!validation.valid) {
        logger.warn(`Output guard rejected Groq cleanup (${validation.reason}) — falling back to raw`);
        return { cleanedText: rawTranscript.trim(), provider: 'groq', skipped: true };
      }

      return { cleanedText: cleaned, provider: 'groq' };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}
