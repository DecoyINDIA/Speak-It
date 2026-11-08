# SpeakIt Privacy Architecture & Data Handling

SpeakIt is designed from the ground up with local-first and privacy-respecting principles. This document provides a transparent accounting of what data is collected, where it is stored, what ever leaves your computer, and the cryptographic boundaries protecting your keys.

---

## 1. What Stays on Your Computer

1. **Audio Recordings:**
   - Microphone audio captured during dictation is buffered in memory.
   - If **"Keep last 20 audio recordings"** is enabled in Settings, the last 20 dictations are stored as WebM files in your local AppData directory (`%APPDATA%\SpeakIt\recordings\`). Older recordings are automatically purged.
   - If disabled, audio buffers are dropped from memory as soon as transcription completes.

2. **Dictation History:**
   - Full transcript history is stored locally in an embedded SQLite database (`%APPDATA%\SpeakIt\speakit.db`).
   - SQLite Full-Text Search (FTS5) indexes are created locally on your machine.
   - The retention policy (default 90 days, or user-configurable) automatically deletes records older than your chosen threshold on app startup and every hour.

3. **Window Titles & Active Applications:**
   - **Window titles are NEVER stored and NEVER transmitted.**
   - The helper inspects only the foreground application executable name (e.g. `chrome.exe`, `code.exe`) to apply per-app paste rules.
   - When **Context Awareness** is enabled, up to 300 characters immediately before the cursor are read via Windows UI Automation (UIA) to supply contextual formatting cues. If context awareness is disabled (default), zero application text is read.
   - Password fields (`IsPassword == true`) are strictly blocked: context is never read, and paste is inhibited with a "blocked" indicator.

4. **Logs:**
   - Rotating local diagnostic logs (`speakit.log` up to 5 × 2MB) are stored in `%APPDATA%\SpeakIt\logs\`.
   - Logs NEVER contain speech transcripts, raw audio, typed keystrokes, or unmasked API keys.

---

## 2. API Key Protection & DPAPI Limitations

All external AI provider API keys (Groq, Gemini) are encrypted using Electron's `safeStorage` API, which leverages the **Windows Data Protection API (DPAPI)**.

### What DPAPI Protects:
- Protects your keys from offline disk access (e.g. stolen laptop drive, backups).
- Protects your keys from other user accounts on the same Windows machine.

### What DPAPI Does NOT Protect:
- **DPAPI does not protect against malware running under your own Windows user account.** Any program executing with your user permissions can ask Windows DPAPI to decrypt data encrypted by that user. SpeakIt does not make false security claims; treat your machine with standard endpoint security precautions.

---

## 3. What Leaves Your Machine (Provider Disclosures)

SpeakIt never sends data to any central SpeakIt server. SpeakIt operates directly between your device and the AI APIs you configure:

### A. Groq Cloud (Recommended Default)
- **Data Sent:** Your audio file (WebM Opus) for transcription, and transcript text for LLM smart formatting.
- **Data Policy:** Groq processes data on ultra-fast LPU inference hardware. For enterprise/commercial tiers, data is not stored. Users should review Groq's standard terms at `groq.com/privacy`.
- **Network Destination:** `https://api.groq.com/openai/v1/`

### B. Google Gemini API
- **Data Sent:** Transcript text for formatting and style refinement.
- **Data Policy Notice:** On Google's **free unpaid tier**, user prompts and inputs may be processed and reviewed by human reviewers to train and improve Google products. If you require zero-data-retention, use a paid Google Cloud project tier, Groq, or the completely offline local engine.
- **Network Destination:** `https://generativelanguage.googleapis.com/v1beta/`

### C. Offline Engine (Local Whisper + Local LLM)
- **Data Sent: ABSOLUTELY NOTHING.**
- The offline engine runs `whisper-server.exe` completely on `127.0.0.1`.
- Model weights (`ggml-*.bin`) are downloaded once from HuggingFace (`huggingface.co`). Once downloaded, all speech transcription and cleanup occur locally on your CPU/GPU with zero network traffic.

---

## 4. Egress Firewall Rules

SpeakIt's main process strictly restricts outgoing HTTP requests. Renderers have zero direct network access (`contextIsolation: true`, strict CSP). Outbound requests from the main process are constrained to:
- `api.groq.com` (Speech & LLM inference)
- `generativelanguage.googleapis.com` (Gemini API)
- `huggingface.co` & `hf.co` (Whisper model downloads)
- `github.com` & `githubusercontent.com` (App updates)
- Loopback / LAN endpoints (user-specified Ollama / LM Studio)

All requests to unknown third parties are denied.
