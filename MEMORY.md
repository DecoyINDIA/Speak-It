# SpeakIt Memory & Architecture Decisions

## Architectural Overview
SpeakIt has been upgraded to a native desktop voice writing and AI transformation platform based on the Wispr Flow reverse engineering architecture.

### 1. IPC Architecture
- **Protocol**: Standard I/O (stdin/stdout) newline-delimited JSON messages between Electron main process and `SpeakItHelper.exe`.
- **Command Structure**:
  ```json
  {"id": "req-1", "cmd": "paste", "text": "hello world", "mode": "auto"|"terminal"|"unicode"}
  {"id": "req-2", "cmd": "copy_selection"}
  {"id": "req-3", "cmd": "get_context"}
  {"id": "req-4", "cmd": "set_hotkey", "key": "Space", "modifiers": ["Alt"], "mode": "push_to_talk"|"toggle", "swallow": true}
  {"id": "req-5", "cmd": "ping"}
  {"id": "req-6", "cmd": "exit"}
  ```
- **Event Structure**:
  ```json
  {"event": "ready", "version": "1.0.0"}
  {"event": "hotkey_down", "key": "32"}
  {"event": "hotkey_up", "key": "32"}
  {"event": "hotkey_press", "key": "32"}
  ```
- **Responses**:
  ```json
  {"id": "req-1", "status": "ok", "success": true, "method": "ctrl_v", "latencyMs": 15.2, "targetApp": "code"}
  {"id": "req-2", "status": "ok", "text": "selected text", "length": 13}
  {"id": "req-3", "status": "ok", "app": "slack.exe", "title": "Slack", "url": "", "caret": {"x": 450, "y": 620, "w": 2, "h": 16}, "preText": "hello ", "postText": ""}
  ```

### 2. Native Win32 Subsystems
- **Keyboard Hook**: Uses Win32 `SetWindowsHookEx(WH_KEYBOARD_LL)`. Runs a dedicated Win32 message loop (`Application.Run()`) in an STA thread to intercept low-level key events with zero lag. Swallows hotkey so OS menu triggers (like `Alt+Space`) do not open system windows.
- **Fast Text Injection**:
  1. Checks active process. If `wt.exe`, `powershell.exe`, or `cmd.exe`, uses `Shift+Insert` keystroke sequence.
  2. Otherwise, snapshot clipboard data formats in memory, write new text to clipboard, dispatch Win32 `SendInput` (`VK_CONTROL` + `V`), wait 35ms, restore clipboard.
  3. If target window disables paste or clipboard fails, fallback to `SendInput` with `KEYEVENTF_UNICODE`.
- **UI Automation (Accessibility Engine)**:
  - Resolves `IUIAutomation::GetFocusedElement`.
  - Queries `TextPattern` or `TextPattern2` for cursor position (`GetSelection().GetBoundingRectangles()`) and surrounding text (`axText`).
  - Fallback to Win32 `GetGUIThreadInfo` if UI Automation is not implemented by the active window, and mouse cursor position as final fallback.

### 3. Audio & Streaming Pipeline
- **Worklet**: 16,000 Hz 1-channel PCM audio processor (`desktop/renderer/recorderWorklet.js`).
- **Frames**: 640 samples per chunk (40ms duration).
- **RMS Volume**: Calculated per chunk in decibels: `20 * log10(max(rms, 1e-4))`.
- **Streaming**: Real-time transmission to backend WebSocket at `/api/stream`, instant finalization on keyup.

### 4. Backtracking & Voice Intelligence
- Backtracking triggers: `["scratch that", "never mind", "nevermind", "forget that", "cancel that", "strike that", "no wait", "wait no", "actually", "i mean"]`.
- Strips preceding clause or sentence upon trigger encounter.
- Client and server side execution to guarantee clean output.

### 5. AI Selection Transforms & Meeting Mode
- Selection Grab: `nativeHelperManager.copySelection()` -> `/api/transforms/apply` -> in-place `nativeHelperManager.paste()`.
- 6 Wispr Flow transforms: Polish, Prompt Engineer, Turn to List, Make Me Sound Smart, What Did I Miss, Translate to English.
- Meeting Mode: Dual loopback + mic capture with executive notes generator (`/api/meetings/summarize`).
