# SpeakIt AI Providers Specification & Limits

This document records the exact free-tier quotas, operational limits, model identifiers, and privacy terms for all AI engines supported by SpeakIt per PLAN.md §8 & M2.

---

## 1. Provider Tier Matrix

| Provider | Purpose | Default Model | Free-Tier Limits | Data-Use / Privacy Terms |
|---|---|---|---|---|
| **Groq** | STT + LLM | STT: `whisper-large-v3-turbo`<br>LLM: `llama-3.3-70b-versatile` | • 20 RPM (requests/min)<br>• 2,000 RPD (requests/day)<br>• 7,200 audio-sec/hour (2 hrs)<br>• 28,800 audio-sec/day (8 hrs)<br>• 25 MB max upload | Groq does **not** use API customer prompts or audio for training. Retained only for transient inference. |
| **Google Gemini** | STT + LLM Fallback | `gemini-1.5-flash` | • 15 RPM<br>• 1,500 RPD<br>• 1,000,000 TPM (tokens/min) | **Important:** On Google's un-billed free tier, prompts and audio may be reviewed by human reviewers and used to improve Google products. Disclosed in SpeakIt onboarding. |
| **Local whisper.cpp** | Offline STT | `ggml-model-whisper-small.bin` (default)<br>`ggml-model-whisper-large-v3-turbo.bin` | None (Unlimited, 100% offline) | Zero network egress. All audio is processed purely on local CPU/GPU. |
| **Local Cleanup (F23)** | Offline LLM | Ollama / LM Studio (`llama3.2:latest`) | None (Local hardware bound) | Zero network egress. |

---

## 2. Speech-to-Text Upload Format

- Cloud uploads use **Opus in WebM** (`audio/webm;codecs=opus`) captured via the browser's built-in `MediaRecorder`.
- At 32 kbps, a 10-second dictation is only **~40 KB**, compared to 320 KB for uncompressed 16kHz WAV.
- On Indian broadband/cellular uplinks (5–20 Mbps), 40 KB uploads in under **40 milliseconds**, minimizing overall latency.

---

## 3. Dynamic Timeout Formula

Timeouts adapt dynamically to payload size to prevent premature aborts on slow uplinks:

- **STT Timeout:**  
  $$\text{Timeout}_{\text{STT}} = 3.0\text{ s} + 1.0\text{ s} \times \left(\frac{\text{Bytes}}{100\text{ KB}}\right) + 0.1 \times \text{Duration}_{\text{sec}}$$
- **LLM Timeout:**  
  $$\text{Timeout}_{\text{LLM}} = 4.0\text{ s} + 1.0\text{ s} \times \left(\frac{\text{Characters}}{1,000}\right)$$

---

## 4. Provider Fallback Chain Rules

1. **Offline Short-Circuit:** If `net.isOnline()` is false or DNS fails, the pipeline skips cloud providers and executes offline whisper.cpp directly.
2. **Quota / Rate-Limit (429):** The provider enters cooldown for the duration specified in the `retry-after` HTTP header (or 60 seconds default). The chain immediately proceeds to the next provider.
3. **LLM Failure Fallback:** If cloud and local cleanup LLMs fail, the pipeline falls back to inserting the raw transcript formatted with `applySmartFormatting()`. No speech is ever lost.
