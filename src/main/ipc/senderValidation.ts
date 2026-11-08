import { IpcMainInvokeEvent, IpcMainEvent } from 'electron';

export function validateSender(event: IpcMainInvokeEvent | IpcMainEvent, allowedWindowType: 'hub' | 'bar' | 'audio' | 'any'): boolean {
  const senderFrame = event.senderFrame;
  if (!senderFrame) {
    return false;
  }

  const url = senderFrame.url;
  if (!url) {
    return false;
  }

  // In production: file:///.../out/renderer/<windowType>/index.html
  // In dev: http://localhost:5173/<windowType>/index.html or similar
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') {
      if (allowedWindowType === 'any') return true;
      return url.toLowerCase().includes(allowedWindowType);
    }
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      if (allowedWindowType === 'any') return true;
      return url.toLowerCase().includes(allowedWindowType);
    }
  } catch {
    return false;
  }

  return false;
}
