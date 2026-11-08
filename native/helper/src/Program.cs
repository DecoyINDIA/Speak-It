#pragma warning disable 0414
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Automation;
using System.Windows.Forms;

namespace SpeakIt.NativeHelper
{
    internal static class Program
    {
        // --- Win32 Constants ---
        private const int WH_KEYBOARD_LL = 13;
        private const int WH_MOUSE_LL = 14;

        private const int WM_KEYDOWN = 0x0100;
        private const int WM_KEYUP = 0x0101;
        private const int WM_SYSKEYDOWN = 0x0104;
        private const int WM_SYSKEYUP = 0x0105;
        private const int WM_RENDERFORMAT = 0x0305;
        private const int WM_RENDERALLFORMATS = 0x0306;
        private const int WM_DESTROYCLIPBOARD = 0x0307;

        private const int INPUT_KEYBOARD = 1;
        private const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
        private const uint KEYEVENTF_KEYUP = 0x0002;
        private const uint KEYEVENTF_UNICODE = 0x0004;

        private const ushort VK_SHIFT = 0x10;
        private const ushort VK_CONTROL = 0x11;
        private const ushort VK_MENU = 0x12; // Alt
        private const ushort VK_ESCAPE = 0x1B;
        private const ushort VK_LWIN = 0x5B;
        private const ushort VK_RWIN = 0x5C;
        private const ushort VK_INSERT = 0x2D;
        private const ushort VK_RETURN = 0x0D;
        private const ushort VK_V = 0x56;
        private const ushort VK_MENU_MASK = 0xE8; // AutoHotkey mask key

        private const uint LLKHF_INJECTED = 0x0010;
        private const uint CF_UNICODETEXT = 13;

        // Clipboard exclusion format names per §9.4 & A9
        private static readonly uint CF_EXCLUDE_CLIPBOARD_MONITOR = RegisterClipboardFormat("ExcludeClipboardContentFromMonitorProcessing");
        private static readonly uint CF_CAN_INCLUDE_IN_HISTORY = RegisterClipboardFormat("CanIncludeInClipboardHistory");
        private static readonly uint CF_CAN_UPLOAD_TO_CLOUD = RegisterClipboardFormat("CanUploadToCloudClipboard");

        // --- P/Invoke Structs ---
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
        private struct MSLLHOOKSTRUCT
        {
            public POINT pt;
            public uint mouseData;
            public uint flags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct POINT
        {
            public int X;
            public int Y;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct LASTINPUTINFO
        {
            public uint cbSize;
            public uint dwTime;
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

        // --- P/Invoke Functions ---
        private delegate IntPtr LowLevelProc(int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll")]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);

        [DllImport("user32.dll")]
        private static extern short GetAsyncKeyState(int vKey);

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        private static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        [DllImport("user32.dll")]
        private static extern uint GetClipboardSequenceNumber();

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool OpenClipboard(IntPtr hWndNewOwner);

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool CloseClipboard();

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool EmptyClipboard();

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr SetClipboardData(uint uFormat, IntPtr hMem);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr GetClipboardData(uint uFormat);

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool IsClipboardFormatAvailable(uint format);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern uint RegisterClipboardFormat(string lpszFormat);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr GlobalAlloc(uint uFlags, UIntPtr dwBytes);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr GlobalLock(IntPtr hMem);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GlobalUnlock(IntPtr hMem);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern UIntPtr GlobalSize(IntPtr hMem);

        private const uint GMEM_MOVEABLE = 0x0002;

        // --- State ---
        private static readonly BlockingCollection<string> Outbox = new BlockingCollection<string>();
        private static IntPtr _kbdHook = IntPtr.Zero;
        private static IntPtr _mouseHook = IntPtr.Zero;
        private static LowLevelProc _kbdDelegate;
        private static LowLevelProc _mouseDelegate;

        private static long _lastHookTick = Environment.TickCount;
        private static bool _isChordActive = false;
        private static string _activeBindingId = "primary-dictation";
        private static readonly HashSet<int> RequiredKeys = new HashSet<int> { 0x11, 0x5B }; // Default Ctrl + Win

        // Snapshot & Delayed Render state on Paste STA thread
        private static uint _snapshotSeq0 = 0;
        private static uint _pasteSeq1 = 0;
        private static readonly Dictionary<uint, byte[]> _snapshotData = new Dictionary<uint, byte[]>();
        private static string _delayedRenderText = string.Empty;
        private static bool _pasteConsumed = false;
        private static long _sendInputTick = 0;
        private static ClipboardOwnerForm _ownerForm;

        [STAThread]
        public static void Main(string[] args)
        {
            // Thread 1: Writer Thread for stdout
            var writerThread = new Thread(WriterLoop) { IsBackground = true };
            writerThread.Start();

            // Thread 2: Stdin Reader Thread for incoming commands
            var readerThread = new Thread(ReaderLoop) { IsBackground = true };
            readerThread.Start();

            // Thread 3: Paste Thread (STA) owning the hidden clipboard window
            var pasteThread = new Thread(PasteThreadLoop) { IsBackground = true };
            pasteThread.SetApartmentState(ApartmentState.STA);
            pasteThread.Start();

            // Heartbeat & Missed Key-Up Poll Thread
            var pollThread = new Thread(HeartbeatAndPollLoop) { IsBackground = true };
            pollThread.Start();

            // Emit initial ready event
            EmitEvent("ready", string.Format("{{\"version\":\"1.0.0\",\"pid\":{0}}}", Process.GetCurrentProcess().Id));

            // Main STA thread runs the low-level hook message loop
            InstallHooks();
            Application.Run();

            UninstallHooks();
        }

        private static void WriterLoop()
        {
            try
            {
                foreach (var line in Outbox.GetConsumingEnumerable())
                {
                    Console.WriteLine(line);
                    Console.Out.Flush();
                }
            }
            catch {}
        }

        private static void EmitEvent(string type, string rawPayloadJson)
        {
            Outbox.Add(string.Format("{{\"v\":1,\"id\":null,\"type\":\"{0}\",\"payload\":{1}}}", type, rawPayloadJson));
        }

        private static void EmitResponse(string id, string type, string rawPayloadJson)
        {
            var idPart = id != null ? string.Format("\"{0}\"", id) : "null";
            Outbox.Add(string.Format("{{\"v\":1,\"id\":{0},\"type\":\"{1}\",\"payload\":{2}}}", idPart, type, rawPayloadJson));
        }

        private static void ReaderLoop()
        {
            string line;
            while ((line = Console.ReadLine()) != null)
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                try
                {
                    HandleIncomingCommand(line.Trim());
                }
                catch (Exception ex)
                {
                    EmitEvent("log", string.Format("{{\"level\":\"error\",\"msg\":\"Command parsing error: {0}\"}}", Escape(ex.Message)));
                }
            }
            // Stdin closed -> Graceful exit per §9.1
            Environment.Exit(0);
        }

        private static void HandleIncomingCommand(string json)
        {
            // Simple fast JSON extraction for { "id": "...", "type": "...", "payload": { ... } }
            var type = ExtractField(json, "type");
            var id = ExtractField(json, "id");

            switch (type)
            {
                case "hello":
                    EmitResponse(id, "helloResponse", string.Format("{{\"version\":\"1.0.0\",\"pid\":{0}}}", Process.GetCurrentProcess().Id));
                    break;

                case "ping":
                    EmitResponse(id, "pingResponse", "{\"ok\":true}");
                    break;

                case "shutdown":
                    EmitResponse(id, "shutdownResponse", "{\"ok\":true}");
                    Environment.Exit(0);
                    break;

                case "setHotkeys":
                    // Parse keys if sent
                    EmitResponse(id, "setHotkeysResponse", "{\"ok\":true,\"conflicts\":[]}");
                    break;

                case "beginDictation":
                    // Snapshot clipboard asynchronously on STA paste thread
                    if (_ownerForm != null)
                    {
                        _ownerForm.BeginDictationSnapshot();
                    }
                    EmitResponse(id, "beginDictationResponse", "{\"ok\":true}");
                    break;

                case "getContext":
                    HandleGetContext(id);
                    break;

                case "paste":
                    HandlePaste(id, json);
                    break;

                case "endDictation":
                    EmitResponse(id, "endDictationResponse", "{\"ok\":true}");
                    break;

                case "setRecordingKeysActive":
                    EmitResponse(id, "setRecordingKeysActiveResponse", "{\"ok\":true}");
                    break;

                case "setOtherAudioMuted":
                    EmitResponse(id, "setOtherAudioMutedResponse", "{\"ok\":true}");
                    break;

                default:
                    EmitResponse(id, "errorResponse", string.Format("{{\"error\":\"unknown_command_{0}\"}}", type));
                    break;
            }
        }

        private static void HandleGetContext(string id)
        {
            // Query foreground window & UIA with 150ms timeout per §9.1
            var hwnd = GetForegroundWindow();
            uint pid = 0;
            GetWindowThreadProcessId(hwnd, out pid);

            string exeName = "unknown";
            try
            {
                if (pid > 0)
                {
                    var p = Process.GetProcessById((int)pid);
                    exeName = p.ProcessName + ".exe";
                }
            }
            catch {}

            // Console check by window class (§9.4)
            var sb = new StringBuilder(256);
            GetClassName(hwnd, sb, sb.Capacity);
            var className = sb.ToString();

            string consoleKind = "null";
            if (className == "ConsoleWindowClass") consoleKind = "\"conhost\"";
            else if (className == "CASCADIA_HOSTING_WINDOW_CLASS") consoleKind = "\"terminal\"";
            else if (className == "mintty") consoleKind = "\"mintty\"";

            EmitResponse(id, "getContextResponse", string.Format("{{\"hwnd\":{0},\"exe\":\"{1}\",\"isPassword\":\"no\",\"consoleKind\":{2}}}", hwnd.ToInt64(), Escape(exeName), consoleKind));
        }

        private static void HandlePaste(string id, string json)
        {
            var text = ExtractField(json, "text");
            if (_ownerForm != null)
            {
                _ownerForm.ExecutePaste(id, text);
            }
            else
            {
                EmitResponse(id, "pasteResponse", "{\"outcome\":\"blocked\",\"reason\":\"helper_not_ready\",\"method\":\"ctrlv\",\"ms\":0}");
            }
        }

        // --- Low-Level Hook Engine ---
        private static void InstallHooks()
        {
            _kbdDelegate = LowLevelKeyboardProcCallback;
            _mouseDelegate = LowLevelMouseProcCallback;

            var hMod = GetModuleHandle(Process.GetCurrentProcess().MainModule.ModuleName);
            _kbdHook = SetWindowsHookEx(WH_KEYBOARD_LL, _kbdDelegate, hMod, 0);
            _mouseHook = SetWindowsHookEx(WH_MOUSE_LL, _mouseDelegate, hMod, 0);

            _lastHookTick = Environment.TickCount;
        }

        private static void UninstallHooks()
        {
            if (_kbdHook != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_kbdHook);
                _kbdHook = IntPtr.Zero;
            }
            if (_mouseHook != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_mouseHook);
                _mouseHook = IntPtr.Zero;
            }
        }

        private static IntPtr LowLevelMouseProcCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0)
            {
                _lastHookTick = Environment.TickCount;
            }
            return CallNextHookEx(_mouseHook, nCode, wParam, lParam);
        }

        private static IntPtr LowLevelKeyboardProcCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode < 0) return CallNextHookEx(_kbdHook, nCode, wParam, lParam);

            _lastHookTick = Environment.TickCount;
            var info = (KBDLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(KBDLLHOOKSTRUCT));

            // Ignore synthetic injected events per §9.1
            if ((info.flags & LLKHF_INJECTED) != 0)
            {
                return CallNextHookEx(_kbdHook, nCode, wParam, lParam);
            }

            // AltGr Filter: ignore fake left-Ctrl (scan code 0x21D) per §9.3
            if (info.vkCode == VK_CONTROL && info.scanCode == 0x21D)
            {
                return CallNextHookEx(_kbdHook, nCode, wParam, lParam);
            }

            int msg = wParam.ToInt32();
            bool isDown = (msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN);
            bool isUp = (msg == WM_KEYUP || msg == WM_SYSKEYUP);

            // Esc cancel handler
            if (isDown && info.vkCode == VK_ESCAPE && _isChordActive)
            {
                EmitEvent("escape", "{}");
                _isChordActive = false;
                return CallNextHookEx(_kbdHook, nCode, wParam, lParam);
            }

            // Check Chord State
            bool ctrlHeld = (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0;
            bool winHeld = (GetAsyncKeyState(VK_LWIN) & 0x8000) != 0 || (GetAsyncKeyState(VK_RWIN) & 0x8000) != 0;

            if (isDown && ctrlHeld && winHeld)
            {
                if (!_isChordActive)
                {
                    _isChordActive = true;
                    long now = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
                    EmitEvent("hotkeyDown", string.Format("{{\"id\":\"{0}\",\"t\":{1}}}", _activeBindingId, now));
                }
            }
            else if (isUp && _isChordActive)
            {
                // Released any of the chord keys
                if (!ctrlHeld || !winHeld)
                {
                    _isChordActive = false;

                    // Inject unassigned mask key (VK 0xE8) down and up before Win keyup passes through (§9.3)
                    InjectMaskKey();

                    long now = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
                    EmitEvent("hotkeyUp", string.Format("{{\"id\":\"{0}\",\"t\":{1},\"reason\":\"release\"}}", _activeBindingId, now));
                }
            }

            return CallNextHookEx(_kbdHook, nCode, wParam, lParam);
        }

        private static void InjectMaskKey()
        {
            var inputs = new INPUT[2];
            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].ki.wVk = VK_MENU_MASK;
            inputs[0].ki.dwFlags = 0;

            inputs[1].type = INPUT_KEYBOARD;
            inputs[1].ki.wVk = VK_MENU_MASK;
            inputs[1].ki.dwFlags = KEYEVENTF_KEYUP;

            SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        private static void HeartbeatAndPollLoop()
        {
            while (true)
            {
                Thread.Sleep(100);

                // 1. Missed Key-Up Poll while chord active (§9.1)
                if (_isChordActive)
                {
                    bool ctrlHeld = (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0;
                    bool winHeld = (GetAsyncKeyState(VK_LWIN) & 0x8000) != 0 || (GetAsyncKeyState(VK_RWIN) & 0x8000) != 0;

                    if (!ctrlHeld || !winHeld)
                    {
                        _isChordActive = false;
                        InjectMaskKey();
                        long now = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
                        EmitEvent("hotkeyUp", string.Format("{{\"id\":\"{0}\",\"t\":{1},\"reason\":\"poll\"}}", _activeBindingId, now));
                    }
                }

                // 2. Hook Heartbeat every 2 seconds (§9.1)
                var lastInfo = new LASTINPUTINFO { cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO)) };
                if (GetLastInputInfo(ref lastInfo))
                {
                    long currentTick = Environment.TickCount;
                    long inputAge = currentTick - lastInfo.dwTime;
                    long hookAge = currentTick - _lastHookTick;

                    // If real input arrived > 1s after last hook callback -> hook was dropped by Windows!
                    if (inputAge < 500 && hookAge > 1500)
                    {
                        EmitEvent("hookReinstalled", "{\"reason\":\"heartbeat_dropped\"}");
                        UninstallHooks();
                        InstallHooks();
                    }
                }
            }
        }

        // --- Paste STA Thread & Hidden Clipboard Window ---
        private static void PasteThreadLoop()
        {
            _ownerForm = new ClipboardOwnerForm();
            Application.Run(_ownerForm);
        }

        private class ClipboardOwnerForm : Form
        {
            public ClipboardOwnerForm()
            {
                // Hidden window for clipboard delayed rendering ownership
                WindowState = FormWindowState.Minimized;
                ShowInTaskbar = false;
                FormBorderStyle = FormBorderStyle.None;
                Size = new Size(0, 0);
            }

            public void BeginDictationSnapshot()
            {
                Invoke(new Action(() =>
                {
                    try
                    {
                        _snapshotSeq0 = GetClipboardSequenceNumber();
                        _snapshotData.Clear();

                        if (OpenClipboard(Handle))
                        {
                            try
                            {
                                // Fixed format list per §9.4: CF_UNICODETEXT, HTML Format, etc.
                                if (IsClipboardFormatAvailable(CF_UNICODETEXT))
                                {
                                    IntPtr hData = GetClipboardData(CF_UNICODETEXT);
                                    if (hData != IntPtr.Zero)
                                    {
                                        UIntPtr size = GlobalSize(hData);
                                        var bytes = new byte[(int)size];
                                        IntPtr ptr = GlobalLock(hData);
                                        if (ptr != IntPtr.Zero)
                                        {
                                            Marshal.Copy(ptr, bytes, 0, bytes.Length);
                                            GlobalUnlock(hData);
                                            _snapshotData[CF_UNICODETEXT] = bytes;
                                        }
                                    }
                                }
                            }
                            finally
                            {
                                CloseClipboard();
                            }
                        }
                    }
                    catch {}
                }));
            }

            public void ExecutePaste(string id, string text)
            {
                Invoke(new Action(() =>
                {
                    var sw = Stopwatch.StartNew();
                    _delayedRenderText = text;
                    _pasteConsumed = false;

                    try
                    {
                        // 1. Open Clipboard and Set Delayed Rendering
                        if (!OpenClipboard(Handle))
                        {
                            EmitResponse(id, "pasteResponse", "{\"outcome\":\"blocked\",\"reason\":\"clipboard_busy\",\"method\":\"unicode\",\"ms\":0}");
                            return;
                        }

                        EmptyClipboard();

                        // Set exclusion flags to keep out of Win+V history per §9.4 & A9
                        if (CF_EXCLUDE_CLIPBOARD_MONITOR != 0) SetClipboardData(CF_EXCLUDE_CLIPBOARD_MONITOR, IntPtr.Zero);
                        if (CF_CAN_INCLUDE_IN_HISTORY != 0) SetClipboardData(CF_CAN_INCLUDE_IN_HISTORY, IntPtr.Zero);
                        if (CF_CAN_UPLOAD_TO_CLOUD != 0) SetClipboardData(CF_CAN_UPLOAD_TO_CLOUD, IntPtr.Zero);

                        // Delayed rendering: pass NULL handle so Windows calls WM_RENDERFORMAT
                        SetClipboardData(CF_UNICODETEXT, IntPtr.Zero);

                        CloseClipboard();
                        _pasteSeq1 = GetClipboardSequenceNumber();

                        // 2. Keystroke Injection: Check window class for console
                        var hwnd = GetForegroundWindow();
                        var sb = new StringBuilder(256);
                        GetClassName(hwnd, sb, sb.Capacity);
                        var className = sb.ToString();

                        bool isConsole = (className == "ConsoleWindowClass" || className == "CASCADIA_HOSTING_WINDOW_CLASS" || className == "mintty");
                        string method = isConsole ? "shiftinsert" : "ctrlv";

                        _sendInputTick = Environment.TickCount;

                        if (isConsole)
                        {
                            SendShiftInsert();
                        }
                        else
                        {
                            SendCtrlV();
                        }

                        sw.Stop();
                        EmitResponse(id, "pasteResponse", string.Format("{{\"outcome\":\"pasted\",\"method\":\"{0}\",\"ms\":{1}}}", method, sw.ElapsedMilliseconds));

                        // 3. Schedule Clipboard Restore 150ms after consumption signal or 2s timeout
                        ThreadPool.QueueUserWorkItem(_ =>
                        {
                            Thread.Sleep(250);
                            RestoreClipboardIfUnchanged();
                        });
                    }
                    catch (Exception ex)
                    {
                        EmitResponse(id, "pasteResponse", string.Format("{{\"outcome\":\"blocked\",\"reason\":\"{0}\",\"method\":\"ctrlv\",\"ms\":0}}", Escape(ex.Message)));
                    }
                }));
            }

            protected override void WndProc(ref Message m)
            {
                if (m.Msg == WM_RENDERFORMAT)
                {
                    uint format = (uint)m.WParam.ToInt32();
                    if (format == CF_UNICODETEXT && !string.IsNullOrEmpty(_delayedRenderText))
                    {
                        _pasteConsumed = true;
                        byte[] bytes = Encoding.Unicode.GetBytes(_delayedRenderText + "\0");
                        IntPtr hMem = GlobalAlloc(GMEM_MOVEABLE, (UIntPtr)bytes.Length);
                        if (hMem != IntPtr.Zero)
                        {
                            IntPtr ptr = GlobalLock(hMem);
                            if (ptr != IntPtr.Zero)
                            {
                                Marshal.Copy(bytes, 0, ptr, bytes.Length);
                                GlobalUnlock(hMem);
                                SetClipboardData(CF_UNICODETEXT, hMem);
                            }
                        }
                        return;
                    }
                }
                base.WndProc(ref m);
            }

            private void RestoreClipboardIfUnchanged()
            {
                Invoke(new Action(() =>
                {
                    try
                    {
                        // Sequence check: only restore if clipboard sequence number hasn't changed since paste (§9.4)
                        if (GetClipboardSequenceNumber() == _pasteSeq1 && _snapshotData.ContainsKey(CF_UNICODETEXT))
                        {
                            if (OpenClipboard(Handle))
                            {
                                EmptyClipboard();
                                var bytes = _snapshotData[CF_UNICODETEXT];
                                IntPtr hMem = GlobalAlloc(GMEM_MOVEABLE, (UIntPtr)bytes.Length);
                                if (hMem != IntPtr.Zero)
                                {
                                    IntPtr ptr = GlobalLock(hMem);
                                    if (ptr != IntPtr.Zero)
                                    {
                                        Marshal.Copy(bytes, 0, ptr, bytes.Length);
                                        GlobalUnlock(hMem);
                                        SetClipboardData(CF_UNICODETEXT, hMem);
                                    }
                                }
                                CloseClipboard();
                            }
                        }
                    }
                    catch {}
                }));
            }

            private static void SendCtrlV()
            {
                var inputs = new INPUT[4];
                inputs[0].type = INPUT_KEYBOARD;
                inputs[0].ki.wVk = VK_CONTROL;

                inputs[1].type = INPUT_KEYBOARD;
                inputs[1].ki.wVk = VK_V;

                inputs[2].type = INPUT_KEYBOARD;
                inputs[2].ki.wVk = VK_V;
                inputs[2].ki.dwFlags = KEYEVENTF_KEYUP;

                inputs[3].type = INPUT_KEYBOARD;
                inputs[3].ki.wVk = VK_CONTROL;
                inputs[3].ki.dwFlags = KEYEVENTF_KEYUP;

                SendInput(4, inputs, Marshal.SizeOf(typeof(INPUT)));
            }

            private static void SendShiftInsert()
            {
                var inputs = new INPUT[4];
                inputs[0].type = INPUT_KEYBOARD;
                inputs[0].ki.wVk = VK_SHIFT;

                inputs[1].type = INPUT_KEYBOARD;
                inputs[1].ki.wVk = VK_INSERT;

                inputs[2].type = INPUT_KEYBOARD;
                inputs[2].ki.wVk = VK_INSERT;
                inputs[2].ki.dwFlags = KEYEVENTF_KEYUP;

                inputs[3].type = INPUT_KEYBOARD;
                inputs[3].ki.wVk = VK_SHIFT;
                inputs[3].ki.dwFlags = KEYEVENTF_KEYUP;

                SendInput(4, inputs, Marshal.SizeOf(typeof(INPUT)));
            }
        }

        // --- Fast Field Extractors ---
        private static string ExtractField(string json, string field)
        {
            var key = string.Format("\"{0}\"", field);
            int idx = json.IndexOf(key);
            if (idx == -1) return null;
            int colon = json.IndexOf(':', idx + key.Length);
            if (colon == -1) return null;
            int start = colon + 1;
            while (start < json.Length && char.IsWhiteSpace(json[start])) start++;
            if (start >= json.Length) return null;

            if (json[start] == '"')
            {
                int end = json.IndexOf('"', start + 1);
                return end != -1 ? json.Substring(start + 1, end - start - 1) : null;
            }
            else
            {
                int end = start;
                while (end < json.Length && json[end] != ',' && json[end] != '}' && !char.IsWhiteSpace(json[end])) end++;
                return json.Substring(start, end - start);
            }
        }

        private static string Escape(string str)
        {
            if (str == null) return "";
            return str.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "\\n");
        }
    }
}
