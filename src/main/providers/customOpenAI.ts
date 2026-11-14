import { STTProvider, LLMProvider, TranscriptionResult, CleanupResult } from './types';
import { buildCleanupPrompt, validateCleanedOutput } from '../dictation/prompt';
import { logger } from '../logger';

export class CustomOpenAIProvider implements STTProvider, LLMProvider {
  public name = 'custom_openai';
  private getApiKey: () => string | null;
  private baseUrl: string;
  private sttModel: string;
  private llmModel: string;

  constructor(
    getApiKey: () => string | null,
    baseUrl = 'https://api.openai.com/v1',
    sttModel = 'whisper-1',
    llmModel = 'gpt-4o-mini'
  ) {
    this.getApiKey = getApiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.sttModel = sttModel;
    this.llmModel = llmModel;
  }

  public isAvailable(): boolean {
    const key = this.getApiKey();
    return !!key;
  }

  public async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    options?: { language?: string; glossary?: string[] }
  ): Promise<TranscriptionResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Custom OpenAI API key not configured');

    const durationSec = Math.round(audioBuffer.length / 4000);
    const timeoutMs = Math.round(4000 + (audioBuffer.length / 102400) * 1000 + durationSec * 100);

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', this.sttModel);
    formData.append('response_format', 'verbose_json');

    if (options?.language && options.language !== 'auto') {
      formData.append('language', options.language);
    }
    if (options?.glossary && options.glossary.length > 0) {
      formData.append('prompt', `Glossary: ${options.glossary.slice(0, 50).join(', ')}.`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Custom OpenAI STT failed (${res.status}): ${err}`);
      }

      const data = await res.json() as any;
      const text = (data.text || '').trim();

      return {
        text,
        rawTranscript: text,
        language: data.language,
        durationMs: data.duration ? Math.round(data.duration * 1000) : undefined,
        provider: this.name,
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
    if (!apiKey) throw new Error('Custom OpenAI API key not configured');

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
    const timeoutMs = Math.round(4000 + (rawTranscript.length / 1000) * 1000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
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
        const err = await res.text();
        throw new Error(`Custom OpenAI LLM failed (${res.status}): ${err}`);
      }

      const data = await res.json() as any;
      const cleaned = data.choices?.[0]?.message?.content?.trim() || '';

      const validation = validateCleanedOutput(rawTranscript, cleaned);
      if (!validation.valid) {
        logger.warn(`Output guard rejected Custom OpenAI cleanup (${validation.reason}) — falling back to raw`);
        return { cleanedText: rawTranscript.trim(), provider: this.name, skipped: true };
      }

      return { cleanedText: cleaned, provider: this.name };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}
