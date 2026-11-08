/**
 * 16,000 Hz Mono AudioWorkletProcessor
 * Wispr Flow audio pipeline replica:
 * - 640 samples per chunk = exactly 40.0ms frames at 16kHz
 * - Real-time RMS and dB volume calculation
 * - Downsampling from AudioContext sampleRate to 16kHz
 */

class RecorderWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.frameSize = 640; // 40ms frame size at 16kHz
    this.buffer = new Float32Array(this.frameSize);
    this.bufferIndex = 0;
    this.isActive = true;

    this.port.onmessage = (event) => {
      if (event.data && event.data.type === 'stop') {
        this.isActive = false;
        this.flushBuffer();
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (!this.isActive) return false;

    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const channelData = input[0];
    const sourceSampleRate = sampleRate; // Global AudioWorklet context sample rate

    if (sourceSampleRate === this.targetSampleRate) {
      // Direct pass without resampling
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.bufferIndex++] = channelData[i];
        if (this.bufferIndex >= this.frameSize) {
          this.emitFrame();
        }
      }
    } else {
      // Linear interpolation downsampler to 16kHz
      const ratio = sourceSampleRate / this.targetSampleRate;
      let srcIndex = 0;

      while (srcIndex < channelData.length) {
        const floorIdx = Math.floor(srcIndex);
        const ceilIdx = Math.min(floorIdx + 1, channelData.length - 1);
        const frac = srcIndex - floorIdx;
        const sample = channelData[floorIdx] * (1 - frac) + channelData[ceilIdx] * frac;

        this.buffer[this.bufferIndex++] = sample;
        if (this.bufferIndex >= this.frameSize) {
          this.emitFrame();
        }

        srcIndex += ratio;
      }
    }

    return true;
  }

  emitFrame() {
    // 1. Calculate RMS and dBFS
    let sum = 0;
    for (let i = 0; i < this.frameSize; i++) {
      const s = this.buffer[i];
      sum += s * s;
    }
    const rms = Math.sqrt(sum / this.frameSize);
    // dBFS range roughly -80 dB (silence) to 0 dB (max volume)
    const db = 20 * Math.log10(Math.max(rms, 1e-4));

    // 2. Convert float32 [-1.0, 1.0] to int16 PCM [-32768, 32767]
    const pcm = new Int16Array(this.frameSize);
    for (let i = 0; i < this.frameSize; i++) {
      const s = Math.max(-1, Math.min(1, this.buffer[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // 3. Post to main renderer thread with transferable ArrayBuffer
    this.port.postMessage({
      type: 'audio-chunk',
      pcm: pcm.buffer,
      rms: rms,
      db: db,
      sampleCount: this.frameSize,
      durationMs: 40
    }, [pcm.buffer]);

    // Reset buffer
    this.buffer = new Float32Array(this.frameSize);
    this.bufferIndex = 0;
  }

  flushBuffer() {
    if (this.bufferIndex > 0) {
      const pcm = new Int16Array(this.bufferIndex);
      for (let i = 0; i < this.bufferIndex; i++) {
        const s = Math.max(-1, Math.min(1, this.buffer[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage({
        type: 'audio-chunk',
        pcm: pcm.buffer,
        sampleCount: this.bufferIndex,
        isFinal: true
      }, [pcm.buffer]);
      this.bufferIndex = 0;
    }
  }
}

registerProcessor('recorder-worklet', RecorderWorkletProcessor);
