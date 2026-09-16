import { contextBridge, ipcRenderer } from 'electron';
import type { BrowserState, IpcRendererApi, SwitcherDirection } from '../shared/types';

const api: IpcRendererApi = {
  onStateUpdate: (callback: (state: BrowserState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: BrowserState) => {
      callback(state);
    };
    ipcRenderer.on('browser:state-update', listener);
    return () => {
      ipcRenderer.removeListener('browser:state-update', listener);
    };
  },

  getState: () => ipcRenderer.invoke('browser:get-state'),

  createTab: (url?: string) => ipcRenderer.invoke('browser:create-tab', url),
  closeTab: (tabId: string) => ipcRenderer.invoke('browser:close-tab', tabId),
  switchTab: (tabId: string) => ipcRenderer.invoke('browser:switch-tab', tabId),
  navigateTab: (tabId: string, url: string) => ipcRenderer.invoke('browser:navigate-tab', tabId, url),
  goBack: (tabId: string) => ipcRenderer.invoke('browser:go-back', tabId),
  goForward: (tabId: string) => ipcRenderer.invoke('browser:go-forward', tabId),
  reloadTab: (tabId: string) => ipcRenderer.invoke('browser:reload-tab', tabId),
  toggleMuteTab: (tabId: string) => ipcRenderer.invoke('browser:toggle-mute-tab', tabId),

  openSwitcher: () => ipcRenderer.invoke('browser:open-switcher'),
  closeSwitcher: () => ipcRenderer.invoke('browser:close-switcher'),
  cycleSwitcher: (direction: SwitcherDirection) => ipcRenderer.invoke('browser:cycle-switcher', direction),
  selectSwitcherIndex: (index: number) => ipcRenderer.invoke('browser:select-switcher-index', index),
  commitSwitcher: () => ipcRenderer.invoke('browser:commit-switcher'),

  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
};

contextBridge.exposeInMainWorld('browserApi', api);
