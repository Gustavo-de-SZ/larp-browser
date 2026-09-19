import { ipcMain, BrowserWindow } from 'electron';
import { TabManager } from './tab-manager';
import { DownloadManager } from './download-manager';
import type { BrowserSettings, SwitcherDirection } from '../shared/types';

export function registerIpcHandlers(
  window: BrowserWindow,
  tabManager: TabManager,
  downloadManager: DownloadManager
) {
  ipcMain.handle('browser:get-state', () => {
    return tabManager.getState();
  });

  ipcMain.handle('browser:create-tab', (_event, url?: string, isPrivate?: boolean) => {
    return tabManager.createTab(url, isPrivate);
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

  // Zoom handler
  ipcMain.handle('browser:set-zoom', (_event, tabId: string, factor: number) => {
    return tabManager.setZoomFactor(tabId, factor);
  });

  // Find in Page handlers
  ipcMain.handle('browser:find-in-page', (_event, text: string, forward?: boolean, findNext?: boolean) => {
    tabManager.findInPage(text, forward, findNext);
  });

  ipcMain.handle('browser:stop-find-in-page', (_event, action?: 'clearSelection' | 'keepSelection' | 'activateSelection') => {
    tabManager.stopFindInPage(action);
  });

  ipcMain.handle('browser:set-find-open', (_event, isOpen: boolean) => {
    tabManager.setFindOpen(isOpen);
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

  // History & Browsing Data handlers
  ipcMain.handle('browser:get-history', () => {
    return tabManager.getHistory();
  });

  ipcMain.handle('browser:clear-history', () => {
    tabManager.clearHistory();
  });

  ipcMain.handle('browser:delete-history-item', (_event, id: string) => {
    tabManager.deleteHistoryItem(id);
  });

  ipcMain.handle('browser:clear-browsing-data', async () => {
    await tabManager.clearBrowsingData();
  });

  ipcMain.handle('browser:clear-browsing-data-advanced', async (_event, options: any) => {
    await tabManager.clearBrowsingDataAdvanced(options);
  });

  // Password Vault handlers
  ipcMain.handle('browser:get-passwords', () => {
    return tabManager.getPasswords();
  });

  ipcMain.handle('browser:save-password', (_event, entry: any) => {
    return tabManager.savePassword(entry);
  });

  ipcMain.handle('browser:update-password', (_event, entry: any) => {
    tabManager.updatePassword(entry);
  });

  ipcMain.handle('browser:delete-password', (_event, id: string) => {
    tabManager.deletePassword(id);
  });

  ipcMain.handle('browser:export-passwords', () => {
    return tabManager.exportPasswords();
  });

  ipcMain.handle('browser:import-passwords', () => {
    return tabManager.importPasswords();
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

  ipcMain.handle('browser:get-weather', () => {
    return tabManager.getWeather();
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

  ipcMain.handle('browser:commit-switcher', (_e, onlyIfModifier = false) => {
    return tabManager.commitSwitcher(onlyIfModifier);
  });

  ipcMain.handle('browser:set-modal-open', (_event, isOpen: boolean) => {
    return tabManager.setModalOpen(isOpen);
  });

  // Download handlers
  ipcMain.handle('browser:get-downloads', () => {
    return downloadManager.getDownloads();
  });

  ipcMain.handle('browser:pause-download', (_event, id: string) => {
    return downloadManager.pauseDownload(id);
  });

  ipcMain.handle('browser:resume-download', (_event, id: string) => {
    return downloadManager.resumeDownload(id);
  });

  ipcMain.handle('browser:cancel-download', (_event, id: string) => {
    return downloadManager.cancelDownload(id);
  });

  ipcMain.handle('browser:open-download-file', (_event, id: string) => {
    return downloadManager.openDownloadFile(id);
  });

  ipcMain.handle('browser:show-download-in-folder', (_event, id: string) => {
    return downloadManager.showDownloadInFolder(id);
  });

  ipcMain.handle('browser:clear-downloads', () => {
    return downloadManager.clearDownloads();
  });

  ipcMain.handle('browser:delete-download-item', (_event, id: string) => {
    return downloadManager.deleteDownloadItem(id);
  });

  ipcMain.handle('browser:select-download-directory', () => {
    return downloadManager.selectDownloadDirectory();
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
