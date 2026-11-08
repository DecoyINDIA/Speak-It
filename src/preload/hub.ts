import { contextBridge, ipcRenderer } from 'electron';

export const hubApi = {
  // Settings & Secrets
  getSettings: () => ipcRenderer.invoke('hub:get-settings'),
  updateSettings: (partial: unknown) => ipcRenderer.invoke('hub:update-settings', partial),
  getSecretsStatus: () => ipcRenderer.invoke('hub:get-secrets-status'),
  setSecret: (provider: string, secret: string) => ipcRenderer.invoke('hub:set-secret', provider, secret),
  deleteSecret: (provider: string) => ipcRenderer.invoke('hub:delete-secret', provider),

  // History & Stats
  getDictations: (limit: number, offset: number, query?: string) =>
    ipcRenderer.invoke('hub:get-dictations', limit, offset, query),
  deleteDictation: (uid: string) => ipcRenderer.invoke('hub:delete-dictation', uid),
  getStats: () => ipcRenderer.invoke('hub:get-stats'),

  // Dictionary
  getDictionary: () => ipcRenderer.invoke('hub:get-dictionary'),
  addDictionaryTerm: (term: string, soundsLike?: string) =>
    ipcRenderer.invoke('hub:add-dictionary-term', term, soundsLike),
  deleteDictionaryTerm: (id: number) => ipcRenderer.invoke('hub:delete-dictionary-term', id),

  // Snippets
  getSnippets: () => ipcRenderer.invoke('hub:get-snippets'),
  addSnippet: (trigger: string, expansion: string) =>
    ipcRenderer.invoke('hub:add-snippet', trigger, expansion),
  deleteSnippet: (id: number) => ipcRenderer.invoke('hub:delete-snippet', id),

  // Styles
  getStyles: () => ipcRenderer.invoke('hub:get-styles'),
  updateStyle: (category: string, tone: string, customInstructions?: string) =>
    ipcRenderer.invoke('hub:update-style', category, tone, customInstructions),

  // App & Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Listeners
  onDictationUpdated: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, val: unknown) => callback(val);
    ipcRenderer.on('hub:dictation-updated', handler);
    return () => ipcRenderer.removeListener('hub:dictation-updated', handler);
  },
};

contextBridge.exposeInMainWorld('speakit', hubApi);
