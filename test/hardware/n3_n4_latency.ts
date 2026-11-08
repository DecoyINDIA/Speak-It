/**
 * Hardware Test Runner for N3 & N4: End-to-End Latency
 *
 * PLAN.md §11:
 * - N3: Latency from release to text: p50 <= 2.0 s, p95 <= 4.0 s (Groq, 10 s audio, 50 runs).
 * - N4: Offline default model on laptop: 10 s of audio -> text in p50 <= 4.0 s.
 */

export interface LatencyStats {
  count: number;
  p50: number;
  p90: number;
  p95: number;
  min: number;
  max: number;
}

export function calculatePercentiles(latenciesMs: number[]): LatencyStats {
  if (latenciesMs.length === 0) {
    return { count: 0, p50: 0, p90: 0, p95: 0, min: 0, max: 0 };
  }
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p90 = sorted[Math.floor(sorted.length * 0.90)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  return {
    count: sorted.length,
    p50,
    p90,
    p95,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

export function verifyN3Gate(latenciesMs: number[]): { passed: boolean; stats: LatencyStats; error?: string } {
  const stats = calculatePercentiles(latenciesMs);
  if (stats.p50 > 2000) {
    return { passed: false, stats, error: `N3 Failed: p50 is ${stats.p50}ms (limit <= 2000ms)` };
  }
  if (stats.p95 > 4000) {
    return { passed: false, stats, error: `N3 Failed: p95 is ${stats.p95}ms (limit <= 4000ms)` };
  }
  return { passed: true, stats };
}

export function verifyN4Gate(latenciesMs: number[]): { passed: boolean; stats: LatencyStats; error?: string } {
  const stats = calculatePercentiles(latenciesMs);
  if (stats.p50 > 4000) {
    return { passed: false, stats, error: `N4 Failed: offline p50 is ${stats.p50}ms (limit <= 4000ms)` };
  }
  return { passed: true, stats };
}
