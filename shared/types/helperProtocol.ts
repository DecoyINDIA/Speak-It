/**
 * Helper Protocol v1 Types
 * Matches native helper C# DataContracts per PLAN.md ADR-15 and §9.2.
 */

export type ProtocolVersion = 1;

export type PasteOutcome = 'pasted' | 'pasted_unverified' | 'copied_only' | 'blocked';

export type PasteReason =
  | 'focus_changed'
  | 'elevated'
  | 'password_field'
  | 'keys_held'
  | 'rdp_target'
  | 'clipboard_busy'
  | 'not_consumed';

export type PasteMethod = 'auto' | 'ctrlv' | 'shiftinsert' | 'unicode';

export type ConsoleKind = 'conhost' | 'terminal' | 'mintty' | null;

export type PasswordStatus = 'yes' | 'no' | 'unknown';

export interface HotkeyBinding {
  id: string;
  keys: string[];
  mode: 'ptt' | 'toggle';
}

export type HelperCommandType =
  | 'hello'
  | 'setHotkeys'
  | 'beginDictation'
  | 'getContext'
  | 'paste'
  | 'endDictation'
  | 'setRecordingKeysActive'
  | 'setOtherAudioMuted'
  | 'ping'
  | 'shutdown'
  | 'test.simulateHotkey';

export interface HelperMessageEnvelope<T = unknown> {
  v: ProtocolVersion;
  id: string | null;
  type: string;
  payload: T;
}

// Request Payloads
export interface HelloPayload {}
export interface SetHotkeysPayload {
  bindings: HotkeyBinding[];
}
export interface BeginDictationPayload {
  expectHwnd?: number;
}
export interface GetContextPayload {
  wantPreText: boolean;
  maxChars?: number;
}
export interface PastePayload {
  text: string;
  expectHwnd?: number;
  method?: PasteMethod;
  pressEnter?: boolean;
}
export interface EndDictationPayload {}
export interface SetRecordingKeysActivePayload {
  active: boolean;
}
export interface SetOtherAudioMutedPayload {
  muted: boolean;
}
export interface PingPayload {}
export interface ShutdownPayload {}

// Response Payloads
export interface HelloResponse {
  version: string;
  pid: number;
}
export interface SetHotkeysResponse {
  ok: boolean;
  conflicts: string[];
}
export interface BeginDictationResponse {
  ok: boolean;
}
export interface ContextResponse {
  hwnd: number;
  exe: string;
  urlHost?: string;
  preText?: string;
  isPassword: PasswordStatus;
  consoleKind?: ConsoleKind;
}
export interface PasteResponse {
  outcome: PasteOutcome;
  reason?: PasteReason;
  method: string;
  ms: number;
}
export interface SimpleOkResponse {
  ok: boolean;
}

// Helper Events (helper -> main)
export type HelperEventType =
  | 'ready'
  | 'hotkeyDown'
  | 'hotkeyUp'
  | 'hotkeyAborted'
  | 'escape'
  | 'hookReinstalled'
  | 'log';

export interface ReadyEventPayload {
  version: string;
  pid: number;
}
export interface HotkeyDownPayload {
  id: string;
  t: number;
}
export interface HotkeyUpPayload {
  id: string;
  t: number;
  reason?: string;
}
export interface HotkeyAbortedPayload {
  id: string;
}
export interface EscapePayload {}
export interface HookReinstalledPayload {
  reason?: string;
}
export interface LogPayload {
  level: 'debug' | 'info' | 'warn' | 'error';
  msg: string;
}
