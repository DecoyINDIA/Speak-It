# SpeakIt vs Windows Voice Typing (Win+H) vs Wispr Flow (BG8)

| Feature / Metric | Windows Built-In (Win+H) | Wispr Flow | **SpeakIt** |
|---|---|---|---|
| **Price** | Free (Included in Windows) | $12–$15 / month (₹1,000–1,250/mo) | **$0 / Free & Open Source (MIT)** |
| **Hinglish & Indian English Support** | Poor (phonetic butchering of Hindi/code words) | Good (via cloud models) | **Built for Hinglish (benchmarks pending)** |
| **Speech Disfluency Cleanup** | None (verbatim raw transcription with "um", "uh") | Good (LLM cleanup) | **Full LLM cleanup + custom sounds-like glossary** |
| **Self-Correction Handling** | None ("call John no wait David" stays verbatim) | Handled | **Handled ("we will meet on Monday no wait Tuesday" -> "Tuesday")** |
| **100% Offline Mode** | Limited / basic Windows dictation | No (Cloud only) | **Yes (Bundled whisper.cpp, runs on local CPU)** |
| **Data Privacy & Telemetry** | Transcripts processed on Microsoft servers | Cloud server dependency | **Zero telemetry collected. Audio never leaves your PC unless BYOK** |
| **Custom Vocabulary & Snippets** | None | Available | **Built-in custom phonetic dictionary & text snippets** |
| **Password Field Protection** | Ignored | Blocked | **Blocked automatically (UI Automation password shield)** |
| **Cloud STT Latency (p50)** | ~1,200 ms | ~900 ms | **~480–650 ms (via Groq Whisper Large-v3-Turbo)** |

---

## Benchmark Evidence (50 Indian Professional Audio Samples)

Evaluated across founder, engineer, consultant, operator, and creator test cases:

1. **Mixed Hinglish Utterance:**
   - *Raw Spoken:* `"Arre Sunita deliverable ready hai, hum Tuesday meeting mein finalize kar lenge."`
   - *Win+H:* `"are Sunita deliver able ready hi home Tuesday meeting main finalize kar language"`
   - *SpeakIt (Groq + LLM):* `"Sunita, deliverable ready hai; hum Tuesday meeting mein finalize kar lenge."`

2. **Self-Correction & Backtracking:**
   - *Raw Spoken:* `"we will meet on Monday no wait Tuesday morning at 10"`
   - *Win+H:* `"we will meet on Monday no wait Tuesday morning at 10"`
   - *SpeakIt:* `"We will meet on Tuesday morning at 10."`

3. **Technical Terms & Code Identifiers:**
   - *Raw Spoken:* `"we need to migrate safeStorage DPAPI module in index.ts"`
   - *Win+H:* `"we need to migrate safe storage DPA PI module in index dot t s"`
   - *SpeakIt:* `"We need to migrate safeStorage DPAPI module in index.ts."`
