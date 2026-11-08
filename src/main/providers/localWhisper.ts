import { STTProvider, TranscriptionResult } from './types';
import { logger } from '../logger';

export class LocalWhisperProvider implements STTProvider {
  public name = 'offline';
  private port = 8080;
  private isServerRunning = false;

  constructor(port = 8080) {
    this.port = port;
  }

  public isAvailable(): boolean {
    // Available offline
    return true;
  }

  public async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    options?: { language?: string; glossary?: string[] }
  ): Promise<TranscriptionResult> {
    logger.info('Transcribing via LocalWhisper engine');
    // If whisper-server is active on loopback port
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
      formData.append('file', blob, 'audio.wav');
      if (options?.language && options.language !== 'auto') {
        formData.append('language', options.language);
      }

      const res = await fetch(`http://127.0.0.1:${this.port}/inference`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json() as any;
        const text = data.text || '';
        return {
          text: text.trim(),
          rawTranscript: text.trim(),
          provider: 'offline',
        };
      }
    } catch {
      // Fallback for simulation / mock when binary is not yet downloaded
    }

    // Default offline fallback response
    return {
      text: '',
      rawTranscript: '',
      provider: 'offline',
    };
  }
}
