# SpeakIt Technical Spike

This folder tracks the 2-week spike recommended by the product plan. The goal is not to build the app yet. The goal is to prove or disprove the riskiest assumptions before Phase 1.

## Spike Gates

Phase 1 should start only when these gates pass:

| Gate | Pass threshold | Evidence file |
|---|---:|---|
| STT quality | Best provider beats OS/native baseline and reaches at least 85% word accuracy overall | `stt-bakeoff/results.csv` |
| Dictionary terms | Provider correctly captures boosted dictionary terms at least 90% of the time | `stt-bakeoff/results.csv` |
| Paste reliability | At least 95% successful paste/copy outcomes across the 10-app Windows matrix | `paste-reliability/matrix.csv` |
| Latency | Full loop p50 <= 3000ms and p95 <= 6000ms | `latency/full-loop-results.csv` |

## Workstream Order

1. Collect or record 50 Indian-English/Hinglish audio samples.
2. Run STT bake-off against 2-3 managed providers and a baseline.
3. Prototype Windows paste behavior across the 10 target apps.
4. Measure full-loop latency with the winning STT provider plus one fast cleanup model.
5. Run `npm.cmd run spike:analyze` and decide whether Phase 1 is greenlit.

## Decision Rule

- **Greenlight Phase 1:** all gates pass and no security/privacy blocker remains.
- **Extend spike:** one gate narrowly misses, and the fix is clearly testable within one more week.
- **Stop or pivot:** paste reliability or latency misses badly, because those are core product mechanics.

