# Contributing to SpeakIt

Thank you for contributing to SpeakIt! SpeakIt is built to make voice dictation on Windows fast, reliable, and accessible to everyone.

---

## 1. Prerequisites

- **OS:** Windows 10 (22H2+) or Windows 11, x64
- **Node.js:** v20.0.0 or later (v22+ recommended)
- **.NET SDK:** .NET 8.0 SDK or C# compiler (`csc.exe` or `dotnet`) for building the native helper
- **Git**

---

## 2. Quick Setup

```bash
# 1. Clone repository
git clone https://github.com/DecoyINDIA/Speak-It.git
cd Speak-It

# 2. Install dependencies
npm install

# 3. Build native helper executable (if needed)
powershell -File desktop/native-helper/build.ps1

# 4. Run test suite
npm test

# 5. Start development app
npm run dev
```

---

## 3. Project Structure

- `src/main/` — Electron main process (state machine, IPC, provider chain, SQLite database).
- `src/preload/` — Context isolation bridge (`hub.ts`, `bar.ts`, `audio.ts`).
- `src/renderer/` — React UI components for the Hub window, floating Bar, and background Audio host.
- `desktop/native-helper/` — C# native Windows helper (`SpeakItHelper.cs`) handling `WH_KEYBOARD_LL` low-level keyboard hooks, `SendInput`, and UI Automation context.
- `shared/` — Protocol contracts and shared TypeScript definitions.
- `spike/` — Latency, STT bake-off, and paste reliability test fixtures.
- `docs/` — Architecture specifications, privacy policy, and user guides.

---

## 4. Engineering Guidelines

1. **Minimal Diff Principles:** Solve problems with the least new code. Deletion beats addition. Avoid speculative abstraction.
2. **Privacy First:** Never log, store, or transmit speech audio or transcripts without explicit user consent.
3. **Tests Required:** Any non-trivial logic branch must be accompanied by a unit test in `test/unit/` runnable via `npm test`.
4. **Renaming Architecture:** Never hardcode `"SpeakIt"` in string literals or storage keys. Always import `productConfig` from `product.config.ts`.
