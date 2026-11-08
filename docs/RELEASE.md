# SpeakIt Release & Verification Guide

This document defines the release checklist, signing procedures, virus scanning verification, and clean-environment VM testing required before releasing any build of SpeakIt.

---

## 1. Release Gate Checklist

Before tagging or publishing any release (`v*`):

- [ ] **Tests Green:**
  - `npm test` passes 100% of unit tests and helper contract tests.
  - Golden benchmark passes ≥ 47/50 cases (`npm run test:golden` or `test/unit/golden.test.ts`).
  - `npm run typecheck` passes with zero errors.
- [ ] **Clean Build:**
  - Helper compiles cleanly (`dotnet build native/helper/SpeakItHelper.csproj -c Release` or via `csc.exe`).
  - `electron-vite build` outputs clean main, preload, and renderer bundles.
  - Executable installer built via `electron-builder --win nsis`.
- [ ] **Gate Checks (§11):**
  - Direct paste reliability ≥ 95% across the 10-target matrix.
  - Clipboard hash restoration verification ≥ 99%.
  - Zero sentinel (`SNTL-*`) leaks.
  - Latency: p50 ≤ 2.0s on Groq.
  - Memory soak test passed (< 50MB increase over 500 mock dictations).
- [ ] **Documentation & Identity:**
  - Version numbers match in `package.json` and `product.config.ts`.
  - "Not affiliated with Wispr" legal notice present on all surfaces.
  - `docs/privacy.md` updated with any new provider endpoints.

---

## 2. Code Signing & Antivirus Verification

Because `SpeakItHelper.exe` installs a low-level keyboard hook (`WH_KEYBOARD_LL`), interacts with the Windows clipboard, and calls `SendInput`, heuristic antivirus engines may scrutinize it closely.

### 2.1 Signing Options
1. **SignPath (Recommended for Open Source):**
   - SpeakIt is an open-source project under MIT.
   - Continuous integration via GitHub Actions can sign installer releases using SignPath Foundation certificates once approved.
2. **Microsoft Store (MSIX / Centros):**
   - Package via `electron-builder --win appx` or desktop bridge MSIX.
   - Microsoft Store vetting eliminates the SmartScreen unknown-publisher warning.
3. **Unsigned Beta (Self-hosted):**
   - Provide clear instructions to users on bypassing initial Windows SmartScreen: Click "More info" → "Run anyway".

### 2.2 VirusTotal Scan Protocol
Every release installer and `SpeakItHelper.exe` must be scanned on VirusTotal:
1. Upload `dist/SpeakIt-Setup-*.exe` to [VirusTotal](https://www.virustotal.com/).
2. Gate criterion: **At most 1 low-reputation engine false positive**; 0 detections from Tier-1 vendors (Microsoft Defender, Symantec/Broadcom, Kaspersky, Bitdefender, Sophos).
3. Record the permalink to the VirusTotal analysis report in the GitHub Release notes.

### 2.3 Microsoft Defender False-Positive Submission
If Windows Defender flags the helper or installer:
1. Visit the [Microsoft Security Intelligence Sample Submission](https://www.microsoft.com/en-us/wdsi/filesubmission).
2. Select **Software Developer**.
3. Upload `SpeakItHelper.exe` and `SpeakIt-Setup-*.exe`.
4. Provide the project repository URL, explain that the app is an open-source accessibility/dictation tool using low-level hooks for hotkey detection, and request whitelisting.

---

## 3. Clean VM Testing Guide

Before marking a build as GA (General Availability):

### 3.1 Windows 11 VM Test
1. Spin up a fresh Windows 11 (22H2 / 23H2 / 24H2) VM (Hyper-V, VirtualBox, or VMware) with standard non-admin user credentials.
2. Run `SpeakIt-Setup-*.exe`.
3. Verify:
   - Installs to `%LOCALAPPDATA%\Programs\SpeakIt` without requesting UAC / admin escalation.
   - Starts properly, creates system tray icon.
   - Onboarding modal launches on first run.
   - Hotkey `Ctrl+Win` triggers the floating bar within 300ms.
   - End-to-end dictation pastes into Notepad.
4. Verify Uninstallation:
   - Open Windows Settings → Installed apps → SpeakIt → Uninstall.
   - Prompt appears: "Delete my data?".
   - Choosing "No" leaves SQLite database intact at `%APPDATA%\SpeakIt`.

### 3.2 Windows 10 VM Test
1. Spin up a fresh Windows 10 22H2 VM.
2. Install .NET Framework 4.8 if not already enabled (default on modern Win10 builds).
3. Run the installer and verify hotkey triggering, delayed rendering paste, and bar animations.

### 3.3 Update from Previous Version Test
1. Install version `N-1`.
2. Configure settings (e.g. set a custom dictionary term and snippet).
3. Run installer for version `N` (or trigger auto-updater).
4. Verify all database records, custom words, and DPAPI-encrypted API keys remain intact.
