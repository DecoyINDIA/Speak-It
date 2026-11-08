import { contextBridge, ipcRenderer } from 'electron';

export interface BarStatePayload {
  status: 'idle' | 'listening' | 'locked' | 'processing' | 'done' | 'copied_only' | 'blocked' | 'error';
  text?: string;
  reason?: string;
  levels?: number[];
}

export const barApi = {
  onStateChange: (callback: (state: BarStatePayload) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: BarStatePayload) => callback(state);
    ipcRenderer.on('bar:state-change', handler);
    return () => ipcRenderer.removeListener('bar:state-change', handler);
  },
  onVolumeLevels: (callback: (levels: number[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, levels: number[]) => callback(levels);
    ipcRenderer.on('bar:volume-levels', handler);
    return () => ipcRenderer.removeListener('bar:volume-levels', handler);
  },
  cancel: () => ipcRenderer.send('bar:cancel'),
  stop: () => ipcRenderer.send('bar:stop'),
  retry: () => ipcRenderer.send('bar:retry'),
  setIgnoreMouse: (ignore: boolean) => ipcRenderer.send('bar:set-ignore-mouse', ignore),
};

contextBridge.exposeInMainWorld('barApi', barApi);
