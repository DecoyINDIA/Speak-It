import * as os from 'os';

export interface HardwareProfile {
  cpuCores: number;
  totalMemoryGb: number;
  cpuModel: string;
  isConstrained: boolean;
  benchmarkScoreMs: number;
  recommendedModel: 'ggml-model-whisper-tiny.bin' | 'ggml-model-whisper-small.bin' | 'ggml-model-whisper-large-v3-turbo.bin';
  advice: string;
}

export function runHardwareBenchmark(): HardwareProfile {
  const cores = os.cpus().length;
  const totalMemGb = Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 10) / 10;
  const cpuModel = os.cpus()[0]?.model || 'Generic x64 CPU';

  // Lightweight 50ms matrix-like micro-benchmark to evaluate CPU single-thread throughput
  const start = Date.now();
  let acc = 1.0;
  for (let i = 0; i < 1_500_000; i++) {
    acc = (acc * 1.00001 + Math.sin(i)) % 1000.0;
  }
  const benchmarkScoreMs = Date.now() - start;

  const isLowResource = cores <= 4 || totalMemGb < 8.0 || benchmarkScoreMs > 120;

  let recommendedModel: HardwareProfile['recommendedModel'] = 'ggml-model-whisper-small.bin';
  let advice = 'Hardware is well suited for local Whisper Small model (~1.5s latency).';

  if (cores <= 2 || totalMemGb <= 6.0 || benchmarkScoreMs > 200) {
    recommendedModel = 'ggml-model-whisper-tiny.bin';
    advice = 'Detected constrained hardware (low cores/RAM). Recommend tiny model or free cloud Groq for 5x faster speed.';
  } else if (cores >= 8 && totalMemGb >= 16.0 && benchmarkScoreMs < 75) {
    recommendedModel = 'ggml-model-whisper-small.bin';
    advice = 'High performance system. Whisper Small / Large-Turbo offline models run smoothly.';
  }

  return {
    cpuCores: cores,
    totalMemoryGb: totalMemGb,
    cpuModel,
    isConstrained: isLowResource,
    benchmarkScoreMs,
    recommendedModel,
    advice,
  };
}
