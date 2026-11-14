# Why Does SpeakIt Need Keyboard & Input Access? (BG9)

When installing or running SpeakIt, Windows Defender, SmartScreen, or antivirus software may note that the application accesses low-level keyboard events and simulates keyboard input.

Here is an honest, transparent technical explanation of exactly what SpeakIt accesses, why it is required, and how your privacy is protected.

---

## 1. The Permissions SpeakIt Uses

### A. Global Low-Level Keyboard Hook (`WH_KEYBOARD_LL`)
- **Why it is needed:** SpeakIt lets you dictate from inside **any application** (Chrome, Slack, VS Code, Word, WhatsApp) by holding your push-to-talk hotkey (<kbd>Ctrl</kbd> + <kbd>Win</kbd>). Windows only allows applications to detect hotkey press-and-release events globally across applications via a registered low-level keyboard hook or raw input.
- **What SpeakIt does:** The native helper process (`SpeakItHelper.exe`) monitors exclusively for the configured hotkey combination.
- **What SpeakIt NEVER does:** It **never** logs, records, or stores everyday keystrokes. When you type passwords, documents, or personal messages, non-hotkey keystrokes pass straight through untouched to your active application.

### B. Keyboard Simulation (`SendInput` & `WM_PASTE`)
- **Why it is needed:** Once your speech is transcribed and formatted, the text must be inserted directly where your cursor is currently blinking. SpeakIt achieves this by triggering a paste into the foreground window.
- **What SpeakIt does:** Automatically restores whatever you previously had in your clipboard within 100 milliseconds after insertion, so your copied links, images, or text are never permanently overwritten.

### C. UI Automation Accessibility Inspection
- **Why it is needed:** To keep your credentials safe! Before pasting or recording, SpeakIt queries Windows UI Automation to check if the focused element is a `Password` field. If so, dictation is automatically blocked with an alert: *"Password field protected"*.

---

## 2. Open Source Verification
SpeakIt is 100% open source under the MIT License. Every line of the native helper code is publicly readable in the repository:
- C# Native Helper: [`desktop/native-helper/SpeakItHelper.cs`](file:///d:/XOLVER/SpeakIt/desktop/native-helper/SpeakItHelper.cs)
- Native IPC Protocol: [`shared/types/helperProtocol.ts`](file:///d:/XOLVER/SpeakIt/shared/types/helperProtocol.ts)

You can compile the native helper yourself using the provided build script:
```powershell
powershell -File desktop/native-helper/build.ps1
```

---

## 3. How to Bypass Unsigned SmartScreen Warnings
Until open-source code signing certificates are processed by SignPath Foundation:
1. When downloading the installer, if Windows SmartScreen displays *"Windows protected your PC"*:
2. Click **More info**.
3. Click **Run anyway**.
