# SpeakIt — High-Performance Desktop Voice Writing Assistant

**SpeakIt** is a fast, privacy-first, desktop-native AI voice dictation and writing assistant for Windows. It runs system-wide, transcribes speech with ultra-low latency, formats raw speech into clear, structured prose using AI, and pastes text directly into any focused application.

> *SpeakIt is an independent open-source project and is not affiliated with, endorsed by, or sponsored by Wispr or the creators of Wispr Flow.*

---

## Key Features

- **Global Push-to-Talk & Double-Tap Hands-Free:** Trigger dictation anywhere with `Ctrl + Win` (or configurable custom hotkeys). Includes missed-key polling, Start-menu mask key (`VK 0xE8`), and 200ms chord conflict abort.
- **Sub-Second Streaming Pipeline:** Powered by Groq's LPU inference (`whisper-large-v3-turbo` + `llama-3.3-70b-versatile`) with p50 latency under 2 seconds.
- **Smart Formatting Engine:** Removes conversational filler words ("um", "ah"), fixes false starts, formats lists and punctuation, and preserves technical terminology without hallucinating answers.
- **Zero-Cloud Offline Mode:** Downloadable local Whisper engine (`whisper-server.exe`) paired with local Ollama or LM Studio endpoints for 100% offline, private dictation.
- **Native Helper v2 (`SpeakItHelper.exe`):** C# low-level hook and Win32 delayed-rendering clipboard architecture (`WM_RENDERFORMAT`) with sequence number verification (`S0`/`S1`) and zero-loss clipboard restoration.
- **Security & Privacy Hardened:**
  - API keys encrypted with Windows DPAPI (`safeStorage`).
  - Strict Content Security Policy (CSP), disabled Node integration, isolated renderers.
  - Zero telemetry by default. Rotating local-only diagnostic logs (5 × 2MB).
  - Outbound network egress strictly whitelisted.
- **Modern Hub & Bar Interface:** Floating status pill with 9 live audio RMS volume bars, full Hub application with Dictation History (FTS5 search), Personal Dictionary, Snippets, Writing Styles, and Settings.

---

## Architecture Overview

```
SpeakIt/
├── native/helper/          # Native C# (.NET 4.8) hook & delayed-rendering helper
├── src/
│   ├── main/               # Electron Main Process (TypeScript)
│   │   ├── dictation/      # State machine, insert queue, smart formatter
│   │   ├── helper/         # Line-delimited JSON IPC helper client
│   │   ├── providers/      # Groq, Gemini, and Offline Whisper providers
│   │   ├── storage/        # SQLite database (better-sqlite3), DPAPI secret store
│   │   └── windows/        # Window Manager (Hub, Bar, Audio host)
│   ├── preload/            # Context-isolated secure preload scripts
│   └── renderer/           # React 19 + TypeScript modern UI (Hub & Bar)
├── docs/                   # Documentation (providers, release, privacy, parity)
└── test/                   # Golden benchmark suite (50 cases), unit, and contract tests
```

---

## Getting Started

### Prerequisites
- Windows 10 (22H2+) or Windows 11
- Node.js 22 LTS or higher
- .NET Framework 4.8 (pre-installed on Windows 10/11)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/speakit.git
   cd speakit
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Build the Native Helper:**
   Using the .NET CLI:
   ```bash
   dotnet build native/helper/SpeakItHelper.csproj -c Release
   ```
   Or using the pre-installed Windows C# compiler:
   ```powershell
   & "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:winexe /optimize+ /platform:x64 /out:native/helper/bin/Release/SpeakItHelper.exe native/helper/src/Program.cs
   ```

4. **Run in Development:**
   ```bash
   npm run dev
   ```

---

## Testing & Quality Benchmarks

Run the complete test suite:
```bash
# Run all unit tests, state machine tests, and golden benchmark
npm test

# Type checking
npm run typecheck

# Golden prompt benchmark (50 curated test cases)
npx vitest run test/unit/golden.test.ts
```

---

## Production Packaging

To build the self-contained per-user NSIS installer:
```bash
npm run build
npx electron-builder --win nsis
```
The installer will be generated in the `dist/` directory.

---

## License

This project is licensed under the [MIT License](LICENSE).
