# SpeakIt Troubleshooting & Known Limits Guide (BG12)

This guide covers common questions, edge cases, and solutions for SpeakIt on Windows 10 and 11.

---

## 1. Frequently Encountered Issues

### 1. "Text doesn't paste into Command Prompt / Registry Editor / Task Manager"
- **Cause:** Windows User Interface Privilege Isolation (UIPI). Applications running as Standard User cannot send simulated keyboard input (`SendInput`) into elevated Administrator windows.
- **Solution:** 
  - Run the target application without elevation if possible.
  - Or simply press <kbd>Ctrl</kbd> + <kbd>V</kbd> manually! SpeakIt copies your polished text to the clipboard so you never lose your transcription.

### 2. "First word cut off when using Bluetooth headphones / earbuds"
- **Cause:** Bluetooth audio profiles (HFP/HSP) often enter low-power sleep mode and take 200–500ms to wake up the radio transmitter.
- **Solution:** 
  - SpeakIt includes a **Mic Warm Window** (Settings -> System -> Mic Warm Window). Set this to `20s` or `30s` so the microphone stream stays active between rapid dictation turns.
  - Or pause for half a second after pressing <kbd>Ctrl</kbd> + <kbd>Win</kbd> before speaking.

### 3. "Windows Defender / SmartScreen warns during installation"
- **Cause:** New open-source executables without commercial EV certificates trigger Microsoft Defender SmartScreen reputation warnings.
- **Solution:** Click **More Info** -> **Run anyway**. SpeakIt is 100% open source under the MIT license; see [`docs/WHY_ACCESSIBILITY_PERMISSIONS.md`](file:///d:/XOLVER/SpeakIt/docs/WHY_ACCESSIBILITY_PERMISSIONS.md) for full technical security disclosures.

### 4. "Dictating inside Remote Desktop (RDP) or Citrix sessions"
- **Cause:** RDP captures local keystrokes inside the remote window.
- **Solution:** SpeakIt can run either on your local host (pasting into the RDP client window) or directly inside the virtual desktop session. When running on the local host, ensure the RDP client window does not swallow <kbd>Ctrl</kbd> + <kbd>Win</kbd> shortcuts.

### 5. "Microphone shows 'No speech detected' or error"
- **Checklist:**
  - Open **Windows Settings -> Privacy & security -> Microphone**.
  - Ensure **Microphone access** is turned ON.
  - Ensure **Let desktop apps access your microphone** is turned ON.
  - In SpeakIt Settings, verify the correct microphone device is selected.

---

## 2. Getting Help & Support

- **Bug Reports & Feature Requests:** [GitHub Issues](https://github.com/DecoyINDIA/Speak-It/issues)
- **Community Questions:** [GitHub Discussions](https://github.com/DecoyINDIA/Speak-It/discussions)
- **Inspect Logs:** Click *Open Logs Folder* in SpeakIt Hub Settings or navigate to `%APPDATA%\SpeakIt\logs`.
