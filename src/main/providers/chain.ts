import { STTProvider, LLMProvider, TranscriptionResult, CleanupResult } from './types';
import { isOnline } from '../net';
import { applySmartFormatting, FormattingContext } from '../dictation/formatter';
import { logger } from '../logger';

export interface ChainConfig {
  sttProviders: STTProvider[];
  llmProviders: LLMProvider[];
}

export interface PipelineExecutionOptions {
  audioBuffer: Buffer;
  mimeType: string;
  tone: string;
  customInstructions?: string;
  outputLanguage: 'as_spoken' | 'en';
  context?: FormattingContext;
  glossary?: string[];
  snippets?: { id: number; trigger: string; expansion: string }[];
  soundsLikeMap?: { term: string; soundsLike: string }[];
}

export interface PipelineExecutionResult {
  rawTranscript: string;
  cleanedText: string;
  finalInsertedText: string;
  sttProvider: string;
  llmProvider: string;
  sttMs: number;
  llmMs: number;
  totalMs: number;
  words: number;
}

export class ProviderChain {
  private sttProviders: STTProvider[];
  private llmProviders: LLMProvider[];

  constructor(config: ChainConfig) {
    this.sttProviders = config.sttProviders;
    this.llmProviders = config.llmProviders;
  }

  public async executePipeline(options: PipelineExecutionOptions): Promise<PipelineExecutionResult> {
    const t0 = Date.now();
    const online = isOnline();

    // 1. STT Phase: Try providers in order
    let transcription: TranscriptionResult | null = null;
    let sttTime = 0;

    for (const provider of this.sttProviders) {
      // Offline short-circuit
      if (!online && provider.name !== 'offline') {
        continue;
      }

      if (!provider.isAvailable()) {
        continue;
      }

      const sttStart = Date.now();
      try {
        transcription = await provider.transcribe(options.audioBuffer, options.mimeType, {
          language: options.outputLanguage === 'en' ? 'en' : 'auto',
          glossary: options.glossary,
        });
        sttTime = Date.now() - sttStart;
        logger.info(`STT succeeded via ${provider.name} in ${sttTime}ms`);
        break;
      } catch (err: any) {
        logger.warn(`STT provider ${provider.name} failed: ${err?.message || err}. Trying next.`);
      }
    }

    if (!transcription || !transcription.text.trim()) {
      throw new Error('All speech-to-text providers failed or returned empty transcript');
    }

    const rawTranscript = transcription.text.trim();

    // Check whole-utterance snippet match (§8.4)
    if (options.snippets && options.snippets.length > 0) {
      const normalizedRaw = rawTranscript.toLowerCase().replace(/[.,!?;:]/g, '').trim();
      const match = options.snippets.find(
        (s) => s.trigger.toLowerCase().trim() === normalizedRaw
      );
      if (match) {
        logger.info(`Whole-utterance snippet matched trigger: "${match.trigger}"`);
        // Verbatim insertion per §8.4
        let finalInsertedText = match.expansion;
        if (options.context?.preText && /[\w\d]$/.test(options.context.preText)) {
          finalInsertedText = ' ' + finalInsertedText;
        }
        return {
          rawTranscript,
          cleanedText: match.expansion,
          finalInsertedText,
          sttProvider: transcription.provider,
          llmProvider: 'snippet-verbatim',
          sttMs: sttTime,
          llmMs: 0,
          totalMs: Date.now() - t0,
          words: finalInsertedText.split(/\s+/).filter(Boolean).length,
        };
      }
    }

    // 2. LLM Cleanup Phase
    let cleanup: CleanupResult | null = null;
    let llmTime = 0;

    for (const provider of this.llmProviders) {
      if (!online && provider.name !== 'offline' && provider.name !== 'local') {
        continue;
      }

      if (!provider.isAvailable()) {
        continue;
      }

      const llmStart = Date.now();
      try {
        cleanup = await provider.cleanup(rawTranscript, {
          tone: options.tone,
          customInstructions: options.customInstructions,
          outputLanguage: options.outputLanguage,
          appExe: options.context?.appExe,
          preText: options.context?.preText,
          glossary: options.glossary,
          snippets: options.snippets?.map((s) => ({ id: s.id, trigger: s.trigger })),
        });
        llmTime = Date.now() - llmStart;
        logger.info(`LLM cleanup succeeded via ${provider.name} in ${llmTime}ms`);
        break;
      } catch (err: any) {
        logger.warn(`LLM cleanup provider ${provider.name} failed: ${err?.message || err}. Trying next.`);
      }
    }

    let cleanedText = cleanup ? cleanup.cleanedText : rawTranscript;
    const llmProviderUsed = cleanup ? cleanup.provider : 'none';

    // 3. Post-LLM Passes:
    // (a) Inline snippet marker replacement: {{snip:N}} -> expansion
    if (options.snippets && options.snippets.length > 0) {
      for (const s of options.snippets) {
        cleanedText = cleanedText.replaceAll(`{{snip:${s.id}}}`, s.expansion);
      }
    }

    // (b) Deterministic sounds_like glossary replacement (§8.2)
    if (options.soundsLikeMap && options.soundsLikeMap.length > 0) {
      for (const item of options.soundsLikeMap) {
        if (item.soundsLike && item.soundsLike.trim()) {
          const regex = new RegExp(`\\b${escapeRegExp(item.soundsLike.trim())}\\b`, 'gi');
          cleanedText = cleanedText.replace(regex, item.term);
        }
      }
    }

    // (c) Smart Formatting (caret casing and spacing)
    const finalInsertedText = applySmartFormatting(cleanedText, options.context);
    const totalMs = Date.now() - t0;
    const words = finalInsertedText.split(/\s+/).filter(Boolean).length;

    return {
      rawTranscript,
      cleanedText,
      finalInsertedText,
      sttProvider: transcription.provider,
      llmProvider: llmProviderUsed,
      sttMs: sttTime,
      llmMs: llmTime,
      totalMs,
      words,
    };
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
