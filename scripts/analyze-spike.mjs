import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function readCsv(path) {
  const text = readFileSync(resolve(root, path), "utf8").trim();
  const [headerLine, ...lines] = text.split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  return lines
    .filter(Boolean)
    .map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])));
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function status(pass, pending) {
  if (pending) return "PENDING";
  return pass ? "PASS" : "FAIL";
}

const sttRows = readCsv("spike/stt-bakeoff/results.csv").filter((row) => number(row.word_accuracy) > 0);
const pasteRows = readCsv("spike/paste-reliability/matrix.csv").filter((row) => number(row.attempts) > 0);
const latencyRows = readCsv("spike/latency/full-loop-results.csv").filter((row) => number(row.total_ms) > 0);

const providerStats = new Map();
for (const row of sttRows) {
  const key = `${row.provider}/${row.model}`;
  const current = providerStats.get(key) ?? {
    accuracy: [],
    dictTotal: 0,
    dictCorrect: 0,
    latency: [],
    cost: 0,
  };
  current.accuracy.push(number(row.word_accuracy));
  current.dictTotal += number(row.dictionary_terms_total);
  current.dictCorrect += number(row.dictionary_terms_correct);
  current.latency.push(number(row.transcript_latency_ms));
  current.cost += number(row.total_cost_usd);
  providerStats.set(key, current);
}

const sttSummary = [...providerStats.entries()].map(([provider, data]) => ({
  provider,
  avgAccuracy: data.accuracy.reduce((sum, value) => sum + value, 0) / data.accuracy.length,
  dictionaryAccuracy: data.dictTotal === 0 ? 0 : data.dictCorrect / data.dictTotal,
  p95TranscriptLatency: percentile(data.latency, 95),
  cost: data.cost,
}));
sttSummary.sort((a, b) => b.avgAccuracy - a.avgAccuracy);

const bestStt = sttSummary[0];
const sttPending = sttRows.length === 0;
const sttPass = !!bestStt && bestStt.avgAccuracy >= 0.85 && bestStt.dictionaryAccuracy >= 0.9;

const pasteAttempts = pasteRows.reduce((sum, row) => sum + number(row.attempts), 0);
const pasteSuccess = pasteRows.reduce(
  (sum, row) => sum + number(row.successful_paste) + number(row.copied_fallback),
  0,
);
const pasteRate = pasteAttempts === 0 ? 0 : pasteSuccess / pasteAttempts;
const pastePass = pasteAttempts > 0 && pasteRate >= 0.95;

const latencies = latencyRows.filter((row) => row.success === "true").map((row) => number(row.total_ms));
const p50 = percentile(latencies, 50);
const p95 = percentile(latencies, 95);
const latencyPass = latencies.length > 0 && p50 <= 3000 && p95 <= 6000;

console.log("SpeakIt spike status");
console.log("=====================");
console.log(`STT quality:       ${status(sttPass, sttPending)}`);
if (bestStt) {
  console.log(`  best provider:   ${bestStt.provider}`);
  console.log(`  avg accuracy:    ${(bestStt.avgAccuracy * 100).toFixed(1)}%`);
  console.log(`  dictionary acc:  ${(bestStt.dictionaryAccuracy * 100).toFixed(1)}%`);
  console.log(`  p95 STT latency: ${bestStt.p95TranscriptLatency}ms`);
}
console.log(`Paste reliability: ${status(pastePass, pasteAttempts === 0)} (${(pasteRate * 100).toFixed(1)}%)`);
console.log(`Latency:           ${status(latencyPass, latencies.length === 0)} (p50 ${p50}ms, p95 ${p95}ms)`);

const greenlit = sttPass && pastePass && latencyPass;
console.log("");
console.log(greenlit ? "Decision: GREENLIGHT Phase 1." : "Decision: keep spike running.");
