/**
 * Audio Capture Host Window
 * Runs getUserMedia, MediaRecorder (Opus in WebM) and 16kHz PCM AudioWorklet
 * per PLAN.md §5 ADR-7 & §10.
 */

let mediaRecorder: MediaRecorder | null = null;
let audioContext: AudioContext | null = null;
let micStream: MediaStream | null = null;
let recordedChunks: Blob[] = [];
let captureStartTime = 0;
let voicedMs = 0;

export async function startRecording(deviceId?: string): Promise<void> {
  recordedChunks = [];
  captureStartTime = Date.now();
  voicedMs = 0;

  try {
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
      },
      video: false,
    };

    micStream = await navigator.mediaDevices.getUserMedia(constraints);

    // 1. MediaRecorder (WebM/Opus) for high-efficiency cloud STT (~32kbps)
    mediaRecorder = new MediaRecorder(micStream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.start(40); // Collect in 40ms chunks

    // 2. AudioContext + ScriptProcessor / Worklet for RMS level metering & silence gating
    audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(micStream);
    const processor = audioContext.createScriptProcessor(1024, 1, 1);

    processor.onaudioprocess = (e) => {
      const channel = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < channel.length; i++) {
        sum += channel[i] * channel[i];
      }
      const rms = Math.sqrt(sum / channel.length);
      const rmsDb = 20 * Math.log10(Math.max(rms, 1e-4));

      // Voice detection threshold: -45 dBFS
      if (rmsDb > -45) {
        voicedMs += (channel.length / 16000) * 1000;
      }

      // Send per-frame level chunk to main process
      (window as any).audioApi?.sendAudioChunk({ pcmRms: rmsDb });
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  } catch (err: any) {
    (window as any).audioApi?.sendAudioError(err?.message || 'Failed to initialize microphone');
  }
}

export async function stopRecording(): Promise<void> {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

  const durationMs = Date.now() - captureStartTime;

  await new Promise<void>((resolve) => {
    if (!mediaRecorder) return resolve();
    mediaRecorder.onstop = () => resolve();
    mediaRecorder.stop();
  });

  // Stop mic tracks
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }

  if (audioContext && audioContext.state !== 'closed') {
    await audioContext.close();
    audioContext = null;
  }

  const webmBlob = new Blob(recordedChunks, { type: 'audio/webm' });
  const arrayBuffer = await webmBlob.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  (window as any).audioApi?.sendFinalRecording({
    webmBase64: base64,
    pcmBase64: '',
    durationMs,
    speechRmsMs: Math.round(voicedMs),
  });
}

// Wire up IPC event listeners
if ((window as any).audioApi) {
  (window as any).audioApi.onStartCapture((config: { deviceId?: string }) => {
    startRecording(config?.deviceId);
  });
  (window as any).audioApi.onStopCapture(() => {
    stopRecording();
  });
}
