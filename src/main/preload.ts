import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  getAppInfo: () => Promise<{ version: string; platform: string }>;
  getBackendUrl: () => Promise<string>;
}

const electronAPI: ElectronAPI = {
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
};

contextBridge.exposeInMainWorld('electron', electronAPI);

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
