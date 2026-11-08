import { contextBridge, ipcRenderer } from 'electron';

export const audioApi = {
  onStartCapture: (callback: (config: { deviceId?: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, config: { deviceId?: string }) => callback(config);
    ipcRenderer.on('audio:start-capture', handler);
    return () => ipcRenderer.removeListener('audio:start-capture', handler);
  },
  onStopCapture: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('audio:stop-capture', handler);
    return () => ipcRenderer.removeListener('audio:stop-capture', handler);
  },
  sendAudioChunk: (data: { pcmRms: number }) => {
    ipcRenderer.send('audio:pcm-chunk', data);
  },
  sendFinalRecording: (data: { webmBase64: string; pcmBase64: string; durationMs: number; speechRmsMs: number }) => {
    ipcRenderer.send('audio:final-recording', data);
  },
  sendAudioError: (error: string) => {
    ipcRenderer.send('audio:error', error);
  },
};

contextBridge.exposeInMainWorld('audioApi', audioApi);
