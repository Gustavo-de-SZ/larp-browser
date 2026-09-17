import { app, BrowserWindow, WebContentsView, nativeTheme } from 'electron';
import fs from 'fs';
import path from 'path';
import type { BrowserState, BrowserSettings, TabInfo, SwitcherDirection } from '../shared/types';

export const TOP_BAR_HEIGHT = 44;

const DEFAULT_SETTINGS: BrowserSettings = {
  theme: 'dark',
  darkPaletteId: 'graphite',
  lightPaletteId: 'paper',
  forcePageDarkMode: true,
  defaultSearchEngine: 'google',
  autoHibernateTabs: true,
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
  private selectedSwitcherIndex = 0;
  private settings: BrowserSettings = { ...DEFAULT_SETTINGS };
  private settingsPath: string;
  private onStateChangeCallback?: (state: BrowserState) => void;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.settingsPath = path.join(app.getPath('userData'), 'larp-settings.json');
    this.loadSettings();

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
    this.saveSettings();
  }

  private saveSettings() {
    fs.promises.writeFile(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf8').catch((err) => {
      console.error('Failed to save settings:', err);
    });
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

    for (const [key, value] of Object.entries(newSettings)) {
      if (value === null || value === undefined) {
        delete (this.settings as any)[key];
      } else {
        (this.settings as any)[key] = value;
      }
    }

    if (newSettings.theme) {
      nativeTheme.themeSource = newSettings.theme;
    }
    this.saveSettings();

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

  public async createTab(initialUrl = 'about:blank'): Promise<string> {
    const id = 'tab-' + Math.random().toString(36).substring(2, 9);
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        spellcheck: true,
      },
    });

    const info: TabInfo = {
      id,
      url: initialUrl,
      title: initialUrl === 'about:blank' ? 'New Tab' : initialUrl,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      lastAccessed: Date.now(),
      audioPlaying: false,
      isMuted: false,
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
    return id;
  }

  private setupTabEvents(tabId: string, view: WebContentsView) {
    const wc = view.webContents;

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
        this.notifyStateChange();
      }
    });

    wc.on('did-stop-loading', () => {
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.info.isLoading = false;
        tab.info.url = wc.getURL();
        tab.info.title = wc.getTitle() || tab.info.url || 'New Tab';
        tab.info.canGoBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
        tab.info.canGoForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();

        // Ensure active tab view is attached when page finishes loading
        if (tabId === this.activeTabId && !this.isSwitcherOpen) {
          if (tab.info.url && tab.info.url !== 'about:blank') {
            this.attachActiveTabView();
          } else {
            this.detachActiveTabView();
          }
        }

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
          this.createTab(details.url);
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

    const [width, height] = this.window.getContentSize();
    tab.view.setBounds({
      x: 0,
      y: TOP_BAR_HEIGHT,
      width: width,
      height: Math.max(0, height - TOP_BAR_HEIGHT),
    });
  }

  public async setModalOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    if (isOpen) {
      if (this.activeTabId) {
        await this.capturePreview(this.activeTabId);
      }
      this.detachActiveTabView();
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

    // Capture the current page before opening HUD so background blur and current card look pristine
    if (this.activeTabId) {
      await this.capturePreview(this.activeTabId);
    }

    this.isSwitcherOpen = true;
    // Set index to the next tab in MRU order (index 1 if available, otherwise 0)
    this.selectedSwitcherIndex = this.mruTabIds.length > 1 ? 1 : 0;

    // Detach active web contents view so HUD is fully visible in window
    this.detachActiveTabView();
    this.notifyStateChange();
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
}
