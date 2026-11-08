import http from 'http';
const WebSocket = require('ws');
import { db } from './db';
import { transcribeAndCleanup } from './gemini';
import { parseBacktracking } from './formattingEngine';

export function setupStreamingWebSocket(server: http.Server) {
  const wss = new WebSocket.Server({ server, path: '/api/stream' });

  wss.on('connection', (ws: any) => {
    let audioChunks: Buffer[] = [];
    let mode = 'default';
    let language = 'en';
    let startTime = Date.now();

    ws.on('message', async (data: any, isBinary: boolean) => {
      try {
        if (isBinary) {
          // Accumulate raw PCM 16kHz chunk from AudioWorklet
          const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
          audioChunks.push(chunk);
          return;
        }

        // Text control message
        const messageStr = data.toString('utf-8');
        const msg = JSON.parse(messageStr);

        if (msg.type === 'start') {
          audioChunks = [];
          mode = msg.mode || 'default';
          language = msg.language || 'en';
          startTime = Date.now();
          ws.send(JSON.stringify({ type: 'ready' }));
        } else if (msg.type === 'stop') {
          if (audioChunks.length === 0) {
            ws.send(JSON.stringify({ type: 'result', text: '', rawTranscript: '' }));
            return;
          }

          // Combine PCM chunks and wrap with WAV header
          const fullPcm = Buffer.concat(audioChunks);
          const wavBuffer = pcmToWav(fullPcm, 16000, 1, 16);

          const dictionary = db.getDictionary();
          const dbApiKey = db.getSettings().geminiApiKey;

          const result = await transcribeAndCleanup(
            wavBuffer,
            'audio/wav',
            mode,
            dictionary,
            dbApiKey
          );

          const cleanedText = parseBacktracking(result.text);
          const durationMs = Date.now() - startTime;
          const wordCount = cleanedText ? cleanedText.split(/\s+/).length : 0;

          // Save to history
          db.addHistoryRecord({
            text: cleanedText,
            rawTranscript: result.rawTranscript,
            wordCount,
            mode,
            durationMs
          });

          ws.send(JSON.stringify({
            type: 'result',
            text: cleanedText,
            rawTranscript: result.rawTranscript,
            wordCount,
            durationMs
          }));

          audioChunks = [];
        }
      } catch (err: any) {
        console.error('[StreamingWS Error]', err);
        ws.send(JSON.stringify({
          type: 'error',
          error: err.message || 'Stream processing failed'
        }));
      }
    });

    ws.on('close', () => {
      audioChunks = [];
    });
  });

  console.log('[VoiceDraft Backend] WebSocket Audio Streaming endpoint active at /api/stream');
}

function pcmToWav(pcmBuffer: Buffer, sampleRate = 16000, numChannels = 1, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  const dataSize = pcmBuffer.length;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}
