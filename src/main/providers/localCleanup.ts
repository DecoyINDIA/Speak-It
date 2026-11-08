import { LLMProvider, CleanupResult } from './types';
import { buildCleanupPrompt, validateCleanedOutput } from '../dictation/prompt';
import { logger } from '../logger';

export class LocalCleanupProvider implements LLMProvider {
  public name = 'local';
  private baseUrl: string;
  private model: string;
  private enabled: boolean;

  constructor(baseUrl = 'http://127.0.0.1:11434/v1', model = 'llama3.2:latest', enabled = false) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.model = model;
    this.enabled = enabled;
  }

  public isAvailable(): boolean {
    return this.enabled;
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
    const words = rawTranscript.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 3) {
      return { cleanedText: rawTranscript.trim(), provider: 'local', skipped: true };
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
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
        throw new Error(`Local cleanup failed (${res.status}): ${res.statusText}`);
      }

      const data = await res.json() as any;
      const cleaned = data.choices?.[0]?.message?.content?.trim() || '';

      const validation = validateCleanedOutput(rawTranscript, cleaned);
      if (!validation.valid) {
        logger.warn(`Output guard rejected local cleanup (${validation.reason}) — falling back to raw`);
        return { cleanedText: rawTranscript.trim(), provider: 'local', skipped: true };
      }

      return { cleanedText: cleaned, provider: 'local' };
    } catch (err: any) {
      clearTimeout(timeoutId);
      logger.warn(`Local cleanup endpoint unavailable: ${err?.message || err}. Falling back to smart formatting.`);
      return { cleanedText: rawTranscript.trim(), provider: 'local', skipped: true };
    }
  }
}
