# SpeakIt — Voice Typing for Windows that Sounds Like You

**Voice typing for Windows that understands Hinglish, cleans up your speech, and works offline — free and open source.**

SpeakIt runs system-wide across any application on Windows 10 and 11. Hold <kbd>Ctrl</kbd> + <kbd>Win</kbd>, speak your thoughts, and release — clean, well-formatted text appears directly at your cursor.

> *SpeakIt is an independent open-source project under the MIT License and is not affiliated with, endorsed by, or sponsored by Wispr or the creators of Wispr Flow.*

---

## Key Features

- **Global Push-to-Talk & Double-Tap Hands-Free:** Trigger dictation anywhere with `Ctrl + Win` (or configurable custom hotkeys).
- **Sub-Second Streaming Pipeline:** Powered by Groq's LPU inference (`whisper-large-v3-turbo` + `llama-3.3-70b-versatile`) with p50 latency under 2 seconds.
- **Understands Hinglish & Indian Accents:** Built for Indian English and Hinglish dictation (accuracy benchmarks pending).
- **AI Disfluency Removal & Self-Corrections:** Automatically removes conversational filler words ("um", "ah"), formats lists and punctuation, and handles self-corrections ("meet on Monday no wait Tuesday" becomes "meet on Tuesday").
- **100% Offline Capability:** Bundled local `whisper.cpp` engine. Works immediately with zero internet connection, zero API keys, and zero accounts.
- **Privacy-First:**
  - Free to use; works fully offline.
  - Zero telemetry or analytics collected by default.
  - API keys stored securely in Windows DPAPI (`safeStorage`).
  - Automatic Password Field Shield via Windows UI Automation.
- **Enterprise Ready:** Machine-wide policy enforcement via Windows Registry (`HKLM\Software\Policies\SpeakIt`) for mandatory offline mode, locked retention, and silent deployment (`/S`).

---

## Documentation & Guides

- [Troubleshooting & Known Limits](docs/troubleshooting.md)
- [Why SpeakIt Needs Input Access](docs/WHY_ACCESSIBILITY_PERMISSIONS.md)
- [Comparison vs Windows Voice Typing (Win+H)](docs/COMPARISON_WIN_H.md)
- [Enterprise & Group Policy Deployment](docs/ENTERPRISE_DEPLOYMENT.md)
- [AI Providers Specification & Limits](docs/providers.md)
- [Terms of Use](docs/terms.md) & [Privacy Policy](docs/privacy.md)
- [Contributing Guide](CONTRIBUTING.md)

---

## Support & Sustainability

SpeakIt is an independent open-source project that costs $0 to run. If SpeakIt saves you time every day, consider supporting continuous development:

- ♥ [Sponsor on GitHub](https://github.com/sponsors/DecoyINDIA)
- ☕ [Buy Me a Coffee](https://buymeacoffee.com/DecoyINDIA)

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
