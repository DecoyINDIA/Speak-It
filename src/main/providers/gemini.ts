import { STTProvider, LLMProvider, TranscriptionResult, CleanupResult } from './types';
import { usageTracker } from './usageTracker';
import { buildCleanupPrompt, validateCleanedOutput } from '../dictation/prompt';
import { logger } from '../logger';

export class GeminiProvider implements STTProvider, LLMProvider {
  public name = 'gemini';
  private getApiKey: () => string | null;
  private sttModel: string;
  private llmModel: string;

  constructor(getApiKey: () => string | null, sttModel = 'gemini-1.5-flash', llmModel = 'gemini-1.5-flash') {
    this.getApiKey = getApiKey;
    this.sttModel = sttModel;
    this.llmModel = llmModel;
  }

  public isAvailable(): boolean {
    const key = this.getApiKey();
    return !!key && usageTracker.isAvailable('gemini');
  }

  public async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    options?: { language?: string; glossary?: string[] }
  ): Promise<TranscriptionResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Gemini API key not configured');

    const durationSec = Math.round(audioBuffer.length / 4000);
    usageTracker.recordRequest('gemini', durationSec);

    const timeoutMs = Math.round(4000 + (audioBuffer.length / 102400) * 1000 + durationSec * 100);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const glossaryText = options?.glossary?.length ? ` Glossary: ${options.glossary.slice(0, 50).join(', ')}.` : '';
    const prompt = `Transcribe the attached audio verbatim. Output ONLY the plain transcription without commentary or formatting.${glossaryText}`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.sttModel}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || 'audio/webm',
                    data: audioBuffer.toString('base64'),
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 429) {
          usageTracker.setCooldown('gemini', 60);
        }
        const err = await res.text();
        throw new Error(`Gemini STT failed (${res.status}): ${err}`);
      }

      const data = await res.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      return {
        text,
        rawTranscript: text,
        provider: 'gemini',
      };
    } catch (err) {
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
    if (!apiKey) throw new Error('Gemini API key not configured');

    const words = rawTranscript.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 3) {
      return { cleanedText: rawTranscript.trim(), provider: 'gemini', skipped: true };
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

    const timeoutMs = Math.round(5000 + (userPrompt.length / 1000) * 1000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.llmModel}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0 },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 429) {
          usageTracker.setCooldown('gemini', 60);
        }
        const err = await res.text();
        throw new Error(`Gemini LLM failed (${res.status}): ${err}`);
      }

      const data = await res.json() as any;
      const cleaned = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      const validation = validateCleanedOutput(rawTranscript, cleaned);
      if (!validation.valid) {
        logger.warn(`Output guard rejected Gemini cleanup (${validation.reason}) — falling back to raw`);
        return { cleanedText: rawTranscript.trim(), provider: 'gemini', skipped: true };
      }

      return { cleanedText: cleaned, provider: 'gemini' };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}
