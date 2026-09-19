import { contextBridge, ipcRenderer } from 'electron';
import type {
  BrowserState,
  BrowserSettings,
  IpcRendererApi,
  SwitcherDirection,
  BookmarkItem,
  HistoryItem,
  FindResult,
  DownloadItemInfo,
} from '../shared/types';

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

  onToggleModal: (callback: (modal: 'settings' | 'shortcuts' | 'history' | 'passwords' | 'downloads') => void) => {
    const listener = (_event: Electron.IpcRendererEvent, modal: 'settings' | 'shortcuts' | 'history' | 'passwords' | 'downloads') => {
      callback(modal);
    };
    ipcRenderer.on('browser:toggle-modal', listener);
    return () => {
      ipcRenderer.removeListener('browser:toggle-modal', listener);
    };
  },

  onFocusOmnibar: (callback: () => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on('browser:focus-omnibar', listener);
    return () => {
      ipcRenderer.removeListener('browser:focus-omnibar', listener);
    };
  },

  onToggleFind: (callback: () => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on('browser:toggle-find', listener);
    return () => {
      ipcRenderer.removeListener('browser:toggle-find', listener);
    };
  },

  onToggleFavorites: (callback: () => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on('browser:toggle-favorites', listener);
    return () => {
      ipcRenderer.removeListener('browser:toggle-favorites', listener);
    };
  },

  onFindResult: (callback: (result: FindResult) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, result: FindResult) => {
      callback(result);
    };
    ipcRenderer.on('browser:found-in-page', listener);
    return () => {
      ipcRenderer.removeListener('browser:found-in-page', listener);
    };
  },

  getState: () => ipcRenderer.invoke('browser:get-state'),

  createTab: (url?: string, isPrivate?: boolean) => ipcRenderer.invoke('browser:create-tab', url, isPrivate),
  closeTab: (tabId: string) => ipcRenderer.invoke('browser:close-tab', tabId),
  switchTab: (tabId: string) => ipcRenderer.invoke('browser:switch-tab', tabId),
  navigateTab: (tabId: string, url: string) => ipcRenderer.invoke('browser:navigate-tab', tabId, url),
  goBack: (tabId: string) => ipcRenderer.invoke('browser:go-back', tabId),
  goForward: (tabId: string) => ipcRenderer.invoke('browser:go-forward', tabId),
  reloadTab: (tabId: string) => ipcRenderer.invoke('browser:reload-tab', tabId),
  toggleMuteTab: (tabId: string) => ipcRenderer.invoke('browser:toggle-mute-tab', tabId),

  // Zoom
  setZoomFactor: (tabId: string, factor: number) =>
    ipcRenderer.invoke('browser:set-zoom', tabId, factor),

  // Find in Page
  findInPage: (text: string, forward?: boolean, findNext?: boolean) =>
    ipcRenderer.invoke('browser:find-in-page', text, forward, findNext),
  stopFindInPage: (action?: 'clearSelection' | 'keepSelection' | 'activateSelection') =>
    ipcRenderer.invoke('browser:stop-find-in-page', action),
  setFindOpen: (isOpen: boolean) =>
    ipcRenderer.invoke('browser:set-find-open', isOpen),

  // Bookmarks
  getBookmarks: () => ipcRenderer.invoke('browser:get-bookmarks'),
  addBookmark: (bookmark: { title: string; url: string; favicon?: string }) =>
    ipcRenderer.invoke('browser:add-bookmark', bookmark),
  removeBookmark: (idOrUrl: string) => ipcRenderer.invoke('browser:remove-bookmark', idOrUrl),
  toggleBookmark: (bookmark: { title: string; url: string; favicon?: string }) =>
    ipcRenderer.invoke('browser:toggle-bookmark', bookmark),

  // History & Browsing Data
  getHistory: () => ipcRenderer.invoke('browser:get-history'),
  clearHistory: () => ipcRenderer.invoke('browser:clear-history'),
  deleteHistoryItem: (id: string) => ipcRenderer.invoke('browser:delete-history-item', id),
  clearBrowsingData: () => ipcRenderer.invoke('browser:clear-browsing-data'),
  clearBrowsingDataAdvanced: (options: any) =>
    ipcRenderer.invoke('browser:clear-browsing-data-advanced', options),

  // Passwords Vault
  getPasswords: () => ipcRenderer.invoke('browser:get-passwords'),
  savePassword: (entry: any) => ipcRenderer.invoke('browser:save-password', entry),
  updatePassword: (entry: any) => ipcRenderer.invoke('browser:update-password', entry),
  deletePassword: (id: string) => ipcRenderer.invoke('browser:delete-password', id),
  exportPasswords: () => ipcRenderer.invoke('browser:export-passwords'),
  importPasswords: () => ipcRenderer.invoke('browser:import-passwords'),

  // Downloads
  getDownloads: () => ipcRenderer.invoke('browser:get-downloads'),
  pauseDownload: (id: string) => ipcRenderer.invoke('browser:pause-download', id),
  resumeDownload: (id: string) => ipcRenderer.invoke('browser:resume-download', id),
  cancelDownload: (id: string) => ipcRenderer.invoke('browser:cancel-download', id),
  openDownloadFile: (id: string) => ipcRenderer.invoke('browser:open-download-file', id),
  showDownloadInFolder: (id: string) => ipcRenderer.invoke('browser:show-download-in-folder', id),
  clearDownloads: () => ipcRenderer.invoke('browser:clear-downloads'),
  deleteDownloadItem: (id: string) => ipcRenderer.invoke('browser:delete-download-item', id),
  selectDownloadDirectory: () => ipcRenderer.invoke('browser:select-download-directory'),
  onDownloadStarted: (callback: (item: DownloadItemInfo) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, item: DownloadItemInfo) => {
      callback(item);
    };
    ipcRenderer.on('browser:download-started', listener);
    return () => {
      ipcRenderer.removeListener('browser:download-started', listener);
    };
  },
  onDownloadProgress: (callback: (item: DownloadItemInfo) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, item: DownloadItemInfo) => {
      callback(item);
    };
    ipcRenderer.on('browser:download-progress', listener);
    return () => {
      ipcRenderer.removeListener('browser:download-progress', listener);
    };
  },
  onDownloadDone: (callback: (item: DownloadItemInfo) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, item: DownloadItemInfo) => {
      callback(item);
    };
    ipcRenderer.on('browser:download-done', listener);
    return () => {
      ipcRenderer.removeListener('browser:download-done', listener);
    };
  },

  setTheme: (theme: 'dark' | 'light') => ipcRenderer.invoke('browser:set-theme', theme),
  getSettings: () => ipcRenderer.invoke('browser:get-settings'),
  updateSettings: (settings: Partial<BrowserSettings>) => ipcRenderer.invoke('browser:update-settings', settings),
  getWeather: () => ipcRenderer.invoke('browser:get-weather'),

  openSwitcher: () => ipcRenderer.invoke('browser:open-switcher'),
  closeSwitcher: () => ipcRenderer.invoke('browser:close-switcher'),
  cycleSwitcher: (direction: SwitcherDirection) => ipcRenderer.invoke('browser:cycle-switcher', direction),
  selectSwitcherIndex: (index: number) => ipcRenderer.invoke('browser:select-switcher-index', index),
  commitSwitcher: (onlyIfModifier?: boolean) => ipcRenderer.invoke('browser:commit-switcher', onlyIfModifier),
  setModalOpen: (isOpen: boolean) => ipcRenderer.invoke('browser:set-modal-open', isOpen),

  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
};

contextBridge.exposeInMainWorld('browserApi', api);
