# SpeakIt Bug Tracker & Known Limitations

## Issue & Bug Log

| ID | Component | Description | Status | Resolution |
|---|---|---|---|---|
| BUG-001 | Text Injection | PowerShell `SendKeys` was taking ~600ms per paste causing severe latency | Fixed | Replaced with native Win32 `SendInput` in `SpeakItHelper.exe` (<50ms end-to-end, sub-10ms keystroke injection) |
| BUG-002 | Hotkey | `globalShortcut.register` in Electron doesn't capture keyup events for Push-to-Talk | Fixed | Replaced with low-level `WH_KEYBOARD_LL` hook running in STA message loop with hotkey swallowing |
| BUG-003 | Terminal Paste | Windows Terminal / PowerShell consoles reject `Ctrl+V` in raw console modes | Fixed | `Shift+Insert` terminal fallback implemented for `wt.exe`, `cmd.exe`, `powershell.exe`, `pwsh.exe` |
| BUG-004 | Multi-monitor Caret | Caret coordinates can be outside primary screen bounds or null in Chromium apps | Fixed | Multi-tier caret detection: UIA `TextPattern` -> Win32 `GetGUIThreadInfo` -> Mouse cursor fallback |
| BUG-005 | French/Spanish LID | Stopword list missed high-frequency conversational pronouns | Fixed | Expanded multilingual stopword dictionary across 6 languages |
| BUG-006 | Backtracking Clause | Backtracking without comma separators lost sentence prefix | Fixed | Added regex fallback checking prepositions, conjunctions, and previous word tokens |

---

## Technical Debt & Shortcuts

- `shortcut: UIA TextPattern fallback to GetGUIThreadInfo and cursor position, when accessibility tree is disabled by chromium flags`
- `shortcut: In-memory text-only clipboard backup in helper, upgrade to IDataObject format preservation if rich-text clipboard preservation is required`
