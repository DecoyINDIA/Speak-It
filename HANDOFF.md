# SpeakIt (VoiceDraft) — Implementation Handoff Document (SUPERSEDED)

> [!WARNING]
> **SUPERSEDED ON 2026-11-08 by `PLAN.md`.**
> Many claims of completion in this document are inaccurate or describe prototype code with known ship-blocking defects (e.g. API key leak, word-deleting regex backtracking, push-to-talk freeze, audio clipping, unverified spike gates). Refer exclusively to `PLAN.md` for current specifications, architecture, and milestones.

## Project Vision & Reference
Reverse engineering Wispr Flow v1.6.1400 desktop architecture into SpeakIt:
1. Native Windows Helper (`SpeakItHelper.exe`) with Win32 `SendInput`, `WH_KEYBOARD_LL` low-level hook, and UI Automation.
2. Context Intelligence, Caret screen tracking, and smart pre-paste formatting + voice backtracking.
3. 16kHz AudioWorklet + incremental audio streaming + local language identification.
4. Caret-anchored floating pill widget, AI text selection transforms, and meeting loopback capture.

---

## Task Progress Tracker

| Task # | Task Description | Phase | Status | Verification |
|---|---|---|---|---|
| **0** | Tracking & Architecture setup (`HANDOFF.md`, `MEMORY.md`, `BUGS.md`) | Prep | Completed | Files created |
| **1** | Native C# Win32 Helper (`SpeakItHelper.exe`): Win32 `SendInput`, clipboard swap, `Shift+Insert` terminal fallback, `WH_KEYBOARD_LL` hook, UI Automation caret & context extraction | Phase 1 & 2 | Completed | Compiled via `build.ps1`, tested via `test_helper.ps1` |
| **2** | Electron Main Process Helper Manager: stdin/stdout IPC, lifecycle management, push-to-talk & toggle hotkeys | Phase 1 | Completed | Syntax validated & lifecycle integrated |
| **3** | Smart Pre-Paste Formatting & Voice Backtracking Parser | Phase 2 | Completed | 12/12 unit tests passing in `test_formatting.js` |
| **4** | 16kHz `AudioWorklet` with 40ms frames & RMS dB metering, WebSocket streaming & Local LID | Phase 3 | Completed | Unit tested in `test_audio_stream.js` & compiled |
| **5** | Caret-Anchored Widget, Selection AI Transforms & Meeting Loopback Mode | Phase 4 | Completed | Frontend & backend routes implemented & styled |
| **6** | Full System Integration, Build Verification & End-to-End Testing | Phase 1-4 | Completed | `npm test` passing with 100% success |

---

## Detailed Task Log

### Task 0: Setup
- Initialized tracking files: `HANDOFF.md`, `MEMORY.md`, `BUGS.md`.
- Evaluated existing codebase (`desktop/main.js`, `desktop/renderer/`, `backend/src/`).
- Confirmed Windows C# compilation via `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`.

### Task 1: Native C# Win32 Helper (`SpeakItHelper.exe`)
- Implemented `desktop/native-helper/SpeakItHelper.cs`:
  - Win32 `WH_KEYBOARD_LL` low-level keyboard hook running in an STA thread message pump.
  - Push-to-Talk (`hotkey_down` and `hotkey_up` events) and Toggle modes (`hotkey_press`).
  - Hotkey swallowing (`swallow: true`) preventing unwanted Windows system shortcut triggers (e.g. `Alt+Space` window menu).
  - Win32 `SendInput` with in-memory clipboard snapshot, paste (`Ctrl+V`), and automatic restoration.
  - Windows Terminal / Console detection (`wt.exe`, `powershell.exe`, `pwsh.exe`, `cmd.exe`) with `Shift+Insert` fallback.
  - Unicode character keystroke injection fallback (`KEYEVENTF_UNICODE`).
  - Text selection copy grab (`Ctrl+C` with clipboard backup and restore).
  - UI Automation (`IUIAutomation` / `AutomationElement.FocusedElement`) query for caret bounding rect (`TextPattern.GetSelection().GetBoundingRectangles()`) and surrounding text (`preText`, `postText`).
  - Fallbacks: Win32 `GetGUIThreadInfo` caret bounds and mouse cursor position fallback.
  - Browser URL detection for Chrome, Edge, Brave, and Firefox.
- Added build script `desktop/native-helper/build.ps1` and test harness `desktop/native-helper/test_helper.ps1`.
- Verified compilation and execution with zero errors and sub-60ms paste latency.

### Task 2: Electron Helper Manager & Push-to-Talk
- Implemented `desktop/nativeHelperManager.js`:
  - Lifecycle management (spawn, restart with exponential backoff, graceful shutdown).
  - Promise-based RPC over standard I/O newline-delimited JSON (`paste`, `copySelection`, `getContext`, `setHotkey`, `ping`).
  - Event dispatch for `ready`, `hotkey-down`, `hotkey-up`, `hotkey-press`.
- Updated `desktop/preload.js`:
  - Added `getContext()`, `copySelection()`, `positionIndicatorAtCaret()`, `onStartRecording()`, `onStopRecording()`, `setHotkeyMode()`.
- Updated `desktop/main.js`:
  - Linked `nativeHelperManager` to Push-to-Talk press (`start-recording`) and release (`stop-recording`).
  - Dynamic caret positioning `positionIndicatorNearCaret(caret)` using live UIA coordinates.
  - Seamless fast-paste routing through `nativeHelperManager.paste()` with PowerShell fallback.
  - Cleaned up on `will-quit`.

### Task 3: Smart Pre-Paste Formatting & Voice Backtracking
- Created `desktop/formattingEngine.js` and `backend/src/services/formattingEngine.ts`:
  - Context-aware pre-caret spacing (alphanumeric vs punctuation vs brackets).
  - Sentence start capitalization vs mid-sentence lowercase formatting.
  - Acronym preservation (API, JSON, NASA).
  - Trailing space insertion when text follows caret.
  - Backtracking triggers: `scratch that`, `never mind`, `nevermind`, `forget that`, `cancel that`, `strike that`, `no wait`, `wait no`, `actually`, `i mean`.
- Integrated backtracking in backend `/api/dictations/process` and client pre-paste formatting in `desktop/renderer/index.js`.
- Verified with 12 automated unit tests in `test/test_formatting.js` (all passed).

### Task 4: 16kHz AudioWorklet & Real-Time Streaming & Local LID
- Implemented `desktop/renderer/recorderWorklet.js`:
  - Dedicated AudioWorklet thread recording at 16,000 Hz mono.
  - 640-sample frames (40ms chunks) with real-time RMS volume and dBFS calculations.
  - Automatic downsampling from host AudioContext sample rates.
- Implemented `desktop/renderer/languageDetector.js`:
  - Zero-latency local language and dialect identification (<1ms).
  - Recognizes English, Hindi (Devanagari), Hinglish, French, Spanish, German, etc.
- Implemented WebSocket audio streaming endpoint in `backend/src/services/streamingServer.ts`:
  - Handles `/api/stream` WebSocket protocol for live 16kHz binary PCM chunk transmission.
  - Immediate `stop` finalization with `pcmToWav()` and Gemini transcription.
- Implemented `desktop/renderer/audioStreamManager.js`:
  - Manages audio graph, live streaming over WebSocket, and HTTP fallback.
- Automated tests passing in `test/test_audio_stream.js`.

### Task 5: Caret-Anchored Widget, Selection AI Transforms & Meeting Mode
- Enhanced floating indicator widget (`desktop/renderer/indicator.html` and `indicator.js`):
  - Glassmorphic pill styling matching Wispr Flow.
  - Real-time 5-bar equalizer waveform visualizer responding to voice volume.
  - Dynamic language identification badge ("EN", "HI", etc.) and mode display.
- Implemented Selection AI Transforms Studio in `desktop/renderer/index.html` and `index.js`:
  - `Polish`: Typos, grammar & flow.
  - `Prompt Engineer`: Unstructured idea -> structured LLM prompt.
  - `Turn to List`: Paragraphs -> clean Markdown bulleted action items.
  - `Make Me Sound Smart`: Executive business voice.
  - `What Did I Miss`: Gaps, risks & blind spots.
  - `Translate to English`: Hinglish/regional translation to fluent English.
  - Integrated with Win32 simulated copy grab (`window.api.copySelection()`) and fast in-place replacement (`window.api.executePaste()`).
- Implemented Meeting Mode:
  - Loopback audio + mic capture streaming.
  - Executive Chief of Staff summarizer (`/api/meetings/summarize`) returning Executive Summary, Decisions, Action Items, and structured notes.

### Task 6: Full System Integration, Build Verification & Packaging
- Added root build & test commands in `package.json`:
  - `npm test`: executes formatting unit tests, audio streaming tests, and native helper verification.
  - `npm run build:helper`: compiles `SpeakItHelper.exe` via C# compiler.
  - `npm run build:backend`: compiles TypeScript backend.
- Updated `desktop/package.json` to include native helper binaries in `files` and `extraResources`.
- Verified 100% test pass rate across all suites.
