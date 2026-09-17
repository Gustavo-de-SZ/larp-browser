import { ipcMain, BrowserWindow } from 'electron';
import { TabManager } from './tab-manager';
import type { BrowserSettings, SwitcherDirection } from '../shared/types';

export function registerIpcHandlers(window: BrowserWindow, tabManager: TabManager) {
  ipcMain.handle('browser:get-state', () => {
    return tabManager.getState();
  });

  ipcMain.handle('browser:create-tab', (_event, url?: string) => {
    return tabManager.createTab(url);
  });

  ipcMain.handle('browser:close-tab', (_event, tabId: string) => {
    return tabManager.closeTab(tabId);
  });

  ipcMain.handle('browser:switch-tab', (_event, tabId: string) => {
    return tabManager.switchTab(tabId);
  });

  ipcMain.handle('browser:navigate-tab', (_event, tabId: string, url: string) => {
    return tabManager.navigateTab(tabId, url);
  });

  ipcMain.handle('browser:go-back', (_event, tabId: string) => {
    tabManager.goBack(tabId);
  });

  ipcMain.handle('browser:go-forward', (_event, tabId: string) => {
    tabManager.goForward(tabId);
  });

  ipcMain.handle('browser:reload-tab', (_event, tabId: string) => {
    tabManager.reloadTab(tabId);
  });

  ipcMain.handle('browser:toggle-mute-tab', (_event, tabId: string) => {
    tabManager.toggleMuteTab(tabId);
  });

  // Bookmarks handlers
  ipcMain.handle('browser:get-bookmarks', () => {
    return tabManager.getBookmarks();
  });

  ipcMain.handle('browser:add-bookmark', (_event, bookmark: { title: string; url: string; favicon?: string }) => {
    return tabManager.addBookmark(bookmark);
  });

  ipcMain.handle('browser:remove-bookmark', (_event, idOrUrl: string) => {
    tabManager.removeBookmark(idOrUrl);
  });

  ipcMain.handle('browser:toggle-bookmark', (_event, bookmark: { title: string; url: string; favicon?: string }) => {
    return tabManager.toggleBookmark(bookmark);
  });

  // Settings & Theme handlers
  ipcMain.handle('browser:set-theme', (_event, theme: 'dark' | 'light') => {
    return tabManager.setTheme(theme);
  });

  ipcMain.handle('browser:get-settings', () => {
    return tabManager.getSettings();
  });

  ipcMain.handle('browser:update-settings', (_event, settings: Partial<BrowserSettings>) => {
    return tabManager.updateSettings(settings);
  });

  // Switcher HUD handlers
  ipcMain.handle('browser:open-switcher', () => {
    return tabManager.openSwitcher();
  });

  ipcMain.handle('browser:close-switcher', () => {
    tabManager.closeSwitcher();
  });

  ipcMain.handle('browser:cycle-switcher', (_event, direction: SwitcherDirection) => {
    tabManager.cycleSwitcher(direction);
  });

  ipcMain.handle('browser:select-switcher-index', (_event, index: number) => {
    tabManager.selectSwitcherIndex(index);
  });

  ipcMain.handle('browser:commit-switcher', () => {
    return tabManager.commitSwitcher();
  });

  ipcMain.handle('browser:set-modal-open', (_event, isOpen: boolean) => {
    return tabManager.setModalOpen(isOpen);
  });

  // Window operations
  ipcMain.handle('window:minimize', () => {
    window.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    window.close();
  });
}
