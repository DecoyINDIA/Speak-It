using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Automation;
using System.Windows.Automation.Text;
using System.Windows.Forms;

namespace SpeakIt.NativeHelper
{
    internal static class Program
    {
        // Win32 Constants
        private const int WH_KEYBOARD_LL = 13;
        private const int WM_KEYDOWN = 0x0100;
        private const int WM_KEYUP = 0x0101;
        private const int WM_SYSKEYDOWN = 0x0104;
        private const int WM_SYSKEYUP = 0x0105;

        private const int INPUT_KEYBOARD = 1;
        private const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
        private const uint KEYEVENTF_KEYUP = 0x0002;
        private const uint KEYEVENTF_UNICODE = 0x0004;

        private const ushort VK_SHIFT = 0x10;
        private const ushort VK_CONTROL = 0x11;
        private const ushort VK_MENU = 0x12; // Alt
        private const ushort VK_LWIN = 0x5B;
        private const ushort VK_RWIN = 0x5C;
        private const ushort VK_SPACE = 0x20;
        private const ushort VK_INSERT = 0x2D;
        private const ushort VK_C = 0x43;
        private const ushort VK_V = 0x56;

        // P/Invoke Structures
        [StructLayout(LayoutKind.Sequential)]
        private struct KBDLLHOOKSTRUCT
        {
            public uint vkCode;
            public uint scanCode;
            public uint flags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct KEYBDINPUT
        {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Explicit)]
        private struct INPUT
        {
            [FieldOffset(0)] public int type;
            [FieldOffset(8)] public KEYBDINPUT ki;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct POINT
        {
            public int X;
            public int Y;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct GUITHREADINFO
        {
            public int cbSize;
            public int flags;
            public IntPtr hwndActive;
            public IntPtr hwndFocus;
            public IntPtr hwndCapture;
            public IntPtr hwndMenuOwner;
            public IntPtr hwndMoveSize;
            public IntPtr hwndCaret;
            public RECT rcCaret;
        }

        // P/Invoke Methods
        private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);

        [DllImport("user32.dll")]
        private static extern short GetAsyncKeyState(int vKey);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetGUIThreadInfo(uint idThread, ref GUITHREADINFO lpgui);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetCursorPos(out POINT lpPoint);

        // State fields
        private static IntPtr _hookId = IntPtr.Zero;
        private static LowLevelKeyboardProc _hookCallback;
        private static Thread _hookThread;

        private static ushort _targetVk = VK_SPACE;
        private static bool _reqAlt = true;
        private static bool _reqCtrl = false;
        private static bool _reqShift = false;
        private static bool _reqWin = false;
        private static string _hotkeyMode = "push_to_talk"; // "push_to_talk" or "toggle"
        private static bool _swallowHotkey = true;
        private static bool _isHotkeyDown = false;

        private static readonly object _stdoutLock = new object();
        private static volatile bool _running = true;

        [STAThread]
        public static void Main(string[] args)
        {
            try
            {
                try
                {
                    Console.InputEncoding = Encoding.UTF8;
                    Console.OutputEncoding = Encoding.UTF8;
                }
                catch { }

                // Start Low-Level Keyboard Hook in dedicated thread with message pump
                _hookCallback = HookCallback;
                _hookThread = new Thread(HookThreadStart)
                {
                    IsBackground = true
                };
                _hookThread.SetApartmentState(ApartmentState.STA);
                _hookThread.Start();

                // Emit ready event
                EmitJson("{\"event\":\"ready\",\"version\":\"1.0.0\"}");

                // Main loop reads JSON commands line by line from stdin
                string line;
                while (_running && (line = Console.ReadLine()) != null)
                {
                    line = line.Trim();
                    if (string.IsNullOrEmpty(line))
                    {
                        continue;
                    }

                    try
                    {
                        HandleCommand(line);
                    }
                    catch (Exception ex)
                    {
                        EmitError("ERR_CMD_FAILED", ex.Message, null);
                    }
                }

                // Cleanup
                Cleanup();
            }
            catch (Exception ex)
            {
                try
                {
                    File.AppendAllText("SpeakItHelper_crash.log", "[" + DateTime.UtcNow.ToString("o") + "] " + ex.ToString() + Environment.NewLine);
                }
                catch { }
            }
        }

        private static void HookThreadStart()
        {
            using (Process curProcess = Process.GetCurrentProcess())
            using (ProcessModule curModule = curProcess.MainModule)
            {
                _hookId = SetWindowsHookEx(WH_KEYBOARD_LL, _hookCallback, GetModuleHandle(curModule.ModuleName), 0);
            }

            // Run Win32 Message Loop
            Application.Run();
        }

        private static void Cleanup()
        {
            _running = false;
            if (_hookId != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_hookId);
                _hookId = IntPtr.Zero;
            }
            Application.ExitThread();
        }

        private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0)
            {
                int msg = wParam.ToInt32();
                KBDLLHOOKSTRUCT kbd = (KBDLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(KBDLLHOOKSTRUCT));

                bool isDown = (msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN);
                bool isUp = (msg == WM_KEYUP || msg == WM_SYSKEYUP);

                if (isDown || isUp)
                {
                    bool altPressed = (GetAsyncKeyState(VK_MENU) & 0x8000) != 0;
                    bool ctrlPressed = (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0;
                    bool shiftPressed = (GetAsyncKeyState(VK_SHIFT) & 0x8000) != 0;
                    bool winPressed = ((GetAsyncKeyState(VK_LWIN) & 0x8000) != 0) || ((GetAsyncKeyState(VK_RWIN) & 0x8000) != 0);

                    // Check if pressed key matches target VK code
                    bool keyMatch = (kbd.vkCode == _targetVk);
                    bool modMatch = (altPressed == _reqAlt) &&
                                    (ctrlPressed == _reqCtrl) &&
                                    (shiftPressed == _reqShift) &&
                                    (winPressed == _reqWin);

                    if (keyMatch && modMatch)
                    {
                        if (isDown)
                        {
                            if (!_isHotkeyDown)
                            {
                                _isHotkeyDown = true;
                                if (_hotkeyMode == "push_to_talk")
                                {
                                    EmitJson("{\"event\":\"hotkey_down\",\"key\":\"" + _targetVk + "\"}");
                                }
                                else
                                {
                                    EmitJson("{\"event\":\"hotkey_press\",\"key\":\"" + _targetVk + "\"}");
                                }
                            }

                            if (_swallowHotkey)
                            {
                                return (IntPtr)1; // Swallow key
                            }
                        }
                        else if (isUp)
                        {
                            if (_isHotkeyDown)
                            {
                                _isHotkeyDown = false;
                                if (_hotkeyMode == "push_to_talk")
                                {
                                    EmitJson("{\"event\":\"hotkey_up\",\"key\":\"" + _targetVk + "\"}");
                                }
                            }

                            if (_swallowHotkey)
                            {
                                return (IntPtr)1; // Swallow key
                            }
                        }
                    }
                }
            }

            return CallNextHookEx(_hookId, nCode, wParam, lParam);
        }

        private static void HandleCommand(string json)
        {
            // Simple robust JSON field extraction (no external JSON lib dependency required in C# 5)
            string id = ExtractJsonField(json, "id");
            string cmd = ExtractJsonField(json, "cmd");

            if (string.IsNullOrEmpty(cmd))
            {
                cmd = ExtractJsonField(json, "command");
            }

            if (string.IsNullOrEmpty(cmd))
            {
                EmitError("ERR_UNKNOWN_COMMAND", "Missing 'cmd' in request", id);
                return;
            }

            switch (cmd.ToLowerInvariant())
            {
                case "ping":
                    EmitResponse(id, "{\"pong\":true,\"time\":" + Environment.TickCount + "}");
                    break;

                case "set_hotkey":
                    HandleSetHotkey(json, id);
                    break;

                case "paste":
                    HandlePaste(json, id);
                    break;

                case "copy_selection":
                    HandleCopySelection(id);
                    break;

                case "get_context":
                    HandleGetContext(id);
                    break;

                case "exit":
                case "quit":
                    _running = false;
                    EmitResponse(id, "{\"exiting\":true}");
                    Cleanup();
                    Environment.Exit(0);
                    break;

                default:
                    EmitError("ERR_UNKNOWN_CMD", "Unknown command: " + cmd, id);
                    break;
            }
        }

        private static void HandleSetHotkey(string json, string id)
        {
            string key = ExtractJsonField(json, "key");
            string mode = ExtractJsonField(json, "mode");
            string swallow = ExtractJsonField(json, "swallow");
            string modifiers = ExtractJsonField(json, "modifiers");

            if (!string.IsNullOrEmpty(key))
            {
                if (key.Equals("Space", StringComparison.OrdinalIgnoreCase)) _targetVk = VK_SPACE;
                else if (key.Equals("Insert", StringComparison.OrdinalIgnoreCase)) _targetVk = VK_INSERT;
                else if (key.Length == 1) _targetVk = (ushort)char.ToUpperInvariant(key[0]);
            }

            if (!string.IsNullOrEmpty(modifiers))
            {
                _reqAlt = modifiers.IndexOf("Alt", StringComparison.OrdinalIgnoreCase) >= 0;
                _reqCtrl = modifiers.IndexOf("Ctrl", StringComparison.OrdinalIgnoreCase) >= 0 ||
                           modifiers.IndexOf("Control", StringComparison.OrdinalIgnoreCase) >= 0;
                _reqShift = modifiers.IndexOf("Shift", StringComparison.OrdinalIgnoreCase) >= 0;
                _reqWin = modifiers.IndexOf("Win", StringComparison.OrdinalIgnoreCase) >= 0 ||
                          modifiers.IndexOf("Meta", StringComparison.OrdinalIgnoreCase) >= 0;
            }

            if (!string.IsNullOrEmpty(mode))
            {
                _hotkeyMode = mode.ToLowerInvariant();
            }

            if (!string.IsNullOrEmpty(swallow))
            {
                _swallowHotkey = (swallow == "true" || swallow == "1");
            }

            EmitResponse(id, "{\"status\":\"ok\",\"targetVk\":" + _targetVk + ",\"mode\":\"" + _hotkeyMode + "\"}");
        }

        private static void HandlePaste(string json, string id)
        {
            string text = ExtractJsonStringValue(json, "text");
            string mode = ExtractJsonField(json, "mode");
            long startTick = Stopwatch.GetTimestamp();

            if (text == null)
            {
                text = "";
            }

            IntPtr fgHwnd = GetForegroundWindow();
            string procName = GetProcessNameFromHwnd(fgHwnd);
            bool isTerminal = IsTerminalProcess(procName);

            bool success = false;
            string usedMethod = "clipboard";

            if (mode == "dry_run")
            {
                usedMethod = "dry_run";
                success = true;
            }
            else if (mode == "unicode")
            {
                SendUnicodeChars(text);
                usedMethod = "unicode_keys";
                success = true;
            }
            else if (isTerminal || mode == "terminal")
            {
                // Terminal paste: Shift + Insert
                PasteViaClipboardAndKey(text, VK_SHIFT, VK_INSERT);
                usedMethod = "shift_insert";
                success = true;
            }
            else
            {
                // Standard ultra-fast paste: Ctrl + V with clipboard backup
                PasteViaClipboardAndKey(text, VK_CONTROL, VK_V);
                usedMethod = "ctrl_v";
                success = true;
            }

            double elapsedMs = (Stopwatch.GetTimestamp() - startTick) * 1000.0 / Stopwatch.Frequency;

            EmitResponse(id, string.Format("{{\"status\":\"ok\",\"success\":{0},\"method\":\"{1}\",\"latencyMs\":{2:F2},\"targetApp\":\"{3}\"}}",
                success ? "true" : "false", usedMethod, elapsedMs, EscapeJson(procName)));
        }

        private static void PasteViaClipboardAndKey(string text, ushort modVk, ushort keyVk)
        {
            Thread staThread = new Thread(() =>
            {
                string backupText = null;
                bool hadText = false;

                try
                {
                    if (Clipboard.ContainsText())
                    {
                        backupText = Clipboard.GetText();
                        hadText = true;
                    }
                }
                catch { }

                try
                {
                    Clipboard.SetText(text);
                }
                catch
                {
                    // Fallback to unicode keystrokes if clipboard was locked by another process
                    SendUnicodeChars(text);
                    return;
                }

                // Send Mod + Key via SendInput
                INPUT[] inputs = new INPUT[4];

                // Mod Down
                inputs[0].type = INPUT_KEYBOARD;
                inputs[0].ki.wVk = modVk;

                // Key Down
                inputs[1].type = INPUT_KEYBOARD;
                inputs[1].ki.wVk = keyVk;

                // Key Up
                inputs[2].type = INPUT_KEYBOARD;
                inputs[2].ki.wVk = keyVk;
                inputs[2].ki.dwFlags = KEYEVENTF_KEYUP;

                // Mod Up
                inputs[3].type = INPUT_KEYBOARD;
                inputs[3].ki.wVk = modVk;
                inputs[3].ki.dwFlags = KEYEVENTF_KEYUP;

                SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));

                // Restore previous clipboard text after slight delay for target to consume WM_PASTE
                Thread.Sleep(35);
                if (hadText && backupText != null)
                {
                    try
                    {
                        Clipboard.SetText(backupText);
                    }
                    catch { }
                }
            });

            staThread.SetApartmentState(ApartmentState.STA);
            staThread.Start();
            staThread.Join(500);
        }

        private static void SendUnicodeChars(string text)
        {
            if (string.IsNullOrEmpty(text)) return;

            INPUT[] inputs = new INPUT[text.Length * 2];
            for (int i = 0; i < text.Length; i++)
            {
                char c = text[i];

                inputs[i * 2].type = INPUT_KEYBOARD;
                inputs[i * 2].ki.wScan = (ushort)c;
                inputs[i * 2].ki.dwFlags = KEYEVENTF_UNICODE;

                inputs[i * 2 + 1].type = INPUT_KEYBOARD;
                inputs[i * 2 + 1].ki.wScan = (ushort)c;
                inputs[i * 2 + 1].ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
            }

            SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        private static void HandleCopySelection(string id)
        {
            string selectedText = "";

            Thread staThread = new Thread(() =>
            {
                string priorText = null;
                bool hadPrior = false;
                try
                {
                    if (Clipboard.ContainsText())
                    {
                        priorText = Clipboard.GetText();
                        hadPrior = true;
                    }
                    Clipboard.Clear();
                }
                catch { }

                // Send Ctrl+C
                INPUT[] inputs = new INPUT[4];
                inputs[0].type = INPUT_KEYBOARD;
                inputs[0].ki.wVk = VK_CONTROL;

                inputs[1].type = INPUT_KEYBOARD;
                inputs[1].ki.wVk = VK_C;

                inputs[2].type = INPUT_KEYBOARD;
                inputs[2].ki.wVk = VK_C;
                inputs[2].ki.dwFlags = KEYEVENTF_KEYUP;

                inputs[3].type = INPUT_KEYBOARD;
                inputs[3].ki.wVk = VK_CONTROL;
                inputs[3].ki.dwFlags = KEYEVENTF_KEYUP;

                SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));

                // Wait up to 100ms for clipboard content
                for (int i = 0; i < 10; i++)
                {
                    Thread.Sleep(10);
                    try
                    {
                        if (Clipboard.ContainsText())
                        {
                            selectedText = Clipboard.GetText();
                            break;
                        }
                    }
                    catch { }
                }

                // If nothing was copied, restore prior text
                if (string.IsNullOrEmpty(selectedText) && hadPrior && priorText != null)
                {
                    try { Clipboard.SetText(priorText); } catch { }
                }
            });

            staThread.SetApartmentState(ApartmentState.STA);
            staThread.Start();
            staThread.Join(500);

            EmitResponse(id, string.Format("{{\"status\":\"ok\",\"text\":\"{0}\",\"length\":{1}}}",
                EscapeJson(selectedText), selectedText.Length));
        }

        private static void HandleGetContext(string id)
        {
            IntPtr fgHwnd = GetForegroundWindow();
            string procName = GetProcessNameFromHwnd(fgHwnd);
            string winTitle = GetWindowTitle(fgHwnd);
            string browserUrl = "";
            int caretX = 0, caretY = 0, caretW = 0, caretH = 0;
            string preText = "";
            string postText = "";
            bool caretFound = false;

            try
            {
                // UI Automation attempt
                AutomationElement focused = AutomationElement.FocusedElement;
                if (focused != null)
                {
                    // Check if browser address bar exists to grab URL
                    browserUrl = TryExtractBrowserUrl(focused, procName);

                    // Try TextPattern for Caret position and surrounding text
                    object patternObj;
                    if (focused.TryGetCurrentPattern(TextPattern.Pattern, out patternObj))
                    {
                        TextPattern textPattern = (TextPattern)patternObj;
                        TextPatternRange[] selection = textPattern.GetSelection();
                        if (selection != null && selection.Length > 0)
                        {
                            System.Windows.Rect[] rects = selection[0].GetBoundingRectangles();
                            if (rects != null && rects.Length > 0)
                            {
                                caretX = (int)rects[0].X;
                                caretY = (int)rects[0].Y;
                                caretW = (int)rects[0].Width;
                                caretH = (int)rects[0].Height;
                                caretFound = true;
                            }

                            // Extract surrounding text before and after caret
                            try
                            {
                                TextPatternRange docRange = textPattern.DocumentRange;
                                TextPatternRange preRange = docRange.Clone();
                                preRange.MoveEndpointByRange(TextPatternRangeEndpoint.End, selection[0], TextPatternRangeEndpoint.Start);
                                string fullPre = preRange.GetText(-1);
                                if (!string.IsNullOrEmpty(fullPre))
                                {
                                    int takeLen = Math.Min(fullPre.Length, 150);
                                    preText = fullPre.Substring(fullPre.Length - takeLen);
                                }

                                TextPatternRange postRange = docRange.Clone();
                                postRange.MoveEndpointByRange(TextPatternRangeEndpoint.Start, selection[0], TextPatternRangeEndpoint.End);
                                string fullPost = postRange.GetText(150);
                                if (!string.IsNullOrEmpty(fullPost))
                                {
                                    postText = fullPost;
                                }
                            }
                            catch { }
                        }
                    }
                }
            }
            catch { }

            // Fallback 1: Win32 GetGUIThreadInfo
            if (!caretFound && fgHwnd != IntPtr.Zero)
            {
                uint pid;
                uint tid = GetWindowThreadProcessId(fgHwnd, out pid);
                GUITHREADINFO gui = new GUITHREADINFO();
                gui.cbSize = Marshal.SizeOf(typeof(GUITHREADINFO));

                if (GetGUIThreadInfo(tid, ref gui) && gui.hwndCaret != IntPtr.Zero)
                {
                    POINT pt = new POINT { X = gui.rcCaret.Left, Y = gui.rcCaret.Bottom };
                    ClientToScreen(gui.hwndCaret, ref pt);
                    caretX = pt.X;
                    caretY = pt.Y;
                    caretW = gui.rcCaret.Right - gui.rcCaret.Left;
                    caretH = gui.rcCaret.Bottom - gui.rcCaret.Top;
                    caretFound = true;
                }
            }

            // Fallback 2: Mouse cursor position
            if (!caretFound)
            {
                POINT mousePt;
                if (GetCursorPos(out mousePt))
                {
                    caretX = mousePt.X;
                    caretY = mousePt.Y;
                    caretW = 2;
                    caretH = 20;
                }
            }

            string responseJson = string.Format(
                "{{\"status\":\"ok\",\"app\":\"{0}\",\"title\":\"{1}\",\"url\":\"{2}\",\"caret\":{{\"x\":{3},\"y\":{4},\"w\":{5},\"h\":{6}}},\"preText\":\"{7}\",\"postText\":\"{8}\"}}",
                EscapeJson(procName),
                EscapeJson(winTitle),
                EscapeJson(browserUrl),
                caretX, caretY, caretW, caretH,
                EscapeJson(preText),
                EscapeJson(postText)
            );

            EmitResponse(id, responseJson);
        }

        private static string TryExtractBrowserUrl(AutomationElement focused, string procName)
        {
            if (string.IsNullOrEmpty(procName)) return "";
            string lower = procName.ToLowerInvariant();
            if (lower != "chrome" && lower != "msedge" && lower != "brave" && lower != "firefox")
            {
                return "";
            }

            try
            {
                // Find top-level window element
                AutomationElement topWindow = AutomationElement.FromHandle(GetForegroundWindow());
                if (topWindow == null) return "";

                // Look for Address and search bar Edit control
                Condition cond = new AndCondition(
                    new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit),
                    new PropertyCondition(AutomationElement.IsValuePatternAvailableProperty, true)
                );

                AutomationElement addressBar = topWindow.FindFirst(TreeScope.Descendants, cond);
                if (addressBar != null)
                {
                    object valPattern;
                    if (addressBar.TryGetCurrentPattern(ValuePattern.Pattern, out valPattern))
                    {
                        return ((ValuePattern)valPattern).Current.Value ?? "";
                    }
                }
            }
            catch { }

            return "";
        }

        private static string GetProcessNameFromHwnd(IntPtr hWnd)
        {
            if (hWnd == IntPtr.Zero) return "";
            try
            {
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                if (pid == 0) return "";
                using (Process p = Process.GetProcessById((int)pid))
                {
                    return p.ProcessName;
                }
            }
            catch
            {
                return "";
            }
        }

        private static string GetWindowTitle(IntPtr hWnd)
        {
            if (hWnd == IntPtr.Zero) return "";
            StringBuilder sb = new StringBuilder(512);
            GetWindowText(hWnd, sb, sb.Capacity);
            return sb.ToString();
        }

        private static bool IsTerminalProcess(string procName)
        {
            if (string.IsNullOrEmpty(procName)) return false;
            string lower = procName.ToLowerInvariant();
            return lower == "windowsterminal" ||
                   lower == "cmd" ||
                   lower == "powershell" ||
                   lower == "pwsh" ||
                   lower == "conhost" ||
                   lower == "mintty" ||
                   lower == "bash";
        }

        private static void EmitResponse(string id, string bodyJson)
        {
            if (string.IsNullOrEmpty(id))
            {
                EmitJson(bodyJson);
            }
            else
            {
                if (bodyJson.StartsWith("{") && bodyJson.EndsWith("}"))
                {
                    string inner = bodyJson.Substring(1, bodyJson.Length - 2);
                    EmitJson("{\"id\":\"" + EscapeJson(id) + "\"," + inner + "}");
                }
                else
                {
                    EmitJson("{\"id\":\"" + EscapeJson(id) + "\",\"data\":" + bodyJson + "}");
                }
            }
        }

        private static void EmitError(string code, string message, string id)
        {
            string json = string.Format("{{\"error\":\"{0}\",\"message\":\"{1}\"", EscapeJson(code), EscapeJson(message));
            if (!string.IsNullOrEmpty(id))
            {
                json += ",\"id\":\"" + EscapeJson(id) + "\"";
            }
            json += "}";
            EmitJson(json);
        }

        private static void EmitJson(string json)
        {
            lock (_stdoutLock)
            {
                Console.Out.WriteLine(json);
                Console.Out.Flush();
            }
        }

        private static string ExtractJsonField(string json, string fieldName)
        {
            string needle = "\"" + fieldName + "\"";
            int idx = json.IndexOf(needle, StringComparison.OrdinalIgnoreCase);
            if (idx < 0) return null;

            int colonIdx = json.IndexOf(':', idx + needle.Length);
            if (colonIdx < 0) return null;

            int start = colonIdx + 1;
            while (start < json.Length && char.IsWhiteSpace(json[start])) start++;
            if (start >= json.Length) return null;

            if (json[start] == '"')
            {
                // String value
                int end = start + 1;
                while (end < json.Length)
                {
                    if (json[end] == '\\') { end += 2; continue; }
                    if (json[end] == '"') break;
                    end++;
                }
                if (end < json.Length)
                {
                    return UnescapeJson(json.Substring(start + 1, end - start - 1));
                }
                return null;
            }
            else if (json[start] == '[')
            {
                // Array value
                int depth = 1;
                int end = start + 1;
                while (end < json.Length && depth > 0)
                {
                    if (json[end] == '[') depth++;
                    else if (json[end] == ']') depth--;
                    end++;
                }
                return json.Substring(start, end - start);
            }
            else
            {
                // Primitive value (number, bool, null)
                int end = start;
                while (end < json.Length && json[end] != ',' && json[end] != '}' && !char.IsWhiteSpace(json[end]))
                {
                    end++;
                }
                return json.Substring(start, end - start);
            }
        }

        private static string ExtractJsonStringValue(string json, string fieldName)
        {
            string needle = "\"" + fieldName + "\"";
            int idx = json.IndexOf(needle, StringComparison.OrdinalIgnoreCase);
            if (idx < 0) return null;

            int colonIdx = json.IndexOf(':', idx + needle.Length);
            if (colonIdx < 0) return null;

            int start = colonIdx + 1;
            while (start < json.Length && char.IsWhiteSpace(json[start])) start++;
            if (start >= json.Length || json[start] != '"') return null;

            int end = start + 1;
            while (end < json.Length)
            {
                if (json[end] == '\\') { end += 2; continue; }
                if (json[end] == '"') break;
                end++;
            }

            if (end < json.Length)
            {
                return UnescapeJson(json.Substring(start + 1, end - start - 1));
            }
            return null;
        }

        private static string EscapeJson(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            StringBuilder sb = new StringBuilder(s.Length + 8);
            for (int i = 0; i < s.Length; i++)
            {
                char c = s[i];
                switch (c)
                {
                    case '\\': sb.Append("\\\\"); break;
                    case '"': sb.Append("\\\""); break;
                    case '\b': sb.Append("\\b"); break;
                    case '\f': sb.Append("\\f"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (c < 32)
                        {
                            sb.AppendFormat("\\u{0:x4}", (int)c);
                        }
                        else
                        {
                            sb.Append(c);
                        }
                        break;
                }
            }
            return sb.ToString();
        }

        private static string UnescapeJson(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            StringBuilder sb = new StringBuilder(s.Length);
            for (int i = 0; i < s.Length; i++)
            {
                if (s[i] == '\\' && i + 1 < s.Length)
                {
                    i++;
                    char next = s[i];
                    switch (next)
                    {
                        case '\\': sb.Append('\\'); break;
                        case '"': sb.Append('"'); break;
                        case '/': sb.Append('/'); break;
                        case 'b': sb.Append('\b'); break;
                        case 'f': sb.Append('\f'); break;
                        case 'n': sb.Append('\n'); break;
                        case 'r': sb.Append('\r'); break;
                        case 't': sb.Append('\t'); break;
                        case 'u':
                            if (i + 4 < s.Length)
                            {
                                string hex = s.Substring(i + 1, 4);
                                int code;
                                if (int.TryParse(hex, System.Globalization.NumberStyles.HexNumber, null, out code))
                                {
                                    sb.Append((char)code);
                                    i += 4;
                                }
                            }
                            break;
                        default:
                            sb.Append(next);
                            break;
                    }
                }
                else
                {
                    sb.Append(s[i]);
                }
            }
            return sb.ToString();
        }
    }
}
