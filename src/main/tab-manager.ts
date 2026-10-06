import {
  app,
  BrowserWindow,
  WebContentsView,
  nativeTheme,
  safeStorage,
  dialog,
  session,
  Menu,
  MenuItem,
  clipboard,
  shell,
} from 'electron';
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
  UserProfile,
  SiteSecurityInfo,
} from '../shared/types';
import { parseBangQuery } from '../shared/bangs';
import type { DownloadManager } from './download-manager';
import { PermissionManager } from './permission-manager';

export const TOP_BAR_HEIGHT = 44;
export const BOOKMARKS_BAR_HEIGHT = 28;
export const FIND_BAR_HEIGHT = 36;
export const PINNED_SIDEBAR_WIDTH = 48;

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

export function getSearchUrl(engine: string, query: string): string {
  const engines: Record<string, string> = {
    google: 'https://www.google.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    brave: 'https://search.brave.com/search?q=',
    bing: 'https://www.bing.com/search?q=',
  };
  const base = engines[engine] || engines.google;
  return `${base}${encodeURIComponent(query)}`;
}

const DEFAULT_SETTINGS: BrowserSettings = {
  settingsVersion: 2,
  theme: 'dark',
  darkPaletteId: 'graphite',
  lightPaletteId: 'paper',
  forcePageDarkMode: false,
  defaultSearchEngine: 'google',
  autoHibernateTabs: true,
  idleHibernateMinutes: 30,
  switcherLayout: 'grid',
  switcherShowPreviews: true,
  switcherShowUrls: true,
  switcherSortOrder: 'mru',
  showBookmarksBar: false,
  showPinnedSidebar: true,
  showFavoritesOnNewTab: true,
  startupBehavior: 'new-tab',
  startupCustomUrl: 'https://www.google.com',
  restoreSessionOnStartup: false,
  newTabBehavior: 'dashboard',
  newTabCustomUrl: 'https://www.google.com',
  newTabShowClock: true,
  newTabClockFormat: '12h',
  newTabShowWeather: true,
  newTabShowQuickLinks: true,
  preserveMediaTimestamps: true,
  protectActiveMediaTabs: true,
  domainZoomLevels: {},
  domainVolumeBoost: {},
};

const SMART_DARK_CSS = `
  /* High-contrast smart dark mode filter for websites without native dark mode */
  html:not([data-theme="dark"]):not([data-color-mode="dark"]):not(.dark):not([dark]) {
    filter: invert(90%) hue-rotate(180deg) !important;
    background-color: #ffffff !important;
  }
  html:not([data-theme="dark"]):not([data-color-mode="dark"]):not(.dark):not([dark]) img,
  html:not([data-theme="dark"]):not([data-color-mode="dark"]):not(.dark):not([dark]) video,
  html:not([data-theme="dark"]):not([data-color-mode="dark"]):not(.dark):not([dark]) canvas,
  html:not([data-theme="dark"]):not([data-color-mode="dark"]):not(.dark):not([dark]) svg:not([role="img"]),
  html:not([data-theme="dark"]):not([data-color-mode="dark"]):not(.dark):not([dark]) picture,
  html:not([data-theme="dark"]):not([data-color-mode="dark"]):not(.dark):not([dark]) iframe,
  html:not([data-theme="dark"]):not([data-color-mode="dark"]):not(.dark):not([dark]) [style*="background-image"] {
    filter: invert(100%) hue-rotate(180deg) !important;
  }
`;

export class TabManager {
  private window: BrowserWindow;
  private tabs: Map<
    string,
    {
      info: TabInfo;
      view?: WebContentsView;
      cssKey?: string;
      hibernatedState?: {
        mediaTime?: number;
        scrollX?: number;
        scrollY?: number;
      };
    }
  > = new Map();
  private activeTabId: string | null = null;
  private mruTabIds: string[] = [];
  private isSwitcherOpen = false;
  private isModalOpen = false;
  private isFindOpen = false;
  private isHtmlFullscreen = false;
  private selectedSwitcherIndex = 0;
  private settings: BrowserSettings = { ...DEFAULT_SETTINGS };
  private settingsPath: string;
  private bookmarks: BookmarkItem[] = [];
  private bookmarksPath: string;
  private history: HistoryItem[] = [];
  private historyPath: string;
  private passwords: PasswordEntry[] = [];
  private passwordsPath: string;
  private profiles: UserProfile[] = [];
  private activeProfileId: string = 'default';
  private profilesPath: string;
  private sessionPath: string;
  private cachedWeather: { data: WeatherData; timestamp: number } | null = null;
  private downloadManager?: DownloadManager;
  private closedTabs: Array<{
    url: string;
    title: string;
    isPrivate: boolean;
    scrollX?: number;
    scrollY?: number;
    mediaTime?: number;
    profileId?: string;
  }> = [];
  private onStateChangeCallback?: (state: BrowserState) => void;
  private cleanUserAgent: string = '';
  private permissionManager: PermissionManager;

  public setDownloadManager(dm: DownloadManager) {
    this.downloadManager = dm;
  }

  public getPermissionManager(): PermissionManager {
    return this.permissionManager;
  }

  public getTabIdByWebContents(wc: Electron.WebContents): string | null {
    if (!wc || wc.isDestroyed()) return null;
    for (const [id, tab] of this.tabs.entries()) {
      if (tab.view && !tab.view.webContents.isDestroyed() && tab.view.webContents.id === wc.id) {
        return id;
      }
    }
    return null;
  }

  constructor(window: BrowserWindow) {
    this.window = window;
    this.permissionManager = new PermissionManager(
      () => this.window,
      (wc) => this.getTabIdByWebContents(wc)
    );
    this.settingsPath = path.join(app.getPath('userData'), 'larp-settings.json');
    this.bookmarksPath = path.join(app.getPath('userData'), 'larp-bookmarks.json');
    this.historyPath = path.join(app.getPath('userData'), 'larp-history.json');
    this.passwordsPath = path.join(app.getPath('userData'), 'larp-passwords.json');
    this.profilesPath = path.join(app.getPath('userData'), 'larp-profiles.json');
    this.sessionPath = path.join(app.getPath('userData'), 'larp-session.json');

    try {
      const defaultUa = session.defaultSession.getUserAgent();
      this.cleanUserAgent = defaultUa
        .replace(/Electron\/\S+\s?/, '')
        .replace(/larp-browser\/\S+\s?/, '')
        .trim();
    } catch {
      // Ignore
    }

    this.loadSettings();
    this.loadProfiles();
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
        // Migrate legacy settings where forcePageDarkMode defaulted to true
        if (parsed.settingsVersion === undefined || parsed.settingsVersion < 2) {
          this.settings.forcePageDarkMode = false;
          this.settings.settingsVersion = 2;
        }
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
    if (typeof this.settings.restoreSessionOnStartup !== 'boolean') {
      this.settings.restoreSessionOnStartup = this.settings.startupBehavior === 'continue';
    }
    if (!['dashboard', 'custom-url', 'blank'].includes(this.settings.newTabBehavior || '')) {
      this.settings.newTabBehavior = this.settings.startupBehavior === 'custom-url' ? 'custom-url' : 'dashboard';
    }
    if (!this.settings.startupCustomUrl) {
      this.settings.startupCustomUrl = getSearchEngineHomeUrl(this.settings.defaultSearchEngine);
    }
    if (!this.settings.newTabCustomUrl) {
      this.settings.newTabCustomUrl = this.settings.startupCustomUrl || getSearchEngineHomeUrl(this.settings.defaultSearchEngine);
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

  public async getSiteSecurityInfo(tabId?: string): Promise<SiteSecurityInfo | null> {
    const targetId = tabId || this.activeTabId;
    if (!targetId || !this.tabs.has(targetId)) return null;

    const tab = this.tabs.get(targetId)!;
    const url = tab.info.url;
    if (!url || url === 'about:blank') return null;

    let origin = '';
    let protocol = '';
    try {
      const parsed = new URL(url);
      origin = parsed.origin;
      protocol = parsed.protocol;
    } catch {
      return null;
    }

    const isSecure = protocol === 'https:';
    const permissions = this.permissionManager.getOriginPermissions(origin);

    return {
      url,
      origin,
      protocol,
      isSecure,
      permissions,
    };
  }

  public async clearOriginData(origin: string): Promise<boolean> {
    try {
      const { session } = await import('electron');
      const sessionsToClear = new Set<Electron.Session>();
      sessionsToClear.add(session.defaultSession);

      if (this.activeTabId && this.tabs.has(this.activeTabId)) {
        const tab = this.tabs.get(this.activeTabId)!;
        if (tab.view && !tab.view.webContents.isDestroyed()) {
          sessionsToClear.add(tab.view.webContents.session);
        }
      }

      for (const sess of sessionsToClear) {
        await sess.clearStorageData({
          origin,
          storages: ['cookies', 'localstorage', 'websql', 'indexdb', 'cachestorage'],
        });
      }
      return true;
    } catch (err) {
      console.error('[TabManager] Failed to clear origin data for', origin, err);
      return false;
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

  // --- Profiles & Accounts Management ---

  private loadProfiles() {
    try {
      if (fs.existsSync(this.profilesPath)) {
        const raw = fs.readFileSync(this.profilesPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
          this.profiles = parsed.profiles;
          this.activeProfileId = parsed.activeProfileId || this.profiles[0].id || 'default';
        }
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }

    if (this.profiles.length === 0) {
      this.profiles = [
        {
          id: 'default',
          name: 'Personal',
          color: '#6366f1',
          isDefault: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      this.activeProfileId = 'default';
      this.saveProfiles();
    }
  }

  private saveProfiles() {
    try {
      const data = {
        activeProfileId: this.activeProfileId,
        profiles: this.profiles,
      };
      fs.promises.writeFile(this.profilesPath, JSON.stringify(data, null, 2), 'utf8').catch((err) => {
        console.error('Failed to save profiles:', err);
      });
    } catch (err) {
      console.error('Failed to serialize profiles:', err);
    }
  }

  public getProfiles(): UserProfile[] {
    return [...this.profiles];
  }

  public getActiveProfile(): UserProfile {
    return (
      this.profiles.find((p) => p.id === this.activeProfileId) ||
      this.profiles[0] || {
        id: 'default',
        name: 'Personal',
        color: '#6366f1',
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    );
  }

  public async setActiveProfile(profileId: string) {
    const target = this.profiles.find((p) => p.id === profileId);
    if (!target || target.id === this.activeProfileId) return;

    this.activeProfileId = target.id;
    this.saveProfiles();
    this.notifyStateChange();
  }

  public saveProfile(profileData: Partial<UserProfile>): UserProfile {
    if (profileData.id) {
      const idx = this.profiles.findIndex((p) => p.id === profileData.id);
      if (idx !== -1) {
        this.profiles[idx] = {
          ...this.profiles[idx],
          ...profileData,
          updatedAt: Date.now(),
        };
        this.saveProfiles();
        this.notifyStateChange();
        return this.profiles[idx];
      }
    }

    // Create new profile
    const id = 'prof-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newProfile: UserProfile = {
      id,
      name: profileData.name?.trim() || 'Work',
      email: profileData.email?.trim() || '',
      avatarUrl: profileData.avatarUrl?.trim() || '',
      color: profileData.color || '#3b82f6',
      partition: `persist:profile_${id}`,
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.profiles.push(newProfile);
    this.saveProfiles();
    this.notifyStateChange();
    return newProfile;
  }

  public deleteProfile(profileId: string): boolean {
    if (profileId === 'default') return false;
    const target = this.profiles.find((p) => p.id === profileId);
    if (!target || target.isDefault) return false;

    this.profiles = this.profiles.filter((p) => p.id !== profileId);
    if (this.activeProfileId === profileId) {
      this.activeProfileId = 'default';
    }
    this.saveProfiles();
    this.notifyStateChange();
    return true;
  }

  public linkGoogleAccount(account: { email: string; name?: string; avatarUrl?: string }): UserProfile {
    const active = this.getActiveProfile();
    const idx = this.profiles.findIndex((p) => p.id === active.id);
    if (idx !== -1) {
      this.profiles[idx] = {
        ...this.profiles[idx],
        email: account.email.trim(),
        name: account.name?.trim() || this.profiles[idx].name,
        avatarUrl: account.avatarUrl || this.profiles[idx].avatarUrl,
        updatedAt: Date.now(),
      };
      this.saveProfiles();
      this.notifyStateChange();
      return this.profiles[idx];
    }
    return active;
  }

  public async detectGoogleAccount(): Promise<{ email?: string; name?: string; avatarUrl?: string } | null> {
    // 1. Search through open tabs for Google domains
    const googleDomains = ['google.com', 'accounts.google.com', 'mail.google.com', 'myaccount.google.com', 'youtube.com'];
    for (const tab of this.tabs.values()) {
      if (!tab.view || !tab.view.webContents || tab.view.webContents.isDestroyed()) continue;
      const url = tab.info.url || '';
      const isGoogle = googleDomains.some((d) => url.includes(d));
      if (isGoogle) {
        try {
          const result = await tab.view.webContents.executeJavaScript(`
            (() => {
              try {
                // 1. Aria-label on account buttons/links
                const accountEls = Array.from(document.querySelectorAll('a[aria-label*="@"], a[aria-label*="Google Account"], a[aria-label*="Conta do Google"], button[aria-label*="@"], button[aria-label*="Google Account"]'));
                for (const el of accountEls) {
                  const label = el.getAttribute('aria-label') || '';
                  const emailMatch = label.match(/([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+)/);
                  if (emailMatch) {
                    let name = '';
                    const nameMatch = label.match(/(?:Google Account|Conta do Google):\\s*([^\\n(]+)/i);
                    if (nameMatch) name = nameMatch[1].trim();
                    const img = el.querySelector('img') || document.querySelector('img[src*="googleusercontent.com"]');
                    return { email: emailMatch[1], name, avatarUrl: (img && img.src) || '' };
                  }
                }
                // 2. Data attributes
                const dataEmailEl = document.querySelector('[data-email], [data-identifier]');
                if (dataEmailEl) {
                  const email = dataEmailEl.getAttribute('data-email') || dataEmailEl.getAttribute('data-identifier') || '';
                  const img = document.querySelector('img[src*="googleusercontent.com"]');
                  return { email, avatarUrl: (img && img.src) || '' };
                }
              } catch (e) {}
              return null;
            })()
          `);
          if (result && result.email) {
            return result;
          }
        } catch {
          // Continue searching other tabs
        }
      }
    }

    // 2. Check cookies in active session for hints
    try {
      const activeProfile = this.getActiveProfile();
      const sess = activeProfile.partition ? session.fromPartition(activeProfile.partition) : session.defaultSession;
      const cookies = await sess.cookies.get({ domain: '.google.com' });
      const chooser = cookies.find((c) => c.name === 'ACCOUNT_CHOOSER');
      if (chooser && chooser.value) {
        const decoded = decodeURIComponent(chooser.value);
        const emailMatch = decoded.match(/([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+)/);
        if (emailMatch) {
          return { email: emailMatch[1] };
        }
      }
    } catch {
      // Ignore
    }

    return null;
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
    const timer = setInterval(() => {
      this.checkTabHibernation();
    }, 60000);
    timer.unref?.();
  }

  private async checkTabHibernation() {
    const idleMinutes = this.settings.idleHibernateMinutes ?? 30;
    if (!this.settings.autoHibernateTabs || idleMinutes <= 0) return;
    const now = Date.now();
    const thresholdMs = idleMinutes * 60 * 1000;

    for (const [tabId, tab] of this.tabs.entries()) {
      if (tabId === this.activeTabId) continue;
      if (tab.info.audioPlaying) continue;
      if (tab.info.isHibernated) continue;
      if (!tab.info.url || tab.info.url === 'about:blank') continue;

      const idleDuration = now - (tab.info.lastAccessed || 0);
      if (idleDuration > thresholdMs) {
        await this.hibernateTab(tabId, true);
      }
    }
  }

  public async wakeTab(tabId: string) {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.info.isHibernated) return;

    tab.info.isHibernated = false;
    tab.info.savedMediaTime = undefined;
    this.ensureTabView(tabId);
    this.notifyStateChange();
  }

  public async hibernateTab(tabId: string, isAutomatic = false) {
    const tab = this.tabs.get(tabId);
    if (!tab || tabId === this.activeTabId) return;

    // If tab is already hibernated and hibernateTab was triggered manually, toggle: wake it up!
    if (tab.info.isHibernated) {
      if (!isAutomatic) {
        await this.wakeTab(tabId);
      }
      return;
    }

    if (tab.info.audioPlaying) return;
    if (!tab.info.url || tab.info.url === 'about:blank') return;

    // Extract in-page media playback time, playing state, unsubmitted inputs, and scroll position
    if (tab.view?.webContents && !tab.view.webContents.isDestroyed()) {
      try {
        const pageState = await tab.view.webContents.executeJavaScript(`
          (() => {
            try {
              let mediaTime = null;
              let isMediaPlaying = false;

              // 1. YouTube movie_player API (most accurate on YouTube)
              const ytPlayer = document.getElementById('movie_player');
              if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
                const t = ytPlayer.getCurrentTime();
                if (typeof t === 'number' && t > 0) {
                  mediaTime = Math.floor(t);
                }
                if (typeof ytPlayer.getPlayerState === 'function') {
                  const state = ytPlayer.getPlayerState();
                  // 1 = playing, 3 = buffering
                  isMediaPlaying = state === 1 || state === 3;
                }
              }

              // 2. HTML5 video/audio elements (YouTube, Vimeo, Twitch, podcasts, general web)
              const mediaElements = Array.from(document.querySelectorAll('video, audio'));
              for (const m of mediaElements) {
                if (!m.paused && !m.ended) {
                  isMediaPlaying = true;
                }
                if (mediaTime === null && !isNaN(m.currentTime) && m.currentTime > 1) {
                  mediaTime = Math.floor(m.currentTime);
                }
              }

              // 3. Form input protection (unsubmitted user typing)
              const formInputs = Array.from(
                document.querySelectorAll(
                  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]'
                )
              );
              const hasUnsubmittedInput = formInputs.some((el) => {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                  return (el as HTMLInputElement).value && (el as HTMLInputElement).value.trim().length > 3;
                }
                return el.textContent && el.textContent.trim().length > 3;
              });

              return {
                mediaTime,
                isMediaPlaying,
                hasUnsubmittedInput,
                scrollX: window.scrollX || window.pageXOffset || 0,
                scrollY: window.scrollY || window.pageYOffset || 0,
              };
            } catch {
              return null;
            }
          })()
        `, true);

        if (pageState) {
          // If media is STILL playing (even if muted or undetected by audioPlaying), DO NOT HIBERNATE!
          if (pageState.isMediaPlaying && (this.settings.protectActiveMediaTabs !== false)) {
            tab.info.audioPlaying = true;
            this.notifyStateChange();
            return;
          }

          // If auto-hibernating, protect tabs where user has unsubmitted input
          if (isAutomatic && pageState.hasUnsubmittedInput && (this.settings.protectActiveMediaTabs !== false)) {
            return;
          }

          tab.hibernatedState = {
            mediaTime: pageState.mediaTime || undefined,
            scrollX: pageState.scrollX || 0,
            scrollY: pageState.scrollY || 0,
          };

          if (pageState.mediaTime && pageState.mediaTime > 0) {
            tab.info.savedMediaTime = pageState.mediaTime;

            // YouTube URL timestamp sync (&t=Xs)
            if (this.settings.preserveMediaTimestamps !== false) {
              try {
                const urlObj = new URL(tab.info.url);
                if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/watch')) {
                  urlObj.searchParams.set('t', `${pageState.mediaTime}s`);
                  tab.info.url = urlObj.toString();
                } else if (urlObj.hostname === 'youtu.be') {
                  urlObj.searchParams.set('t', `${pageState.mediaTime}s`);
                  tab.info.url = urlObj.toString();
                }
              } catch {
                // Ignore URL parsing errors
              }
            }
          }
        }
      } catch {
        // executeJavaScript failed
      }
    }

    // Pre-capture preview before discarding view so Alt-Tab switcher card never goes blank
    if (!tab.info.previewImage && tab.view?.webContents && !tab.view.webContents.isDestroyed()) {
      await this.capturePreview(tabId);
    }

    if (tab.view) {
      const viewToDestroy = tab.view;
      tab.view = undefined;

      try {
        if (this.window.contentView.children.includes(viewToDestroy)) {
          this.window.contentView.removeChildView(viewToDestroy);
        }
      } catch {
        // Ignore
      }

      try {
        if (tab.cssKey && viewToDestroy.webContents && !viewToDestroy.webContents.isDestroyed()) {
          viewToDestroy.webContents.removeInsertedCSS(tab.cssKey).catch(() => {});
          tab.cssKey = undefined;
        }
      } catch {
        // Ignore
      }

      try {
        if (viewToDestroy.webContents && !viewToDestroy.webContents.isDestroyed()) {
          (viewToDestroy.webContents as any).destroy?.();
        }
      } catch (err) {
        console.warn(`Failed to destroy WebContentsView for hibernated tab ${tabId}:`, err);
      }
    }

    tab.info.isHibernated = true;
    this.notifyStateChange();
  }

  public async hibernateAllInactive() {
    const promises: Promise<void>[] = [];
    for (const [tabId] of this.tabs.entries()) {
      if (tabId !== this.activeTabId) {
        promises.push(this.hibernateTab(tabId));
      }
    }
    await Promise.all(promises);
  }

  // --- Session Save & Restore ---

  public saveSession() {
    try {
      const tabsList = Array.from(this.tabs.values())
        .filter((t) => !t.info.isPrivate)
        .map((t) => ({
          url: t.info.url,
          title: t.info.title,
          isPinned: t.info.isPinned,
          savedMediaTime: t.info.savedMediaTime,
        }))
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
    const shouldRestore =
      this.settings.restoreSessionOnStartup ?? (this.settings.startupBehavior === 'continue');

    if (shouldRestore && fs.existsSync(this.sessionPath)) {
      try {
        const raw = fs.readFileSync(this.sessionPath, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.tabs) && data.tabs.length > 0) {
          let targetActiveId: string | null = null;
          for (const t of data.tabs) {
            if (t.url && t.url !== 'about:blank') {
              const id = await this.createTab(t.url);
              const createdTab = this.tabs.get(id);
              if (createdTab && t.isPinned) {
                createdTab.info.isPinned = true;
              }
              if (t.savedMediaTime) {
                if (createdTab) {
                  createdTab.info.savedMediaTime = t.savedMediaTime;
                  createdTab.hibernatedState = { mediaTime: t.savedMediaTime };
                }
              }
              if (data.activeTabUrl && t.url === data.activeTabUrl) {
                targetActiveId = id;
              }
            }
          }
          if (targetActiveId) {
            await this.switchTab(targetActiveId);
          }
          if (this.tabs.size > 0) {
            return;
          }
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      }
    }

    // If not restoring session, always restore pinned tabs as persistent apps
    if (!shouldRestore && fs.existsSync(this.sessionPath)) {
      try {
        const raw = fs.readFileSync(this.sessionPath, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.tabs)) {
          for (const t of data.tabs) {
            if (t.isPinned && t.url && t.url !== 'about:blank') {
              const id = await this.createTab(t.url, false, undefined, true);
              const createdTab = this.tabs.get(id);
              if (createdTab) createdTab.info.isPinned = true;
            }
          }
        }
      } catch (err) {
        // Ignore
      }
    }

    const mode =
      this.settings.newTabBehavior ||
      (this.settings.startupBehavior === 'custom-url' ? 'custom-url' : 'dashboard');
    const customUrl = this.settings.newTabCustomUrl || this.settings.startupCustomUrl;

    if (mode === 'custom-url' && customUrl) {
      await this.createTab(customUrl);
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
      profiles: [...this.profiles],
      activeProfileId: this.activeProfileId,
    };
  }

  public getSettings(): BrowserSettings {
    return { ...this.settings };
  }

  public getTabView(tabId: string): { webContents: Electron.WebContents } | undefined {
    const tab = this.tabs.get(tabId);
    return tab && tab.view ? tab.view : undefined;
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
    if (!tab || !tab.view || tab.view.webContents.isDestroyed()) return;

    const isForceDark = tab.info.forceDarkActive !== undefined
      ? tab.info.forceDarkActive
      : (this.settings.theme === 'dark' && this.settings.forcePageDarkMode);

    try {
      const themeBg = isForceDark ? '#121214' : '#ffffff';
      tab.view.setBackgroundColor(themeBg);
    } catch {
      // Ignore
    }

    try {
      // Clean previous custom CSS
      if (tab.cssKey) {
        await tab.view.webContents.removeInsertedCSS(tab.cssKey).catch(() => {});
        tab.cssKey = undefined;
      }

      if (isForceDark) {
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

  public ensureTabView(tabId: string): WebContentsView {
    const tab = this.tabs.get(tabId);
    if (!tab) throw new Error(`Tab ${tabId} not found`);

    if (tab.view?.webContents && !tab.view.webContents.isDestroyed()) {
      return tab.view;
    }

    const activeProfile = this.getActiveProfile();
    const tabProfile = tab.info.profileId ? this.profiles.find((p) => p.id === tab.info.profileId) : activeProfile;
    const partition = tab.info.isPrivate ? 'incognito' : (tabProfile?.partition || undefined);

    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        spellcheck: true,
        partition,
      },
    });

    try {
      const isForceDark = tab.info.forceDarkActive !== undefined
        ? tab.info.forceDarkActive
        : (this.settings.theme === 'dark' && this.settings.forcePageDarkMode);
      const themeBg = isForceDark ? '#121214' : '#ffffff';
      view.setBackgroundColor(themeBg);
    } catch {
      // Ignore
    }

    tab.view = view;
    tab.info.isHibernated = false;

    // Ensure download manager is attached to this session (including custom profile partitions)
    if (this.downloadManager && view.webContents?.session) {
      this.downloadManager.attachSession(view.webContents.session, tab.info.isPrivate || false);
    }

    // Setup webContents event listeners
    this.setupTabEvents(tabId, view);

    // Re-apply zoom factor if customized or remembered for domain
    let effectiveZoom = tab.info.zoomFactor || 1.0;
    if (tab.info.url && tab.info.url !== 'about:blank') {
      try {
        const host = new URL(tab.info.url).hostname;
        if (this.settings.domainZoomLevels?.[host]) {
          effectiveZoom = this.settings.domainZoomLevels[host];
          tab.info.zoomFactor = effectiveZoom;
        }
      } catch {
        // Ignore
      }
    }
    if (effectiveZoom !== 1.0) {
      try {
        if (view.webContents && !view.webContents.isDestroyed()) {
          view.webContents.setZoomFactor(effectiveZoom);
        }
      } catch {
        // Ignore
      }
    }

    // Apply smart dark mode
    this.applyThemeToTab(tabId).catch(() => {});

    // Re-apply domain volume boost if remembered
    if (tab.info.url && tab.info.url !== 'about:blank') {
      try {
        const host = new URL(tab.info.url).hostname;
        if (this.settings.domainVolumeBoost?.[host] !== undefined) {
          tab.info.volumeBoost = this.settings.domainVolumeBoost[host];
        }
      } catch {
        // Ignore
      }
    }

    // Reload content transparently
    if (tab.info.url && tab.info.url !== 'about:blank') {
      tab.info.isLoading = true;
      view.webContents?.loadURL(tab.info.url).catch((err) => {
        try {
          if (view?.webContents && !view.webContents.isDestroyed() && err?.code !== 'ERR_ABORTED') {
            console.warn(`Failed to reload hibernated tab ${tabId} (${tab.info.url}):`, err);
          }
        } catch {
          // Ignore
        }
      });
    }

    return view;
  }

  public async createTab(
    initialUrl?: string,
    isPrivate = false,
    profileId?: string,
    inBackground = false
  ): Promise<string> {
    let effectiveUrl = initialUrl;
    if (!effectiveUrl && !isPrivate) {
      const mode =
        this.settings.newTabBehavior ||
        (this.settings.startupBehavior === 'custom-url' ? 'custom-url' : 'dashboard');
      const customUrl = this.settings.newTabCustomUrl || this.settings.startupCustomUrl;
      if (mode === 'custom-url' && customUrl) {
        effectiveUrl = customUrl;
      } else {
        effectiveUrl = 'about:blank';
      }
    } else if (!effectiveUrl) {
      effectiveUrl = 'about:blank';
    }

    const activeProfile = this.getActiveProfile();
    const effectiveProfileId = isPrivate ? undefined : (profileId || activeProfile.id);
    const partition = isPrivate
      ? 'incognito'
      : (effectiveProfileId ? `persist:${effectiveProfileId}` : (activeProfile.partition || undefined));

    const id = 'tab-' + Math.random().toString(36).substring(2, 9);
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        spellcheck: true,
        partition,
      },
    });

    if (this.cleanUserAgent && view.webContents) {
      view.webContents.setUserAgent(this.cleanUserAgent);
      try {
        view.webContents.session.setUserAgent(this.cleanUserAgent);
      } catch {
        // Ignore
      }
    }

    try {
      this.permissionManager.attachToSession(view.webContents.session);
    } catch {
      // Ignore
    }

    try {
      const isForceDark = this.settings.theme === 'dark' && this.settings.forcePageDarkMode;
      const themeBg = isForceDark ? '#121214' : '#ffffff';
      view.setBackgroundColor(themeBg);
    } catch {
      // Ignore
    }

    const info: TabInfo = {
      id,
      url: effectiveUrl,
      title: effectiveUrl === 'about:blank' ? (isPrivate ? 'Private Tab' : 'New Tab') : effectiveUrl,
      isLoading: effectiveUrl !== 'about:blank',
      hasLoadedPage: false,
      canGoBack: false,
      canGoForward: false,
      lastAccessed: Date.now(),
      audioPlaying: false,
      isMuted: false,
      zoomFactor: 1.0,
      volumeBoost: 100,
      isPrivate,
      profileId: effectiveProfileId,
    };

    if (effectiveUrl && effectiveUrl !== 'about:blank') {
      try {
        const host = new URL(effectiveUrl).hostname;
        if (this.settings.domainZoomLevels?.[host]) {
          info.zoomFactor = this.settings.domainZoomLevels[host];
          if (view.webContents) {
            try {
              view.webContents.setZoomFactor(info.zoomFactor);
            } catch {
              // Ignore
            }
          }
        }
        if (this.settings.domainVolumeBoost?.[host]) {
          info.volumeBoost = this.settings.domainVolumeBoost[host];
        }
      } catch {
        // Ignore
      }
    }

    this.tabs.set(id, { info, view });
    this.mruTabIds.unshift(id);

    // Setup webContents event listeners
    this.setupTabEvents(id, view);

    // Load initial URL
    if (effectiveUrl && effectiveUrl !== 'about:blank') {
      view.webContents?.loadURL(effectiveUrl).catch(err => {
        try {
          if (view?.webContents && !view.webContents.isDestroyed() && err?.code !== 'ERR_ABORTED') {
            console.error(`Failed to load ${effectiveUrl}:`, err);
          }
        } catch {
          // Ignore
        }
      });
    }

    if (inBackground && this.activeTabId) {
      // Background tab: keep current active tab focused, insert new tab next in MRU
      const activeIdx = this.mruTabIds.indexOf(this.activeTabId);
      if (activeIdx >= 0) {
        this.mruTabIds = this.mruTabIds.filter((t) => t !== id);
        this.mruTabIds.splice(activeIdx + 1, 0, id);
      }
      this.saveSession();
      this.notifyStateChange();
    } else {
      // Switch to the newly created tab
      await this.switchTab(id);
      this.saveSession();

      if (effectiveUrl === 'about:blank') {
        setTimeout(() => {
          try {
            this.window.focus();
            this.window.webContents.focus();
            this.window.webContents.send('browser:focus-omnibar');
          } catch {
            // Ignore
          }
        }, 50);
      }
    }

    return id;
  }

  private restoreTabHibernatedState(
    wc: Electron.WebContents,
    mediaTime?: number,
    scrollX = 0,
    scrollY = 0
  ) {
    if (!wc || wc.isDestroyed()) return;

    const script = `
      (() => {
        try {
          const targetTime = ${typeof mediaTime === 'number' && mediaTime > 0 ? mediaTime : 'null'};
          const targetScrollX = ${scrollX || 0};
          const targetScrollY = ${scrollY || 0};

          // 1. Restore scroll position
          if (targetScrollY > 0 || targetScrollX > 0) {
            window.scrollTo(targetScrollX, targetScrollY);
            setTimeout(() => window.scrollTo(targetScrollX, targetScrollY), 250);
            setTimeout(() => window.scrollTo(targetScrollX, targetScrollY), 800);
          }

          // 2. Restore video/audio playback position
          if (targetTime !== null && targetTime > 0) {
            let attempts = 0;
            const maxAttempts = 25; // Poll for up to ~12.5 seconds
            const interval = setInterval(() => {
              attempts++;
              let restored = false;

              // Check YouTube movie_player API first
              const ytPlayer = document.getElementById('movie_player');
              if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
                try {
                  ytPlayer.seekTo(targetTime, true);
                  restored = true;
                } catch {}
              }

              // Check HTML5 video and audio tags (YouTube, Vimeo, Twitch, podcasts, general)
              if (!restored) {
                const mediaElements = Array.from(document.querySelectorAll('video, audio'));
                for (const media of mediaElements) {
                  if (media.duration && !isNaN(media.duration) && media.duration >= targetTime) {
                    try {
                      media.currentTime = targetTime;
                      restored = true;
                    } catch {}
                  }
                }
              }

              if (restored || attempts >= maxAttempts) {
                clearInterval(interval);
              }
            }, 500);
          }
        } catch {}
      })()
    `;

    wc.executeJavaScript(script, true).catch(() => {});
  }

  private handleExternalProtocolNavigation(event: Electron.Event, url: string): boolean {
    try {
      const parsed = new URL(url);
      if (['http:', 'https:', 'about:', 'view-source:', 'data:'].includes(parsed.protocol)) {
        return false;
      }
      event.preventDefault();
      const safeExternalProtocols = [
        'mailto:', 'tel:', 'sms:', 'slack:', 'zoommtg:', 'discord:',
        'tg:', 'steam:', 'vscode:', 'github-mac:', 'github-windows:',
      ];
      if (
        safeExternalProtocols.includes(parsed.protocol) ||
        parsed.protocol.endsWith('-auth:') ||
        parsed.protocol.endsWith('-oauth:') ||
        parsed.protocol.startsWith('x-')
      ) {
        shell.openExternal(url).catch(() => {});
      } else {
        console.warn(`[Security] Blocked external navigation to: ${url}`);
      }
      return true;
    } catch {
      event.preventDefault();
      return true;
    }
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

    // Security & External Protocols: Validate navigation and redirects (including deep links)
    wc.on('will-navigate', (event, url) => {
      this.handleExternalProtocolNavigation(event, url);
    });

    wc.on('will-redirect', (event, url) => {
      this.handleExternalProtocolNavigation(event, url);
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
          if (url === 'about:blank') {
            tab.info.hasLoadedPage = false;
          }
          if (tabId === this.activeTabId && !this.isSwitcherOpen && !this.isModalOpen) {
            if (tab.info.hasLoadedPage && url && url !== 'about:blank') {
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
        if (url && url !== 'about:blank') {
          tab.info.hasLoadedPage = true;
          try {
            const host = new URL(url).hostname;
            const domainZoom = this.settings.domainZoomLevels?.[host];
            if (domainZoom && domainZoom !== tab.info.zoomFactor) {
              tab.info.zoomFactor = domainZoom;
              wc.setZoomFactor(domainZoom);
            }
            const domainBoost = this.settings.domainVolumeBoost?.[host];
            if (domainBoost !== undefined) {
              tab.info.volumeBoost = domainBoost;
            }
          } catch {
            // Ignore
          }
          if (tab.info.volumeBoost && tab.info.volumeBoost !== 100) {
            this.applyVolumeBoostToTab(tabId).catch(() => {});
          }
          if (tabId === this.activeTabId && !this.isSwitcherOpen && !this.isModalOpen) {
            this.attachActiveTabView();
          }
        } else {
          tab.info.hasLoadedPage = false;
          if (tabId === this.activeTabId && !this.isSwitcherOpen && !this.isModalOpen) {
            this.detachActiveTabView();
          }
        }
        this.addHistory(tab.info.title, url, tab.info.isPrivate);
        this.saveSession();
        this.notifyStateChange();
      }
    });

    wc.on('did-navigate-in-page', (_event, url, isMainFrame) => {
      if (isMainFrame) {
        const tab = this.tabs.get(tabId);
        if (tab) {
          tab.info.url = url;
          tab.info.title = wc.getTitle() || tab.info.title;
          tab.info.canGoBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
          tab.info.canGoForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();
          if (url && url !== 'about:blank') {
            tab.info.hasLoadedPage = true;
            try {
              const host = new URL(url).hostname;
              const domainBoost = this.settings.domainVolumeBoost?.[host];
              if (domainBoost !== undefined) {
                tab.info.volumeBoost = domainBoost;
              }
            } catch {
              // Ignore
            }
            if (tab.info.volumeBoost && tab.info.volumeBoost !== 100) {
              this.applyVolumeBoostToTab(tabId).catch(() => {});
            }
          }
          this.addHistory(tab.info.title, url, tab.info.isPrivate);
          this.saveSession();
          this.notifyStateChange();
          // Update preview in background for SPA navigation
          this.capturePreview(tabId).then((img) => {
            if (img) this.notifyStateChange();
          }).catch(() => {});
        }
      }
    });

    wc.on('dom-ready', () => {
      const tab = this.tabs.get(tabId);
      if (tab && tab.info.url && tab.info.url !== 'about:blank') {
        tab.info.hasLoadedPage = true;
        if (tabId === this.activeTabId && !this.isSwitcherOpen && !this.isModalOpen) {
          this.attachActiveTabView();
        }
        if (tab.info.volumeBoost && tab.info.volumeBoost !== 100) {
          this.applyVolumeBoostToTab(tabId).catch(() => {});
        }
        this.notifyStateChange();

        // Restore hibernated state (scroll position and video/media timer)
        if (tab.hibernatedState) {
          const { mediaTime, scrollX, scrollY } = tab.hibernatedState;
          tab.hibernatedState = undefined;
          this.restoreTabHibernatedState(wc, mediaTime, scrollX, scrollY);
        }
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
        if (tab.info.url && tab.info.url !== 'about:blank') {
          tab.info.hasLoadedPage = true;
          if (tabId === this.activeTabId && !this.isSwitcherOpen) {
            this.attachActiveTabView();
          }
        } else {
          tab.info.hasLoadedPage = false;
          if (tabId === this.activeTabId && !this.isSwitcherOpen) {
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

    // Renderer process crash & termination resilience
    wc.on('render-process-gone', (_event, details) => {
      console.error(`Tab ${tabId} render process gone: reason=${details.reason}, exitCode=${details.exitCode}`);
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.info.isCrashed = true;
        tab.info.crashedReason = details.reason;
        tab.info.isLoading = false;
        this.notifyStateChange();
      }
    });

    // Real-time zoom level sync for touchpad pinch & Ctrl+Wheel gestures
    wc.on('zoom-changed', () => {
      const tab = this.tabs.get(tabId);
      if (tab && !wc.isDestroyed()) {
        try {
          const factor = Math.round(wc.getZoomFactor() * 100) / 100;
          tab.info.zoomFactor = factor;
          if (tab.info.url && tab.info.url !== 'about:blank') {
            try {
              const host = new URL(tab.info.url).hostname;
              if (host) {
                if (!this.settings.domainZoomLevels) {
                  this.settings.domainZoomLevels = {};
                }
                if (factor === 1.0) {
                  delete this.settings.domainZoomLevels[host];
                } else {
                  this.settings.domainZoomLevels[host] = factor;
                }
                this.saveSettings();
              }
            } catch {
              // Ignore
            }
          }
          this.notifyStateChange();
        } catch {
          // Ignore
        }
      }
    });

    wc.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      // Ignore subframe / iframe failures so hidden tracking or captcha widgets don't crash the main page
      if (!isMainFrame) {
        return;
      }
      console.error(`Tab ${tabId} failed to load ${validatedURL}: [${errorCode}] ${errorDescription}`);
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.info.isLoading = false;
        // Don't show error page for aborted requests (e.g. user navigated away or HTTP redirects) or custom app schemes
        const isAborted = errorCode === -3; // ERR_ABORTED
        const isUnknownScheme = errorCode === -302; // ERR_UNKNOWN_URL_SCHEME
        const isInternalUrl = validatedURL.startsWith('data:') || validatedURL === 'about:blank';
        if (!isAborted && !isUnknownScheme && validatedURL && !isInternalUrl) {
          const errorHtml = this.generateErrorPage(validatedURL, errorCode, errorDescription);
          wc.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`).catch(() => {});
        }
        if (tab.info.url && tab.info.url !== 'about:blank') {
          tab.info.hasLoadedPage = true;
          if (tabId === this.activeTabId && !this.isSwitcherOpen) {
            this.attachActiveTabView();
          }
        }
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

    // Handle window.open (OAuth popups, SSO login windows, or target="_blank" links)
    wc.setWindowOpenHandler((details) => {
      try {
        let isSafeProtocol = false;
        if (!details.url || details.url === 'about:blank') {
          isSafeProtocol = true;
        } else {
          const parsed = new URL(details.url);
          isSafeProtocol = ['http:', 'https:', 'about:', 'view-source:'].includes(parsed.protocol);
        }

        if (!isSafeProtocol) {
          console.warn(`[Security] Blocked popup request to unsafe protocol: ${details.url}`);
          return { action: 'deny' };
        }

        const currentTab = this.tabs.get(tabId);
        const isPrivate = currentTab?.info.isPrivate || false;
        const profileId = currentTab?.info.profileId;
        const partition = isPrivate
          ? 'incognito'
          : (profileId ? `persist:${profileId}` : (this.getActiveProfile().partition || undefined));

        // Detect if this is an OAuth / SSO login popup or auxiliary dialog (features defined with dimensions or specific disposition)
        const hasFeatures = !!(details.features && details.features.trim().length > 0);
        const isNewWindow = details.disposition === 'new-window';
        const hasNonBlankFrame = !!(details.frameName && details.frameName !== '_blank');

        if (hasFeatures || (isNewWindow && hasNonBlankFrame)) {
          // Allow native child window so window.opener, postMessage, and window.close() work seamlessly for OAuth/SSO
          return {
            action: 'allow',
            overrideBrowserWindowOptions: {
              parent: this.window,
              modal: false,
              autoHideMenuBar: true,
              backgroundColor: this.settings.theme === 'dark' ? '#121214' : '#ffffff',
              webPreferences: {
                partition,
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                spellcheck: true,
              },
            },
          };
        }

        // Standard link opened with target="_blank", middle-click, or Ctrl+click -> open as a regular browser tab
        if (details.url && details.url !== 'about:blank') {
          const isBackground = details.disposition === 'background-tab';
          this.createTab(details.url, isPrivate, profileId, isBackground);
        }
      } catch (err) {
        console.error('Error handling window open:', err);
      }
      return { action: 'deny' };
    });

    // Listen for child popup window creation to configure clean User-Agent and external link handlers
    wc.on('did-create-window', (childWindow) => {
      try {
        childWindow.setMenu(null);
        if (this.cleanUserAgent) {
          childWindow.webContents.setUserAgent(this.cleanUserAgent);
        }
        childWindow.webContents.on('will-navigate', (event, url) => {
          this.handleExternalProtocolNavigation(event, url);
        });
        childWindow.webContents.on('will-redirect', (event, url) => {
          this.handleExternalProtocolNavigation(event, url);
        });
      } catch (err) {
        console.error('Error configuring child popup window:', err);
      }
    });

    // When in-page JavaScript calls window.close() or webContents is destroyed, close the tab
    wc.on('destroyed', () => {
      this.closeTab(tabId);
    });

    // In-Page Context Menu
    wc.on('context-menu', (_event, params) => {
      this.showContextMenu(tabId, params);
    });

    // HTML5 Fullscreen for embedded videos (YouTube, Netflix, Twitch)
    wc.on('enter-html-full-screen', () => {
      if (tabId === this.activeTabId) {
        this.isHtmlFullscreen = true;
        this.updateActiveViewBounds();
        this.window.webContents.send('browser:html-fullscreen', true);
      }
    });

    wc.on('leave-html-full-screen', () => {
      if (tabId === this.activeTabId) {
        this.isHtmlFullscreen = false;
        this.updateActiveViewBounds();
        this.window.webContents.send('browser:html-fullscreen', false);
      }
    });
  }

  private generateErrorPage(url: string, errorCode: number, errorDescription: string): string {
    const isDark = this.settings.theme !== 'light';
    const bg = isDark ? '#121214' : '#f8fafc';
    const text = isDark ? '#f4f4f5' : '#0f172a';
    const textMuted = isDark ? '#a1a1aa' : '#64748b';
    const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#ffffff';
    const border = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
    const accent = '#6366f1';

    let friendlyMsg = 'An unexpected connection error occurred.';
    if (errorCode === -105) friendlyMsg = 'The server IP address could not be found (DNS lookup failed).';
    else if (errorCode === -106) friendlyMsg = 'You are currently offline. Check your internet or Wi-Fi connection.';
    else if (errorCode === -102) friendlyMsg = 'The target server refused the connection.';
    else if (errorCode === -118) friendlyMsg = 'The server took too long to respond (connection timed out).';
    else if (errorCode <= -200 && errorCode >= -299) friendlyMsg = 'The site presented an invalid security certificate.';

    const safeUrl = url.replace(/'/g, "\\'");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Can't reach this page</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${bg};
      color: ${text};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      user-select: none;
    }
    .card {
      background: ${cardBg};
      border: 1px solid ${border};
      border-radius: 18px;
      max-width: 520px;
      width: 100%;
      padding: 36px 32px;
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.3);
      text-align: center;
    }
    .icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 8px; letter-spacing: -0.02em; }
    p.desc { font-size: 13px; color: ${textMuted}; line-height: 1.5; margin-bottom: 18px; }
    .url-pill {
      font-family: monospace;
      font-size: 11px;
      background: rgba(128,128,128,0.1);
      padding: 6px 12px;
      border-radius: 8px;
      word-break: break-all;
      color: ${textMuted};
      margin-bottom: 16px;
      display: inline-block;
      max-width: 100%;
    }
    .code-badge {
      font-family: monospace;
      font-size: 10px;
      color: ${textMuted};
      display: block;
      margin-bottom: 24px;
      opacity: 0.8;
    }
    .btn {
      background: ${accent};
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 10px 22px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.15s;
    }
    .btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn:active { transform: translateY(0); }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    </div>
    <h1>This site can’t be reached</h1>
    <p class="desc">${friendlyMsg}</p>
    <div class="url-pill">${url}</div>
    <div class="code-badge">${errorDescription} (${errorCode})</div>
    <button class="btn" onclick="window.location.href='${safeUrl}'">Try Again</button>
  </div>
</body>
</html>`;
  }

  private showContextMenu(tabId: string, params: Electron.ContextMenuParams) {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.view || tab.view.webContents.isDestroyed()) return;
    const wc = tab.view.webContents;
    const menu = new Menu();

    const userLocale = app.getLocale() || 'en-US';
    const langCode = userLocale.split('-')[0].toLowerCase() || 'en';
    let targetLangName = 'English';
    try {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
      targetLangName = displayNames.of(langCode) || 'English';
    } catch {
      targetLangName = 'English';
    }

    // 1. Misspelled Word Suggestions (Spellcheck)
    if (params.misspelledWord && params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(
          new MenuItem({
            label: suggestion,
            click: () => wc.replaceMisspelling(suggestion),
          })
        );
      }
      menu.append(
        new MenuItem({
          label: `Add to Dictionary`,
          click: () => wc.session.addWordToSpellCheckerDictionary(params.misspelledWord),
        })
      );
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // 2. Link Context Menu
    if (params.linkURL) {
      menu.append(
        new MenuItem({
          label: 'Open Link in New Tab',
          click: () => this.createTab(params.linkURL, false, undefined, false),
        })
      );
      menu.append(
        new MenuItem({
          label: 'Open Link in Background Tab',
          click: () => this.createTab(params.linkURL, false, undefined, true),
        })
      );
      menu.append(
        new MenuItem({
          label: 'Open Link in New Private Tab',
          click: () => this.createTab(params.linkURL, true, undefined, false),
        })
      );
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(
        new MenuItem({
          label: 'Save Link As...',
          click: () => wc.downloadURL(params.linkURL),
        })
      );
      menu.append(
        new MenuItem({
          label: 'Copy Link Address',
          click: () => clipboard.writeText(params.linkURL),
        })
      );
      if (params.linkText && params.linkText.trim()) {
        menu.append(
          new MenuItem({
            label: 'Copy Link Text',
            click: () => clipboard.writeText(params.linkText.trim()),
          })
        );
      }
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // 3. Image / Media Context Menu
    if (params.hasImageContents || params.mediaType === 'image') {
      if (params.srcURL) {
        menu.append(
          new MenuItem({
            label: 'Open Image in New Tab',
            click: () => this.createTab(params.srcURL, false, undefined, false),
          })
        );
        menu.append(
          new MenuItem({
            label: 'Open Image in Background Tab',
            click: () => this.createTab(params.srcURL, false, undefined, true),
          })
        );
        menu.append(
          new MenuItem({
            label: 'Save Image As...',
            click: () => wc.downloadURL(params.srcURL),
          })
        );
      }
      menu.append(
        new MenuItem({
          label: 'Copy Image',
          click: () => wc.copyImageAt(params.x, params.y),
        })
      );
      if (params.srcURL) {
        menu.append(
          new MenuItem({
            label: 'Copy Image Address',
            click: () => clipboard.writeText(params.srcURL),
          })
        );
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(
          new MenuItem({
            label: 'Search Image with Google Lens',
            click: () => {
              const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(params.srcURL)}`;
              this.createTab(lensUrl, tab.info.isPrivate);
            },
          })
        );
      }
      menu.append(new MenuItem({ type: 'separator' }));
    } else if (params.mediaType === 'video' || params.mediaType === 'audio') {
      if (params.srcURL) {
        menu.append(
          new MenuItem({
            label: `Open ${params.mediaType === 'video' ? 'Video' : 'Audio'} in New Tab`,
            click: () => this.createTab(params.srcURL, false),
          })
        );
        menu.append(
          new MenuItem({
            label: `Save ${params.mediaType === 'video' ? 'Video' : 'Audio'} As...`,
            click: () => wc.downloadURL(params.srcURL),
          })
        );
        menu.append(
          new MenuItem({
            label: 'Copy Media Address',
            click: () => clipboard.writeText(params.srcURL),
          })
        );
      }
      if (params.mediaType === 'video') {
        menu.append(
          new MenuItem({
            label: 'Picture in Picture',
            click: () => {
              wc.executeJavaScript(`
                (function() {
                  const video = document.elementFromPoint(${params.x}, ${params.y})?.closest('video') || document.querySelector('video');
                  if (video) {
                    if (document.pictureInPictureElement) {
                      document.exitPictureInPicture();
                    } else if (document.pictureInPictureEnabled) {
                      video.requestPictureInPicture();
                    }
                  }
                })()
              `).catch(() => {});
            },
          })
        );
      }
      menu.append(
        new MenuItem({
          label: 'Toggle Loop',
          click: () => {
            wc.executeJavaScript(`
              (function() {
                const media = document.elementFromPoint(${params.x}, ${params.y})?.closest('video, audio') || document.querySelector('video, audio');
                if (media) media.loop = !media.loop;
              })()
            `).catch(() => {});
          },
        })
      );

      // Volume Boost submenu for media
      const boostSubmenu = new Menu();
      const currentBoost = tab.info.volumeBoost ?? 100;
      [100, 150, 200, 300, 400, 600].forEach((pct) => {
        boostSubmenu.append(
          new MenuItem({
            label: pct === 100 ? '100% (Normal)' : `${pct}% Boost`,
            type: 'checkbox',
            checked: currentBoost === pct,
            click: () => this.setTabVolumeBoost(tabId, pct),
          })
        );
      });
      menu.append(
        new MenuItem({
          label: `Volume Boost (${currentBoost}%)`,
          submenu: boostSubmenu,
        })
      );
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // 4. Selection Text Menu
    if (params.selectionText && params.selectionText.trim()) {
      const selected = params.selectionText.trim();
      const truncated = selected.length > 25 ? selected.substring(0, 25) + '…' : selected;
      const engineName =
        this.settings.defaultSearchEngine.charAt(0).toUpperCase() + this.settings.defaultSearchEngine.slice(1);

      menu.append(
        new MenuItem({
          label: 'Copy',
          role: 'copy',
        })
      );
      menu.append(
        new MenuItem({
          label: `Search ${engineName} for "${truncated}"`,
          click: () => {
            const searchUrl = getSearchUrl(this.settings.defaultSearchEngine, selected);
            this.createTab(searchUrl, tab.info.isPrivate);
          },
        })
      );

      // Direct navigation if selected text is a valid web address or hostname
      let directNavUrl: string | null = null;
      if (/^https?:\/\/[^\s]+$/i.test(selected)) {
        directNavUrl = selected;
      } else if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/i.test(selected)) {
        directNavUrl = 'https://' + selected;
      }
      if (directNavUrl) {
        menu.append(
          new MenuItem({
            label: `Go to ${selected.length > 30 ? selected.substring(0, 30) + '…' : selected}`,
            click: () => this.createTab(directNavUrl!, tab.info.isPrivate),
          })
        );
      }

      menu.append(new MenuItem({ type: 'separator' }));

      // Selection translation options
      menu.append(
        new MenuItem({
          label: `Translate selection to ${targetLangName}`,
          click: () => {
            const transUrl = `https://translate.google.com/?sl=auto&tl=${langCode}&text=${encodeURIComponent(selected)}&op=translate`;
            this.createTab(transUrl, tab.info.isPrivate);
          },
        })
      );

      const selTransSubmenu = new Menu();
      selTransSubmenu.append(
        new MenuItem({
          label: `Google Translate (${targetLangName})`,
          click: () => {
            const transUrl = `https://translate.google.com/?sl=auto&tl=${langCode}&text=${encodeURIComponent(selected)}&op=translate`;
            this.createTab(transUrl, tab.info.isPrivate);
          },
        })
      );
      selTransSubmenu.append(
        new MenuItem({
          label: `DeepL Translator`,
          click: () => {
            const transUrl = `https://www.deepl.com/translator#auto/${langCode}/${encodeURIComponent(selected)}`;
            this.createTab(transUrl, tab.info.isPrivate);
          },
        })
      );
      menu.append(
        new MenuItem({
          label: 'Translate with...',
          submenu: selTransSubmenu,
        })
      );

      menu.append(new MenuItem({ type: 'separator' }));
    }

    // 5. Editable Area (Inputs, Textareas)
    if (params.isEditable) {
      menu.append(new MenuItem({ label: 'Undo', role: 'undo', enabled: params.editFlags.canUndo }));
      menu.append(new MenuItem({ label: 'Redo', role: 'redo', enabled: params.editFlags.canRedo }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Cut', role: 'cut', enabled: params.editFlags.canCut }));
      menu.append(new MenuItem({ label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy }));
      menu.append(new MenuItem({ label: 'Paste', role: 'paste', enabled: params.editFlags.canPaste }));
      menu.append(
        new MenuItem({
          label: 'Paste and Match Style',
          role: 'pasteAndMatchStyle',
          enabled: params.editFlags.canPaste,
        })
      );
      menu.append(new MenuItem({ label: 'Select All', role: 'selectAll', enabled: params.editFlags.canSelectAll }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // 6. Navigation & Page Controls (when not clicking on an editable or link)
    if (!params.linkURL && !params.isEditable) {
      const canGoBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
      const canGoForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();

      menu.append(
        new MenuItem({
          label: 'Back',
          enabled: canGoBack,
          click: () => {
            if (wc.navigationHistory) wc.navigationHistory.goBack();
            else wc.goBack();
          },
        })
      );
      menu.append(
        new MenuItem({
          label: 'Forward',
          enabled: canGoForward,
          click: () => {
            if (wc.navigationHistory) wc.navigationHistory.goForward();
            else wc.goForward();
          },
        })
      );
      menu.append(
        new MenuItem({
          label: 'Reload',
          click: () => wc.reload(),
        })
      );
      menu.append(new MenuItem({ type: 'separator' }));

      // Save Page As...
      if (tab.info.url && tab.info.url.startsWith('http')) {
        menu.append(
          new MenuItem({
            label: 'Save Page As...',
            accelerator: 'Ctrl+S',
            click: () => this.savePage(tabId),
          })
        );
      }

      // Copy Page Address
      if (tab.info.url && tab.info.url !== 'about:blank') {
        menu.append(
          new MenuItem({
            label: 'Copy Page Address',
            click: () => clipboard.writeText(tab.info.url),
          })
        );
      }

      // Bookmark page
      if (tab.info.url && tab.info.url !== 'about:blank') {
        menu.append(
          new MenuItem({
            label: 'Bookmark Page...',
            click: () => {
              this.addBookmark({
                title: tab.info.title || tab.info.url,
                url: tab.info.url,
                favicon: tab.info.favicon,
              });
            },
          })
        );
      }

      // Page Translation
      if (tab.info.url && tab.info.url.startsWith('http')) {
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(
          new MenuItem({
            label: `Translate to ${targetLangName}`,
            click: () => {
              const url = `https://translate.google.com/translate?sl=auto&tl=${langCode}&u=${encodeURIComponent(tab.info.url)}`;
              this.createTab(url, tab.info.isPrivate);
            },
          })
        );

        const pageTransSubmenu = new Menu();
        pageTransSubmenu.append(
          new MenuItem({
            label: `Google Translate (${targetLangName})`,
            click: () => {
              const url = `https://translate.google.com/translate?sl=auto&tl=${langCode}&u=${encodeURIComponent(tab.info.url)}`;
              this.createTab(url, tab.info.isPrivate);
            },
          })
        );
        pageTransSubmenu.append(
          new MenuItem({
            label: `In-Page Translation Widget`,
            click: () => this.translatePage(tabId, langCode),
          })
        );
        pageTransSubmenu.append(
          new MenuItem({
            label: `DeepL Translator`,
            click: () => {
              const url = `https://www.deepl.com/translator#auto/${langCode}/${encodeURIComponent(tab.info.url)}`;
              this.createTab(url, tab.info.isPrivate);
            },
          })
        );
        menu.append(
          new MenuItem({
            label: 'Translate Options',
            submenu: pageTransSubmenu,
          })
        );

        const pageBoostSubmenu = new Menu();
        const currentBoost = tab.info.volumeBoost ?? 100;
        [100, 150, 200, 300, 400, 600].forEach((pct) => {
          pageBoostSubmenu.append(
            new MenuItem({
              label: pct === 100 ? '100% (Normal)' : `${pct}% Boost`,
              type: 'checkbox',
              checked: currentBoost === pct,
              click: () => this.setTabVolumeBoost(tabId, pct),
            })
          );
        });
        menu.append(
          new MenuItem({
            label: `Volume Boost (${currentBoost}%)`,
            submenu: pageBoostSubmenu,
          })
        );
      }

      menu.append(new MenuItem({ type: 'separator' }));

      menu.append(
        new MenuItem({
          label: 'Print...',
          accelerator: 'Ctrl+P',
          click: () => wc.print(),
        })
      );

      if (tab.info.url && tab.info.url.startsWith('http')) {
        menu.append(
          new MenuItem({
            label: 'View Page Source',
            accelerator: 'Ctrl+U',
            click: () => this.createTab('view-source:' + tab.info.url, tab.info.isPrivate),
          })
        );

        const isForceDarkActive = tab.info.forceDarkActive !== undefined
          ? tab.info.forceDarkActive
          : (this.settings.theme === 'dark' && this.settings.forcePageDarkMode);
        menu.append(
          new MenuItem({
            label: isForceDarkActive ? 'Disable Dark Mode on This Tab' : 'Force Dark Mode on This Tab',
            click: () => this.toggleTabForceDark(tabId),
          })
        );

        menu.append(
          new MenuItem({
            label: tab.info.isPinned ? 'Unpin This Tab' : 'Pin This Tab',
            click: () => this.togglePinTab(tabId),
          })
        );
      }
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // 7. Developer Inspection Tools
    menu.append(
      new MenuItem({
        label: 'Inspect Element',
        click: () => {
          wc.inspectElement(params.x, params.y);
          if (!wc.isDevToolsOpened()) {
            wc.openDevTools({ mode: 'right' });
          }
        },
      })
    );

    menu.popup({ window: this.window });
  }

  public async duplicateTab(tabId?: string): Promise<string | null> {
    const targetId = tabId || this.activeTabId;
    if (!targetId || !this.tabs.has(targetId)) return null;
    const tab = this.tabs.get(targetId)!;
    const newTabId = await this.createTab(tab.info.url, tab.info.isPrivate);
    return newTabId;
  }

  public closeOtherTabs(tabId: string) {
    const toClose = Array.from(this.tabs.entries())
      .filter(([id, tab]) => id !== tabId && !tab.info.isPinned)
      .map(([id]) => id);
    for (const id of toClose) {
      this.closeTab(id);
    }
  }

  public closeTabsToRight(tabId: string) {
    const entries = Array.from(this.tabs.entries());
    const targetIndex = entries.findIndex(([id]) => id === tabId);
    if (targetIndex !== -1) {
      const toClose = entries
        .slice(targetIndex + 1)
        .filter(([, tab]) => !tab.info.isPinned)
        .map(([id]) => id);
      for (const id of toClose) {
        this.closeTab(id);
      }
    }
  }

  public async savePage(tabId?: string): Promise<void> {
    const targetId = tabId || this.activeTabId;
    if (!targetId || !this.tabs.has(targetId)) return;
    const tab = this.tabs.get(targetId)!;
    if (!tab.view || tab.view.webContents.isDestroyed()) return;
    const wc = tab.view.webContents;
    if (!tab.info.url || tab.info.url === 'about:blank') return;

    try {
      const rawTitle = tab.info.title || 'webpage';
      const safeTitle = rawTitle.replace(/[/\\?%*:|"<>]/g, '_').substring(0, 80);
      const { canceled, filePath } = await dialog.showSaveDialog(this.window, {
        title: 'Save Webpage',
        defaultPath: `${safeTitle}.html`,
        filters: [
          { name: 'Webpage, Complete (*.html)', extensions: ['html', 'htm'] },
          { name: 'Webpage, Single File (*.mhtml)', extensions: ['mhtml'] },
          { name: 'Webpage, HTML Only (*.html)', extensions: ['html', 'htm'] },
        ],
      });
      if (!canceled && filePath) {
        let saveType: 'HTMLComplete' | 'MHTML' | 'HTMLOnly' = 'HTMLComplete';
        if (filePath.endsWith('.mhtml')) {
          saveType = 'MHTML';
        } else if (filePath.endsWith('.htm') || filePath.endsWith('.html')) {
          saveType = 'HTMLComplete';
        }
        await wc.savePage(filePath, saveType);
      }
    } catch (err) {
      console.error('Failed to save page:', err);
    }
  }

  public async translatePage(tabId?: string, targetLang?: string): Promise<void> {
    const targetId = tabId || this.activeTabId;
    if (!targetId || !this.tabs.has(targetId)) return;
    const tab = this.tabs.get(targetId)!;
    if (!tab.view || tab.view.webContents.isDestroyed()) return;
    const wc = tab.view.webContents;
    if (!tab.info.url || !tab.info.url.startsWith('http')) return;

    const userLocale = app.getLocale() || 'en-US';
    const lang = targetLang || userLocale.split('-')[0].toLowerCase() || 'en';

    const script = `
      (function() {
        const existing = document.getElementById('larp-translate-widget');
        if (existing) {
          existing.style.display = existing.style.display === 'none' ? 'flex' : 'none';
          return;
        }

        const container = document.createElement('div');
        container.id = 'larp-translate-widget';
        container.style.cssText = [
          'position: fixed',
          'top: 14px',
          'right: 20px',
          'z-index: 2147483647',
          'background: #18181b',
          'color: #f4f4f5',
          'border: 1px solid rgba(255, 255, 255, 0.15)',
          'border-radius: 12px',
          'box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5)',
          'padding: 8px 14px',
          'font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          'font-size: 13px',
          'display: flex',
          'align-items: center',
          'gap: 12px',
          'box-sizing: border-box'
        ].join(';');

        const label = document.createElement('div');
        label.style.cssText = 'display: flex; align-items: center; gap: 6px; font-weight: 600; white-space: nowrap;';
        label.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> <span>Translate</span>';

        const elemContainer = document.createElement('div');
        elemContainer.id = 'google_translate_element';

        const webFallback = document.createElement('a');
        webFallback.href = 'https://translate.google.com/translate?sl=auto&tl=' + encodeURIComponent('${lang}') + '&u=' + encodeURIComponent(window.location.href);
        webFallback.target = '_blank';
        webFallback.innerText = 'Web View ↗';
        webFallback.style.cssText = 'color: #93c5fd; text-decoration: none; font-size: 12px; font-weight: 500; cursor: pointer; padding: 2px 6px; border-radius: 4px; background: rgba(147, 197, 253, 0.1); border: 1px solid rgba(147, 197, 253, 0.2); white-space: nowrap;';

        const closeBtn = document.createElement('button');
        closeBtn.innerText = '✕';
        closeBtn.title = 'Close';
        closeBtn.style.cssText = 'background: transparent; border: none; color: #a1a1aa; font-size: 13px; cursor: pointer; padding: 2px 6px; border-radius: 4px; line-height: 1;';
        closeBtn.onclick = () => container.remove();

        container.appendChild(label);
        container.appendChild(elemContainer);
        container.appendChild(webFallback);
        container.appendChild(closeBtn);
        document.body.appendChild(container);

        window.googleTranslateElementInit = function() {
          new window.google.translate.TranslateElement({
            pageLanguage: 'auto',
            includedLanguages: '${lang},en,es,fr,de,ja,zh-CN,ru,pt,it,ko,ar,hi',
            autoDisplay: true,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
          }, 'google_translate_element');
        };

        const script = document.createElement('script');
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.onerror = () => {
          elemContainer.innerHTML = '<span style="color: #f87171; font-size: 12px;">Script blocked by site policy.</span>';
        };
        document.head.appendChild(script);
      })();
    `;

    try {
      await wc.executeJavaScript(script);
    } catch (err) {
      console.error('Failed to inject translation script:', err);
      const url = `https://translate.google.com/translate?sl=auto&tl=${lang}&u=${encodeURIComponent(tab.info.url)}`;
      this.createTab(url, tab.info.isPrivate);
    }
  }

  public print(tabId?: string) {
    const targetId = tabId || this.activeTabId;
    if (!targetId || !this.tabs.has(targetId)) return;
    const tab = this.tabs.get(targetId)!;
    if (tab.view && !tab.view.webContents.isDestroyed()) {
      tab.view.webContents.print();
    }
  }

  public toggleDevTools(tabId?: string) {
    const targetId = tabId || this.activeTabId;
    if (!targetId || !this.tabs.has(targetId)) return;
    const tab = this.tabs.get(targetId)!;
    if (tab.view && !tab.view.webContents.isDestroyed()) {
      if (tab.view.webContents.isDevToolsOpened()) {
        tab.view.webContents.closeDevTools();
      } else {
        tab.view.webContents.openDevTools({ mode: 'right' });
      }
    }
  }

  public async capturePreview(tabId: string): Promise<string | undefined> {
    const tab = this.tabs.get(tabId);
    if (!tab) return undefined;
    const wc = tab.view?.webContents;
    if (!wc || wc.isDestroyed()) {
      return tab.info.previewImage;
    }
    if (!tab.info.url || tab.info.url === 'about:blank') return undefined;

    try {
      if (!tab.view?.webContents || tab.view.webContents.isDestroyed()) return tab.info.previewImage;
      // Race capturePage with a 400ms timeout guard in case view is detached or compositor unpainted
      const capturePromise = wc.capturePage();
      const timeoutPromise = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 400));
      const image = await Promise.race([capturePromise, timeoutPromise]);
      if (!image || (image as any).isEmpty?.()) return tab.info.previewImage;
      // High-performance downscale for thumbnail card and modal background: crisp 1280px resolution
      const thumbnail = (image as any).resize({ width: 1280, quality: 'good' });
      const preview = thumbnail.toDataURL();
      tab.info.previewImage = preview;
      return preview;
    } catch {
      // Quietly ignore if frame has not painted yet
      return tab.info.previewImage;
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
      if (prevTab.view) {
        try {
          this.window.contentView.removeChildView(prevTab.view);
        } catch {
          // Ignore if not already attached
        }
      }
    }

    this.activeTabId = tabId;
    const currentTab = this.tabs.get(tabId)!;
    currentTab.info.lastAccessed = Date.now();
    currentTab.info.isHibernated = false;
    currentTab.info.savedMediaTime = undefined;

    // Ensure tab has an active WebContentsView (resurrects if hibernated)
    this.ensureTabView(tabId);

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

    // If active tab is about:blank or has not loaded a webpage yet, keep detached so the New Tab React dashboard is visible
    if (!tab.info.url || tab.info.url === 'about:blank' || !tab.info.hasLoadedPage) {
      this.detachActiveTabView();
      return;
    }

    const view = this.ensureTabView(this.activeTabId);

    // Detach any other tab's view
    for (const [id, otherTab] of this.tabs) {
      if (id !== this.activeTabId && otherTab.view) {
        try {
          if (this.window.contentView.children.includes(otherTab.view)) {
            this.window.contentView.removeChildView(otherTab.view);
          }
        } catch {
          // Ignore
        }
      }
    }

    if (!this.window.contentView.children.includes(view)) {
      this.window.contentView.addChildView(view);
    }
    this.updateActiveViewBounds();
    try {
      view.webContents.focus();
    } catch {
      // Ignore
    }
  }

  public detachActiveTabView() {
    if (!this.activeTabId || !this.tabs.has(this.activeTabId)) return;
    const tab = this.tabs.get(this.activeTabId)!;
    if (tab.view) {
      try {
        if (this.window.contentView.children.includes(tab.view)) {
          this.window.contentView.removeChildView(tab.view);
        }
      } catch {
        // Ignore
      }
    }
    try {
      this.window.focus();
      this.window.webContents.focus();
    } catch {
      // Ignore
    }
  }

  public updateActiveViewBounds() {
    if (!this.activeTabId || this.isSwitcherOpen || this.isModalOpen) return;
    const tab = this.tabs.get(this.activeTabId);
    if (!tab || !tab.view || !tab.info.url || tab.info.url === 'about:blank') return;

    const [width, height] = this.window.getContentSize();
    if (this.isHtmlFullscreen) {
      tab.view.setBounds({
        x: 0,
        y: 0,
        width,
        height,
      });
      return;
    }

    const hasPinnedTabs = Array.from(this.tabs.values()).some((t) => t.info.isPinned);
    const showSidebar = (this.settings.showPinnedSidebar ?? true) && hasPinnedTabs;
    const sidebarWidth = showSidebar ? PINNED_SIDEBAR_WIDTH : 0;

    const topOffset =
      TOP_BAR_HEIGHT +
      (this.settings.showBookmarksBar ? BOOKMARKS_BAR_HEIGHT : 0) +
      (this.isFindOpen ? FIND_BAR_HEIGHT : 0);
    tab.view.setBounds({
      x: sidebarWidth,
      y: topOffset,
      width: Math.max(0, width - sidebarWidth),
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
      // Capture live page preview BEFORE detaching while view is still attached and rendered
      if (this.activeTabId && this.tabs.has(this.activeTabId)) {
        const tab = this.tabs.get(this.activeTabId)!;
        if (tab.view && !tab.view.webContents.isDestroyed() && tab.info.hasLoadedPage) {
          try {
            const img = await tab.view.webContents.capturePage();
            if (img && !(img as any).isEmpty?.()) {
              tab.info.previewImage = img.toDataURL();
            }
          } catch {
            // Ignore if frame is busy
          }
        }
      }
      this.detachActiveTabView();
      // Ensure shell window has immediate keyboard focus for shortcuts and escape handling
      this.window.focus();
      this.window.webContents.focus();
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

    if (tab.view) {
      const viewToDestroy = tab.view;
      tab.view = undefined;

      try {
        this.window.contentView.removeChildView(viewToDestroy);
      } catch {
        // Ignore
      }

      // Destroy webContents
      try {
        if (viewToDestroy.webContents && !viewToDestroy.webContents.isDestroyed()) {
          this.permissionManager.cleanupForWebContents(viewToDestroy.webContents.id);
          (viewToDestroy.webContents as any).destroy?.();
        }
      } catch {
        // Ignore
      }
    }

    // Save to closed tabs history stack (up to 25 entries, excluding blank/new tabs)
    if (tab.info.url && tab.info.url !== 'about:blank') {
      this.closedTabs.push({
        url: tab.info.url,
        title: tab.info.title || 'Untitled',
        isPrivate: tab.info.isPrivate || false,
        scrollX: tab.hibernatedState?.scrollX,
        scrollY: tab.hibernatedState?.scrollY,
        mediaTime: tab.hibernatedState?.mediaTime || tab.info.savedMediaTime,
        profileId: tab.info.profileId,
      });
      if (this.closedTabs.length > 25) {
        this.closedTabs.shift();
      }
    }

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

  public async reopenClosedTab(): Promise<string | null> {
    if (this.closedTabs.length === 0) return null;
    const item = this.closedTabs.pop();
    if (!item) return null;

    const newTabId = await this.createTab(item.url, item.isPrivate);
    const tab = this.tabs.get(newTabId);
    if (tab) {
      if (item.title) tab.info.title = item.title;
      if (item.profileId) tab.info.profileId = item.profileId;
      if (typeof item.mediaTime === 'number' || item.scrollX || item.scrollY) {
        tab.hibernatedState = {
          mediaTime: item.mediaTime,
          scrollX: item.scrollX,
          scrollY: item.scrollY,
        };
        tab.info.savedMediaTime = item.mediaTime;
      }
    }
    this.notifyStateChange();
    return newTabId;
  }

  public async navigateTab(tabId: string, input: string) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    let targetUrl = input.trim();
    const bangMatch = parseBangQuery(targetUrl);
    if (bangMatch) {
      targetUrl = bangMatch.targetUrl;
    } else {
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
      } else if (!/^https?:\/\//i.test(targetUrl) && !/^about:/i.test(targetUrl) && !/^view-source:/i.test(targetUrl)) {
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
    }

    tab.info.url = targetUrl;
    tab.info.isLoading = true;

    if (targetUrl === 'about:blank') {
      tab.info.hasLoadedPage = false;
    }

    const view = this.ensureTabView(tabId);

    // Only attach immediately if this active tab already has a loaded page (in-place navigation)
    if (tabId === this.activeTabId && !this.isSwitcherOpen) {
      if (tab.info.hasLoadedPage && targetUrl !== 'about:blank') {
        this.attachActiveTabView();
      } else {
        this.detachActiveTabView();
      }
    }

    this.notifyStateChange();

    try {
      await view.webContents.loadURL(targetUrl);
    } catch (err: any) {
      if (!view.webContents.isDestroyed() && err?.code !== 'ERR_ABORTED') {
        console.error(`Failed to navigate tab ${tabId} to ${targetUrl}:`, err);
      }
    }
  }

  public goBack(tabId: string) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    const view = this.ensureTabView(tabId);
    const wc = view.webContents;
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
    const view = this.ensureTabView(tabId);
    const wc = view.webContents;
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
      const view = this.ensureTabView(tabId);
      view.webContents.reload();
    }
  }

  public toggleMuteTab(tabId: string) {
    const tab = this.tabs.get(tabId);
    if (tab) {
      const isMuted = tab.view?.webContents ? !tab.view.webContents.isAudioMuted() : !tab.info.isMuted;
      try {
        if (tab.view?.webContents && !tab.view.webContents.isDestroyed()) {
          tab.view.webContents.setAudioMuted(isMuted);
        }
      } catch {
        // Ignore
      }
      tab.info.isMuted = isMuted;
      this.notifyStateChange();
    }
  }

  public async toggleTabForceDark(targetTabId?: string): Promise<void> {
    const tabId = targetTabId || this.activeTabId;
    if (!tabId) return;
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    const currentActive = tab.info.forceDarkActive !== undefined
      ? tab.info.forceDarkActive
      : (this.settings.theme === 'dark' && this.settings.forcePageDarkMode);

    tab.info.forceDarkActive = !currentActive;
    await this.applyThemeToTab(tabId);
    this.notifyStateChange();
  }

  public pinTab(tabId: string) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    tab.info.isPinned = true;
    this.saveSession();
    this.updateActiveViewBounds();
    this.notifyStateChange();
  }

  public unpinTab(tabId: string) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    tab.info.isPinned = false;
    this.saveSession();
    this.updateActiveViewBounds();
    this.notifyStateChange();
  }

  public togglePinTab(tabId: string) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    if (tab.info.isPinned) {
      this.unpinTab(tabId);
    } else {
      this.pinTab(tabId);
    }
  }

  // --- Alt-Tab / Ctrl-Tab Switcher HUD Controls ---

  private switcherOpenedWithModifier = false;

  public async openSwitcher(openedWithModifier = false) {
    if (this.tabs.size === 0) return;

    this.switcherOpenedWithModifier = openedWithModifier;
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
    this.switcherOpenedWithModifier = false;
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

  public async commitSwitcher(onlyIfModifier = false) {
    if (!this.isSwitcherOpen) return;
    if (onlyIfModifier && !this.switcherOpenedWithModifier) return;
    this.switcherOpenedWithModifier = false;
    const targetTabId = this.mruTabIds[this.selectedSwitcherIndex];
    this.isSwitcherOpen = false;

    if (targetTabId) {
      await this.switchTab(targetTabId);
    } else {
      this.attachActiveTabView();
      this.notifyStateChange();
    }
  }

  public isSwitcherActive(): boolean {
    return this.isSwitcherOpen;
  }

  public wasSwitcherOpenedWithModifier(): boolean {
    return this.switcherOpenedWithModifier;
  }

  public async quickFlipMruTab() {
    if (this.mruTabIds.length > 1) {
      await this.switchTab(this.mruTabIds[1]);
    }
  }

  // --- Find in Page ---

  public findInPage(text: string, forward = true, findNext = false) {
    if (!this.activeTabId) return;
    const tab = this.tabs.get(this.activeTabId);
    if (!tab || !tab.view?.webContents || tab.view.webContents.isDestroyed()) return;
    tab.view.webContents.findInPage(text, { forward, findNext });
  }

  public stopFindInPage(action: 'clearSelection' | 'keepSelection' | 'activateSelection' = 'clearSelection') {
    if (!this.activeTabId) return;
    const tab = this.tabs.get(this.activeTabId);
    if (!tab || !tab.view?.webContents || tab.view.webContents.isDestroyed()) return;
    tab.view.webContents.stopFindInPage(action);
  }

  // --- Page Zoom ---

  public setZoomFactor(tabId: string, factor: number): number {
    const tab = this.tabs.get(tabId);
    if (!tab) return 1.0;
    const clamped = Math.min(3.0, Math.max(0.3, Math.round(factor * 10) / 10));
    tab.info.zoomFactor = clamped;
    try {
      if (tab.view?.webContents && !tab.view.webContents.isDestroyed()) {
        tab.view.webContents.setZoomFactor(clamped);
      }
    } catch {
      // Ignore
    }

    if (tab.info.url && tab.info.url !== 'about:blank') {
      try {
        const host = new URL(tab.info.url).hostname;
        if (host) {
          if (!this.settings.domainZoomLevels) {
            this.settings.domainZoomLevels = {};
          }
          if (clamped === 1.0) {
            delete this.settings.domainZoomLevels[host];
          } else {
            this.settings.domainZoomLevels[host] = clamped;
          }
          this.saveSettings();
        }
      } catch {
        // Ignore
      }
    }

    this.notifyStateChange();
    return clamped;
  }

  // --- Tab Audio Volume Booster ---

  public async applyVolumeBoostToTab(tabId: string): Promise<void> {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.view || tab.view.webContents.isDestroyed()) return;
    const boostPercent = tab.info.volumeBoost ?? 100;
    const factor = Math.max(0, Math.min(600, boostPercent)) / 100;

    const script = `
      (function() {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;

          if (!window.__larpAudioEngine) {
            let ctx = null;
            let gainNode = null;
            let compressor = null;
            let currentGain = 1.0;
            const hookedMedia = new WeakSet();

            function getOrCreateContext() {
              if (!ctx) {
                ctx = new AudioContext();
                gainNode = ctx.createGain();
                gainNode.gain.setValueAtTime(currentGain, ctx.currentTime);

                // Anti-clipping dynamics compressor (limiter)
                compressor = ctx.createDynamicsCompressor();
                compressor.threshold.setValueAtTime(-14, ctx.currentTime);
                compressor.knee.setValueAtTime(30, ctx.currentTime);
                compressor.ratio.setValueAtTime(12, ctx.currentTime);
                compressor.attack.setValueAtTime(0.003, ctx.currentTime);
                compressor.release.setValueAtTime(0.25, ctx.currentTime);

                gainNode.connect(compressor);
                compressor.connect(ctx.destination);
              }
              if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
              }
              return ctx;
            }

            function hookElement(mediaEl) {
              if (!mediaEl || hookedMedia.has(mediaEl)) return;
              try {
                getOrCreateContext();
                const source = ctx.createMediaElementSource(mediaEl);
                source.connect(gainNode);
                hookedMedia.add(mediaEl);
              } catch (err) {
                // Media might already be connected or CORS restricted
              }
            }

            function scanAndHook() {
              document.querySelectorAll('video, audio').forEach(hookElement);
              document.querySelectorAll('iframe').forEach((iframe) => {
                try {
                  if (iframe.contentDocument) {
                    iframe.contentDocument.querySelectorAll('video, audio').forEach(hookElement);
                  }
                } catch (e) {}
              });
            }

            // MutationObserver to hook dynamically created elements (e.g. YouTube, Twitter, Twitch)
            const observer = new MutationObserver(() => scanAndHook());
            if (document.body) {
              observer.observe(document.body, { childList: true, subtree: true });
            } else {
              document.addEventListener('DOMContentLoaded', () => {
                if (document.body) observer.observe(document.body, { childList: true, subtree: true });
              });
            }

            // Hook on play event capture
            window.addEventListener('play', (e) => {
              if (e.target && (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO')) {
                hookElement(e.target);
                if (ctx && ctx.state === 'suspended') {
                  ctx.resume().catch(() => {});
                }
              }
            }, true);

            scanAndHook();

            window.__larpAudioEngine = {
              setGain(val) {
                currentGain = val;
                getOrCreateContext();
                scanAndHook();
                if (gainNode && ctx) {
                  gainNode.gain.setValueAtTime(val, ctx.currentTime);
                }
                // Fallback direct volume adjustment on all media elements
                document.querySelectorAll('video, audio').forEach((mediaEl) => {
                  try {
                    if (val <= 1.0) {
                      mediaEl.volume = Math.max(0, val);
                    } else {
                      mediaEl.volume = 1.0;
                    }
                  } catch (e) {}
                });
              },
              getGain() {
                return currentGain;
              }
            };
          }

          if (window.__larpAudioEngine) {
            window.__larpAudioEngine.setGain(${factor});
          }
        } catch (e) {
          console.warn('[LarpVolumeBooster] Error adjusting audio gain:', e);
        }
      })();
    `;

    try {
      await tab.view.webContents.executeJavaScript(script);
    } catch {
      // Ignore
    }
  }

  public async setTabVolumeBoost(tabId: string, boostPercent: number, rememberDomain = false): Promise<void> {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    const clamped = Math.max(0, Math.min(600, Math.round(boostPercent)));
    tab.info.volumeBoost = clamped;

    if (clamped === 0) {
      try {
        if (tab.view?.webContents && !tab.view.webContents.isDestroyed()) {
          tab.view.webContents.setAudioMuted(true);
        }
      } catch {}
      tab.info.isMuted = true;
    } else if (tab.info.isMuted && clamped > 0) {
      try {
        if (tab.view?.webContents && !tab.view.webContents.isDestroyed()) {
          tab.view.webContents.setAudioMuted(false);
        }
      } catch {}
      tab.info.isMuted = false;
    }

    if (rememberDomain && tab.info.url && tab.info.url !== 'about:blank') {
      try {
        const host = new URL(tab.info.url).hostname;
        if (host) {
          if (!this.settings.domainVolumeBoost) {
            this.settings.domainVolumeBoost = {};
          }
          if (clamped === 100) {
            delete this.settings.domainVolumeBoost[host];
          } else {
            this.settings.domainVolumeBoost[host] = clamped;
          }
          this.saveSettings();
        }
      } catch {
        // Ignore
      }
    }

    await this.applyVolumeBoostToTab(tabId);
    this.notifyStateChange();
  }
}
