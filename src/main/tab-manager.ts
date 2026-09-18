import { app, BrowserWindow, WebContentsView, nativeTheme, safeStorage, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  BrowserState,
  BrowserSettings,
  TabInfo,
  SwitcherDirection,
  BookmarkItem,
  HistoryItem,
  PasswordEntry,
  ClearBrowsingDataOptions,
  WeatherData,
} from '../shared/types';
import type { DownloadManager } from './download-manager';

export const TOP_BAR_HEIGHT = 44;
export const BOOKMARKS_BAR_HEIGHT = 28;
export const FIND_BAR_HEIGHT = 36;

export function getSearchEngineHomeUrl(engine: string): string {
  switch (engine) {
    case 'duckduckgo':
      return 'https://duckduckgo.com';
    case 'brave':
      return 'https://search.brave.com';
    case 'bing':
      return 'https://www.bing.com';
    case 'google':
    default:
      return 'https://www.google.com';
  }
}

const DEFAULT_SETTINGS: BrowserSettings = {
  theme: 'dark',
  darkPaletteId: 'graphite',
  lightPaletteId: 'paper',
  forcePageDarkMode: true,
  defaultSearchEngine: 'google',
  autoHibernateTabs: true,
  idleHibernateMinutes: 30,
  switcherLayout: 'grid',
  switcherShowPreviews: true,
  switcherShowUrls: true,
  switcherSortOrder: 'mru',
  showBookmarksBar: false,
  showFavoritesOnNewTab: true,
  startupBehavior: 'new-tab',
  startupCustomUrl: 'https://www.google.com',
  newTabShowClock: true,
  newTabClockFormat: '12h',
  newTabShowWeather: true,
  newTabShowQuickLinks: true,
};

const SMART_DARK_CSS = `
  :root {
    color-scheme: dark !important;
  }
  @media (prefers-color-scheme: dark) {
    html:not([data-theme="dark"]) {
      background-color: #121214 !important;
    }
  }
`;

export class TabManager {
  private window: BrowserWindow;
  private tabs: Map<string, { info: TabInfo; view: WebContentsView; cssKey?: string }> = new Map();
  private activeTabId: string | null = null;
  private mruTabIds: string[] = [];
  private isSwitcherOpen = false;
  private isModalOpen = false;
  private isFindOpen = false;
  private selectedSwitcherIndex = 0;
  private settings: BrowserSettings = { ...DEFAULT_SETTINGS };
  private settingsPath: string;
  private bookmarks: BookmarkItem[] = [];
  private bookmarksPath: string;
  private history: HistoryItem[] = [];
  private historyPath: string;
  private passwords: PasswordEntry[] = [];
  private passwordsPath: string;
  private sessionPath: string;
  private cachedWeather: { data: WeatherData; timestamp: number } | null = null;
  private downloadManager?: DownloadManager;
  private onStateChangeCallback?: (state: BrowserState) => void;

  public setDownloadManager(dm: DownloadManager) {
    this.downloadManager = dm;
  }

  constructor(window: BrowserWindow) {
    this.window = window;
    this.settingsPath = path.join(app.getPath('userData'), 'larp-settings.json');
    this.bookmarksPath = path.join(app.getPath('userData'), 'larp-bookmarks.json');
    this.historyPath = path.join(app.getPath('userData'), 'larp-history.json');
    this.passwordsPath = path.join(app.getPath('userData'), 'larp-passwords.json');
    this.sessionPath = path.join(app.getPath('userData'), 'larp-session.json');
    this.loadSettings();
    this.loadBookmarks();
    this.loadHistory();
    this.loadPasswords();
    this.startHibernateTimer();

    // Set Chromium native theme
    nativeTheme.themeSource = this.settings.theme;
  }

  private loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const raw = fs.readFileSync(this.settingsPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }

    const validDark = ['graphite', 'midnight', 'warm-charcoal', 'forest-sage', 'pitch-black'];
    const validLight = ['paper', 'warm-sand', 'cool-slate', 'matcha-garden'];

    if (!validDark.includes(this.settings.darkPaletteId)) {
      this.settings.darkPaletteId = 'graphite';
    }
    if (!validLight.includes(this.settings.lightPaletteId)) {
      this.settings.lightPaletteId = 'paper';
    }
    if (!['google', 'duckduckgo', 'brave', 'bing'].includes(this.settings.defaultSearchEngine)) {
      this.settings.defaultSearchEngine = 'google';
    }
    if (typeof this.settings.idleHibernateMinutes !== 'number') {
      this.settings.idleHibernateMinutes = 30;
    }
    if (!['grid', 'compact'].includes(this.settings.switcherLayout || '')) {
      this.settings.switcherLayout = 'grid';
    }
    if (typeof this.settings.switcherShowPreviews !== 'boolean') {
      this.settings.switcherShowPreviews = true;
    }
    if (typeof this.settings.switcherShowUrls !== 'boolean') {
      this.settings.switcherShowUrls = true;
    }
    if (!['mru', 'creation'].includes(this.settings.switcherSortOrder || '')) {
      this.settings.switcherSortOrder = 'mru';
    }
    if (typeof this.settings.showBookmarksBar !== 'boolean') {
      this.settings.showBookmarksBar = false;
    }
    if (typeof this.settings.showFavoritesOnNewTab !== 'boolean') {
      this.settings.showFavoritesOnNewTab = true;
    }
    if (!['new-tab', 'continue', 'custom-url'].includes(this.settings.startupBehavior)) {
      this.settings.startupBehavior = 'new-tab';
    }
    if (!this.settings.startupCustomUrl) {
      this.settings.startupCustomUrl = getSearchEngineHomeUrl(this.settings.defaultSearchEngine);
    }
    this.saveSettings();
  }

  private saveSettings() {
    fs.promises.writeFile(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf8').catch((err) => {
      console.error('Failed to save settings:', err);
    });
  }

  private loadBookmarks() {
    try {
      if (fs.existsSync(this.bookmarksPath)) {
        const raw = fs.readFileSync(this.bookmarksPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.bookmarks = parsed;
        }
      }
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
      this.bookmarks = [];
    }
  }

  private saveBookmarks() {
    fs.promises.writeFile(this.bookmarksPath, JSON.stringify(this.bookmarks, null, 2), 'utf8').catch((err) => {
      console.error('Failed to save bookmarks:', err);
    });
  }

  public getBookmarks(): BookmarkItem[] {
    return [...this.bookmarks];
  }

  public addBookmark(data: { title: string; url: string; favicon?: string }): BookmarkItem {
    const existing = this.bookmarks.find((b) => b.url === data.url);
    if (existing) {
      existing.title = data.title || existing.title;
      if (data.favicon) existing.favicon = data.favicon;
      this.saveBookmarks();
      this.notifyStateChange();
      return existing;
    }

    const newBookmark: BookmarkItem = {
      id: 'bm-' + Math.random().toString(36).substring(2, 9),
      title: data.title || data.url,
      url: data.url,
      favicon: data.favicon,
      createdAt: Date.now(),
    };
    this.bookmarks.unshift(newBookmark);
    this.saveBookmarks();
    this.notifyStateChange();
    return newBookmark;
  }

  public removeBookmark(idOrUrl: string) {
    this.bookmarks = this.bookmarks.filter((b) => b.id !== idOrUrl && b.url !== idOrUrl);
    this.saveBookmarks();
    this.notifyStateChange();
  }

  public toggleBookmark(data: { title: string; url: string; favicon?: string }): { bookmarked: boolean; item?: BookmarkItem } {
    const existing = this.bookmarks.find((b) => b.url === data.url);
    if (existing) {
      this.removeBookmark(existing.id);
      return { bookmarked: false };
    } else {
      const item = this.addBookmark(data);
      return { bookmarked: true, item };
    }
  }

  // --- History Management ---

  private loadHistory() {
    try {
      if (fs.existsSync(this.historyPath)) {
        const raw = fs.readFileSync(this.historyPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.history = parsed;
        }
      }
    } catch (err) {
      console.error('Failed to load history:', err);
      this.history = [];
    }
  }

  private saveHistory() {
    fs.promises.writeFile(this.historyPath, JSON.stringify(this.history, null, 2), 'utf8').catch((err) => {
      console.error('Failed to save history:', err);
    });
  }

  public addHistory(title: string, url: string, isPrivate = false) {
    if (isPrivate) return;
    if (!url || url.startsWith('about:') || url.startsWith('data:') || url.startsWith('chrome:')) return;
    if (
      this.history.length > 0 &&
      this.history[0].url === url &&
      Date.now() - this.history[0].visitedAt < 120000
    ) {
      this.history[0].title = title || this.history[0].title;
      this.saveHistory();
      return;
    }

    const item: HistoryItem = {
      id: 'h-' + Math.random().toString(36).substring(2, 9),
      url,
      title: title || url,
      visitedAt: Date.now(),
    };
    this.history.unshift(item);
    if (this.history.length > 500) {
      this.history = this.history.slice(0, 500);
    }
    this.saveHistory();
  }

  public getHistory(): HistoryItem[] {
    return [...this.history];
  }

  public clearHistory() {
    this.history = [];
    this.saveHistory();
  }

  public deleteHistoryItem(id: string) {
    this.history = this.history.filter((item) => item.id !== id);
    this.saveHistory();
  }

  public async clearBrowsingData() {
    this.clearHistory();
    try {
      const { session } = await import('electron');
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData();
    } catch (err) {
      console.error('Failed to clear browsing data:', err);
    }
  }

  public async clearBrowsingDataAdvanced(options: ClearBrowsingDataOptions) {
    let cutoff = 0;
    const now = Date.now();
    if (options.timeRange === 'hour') {
      cutoff = now - 3600 * 1000;
    } else if (options.timeRange === '24h') {
      cutoff = now - 24 * 3600 * 1000;
    } else if (options.timeRange === '7d') {
      cutoff = now - 7 * 24 * 3600 * 1000;
    } else if (options.timeRange === '4w') {
      cutoff = now - 28 * 24 * 3600 * 1000;
    } else if (options.timeRange === 'all') {
      cutoff = 0;
    }

    if (options.clearHistory) {
      if (cutoff === 0) {
        this.history = [];
      } else {
        this.history = this.history.filter((h) => h.visitedAt < cutoff);
      }
      this.saveHistory();
    }

    try {
      const { session } = await import('electron');
      if (options.clearCookies) {
        await session.defaultSession.clearStorageData({
          storages: ['cookies', 'localstorage', 'websql', 'indexdb'],
        });
      }
      if (options.clearCache) {
        await session.defaultSession.clearCache();
      }
    } catch (err) {
      console.error('Failed to clear browsing data:', err);
    }
  }

  // --- Password Vault Management ---

  private encryptSecret(text: string): string {
    try {
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        return 'safe:' + safeStorage.encryptString(text).toString('base64');
      }
    } catch {
      // Fallback to AES-GCM
    }
    try {
      const iv = crypto.randomBytes(12);
      const key = crypto.createHash('sha256').update(app.getPath('userData') + '-larp-secret').digest();
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return 'aes:' + Buffer.concat([iv, tag, encrypted]).toString('base64');
    } catch (err) {
      console.error('Fallback encryption error:', err);
      return 'plain:' + Buffer.from(text).toString('base64');
    }
  }

  private decryptSecret(ciphertext: string): string {
    if (!ciphertext) return '';
    try {
      if (ciphertext.startsWith('safe:')) {
        const raw = Buffer.from(ciphertext.substring(5), 'base64');
        return safeStorage.decryptString(raw);
      } else if (ciphertext.startsWith('aes:')) {
        const raw = Buffer.from(ciphertext.substring(4), 'base64');
        const iv = raw.subarray(0, 12);
        const tag = raw.subarray(12, 28);
        const data = raw.subarray(28);
        const key = crypto.createHash('sha256').update(app.getPath('userData') + '-larp-secret').digest();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        return decipher.update(data) + decipher.final('utf8');
      } else if (ciphertext.startsWith('plain:')) {
        return Buffer.from(ciphertext.substring(6), 'base64').toString('utf8');
      }
    } catch (err) {
      console.error('Failed to decrypt secret:', err);
    }
    return '';
  }

  private loadPasswords() {
    try {
      if (fs.existsSync(this.passwordsPath)) {
        const raw = fs.readFileSync(this.passwordsPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.passwords = parsed.map((item: any) => ({
            id: item.id,
            site: item.site || '',
            username: item.username || '',
            password: this.decryptSecret(item.secret || ''),
            createdAt: item.createdAt || Date.now(),
            updatedAt: item.updatedAt || Date.now(),
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load passwords:', err);
      this.passwords = [];
    }
  }

  private savePasswords() {
    try {
      const serializable = this.passwords.map((p) => ({
        id: p.id,
        site: p.site,
        username: p.username,
        secret: this.encryptSecret(p.password),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
      fs.promises.writeFile(this.passwordsPath, JSON.stringify(serializable, null, 2), 'utf8').catch((err) => {
        console.error('Failed to save passwords:', err);
      });
    } catch (err) {
      console.error('Failed to serialize passwords:', err);
    }
  }

  public getPasswords(): PasswordEntry[] {
    return [...this.passwords];
  }

  public savePassword(entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>): PasswordEntry {
    const newEntry: PasswordEntry = {
      id: 'pwd-' + Math.random().toString(36).substring(2, 9),
      site: entry.site.trim(),
      username: entry.username.trim(),
      password: entry.password,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.passwords.unshift(newEntry);
    this.savePasswords();
    return newEntry;
  }

  public updatePassword(entry: PasswordEntry) {
    const idx = this.passwords.findIndex((p) => p.id === entry.id);
    if (idx !== -1) {
      this.passwords[idx] = {
        ...this.passwords[idx],
        site: entry.site.trim(),
        username: entry.username.trim(),
        password: entry.password,
        updatedAt: Date.now(),
      };
      this.savePasswords();
    }
  }

  public deletePassword(id: string) {
    this.passwords = this.passwords.filter((p) => p.id !== id);
    this.savePasswords();
  }

  public async exportPasswords(): Promise<{
    success: boolean;
    count?: number;
    path?: string;
    canceled?: boolean;
    error?: string;
  }> {
    try {
      const result = await dialog.showSaveDialog(this.window, {
        title: 'Export Passwords',
        defaultPath: 'larp-passwords.csv',
        filters: [
          { name: 'CSV (*.csv)', extensions: ['csv'] },
          { name: 'JSON (*.json)', extensions: ['json'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePath;
      const isJson = filePath.toLowerCase().endsWith('.json');

      if (isJson) {
        const payload = this.passwords.map((p) => ({
          site: p.site,
          username: p.username,
          password: p.password,
        }));
        await fs.promises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      } else {
        const escapeCsv = (val: string) => {
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        };
        const header = 'url,username,password\n';
        const rows = this.passwords
          .map((p) => `${escapeCsv(p.site)},${escapeCsv(p.username)},${escapeCsv(p.password)}`)
          .join('\n');
        await fs.promises.writeFile(filePath, header + rows, 'utf-8');
      }

      return { success: true, count: this.passwords.length, path: filePath };
    } catch (err: any) {
      return { success: false, error: err.message || 'Export failed' };
    }
  }

  public async importPasswords(): Promise<{
    success: boolean;
    importedCount?: number;
    totalCount?: number;
    canceled?: boolean;
    error?: string;
  }> {
    try {
      const result = await dialog.showOpenDialog(this.window, {
        title: 'Import Passwords',
        properties: ['openFile'],
        filters: [
          { name: 'Passwords (*.csv, *.json)', extensions: ['csv', 'json'] },
        ],
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      const newEntries: Array<{ site: string; username: string; password: string }> = [];

      if (filePath.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const site = String(item.site || item.url || item.website || item.name || '').trim();
            const username = String(item.username || item.login || item.user || item.email || '').trim();
            const password = String(item.password || item.pass || '');
            if (site && username && password) {
              newEntries.push({ site, username, password });
            }
          }
        }
      } else {
        const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length > 0) {
          const parseCsvLine = (line: string): string[] => {
            const res: string[] = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  current += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                res.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            res.push(current.trim());
            return res;
          };

          const firstLineCols = parseCsvLine(lines[0]).map((c) => c.toLowerCase());
          let urlIdx = firstLineCols.findIndex((c) => c === 'url' || c === 'site' || c === 'website' || c === 'name');
          let userIdx = firstLineCols.findIndex((c) => c === 'username' || c === 'user' || c === 'login' || c === 'email');
          let passIdx = firstLineCols.findIndex((c) => c === 'password' || c === 'pass');

          let startIndex = 1;
          if (urlIdx === -1 && userIdx === -1 && passIdx === -1) {
            urlIdx = 0;
            userIdx = 1;
            passIdx = 2;
            startIndex = 0;
          } else {
            if (urlIdx === -1) urlIdx = 0;
            if (userIdx === -1) userIdx = 1;
            if (passIdx === -1) passIdx = 2;
          }

          for (let i = startIndex; i < lines.length; i++) {
            const cols = parseCsvLine(lines[i]);
            const site = (cols[urlIdx] || '').trim();
            const username = (cols[userIdx] || '').trim();
            const password = cols[passIdx] || '';
            if (site && username && password) {
              newEntries.push({ site, username, password });
            }
          }
        }
      }

      if (newEntries.length === 0) {
        return { success: false, error: 'No valid passwords found in selected file' };
      }

      let importedCount = 0;
      for (const entry of newEntries) {
        const existingIdx = this.passwords.findIndex(
          (p) =>
            p.site.toLowerCase() === entry.site.toLowerCase() &&
            p.username.toLowerCase() === entry.username.toLowerCase()
        );
        if (existingIdx !== -1) {
          this.passwords[existingIdx] = {
            ...this.passwords[existingIdx],
            password: entry.password,
            updatedAt: Date.now(),
          };
          importedCount++;
        } else {
          this.passwords.unshift({
            id: 'pwd-' + Math.random().toString(36).substring(2, 9),
            site: entry.site,
            username: entry.username,
            password: entry.password,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          importedCount++;
        }
      }

      this.savePasswords();
      return { success: true, importedCount, totalCount: this.passwords.length };
    } catch (err: any) {
      return { success: false, error: err.message || 'Import failed' };
    }
  }

  public async getWeather(): Promise<WeatherData | null> {
    const CACHE_TTL = 20 * 60 * 1000; // 20 minutes
    if (this.cachedWeather && Date.now() - this.cachedWeather.timestamp < CACHE_TTL) {
      return this.cachedWeather.data;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch('https://wttr.in/?format=j1', {
        signal: controller.signal,
        headers: { 'User-Agent': 'curl/7.68.0' },
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: any = await res.json();
      const current = data.current_condition?.[0];
      const area = data.nearest_area?.[0]?.areaName?.[0]?.value || '';

      if (current) {
        const weather: WeatherData = {
          tempC: current.temp_C || '0',
          tempF: current.temp_F || '32',
          desc: current.weatherDesc?.[0]?.value || 'Clear',
          area: area,
        };
        this.cachedWeather = {
          data: weather,
          timestamp: Date.now(),
        };
        return weather;
      }
    } catch (err) {
      console.warn('Failed to fetch weather in main process:', err);
    }

    return this.cachedWeather ? this.cachedWeather.data : null;
  }

  // --- Active Tab Hibernation ---

  private startHibernateTimer() {
    setInterval(() => {
      this.checkTabHibernation();
    }, 60000);
  }

  private checkTabHibernation() {
    const idleMinutes = this.settings.idleHibernateMinutes ?? 30;
    if (!this.settings.autoHibernateTabs || idleMinutes <= 0) return;
    const now = Date.now();
    const thresholdMs = idleMinutes * 60 * 1000;

    let changed = false;
    for (const [tabId, tab] of this.tabs.entries()) {
      if (tabId === this.activeTabId) continue;
      if (tab.info.audioPlaying) continue;
      if (tab.info.isHibernated) continue;
      if (!tab.info.url || tab.info.url === 'about:blank') continue;

      const idleDuration = now - (tab.info.lastAccessed || 0);
      if (idleDuration > thresholdMs) {
        tab.info.isHibernated = true;
        try {
          tab.view.webContents.setBackgroundThrottling(true);
        } catch {
          // Ignore
        }
        changed = true;
      }
    }
    if (changed) {
      this.notifyStateChange();
    }
  }

  // --- Session Save & Restore ---

  public saveSession() {
    try {
      const tabsList = Array.from(this.tabs.values())
        .filter((t) => !t.info.isPrivate)
        .map((t) => ({ url: t.info.url, title: t.info.title }))
        .filter((t) => t.url && t.url !== 'about:blank');

      const activeTab = this.activeTabId ? this.tabs.get(this.activeTabId) : null;
      const activeUrl = activeTab && !activeTab.info.isPrivate ? activeTab.info.url : undefined;
      const sessionData = {
        tabs: tabsList,
        activeTabUrl: activeUrl,
      };
      fs.promises.writeFile(this.sessionPath, JSON.stringify(sessionData, null, 2), 'utf8').catch(() => {});
    } catch {
      // Ignore
    }
  }

  public async initializeSession() {
    const behavior = this.settings.startupBehavior || 'new-tab';
    if (behavior === 'continue' && fs.existsSync(this.sessionPath)) {
      try {
        const raw = fs.readFileSync(this.sessionPath, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.tabs) && data.tabs.length > 0) {
          let targetActiveId: string | null = null;
          for (const t of data.tabs) {
            if (t.url && t.url !== 'about:blank') {
              const id = await this.createTab(t.url);
              if (data.activeTabUrl && t.url === data.activeTabUrl) {
                targetActiveId = id;
              }
            }
          }
          if (targetActiveId) {
            await this.switchTab(targetActiveId);
          }
          return;
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      }
    } else if (behavior === 'custom-url' && this.settings.startupCustomUrl) {
      await this.createTab(this.settings.startupCustomUrl);
      return;
    }

    await this.createTab('about:blank');
  }

  public setOnStateChange(cb: (state: BrowserState) => void) {
    this.onStateChangeCallback = cb;
  }

  public notifyStateChange() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.getState());
    }
  }

  public getState(): BrowserState {
    const tabsList = Array.from(this.tabs.values()).map(t => t.info);
    return {
      tabs: tabsList,
      activeTabId: this.activeTabId,
      isSwitcherOpen: this.isSwitcherOpen,
      selectedSwitcherIndex: this.selectedSwitcherIndex,
      mruTabIds: [...this.mruTabIds],
      bookmarks: [...this.bookmarks],
      settings: { ...this.settings },
    };
  }

  public getSettings(): BrowserSettings {
    return { ...this.settings };
  }

  public getTabView(tabId: string): { webContents: Electron.WebContents } | undefined {
    const tab = this.tabs.get(tabId);
    return tab ? tab.view : undefined;
  }

  public async setTheme(theme: 'dark' | 'light') {
    if (this.settings.theme === theme) return;
    this.settings.theme = theme;
    nativeTheme.themeSource = theme;
    this.saveSettings();
    this.applyThemeToAllTabs().catch((err) => {
      console.error('Failed to apply theme to tabs:', err);
    });
    this.notifyStateChange();
  }

  public async updateSettings(newSettings: Partial<BrowserSettings>): Promise<BrowserSettings> {
    const themeChanged = newSettings.theme !== undefined && newSettings.theme !== this.settings.theme;
    const forceDarkChanged = newSettings.forcePageDarkMode !== undefined && newSettings.forcePageDarkMode !== this.settings.forcePageDarkMode;
    const bookmarksBarChanged = newSettings.showBookmarksBar !== undefined;
    const oldEngine = this.settings.defaultSearchEngine;
    const wasUsingSearchHome = !this.settings.startupCustomUrl || this.settings.startupCustomUrl === getSearchEngineHomeUrl(oldEngine);

    for (const [key, value] of Object.entries(newSettings)) {
      if (value === null || value === undefined) {
        delete (this.settings as any)[key];
      } else {
        (this.settings as any)[key] = value;
      }
    }

    if (newSettings.defaultSearchEngine && newSettings.defaultSearchEngine !== oldEngine && wasUsingSearchHome && !newSettings.startupCustomUrl) {
      this.settings.startupCustomUrl = getSearchEngineHomeUrl(newSettings.defaultSearchEngine);
    }

    if (newSettings.theme) {
      nativeTheme.themeSource = newSettings.theme;
    }
    this.saveSettings();

    if (bookmarksBarChanged) {
      this.updateActiveViewBounds();
    }

    // Only apply theme/CSS to tabs if theme or forcePageDarkMode actually changed
    // And run it in background so IPC return is instantaneous!
    if (themeChanged || forceDarkChanged) {
      this.applyThemeToAllTabs().catch((err) => {
        console.error('Failed to apply theme to tabs:', err);
      });
    }

    this.notifyStateChange();
    return { ...this.settings };
  }

  private async applyThemeToTab(tabId: string) {
    const tab = this.tabs.get(tabId);
    if (!tab || tab.view.webContents.isDestroyed()) return;

    try {
      // Clean previous custom CSS
      if (tab.cssKey) {
        await tab.view.webContents.removeInsertedCSS(tab.cssKey).catch(() => {});
        tab.cssKey = undefined;
      }

      if (this.settings.theme === 'dark' && this.settings.forcePageDarkMode) {
        tab.cssKey = await tab.view.webContents.insertCSS(SMART_DARK_CSS);
      }
    } catch (err) {
      // Ignore CSS insertion errors
    }
  }

  private async applyThemeToAllTabs() {
    const promises = Array.from(this.tabs.keys()).map((id) => this.applyThemeToTab(id));
    await Promise.all(promises);
  }

  public async createTab(initialUrl = 'about:blank', isPrivate = false): Promise<string> {
    const id = 'tab-' + Math.random().toString(36).substring(2, 9);
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        spellcheck: true,
        partition: isPrivate ? 'incognito' : undefined,
      },
    });

    const info: TabInfo = {
      id,
      url: initialUrl,
      title: initialUrl === 'about:blank' ? (isPrivate ? 'Private Tab' : 'New Tab') : initialUrl,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      lastAccessed: Date.now(),
      audioPlaying: false,
      isMuted: false,
      zoomFactor: 1.0,
      isPrivate,
    };

    this.tabs.set(id, { info, view });
    this.mruTabIds.unshift(id);

    // Setup webContents event listeners
    this.setupTabEvents(id, view);

    // Load initial URL
    if (initialUrl && initialUrl !== 'about:blank') {
      view.webContents.loadURL(initialUrl).catch(err => {
        console.error(`Failed to load ${initialUrl}:`, err);
      });
    }

    // Switch to the newly created tab
    await this.switchTab(id);
    this.saveSession();
    return id;
  }

  private setupTabEvents(tabId: string, view: WebContentsView) {
    const wc = view.webContents;

    // Found in page listener
    wc.on('found-in-page', (_event, result) => {
      if (tabId === this.activeTabId) {
        this.window.webContents.send('browser:found-in-page', {
          activeMatchOrdinal: result.activeMatchOrdinal,
          numberOfMatches: result.matches,
          finalUpdate: result.finalUpdate,
        });
      }
    });

    // Security: Validate navigation protocol before allowing tabs to navigate
    wc.on('will-navigate', (event, url) => {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:', 'about:'].includes(parsed.protocol)) {
          console.warn(`[Security] Blocked unsafe navigation in tab ${tabId} to: ${url}`);
          event.preventDefault();
        }
      } catch {
        event.preventDefault();
      }
    });

    wc.on('did-start-loading', () => {
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.info.isLoading = true;
        this.notifyStateChange();
      }
    });

    wc.on('did-start-navigation', (_event, url, _isInPlace, isMainFrame) => {
      if (isMainFrame) {
        const tab = this.tabs.get(tabId);
        if (tab) {
          tab.info.url = url;
          if (tabId === this.activeTabId && !this.isSwitcherOpen && !this.isModalOpen) {
            if (url && url !== 'about:blank') {
              this.attachActiveTabView();
            } else {
              this.detachActiveTabView();
            }
          }
          this.notifyStateChange();
        }
      }
    });

    wc.on('did-navigate', (_event, url) => {
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.info.url = url;
        tab.info.canGoBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
        tab.info.canGoForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();
        if (tabId === this.activeTabId && !this.isSwitcherOpen && !this.isModalOpen) {
          if (url && url !== 'about:blank') {
            this.attachActiveTabView();
          } else {
            this.detachActiveTabView();
          }
        }
        this.addHistory(tab.info.title, url, tab.info.isPrivate);
        this.saveSession();
        this.notifyStateChange();
      }
    });

    wc.on('did-stop-loading', () => {
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.info.isLoading = false;
        tab.info.url = wc.getURL();
        tab.info.title = wc.getTitle() || tab.info.url || 'New Tab';
        tab.info.canGoBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoForward();
        tab.info.canGoForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();

        // Ensure active tab view is attached when page finishes loading
        if (tabId === this.activeTabId && !this.isSwitcherOpen) {
          if (tab.info.url && tab.info.url !== 'about:blank') {
            this.attachActiveTabView();
          } else {
            this.detachActiveTabView();
          }
        }

        this.addHistory(tab.info.title, tab.info.url, tab.info.isPrivate);
        this.saveSession();
        this.notifyStateChange();
        
        // Apply theme and capture snapshot in background
        this.applyThemeToTab(tabId);
        this.capturePreview(tabId).then((img) => {
          if (img) this.notifyStateChange();
        });
      }
    });

    wc.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.error(`Tab ${tabId} failed to load ${validatedURL}: [${errorCode}] ${errorDescription}`);
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.info.isLoading = false;
        this.notifyStateChange();
      }
    });

    wc.on('page-title-updated', (_event, title) => {
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.info.title = title || 'Untitled';
        this.notifyStateChange();
      }
    });

    wc.on('page-favicon-updated', (_event, favicons) => {
      const tab = this.tabs.get(tabId);
      if (tab && favicons.length > 0) {
        tab.info.favicon = favicons[0];
        this.notifyStateChange();
      }
    });

    wc.on('media-started-playing', () => {
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.info.audioPlaying = true;
        this.notifyStateChange();
      }
    });

    wc.on('media-paused', () => {
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.info.audioPlaying = false;
        this.notifyStateChange();
      }
    });

    // Intercept window.open or links with target="_blank"
    wc.setWindowOpenHandler((details) => {
      try {
        const parsed = new URL(details.url);
        if (['http:', 'https:', 'about:'].includes(parsed.protocol)) {
          const currentTab = this.tabs.get(tabId);
          this.createTab(details.url, currentTab?.info.isPrivate || false);
        } else {
          console.warn(`[Security] Blocked popup request to unsafe protocol: ${details.url}`);
        }
      } catch {
        // Ignore invalid URL
      }
      return { action: 'deny' };
    });
  }

  public async capturePreview(tabId: string): Promise<string | undefined> {
    const tab = this.tabs.get(tabId);
    if (!tab) return undefined;
    try {
      if (tab.view.webContents.isDestroyed() || !tab.info.url || tab.info.url === 'about:blank') return undefined;
      const image = await tab.view.webContents.capturePage();
      if (image.isEmpty()) return undefined;
      // High-performance downscale for thumbnail card: drops payload and encoding time by 99%
      const thumbnail = image.resize({ width: 360, quality: 'good' });
      const preview = thumbnail.toDataURL();
      tab.info.previewImage = preview;
      return preview;
    } catch {
      // Quietly ignore if frame has not painted yet
      return undefined;
    }
  }

  public async switchTab(tabId: string) {
    if (!this.tabs.has(tabId)) return;

    // Capture preview of previous tab asynchronously in background (zero blocking!)
    if (this.activeTabId && this.activeTabId !== tabId) {
      this.capturePreview(this.activeTabId);
    }

    // Hide previous tab view
    if (this.activeTabId && this.tabs.has(this.activeTabId)) {
      const prevTab = this.tabs.get(this.activeTabId)!;
      try {
        this.window.contentView.removeChildView(prevTab.view);
      } catch {
        // Ignore if not already attached
      }
    }

    this.activeTabId = tabId;
    const currentTab = this.tabs.get(tabId)!;
    currentTab.info.lastAccessed = Date.now();
    if (currentTab.info.isHibernated) {
      currentTab.info.isHibernated = false;
      try {
        currentTab.view.webContents.setBackgroundThrottling(false);
      } catch {
        // Ignore
      }
    }

    // Update MRU list: move tabId to the front
    this.mruTabIds = [tabId, ...this.mruTabIds.filter(id => id !== tabId)];

    // If switcher is not open and no modal is open, mount and position the new active tab view
    if (!this.isSwitcherOpen && !this.isModalOpen) {
      this.attachActiveTabView();
    }

    this.notifyStateChange();
  }

  public attachActiveTabView() {
    if (!this.activeTabId || !this.tabs.has(this.activeTabId)) return;
    if (this.isSwitcherOpen || this.isModalOpen) return;
    const tab = this.tabs.get(this.activeTabId)!;

    // If active tab is about:blank, keep detached so the New Tab React dashboard is visible
    if (!tab.info.url || tab.info.url === 'about:blank') {
      this.detachActiveTabView();
      return;
    }

    // Detach any other tab's view
    for (const [id, otherTab] of this.tabs) {
      if (id !== this.activeTabId) {
        try {
          if (this.window.contentView.children.includes(otherTab.view)) {
            this.window.contentView.removeChildView(otherTab.view);
          }
        } catch {
          // Ignore
        }
      }
    }

    if (!this.window.contentView.children.includes(tab.view)) {
      this.window.contentView.addChildView(tab.view);
    }
    this.updateActiveViewBounds();
    try {
      tab.view.webContents.focus();
    } catch {
      // Ignore
    }
  }

  public detachActiveTabView() {
    if (!this.activeTabId || !this.tabs.has(this.activeTabId)) return;
    const tab = this.tabs.get(this.activeTabId)!;
    try {
      if (this.window.contentView.children.includes(tab.view)) {
        this.window.contentView.removeChildView(tab.view);
      }
    } catch {
      // Ignore
    }
  }

  public updateActiveViewBounds() {
    if (!this.activeTabId || this.isSwitcherOpen || this.isModalOpen) return;
    const tab = this.tabs.get(this.activeTabId);
    if (!tab || !tab.info.url || tab.info.url === 'about:blank') return;

    const topOffset =
      TOP_BAR_HEIGHT +
      (this.settings.showBookmarksBar ? BOOKMARKS_BAR_HEIGHT : 0) +
      (this.isFindOpen ? FIND_BAR_HEIGHT : 0);
    const [width, height] = this.window.getContentSize();
    tab.view.setBounds({
      x: 0,
      y: topOffset,
      width: width,
      height: Math.max(0, height - topOffset),
    });
  }

  public setFindOpen(isOpen: boolean) {
    this.isFindOpen = isOpen;
    this.updateActiveViewBounds();
  }

  public async setModalOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    if (isOpen) {
      this.detachActiveTabView();
      // Ensure shell window has immediate keyboard focus for shortcuts and escape handling
      this.window.focus();
      this.window.webContents.focus();
      // Capture preview in background without blocking modal appearance
      if (this.activeTabId) {
        this.capturePreview(this.activeTabId).then(() => this.notifyStateChange()).catch(() => {});
      }
    } else {
      if (!this.isSwitcherOpen) {
        this.attachActiveTabView();
      }
    }
    this.notifyStateChange();
  }

  public async closeTab(tabId: string) {
    if (!this.tabs.has(tabId)) return;
    const tab = this.tabs.get(tabId)!;

    try {
      this.window.contentView.removeChildView(tab.view);
    } catch {
      // Ignore
    }

    // Destroy webContents
    (tab.view.webContents as any).destroy?.();
    this.tabs.delete(tabId);
    this.mruTabIds = this.mruTabIds.filter(id => id !== tabId);

    // If closed tab was private, purge ephemeral data if no private tabs remain
    if (tab.info.isPrivate) {
      const remainingPrivate = Array.from(this.tabs.values()).filter((t) => t.info.isPrivate);
      if (remainingPrivate.length === 0) {
        try {
          const { session } = await import('electron');
          const incognitoSession = session.fromPartition('incognito');
          await incognitoSession.clearStorageData();
          await incognitoSession.clearCache();
        } catch (err) {
          console.error('Failed to clear incognito session data:', err);
        }
        this.downloadManager?.clearPrivateDownloads();
      }
    }

    this.saveSession();

    // If we closed the active tab, switch to next in MRU
    if (this.activeTabId === tabId) {
      if (this.mruTabIds.length > 0) {
        await this.switchTab(this.mruTabIds[0]);
      } else {
        // If no tabs left, create an empty one
        await this.createTab();
      }
    } else {
      this.notifyStateChange();
    }
  }

  public async navigateTab(tabId: string, input: string) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    let targetUrl = input.trim();
    // Security: Disallow dangerous schemes (javascript:, data:, file:, shell:) from direct Omnibar entry
    // If entered, treat them safely as a web search query
    const isDangerousScheme = /^(javascript|data|file|vbscript|shell):/i.test(targetUrl);
    if (isDangerousScheme) {
      const engines = {
        google: 'https://www.google.com/search?q=',
        duckduckgo: 'https://duckduckgo.com/?q=',
        brave: 'https://search.brave.com/search?q=',
        bing: 'https://www.bing.com/search?q=',
      };
      const base = engines[this.settings.defaultSearchEngine] || engines.google;
      targetUrl = `${base}${encodeURIComponent(targetUrl)}`;
    } else if (!/^https?:\/\//i.test(targetUrl) && !/^about:/i.test(targetUrl)) {
      if (targetUrl.includes('.') && !targetUrl.includes(' ')) {
        targetUrl = 'https://' + targetUrl;
      } else {
        const engines = {
          google: 'https://www.google.com/search?q=',
          duckduckgo: 'https://duckduckgo.com/?q=',
          brave: 'https://search.brave.com/search?q=',
          bing: 'https://www.bing.com/search?q=',
        };
        const base = engines[this.settings.defaultSearchEngine] || engines.google;
        targetUrl = `${base}${encodeURIComponent(targetUrl)}`;
      }
    }

    tab.info.url = targetUrl;
    tab.info.isLoading = true;

    // Immediately attach the view if this is the active tab and it is not about:blank
    if (tabId === this.activeTabId && !this.isSwitcherOpen) {
      if (targetUrl && targetUrl !== 'about:blank') {
        this.attachActiveTabView();
      } else {
        this.detachActiveTabView();
      }
    }

    this.notifyStateChange();

    try {
      await tab.view.webContents.loadURL(targetUrl);
    } catch (err) {
      console.error(`Failed to navigate tab ${tabId} to ${targetUrl}:`, err);
    }
  }

  public goBack(tabId: string) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    const wc = tab.view.webContents;
    if (wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack()) {
      if (wc.navigationHistory) {
        wc.navigationHistory.goBack();
      } else {
        wc.goBack();
      }
    }
  }

  public goForward(tabId: string) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    const wc = tab.view.webContents;
    if (wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward()) {
      if (wc.navigationHistory) {
        wc.navigationHistory.goForward();
      } else {
        wc.goForward();
      }
    }
  }

  public reloadTab(tabId: string) {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.view.webContents.reload();
    }
  }

  public toggleMuteTab(tabId: string) {
    const tab = this.tabs.get(tabId);
    if (tab) {
      const isMuted = !tab.view.webContents.isAudioMuted();
      tab.view.webContents.setAudioMuted(isMuted);
      tab.info.isMuted = isMuted;
      this.notifyStateChange();
    }
  }

  // --- Alt-Tab / Ctrl-Tab Switcher HUD Controls ---

  public async openSwitcher() {
    if (this.tabs.size === 0) return;

    this.isSwitcherOpen = true;
    // Set index to the next tab in MRU order (index 1 if available, otherwise 0)
    this.selectedSwitcherIndex = this.mruTabIds.length > 1 ? 1 : 0;

    // Detach active web contents view so HUD is immediately visible in window
    this.detachActiveTabView();

    // Immediately focus shell window and webContents so arrow keys and enter work with 0ms latency
    this.window.focus();
    this.window.webContents.focus();

    this.notifyStateChange();

    // Capture the current page in background (non-blocking) so HUD opening is never delayed
    if (this.activeTabId) {
      this.capturePreview(this.activeTabId)
        .then(() => {
          if (this.isSwitcherOpen) {
            this.notifyStateChange();
          }
        })
        .catch(() => {});
    }
  }

  public closeSwitcher() {
    if (!this.isSwitcherOpen) return;
    this.isSwitcherOpen = false;
    this.attachActiveTabView();
    this.notifyStateChange();
  }

  public cycleSwitcher(direction: SwitcherDirection) {
    if (!this.isSwitcherOpen) {
      this.openSwitcher();
      return;
    }

    const total = this.mruTabIds.length;
    if (total <= 1) return;

    if (direction === 'forward') {
      this.selectedSwitcherIndex = (this.selectedSwitcherIndex + 1) % total;
    } else {
      this.selectedSwitcherIndex = (this.selectedSwitcherIndex - 1 + total) % total;
    }

    this.notifyStateChange();
  }

  public selectSwitcherIndex(index: number) {
    if (index >= 0 && index < this.mruTabIds.length) {
      this.selectedSwitcherIndex = index;
      this.notifyStateChange();
    }
  }

  public async commitSwitcher() {
    if (!this.isSwitcherOpen) return;
    const targetTabId = this.mruTabIds[this.selectedSwitcherIndex];
    this.isSwitcherOpen = false;

    if (targetTabId) {
      await this.switchTab(targetTabId);
    } else {
      this.attachActiveTabView();
      this.notifyStateChange();
    }
  }

  // --- Find in Page ---

  public findInPage(text: string, forward = true, findNext = false) {
    if (!this.activeTabId) return;
    const tab = this.tabs.get(this.activeTabId);
    if (!tab) return;
    tab.view.webContents.findInPage(text, { forward, findNext });
  }

  public stopFindInPage(action: 'clearSelection' | 'keepSelection' | 'activateSelection' = 'clearSelection') {
    if (!this.activeTabId) return;
    const tab = this.tabs.get(this.activeTabId);
    if (!tab) return;
    tab.view.webContents.stopFindInPage(action);
  }

  // --- Page Zoom ---

  public setZoomFactor(tabId: string, factor: number): number {
    const tab = this.tabs.get(tabId);
    if (!tab) return 1.0;
    const clamped = Math.min(3.0, Math.max(0.3, Math.round(factor * 10) / 10));
    tab.view.webContents.setZoomFactor(clamped);
    tab.info.zoomFactor = clamped;
    this.notifyStateChange();
    return clamped;
  }
}
