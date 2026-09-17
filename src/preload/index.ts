import { contextBridge, ipcRenderer } from 'electron';
import type { BrowserState, BrowserSettings, IpcRendererApi, SwitcherDirection } from '../shared/types';

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

  setTheme: (theme: 'dark' | 'light') => ipcRenderer.invoke('browser:set-theme', theme),
  getSettings: () => ipcRenderer.invoke('browser:get-settings'),
  updateSettings: (settings: Partial<BrowserSettings>) => ipcRenderer.invoke('browser:update-settings', settings),

  openSwitcher: () => ipcRenderer.invoke('browser:open-switcher'),
  closeSwitcher: () => ipcRenderer.invoke('browser:close-switcher'),
  cycleSwitcher: (direction: SwitcherDirection) => ipcRenderer.invoke('browser:cycle-switcher', direction),
  selectSwitcherIndex: (index: number) => ipcRenderer.invoke('browser:select-switcher-index', index),
  commitSwitcher: () => ipcRenderer.invoke('browser:commit-switcher'),
  setModalOpen: (isOpen: boolean) => ipcRenderer.invoke('browser:set-modal-open', isOpen),

  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
};

contextBridge.exposeInMainWorld('browserApi', api);
