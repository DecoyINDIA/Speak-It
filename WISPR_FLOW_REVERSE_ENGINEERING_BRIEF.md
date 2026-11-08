# SpeakIt (VoiceDraft) — Wispr Flow Reverse Engineering & Architecture Brief

## 1. Overview & Analysis of Wispr Flow v1.6.1400

Wispr Flow is an Electron + Native AOT desktop application that achieves high-fidelity, low-latency AI dictation through 5 core architectural pillars:

1. **Persistent Native Helper (`Wispr Flow Helper.exe`):**
   - Built with C# .NET Native AOT.
   - Communicates with Electron main process via length-prefixed binary/JSON IPC over standard I/O (`stdin`/`stdout`).
   - Hooks keyboard globally via `SetWindowsHookEx(WH_KEYBOARD_LL)` for zero-lag Push-to-Talk and keyup tracking.
   - Executes native Win32 `SendInput` with in-memory clipboard snapshot & restoration (<5ms paste vs 600ms via PowerShell).
   - Injects fallback modes: `Shift+Insert` for Windows Terminal/Console, and `KEYEVENTF_UNICODE` for blocked clipboard targets.

2. **Windows UI Automation (Accessibility / AX Engine):**
   - Reads `FocusedElement` via `IUIAutomation`.
   - Obtains caret screen bounds (`GetDictatedTextPosition`) to position the floating pill directly below the user's cursor.
   - Extracts surrounding text (`axText`, `axHTML`) before and after the caret.
   - Performs pre-paste formatting: inserts leading space if preceding character is alphanumeric, capitalizes if sentence start.
   - Performs post-paste verification (`DictatedTextVerification`): reads back input value to confirm insertion.

3. **Audio Streaming & Incremental Opus Encoding:**
   - Web Audio `AudioWorkletProcessor` (`recorderWorklet.js`) running at 16,000 Hz mono.
   - 640-sample frames (40ms chunks) buffered and measured for RMS volume in dB.
   - `incrementalOpusEncoder.worker.js` encodes audio in real-time at 64 kbps Opus.
   - Streams chunks over WebSocket/gRPC directly to backend speech services.

4. **Offline Intelligence & Voice Command Logic:**
   - Bundles `fasttext_wasm.cjs` with `lid.176.ftz` for local, zero-latency language identification.
   - Detects backtracking triggers: `["scratch that", "never mind", "forget that", "cancel that", "strike that", "actually", "i mean", "no wait", "wait no"]`.
   - Extracts proper nouns from active application contexts (e.g. Slack workspace, local contacts).

5. **AI Polish & Writing Transforms:**
   - Dedicated transformation engine: `PolishTransform`, `PromptEngineerTransform`, `TurnToListTransform`, `MakeMeSoundSmart`, `WhatDidIMiss`, `TranslateToEnglishTransform`, `CustomTransform`.
   - Text selection capture via simulated copy (`GetSelectedTextViaCopy`) -> LLM transform -> instant replacement.

---

## 2. SpeakIt Gap Analysis

| Capability | Wispr Flow | SpeakIt (Current State) | SpeakIt Upgrade Plan |
|---|---|---|---|
| **Text Insertion** | Native Win32 `SendInput` + RAM clipboard swap (<5ms) | Spawns PowerShell `SendKeys.SendWait('^v')` (~600ms) | Build native Windows helper with Win32 `SendInput` & clipboard backup |
| **Hotkey Handling** | Low-Level Hook `WH_KEYBOARD_LL` (Instant push-to-talk & release) | Electron `globalShortcut.register` (Toggle only, no release event) | Helper-based keyboard hook with push-to-talk keyup detection |
| **Caret Positioning** | Anchors floating widget directly adjacent to caret | Fixed bottom-center screen overlay | Track caret coordinates via UI Automation `TextPattern` |
| **Context Awareness** | Reads active app name, URL, pre/post caret text | None | Query UI Automation `IUIAutomationTextPattern` before paste |
| **Smart Spacing/Casing** | Checks pre-caret characters for space & capital letter rules | Static formatting only | Spacing & capitalization rules engine |
| **Audio Capture** | 16kHz AudioWorklet + 64kbps Opus Web Worker | Standard MediaRecorder in browser | Port 16kHz AudioWorklet + Opus stream encoder |
| **Voice Backtracking** | Auto-removes clauses on "scratch that", "wait no" | None | Sentence backtracking parser |
| **AI Polish / Rewrite** | Select text anywhere -> transform in place | Dictation only | Selection grab via helper + Gemini transform |
| **Language Detection** | Client-side fastText WebAssembly (176 languages) | None | Local fastText Wasm integration |
| **Meeting Notetaker** | WASAPI loopback audio + mic recording | None | Dual audio loopback capture + summarizer |

---

## 3. Implementation Roadmap

### Phase 1: Native Windows Helper & Fast Injection
- Create C# / Win32 Helper executable communicating via stdin/stdout length-prefixed JSON.
- Implement low-level keyboard hook for true push-to-talk (`Alt+Space` down = listen, up = paste).
- Implement sub-10ms Win32 `SendInput` + clipboard swap with `Shift+Insert` terminal fallback.

### Phase 2: Context Intelligence & Smart Spacing
- Extract active window title, process executable, and browser URL.
- Query surrounding text before/after caret via UI Automation.
- Implement context-aware spacing and capitalization rules.
- Add voice backtracking triggers (`scratch that`, `never mind`).

### Phase 3: Real-Time Audio & Gemini 2.0 Streaming
- Implement 16kHz AudioWorklet with 40ms audio chunks.
- Stream Opus frames directly to Gemini 2.0 Flash / Live endpoint.
- Embed fastText Wasm for local language identification.

### Phase 4: Caret-Anchored Widget, AI Polish & Meeting Mode
- Position floating recording pill directly next to the active cursor.
- Implement text selection capture & rewrite modes (`Polish`, `Listify`, `Professional`).
- Add system audio loopback recording for meeting transcription.
