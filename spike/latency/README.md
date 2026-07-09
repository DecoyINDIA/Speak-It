# Full-Loop Latency

Use this workstream after a provisional STT provider is selected.

## Measurement Window

Measure from hotkey release / end-of-speech to visible pasted or copied text.

Break total latency into:

- STT finalization
- Cleanup model call
- Server overhead
- Client insertion

## Pass Gate

The full loop must be p50 <= 3000ms and p95 <= 6000ms.

If latency misses, optimize in this order:

1. Stream audio while speaking so STT is nearly final on release.
2. Use a faster cleanup model for default/email/chat.
3. Reduce prompt size and dictionary terms.
4. Avoid extra round trips between backend services.
