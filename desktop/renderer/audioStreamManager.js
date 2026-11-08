/**
 * Real-Time 16kHz Audio Streaming Manager
 * Manages Web Audio AudioWorklet (16kHz mono, 40ms frames)
 * Streams chunks over WebSocket to backend streaming service.
 */

class AudioStreamManager {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.workletNode = null;
    this.sourceNode = null;
    this.socket = null;
    this.isRecording = false;
    this.pcmChunks = [];
    this.onVolumeChange = null; // callback(db, rms)
  }

  async startStream(apiBaseUrl, options = {}) {
    this.pcmChunks = [];
    this.isRecording = true;

    // 1. Initialize AudioContext at 16,000 Hz if supported, or standard rate
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 16000 });

    // 2. Load RecorderWorklet
    await this.audioContext.audioWorklet.addModule('recorderWorklet.js');

    // 3. Request user microphone stream
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(this.audioContext, 'recorder-worklet');

    // 4. Connect WebSocket if possible
    const wsUrl = apiBaseUrl.replace(/^http/, 'ws') + '/stream';
    let socketReady = false;

    try {
      this.socket = new WebSocket(wsUrl);
      this.socket.binaryType = 'arraybuffer';

      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(), 600); // 600ms timeout before fallback
        this.socket.onopen = () => {
          clearTimeout(timer);
          socketReady = true;
          this.socket.send(JSON.stringify({
            type: 'start',
            mode: options.mode || 'default',
            language: options.language || 'en'
          }));
          resolve();
        };
        this.socket.onerror = (e) => {
          clearTimeout(timer);
          console.warn('[AudioStreamManager] WebSocket connection error, falling back:', e);
          resolve();
        };
      });
    } catch (e) {
      console.warn('[AudioStreamManager] WebSocket setup failed, using HTTP buffer fallback:', e);
    }

    // 5. Wire worklet messages
    this.workletNode.port.onmessage = (event) => {
      const data = event.data;
      if (data && data.type === 'audio-chunk') {
        const pcmBuffer = data.pcm;
        this.pcmChunks.push(pcmBuffer);

        // Stream chunk over WebSocket if open
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(pcmBuffer);
        }

        // Fire live volume callback
        if (typeof this.onVolumeChange === 'function' && data.db !== undefined) {
          this.onVolumeChange(data.db, data.rms);
        }
      }
    };

    // 6. Connect audio graph
    this.sourceNode.connect(this.workletNode);
    // Worklet doesn't need to connect to destination (we don't want audio feedback loop)
  }

  async stopStream(apiBaseUrl, options = {}) {
    this.isRecording = false;

    // Signal worklet to stop and flush
    if (this.workletNode) {
      try {
        this.workletNode.port.postMessage({ type: 'stop' });
      } catch (_) {}
    }

    // Stop mic tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
    }

    // Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch (_) {}
    }

    // If WebSocket is open and active, await result from WebSocket
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.socket.close();
          // If WS times out, fallback to HTTP with accumulated chunks
          resolve(this.fallbackHttpProcess(apiBaseUrl, options));
        }, 12000);

        this.socket.onmessage = (event) => {
          clearTimeout(timeout);
          try {
            const res = JSON.parse(event.data);
            if (res.type === 'result') {
              this.socket.close();
              resolve(res);
            } else if (res.type === 'error') {
              this.socket.close();
              reject(new Error(res.error));
            }
          } catch (err) {
            reject(err);
          }
        };

        // Send stop message
        this.socket.send(JSON.stringify({ type: 'stop' }));
      });
    }

    // Otherwise, assemble WAV blob and send via HTTP
    return this.fallbackHttpProcess(apiBaseUrl, options);
  }

  async fallbackHttpProcess(apiBaseUrl, options = {}) {
    const wavBlob = this.assembleWavBlob();
    const formData = new FormData();
    formData.append('audio', wavBlob, 'recording.wav');
    formData.append('mode', options.mode || 'default');

    const res = await fetch(`${apiBaseUrl}/dictations/process`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error processing audio via fallback HTTP.');
    }

    return await res.json();
  }

  assembleWavBlob() {
    let totalLen = 0;
    for (const chunk of this.pcmChunks) {
      totalLen += chunk.byteLength;
    }

    const wavHeader = this.createWavHeader(totalLen, 16000, 1, 16);
    const parts = [wavHeader];
    for (const chunk of this.pcmChunks) {
      parts.push(chunk);
    }

    return new Blob(parts, { type: 'audio/wav' });
  }

  createWavHeader(dataLength, sampleRate = 16000, channels = 1, bitsPerSample = 16) {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true);
    view.setUint16(32, channels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    return buffer;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AudioStreamManager };
}

if (typeof window !== 'undefined') {
  window.AudioStreamManager = AudioStreamManager;
}
