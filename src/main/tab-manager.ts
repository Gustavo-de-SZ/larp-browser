import { BrowserWindow, WebContentsView } from 'electron';
import type { BrowserState, TabInfo, SwitcherDirection } from '../shared/types';

export const TOP_BAR_HEIGHT = 44;

export class TabManager {
  private window: BrowserWindow;
  private tabs: Map<string, { info: TabInfo; view: WebContentsView }> = new Map();
  private activeTabId: string | null = null;
  private mruTabIds: string[] = [];
  private isSwitcherOpen = false;
  private selectedSwitcherIndex = 0;
  private onStateChangeCallback?: (state: BrowserState) => void;

  constructor(window: BrowserWindow) {
    this.window = window;
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
    };
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

    wc.on('did-start-loading', () => {
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.info.isLoading = true;
        this.notifyStateChange();
      }
    });

    wc.on('did-stop-loading', async () => {
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.info.isLoading = false;
        tab.info.url = wc.getURL();
        tab.info.title = wc.getTitle() || tab.info.url || 'New Tab';
        tab.info.canGoBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
        tab.info.canGoForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();
        // Capture a preview snapshot once loaded
        await this.capturePreview(tabId);
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
      this.createTab(details.url);
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
      const preview = image.toDataURL();
      tab.info.previewImage = preview;
      return preview;
    } catch {
      // Quietly ignore if frame has not painted yet
      return undefined;
    }
  }

  public async switchTab(tabId: string) {
    if (!this.tabs.has(tabId)) return;

    // Capture preview of current active tab before switching away
    if (this.activeTabId && this.activeTabId !== tabId) {
      await this.capturePreview(this.activeTabId);
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

    // If switcher is not open, mount and position the new active tab view
    if (!this.isSwitcherOpen) {
      this.attachActiveTabView();
    }

    this.notifyStateChange();
  }

  public attachActiveTabView() {
    if (!this.activeTabId || !this.tabs.has(this.activeTabId)) return;
    const tab = this.tabs.get(this.activeTabId)!;

    // If active tab is about:blank, keep detached so the New Tab React dashboard is visible
    if (!tab.info.url || tab.info.url === 'about:blank') {
      this.detachActiveTabView();
      return;
    }

    // Check if view is already attached
    try {
      this.window.contentView.removeChildView(tab.view);
    } catch {
      // Ignore
    }

    this.window.contentView.addChildView(tab.view);
    this.updateActiveViewBounds();
  }

  public detachActiveTabView() {
    if (!this.activeTabId || !this.tabs.has(this.activeTabId)) return;
    const tab = this.tabs.get(this.activeTabId)!;
    try {
      this.window.contentView.removeChildView(tab.view);
    } catch {
      // Ignore
    }
  }

  public updateActiveViewBounds() {
    if (!this.activeTabId || this.isSwitcherOpen) return;
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
    // Check if it's a URL or search query
    if (!/^https?:\/\//i.test(targetUrl) && !/^about:/i.test(targetUrl)) {
      if (targetUrl.includes('.') && !targetUrl.includes(' ')) {
        targetUrl = 'https://' + targetUrl;
      } else {
        targetUrl = `https://duckduckgo.com/?q=${encodeURIComponent(targetUrl)}`;
      }
    }

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

    // Detach or hide active web contents view so HUD is fully visible in window
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
