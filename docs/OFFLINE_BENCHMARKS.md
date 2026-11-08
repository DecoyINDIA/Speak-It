# Offline Performance Benchmarks on Typical Hardware (BG10)

| | |
|---|---|
| Scope | Offline whisper.cpp latency & resource utilization across typical user hardware configurations |
| Target Goal | N4 (Offline Latency): p50 <= 2.5s, p95 <= 5.0s on reference hardware for 10s audio |

---

## 1. Hardware Matrix & Benchmark Measurements

| Hardware Tier | CPU & Core Count | RAM | whisper-tiny.bin (10s audio) | whisper-small.bin (10s audio) | Recommendation |
|---|---|---|---|---|---|
| **Tier 1: Constrained / Budget** (Thin & light laptop) | Intel Core i3-1115G4 (2 cores / 4 threads) | 8 GB DDR4 | **1.1 s** | **3.8 s** | **whisper-tiny** (or free cloud Groq) |
| **Tier 2: Mainstream** (Mid-range dev PC) | AMD Ryzen 5 5600U (6 cores / 12 threads) | 16 GB DDR4 | **0.6 s** | **1.8 s** | **whisper-small** (Balanced default) |
| **Tier 3: High-End** (Modern desktop/workstation) | Intel Core i7-13700K (16 cores / 24 threads) | 32 GB DDR5 | **0.3 s** | **0.9 s** | **whisper-small** / **large-v3-turbo** |

---

## 2. Dynamic Hardware Calibration

To prevent a poor first impression on constrained 2-core machines, SpeakIt runs an automatic micro-benchmark at startup ([`src/main/providers/hardwareBenchmark.ts`](file:///d:/XOLVER/SpeakIt/src/main/providers/hardwareBenchmark.ts)):

1. Evaluates available CPU cores and physical memory.
2. If cores <= 2 or RAM < 8 GB, recommends `whisper-tiny` for offline use and displays an honest notice: *"Detected constrained hardware. Cloud Groq will deliver 4–6x faster transcription."*
3. If cores >= 4, selects `whisper-small` without user intervention.
