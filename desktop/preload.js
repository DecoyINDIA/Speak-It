const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  setRecordingState: (recording) => ipcRenderer.send('set-recording-state', recording),
  hideIndicator: () => ipcRenderer.send('hide-indicator'),
  showIndicatorState: (state) => ipcRenderer.send('show-indicator-state', state),
  executePaste: (text) => ipcRenderer.send('execute-paste', text),
  updateHotkey: (newHotkey) => ipcRenderer.send('update-hotkey', newHotkey),
  
  // Event listeners
  onRecordingHotkey: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('recording-hotkey-pressed', subscription);
    return () => ipcRenderer.removeListener('recording-hotkey-pressed', subscription);
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
    const subscription = (event, state) => callback(state);
    ipcRenderer.on('update-state', subscription);
    return () => ipcRenderer.removeListener('update-state', subscription);
  }
});
