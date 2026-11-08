const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getApiUrl: () => ipcRenderer.invoke('get-api-url'),
  setRecordingState: (recording) => ipcRenderer.send('set-recording-state', recording),
  hideIndicator: () => ipcRenderer.send('hide-indicator'),
  showIndicatorState: (state) => ipcRenderer.send('show-indicator-state', state),
  executePaste: (text, mode) => ipcRenderer.send('execute-paste', text, mode),
  updateHotkey: (newHotkey) => ipcRenderer.send('update-hotkey', newHotkey),
  setHotkeyMode: (mode) => ipcRenderer.send('set-hotkey-mode', mode),

  // Native helper direct actions
  getContext: () => ipcRenderer.invoke('get-context'),
  copySelection: () => ipcRenderer.invoke('copy-selection'),
  positionIndicatorAtCaret: () => ipcRenderer.invoke('position-indicator-at-caret'),

  // Event listeners
  onRecordingHotkey: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('recording-hotkey-pressed', subscription);
    return () => ipcRenderer.removeListener('recording-hotkey-pressed', subscription);
  },
  onStartRecording: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('start-recording', subscription);
    return () => ipcRenderer.removeListener('start-recording', subscription);
  },
  onStopRecording: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('stop-recording', subscription);
    return () => ipcRenderer.removeListener('stop-recording', subscription);
  },
  onHotkeyError: (callback) => {
    const subscription = (event, hotkey) => callback(hotkey);
    ipcRenderer.on('hotkey-registration-error', subscription);
    return () => ipcRenderer.removeListener('hotkey-registration-error', subscription);
  },
  onNavigateTo: (callback) => {
    const subscription = (event, page) => callback(page);
    ipcRenderer.on('navigate-to', subscription);
    return () => ipcRenderer.removeListener('navigate-to', subscription);
  },
  onNotification: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('notification', subscription);
    return () => ipcRenderer.removeListener('notification', subscription);
  },
  onUpdateState: (callback) => {
    const subscription = (event, state, meta) => callback(state, meta);
    ipcRenderer.on('update-state', subscription);
    return () => ipcRenderer.removeListener('update-state', subscription);
  },
  onAudioLevel: (callback) => {
    const subscription = (event, level) => callback(level);
    ipcRenderer.on('audio-level', subscription);
    return () => ipcRenderer.removeListener('audio-level', subscription);
  }
});
