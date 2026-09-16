export interface TabInfo {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  previewImage?: string; // base64 data URL for live Alt-Tab card thumbnail
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  lastAccessed: number;
  audioPlaying?: boolean;
  isMuted?: boolean;
}

export interface BrowserState {
  tabs: TabInfo[];
  activeTabId: string | null;
  isSwitcherOpen: boolean;
  selectedSwitcherIndex: number;
  mruTabIds: string[];
}

export type SwitcherDirection = 'forward' | 'backward';

export interface IpcRendererApi {
  // State observation
  onStateUpdate: (callback: (state: BrowserState) => void) => () => void;
  getState: () => Promise<BrowserState>;

  // Tab Operations
  createTab: (url?: string) => Promise<string>;
  closeTab: (tabId: string) => Promise<void>;
  switchTab: (tabId: string) => Promise<void>;
  navigateTab: (tabId: string, url: string) => Promise<void>;
  goBack: (tabId: string) => Promise<void>;
  goForward: (tabId: string) => Promise<void>;
  reloadTab: (tabId: string) => Promise<void>;
  toggleMuteTab: (tabId: string) => Promise<void>;

  // Switcher HUD operations
  openSwitcher: () => Promise<void>;
  closeSwitcher: () => Promise<void>;
  cycleSwitcher: (direction: SwitcherDirection) => Promise<void>;
  selectSwitcherIndex: (index: number) => Promise<void>;
  commitSwitcher: () => Promise<void>;

  // Window operations
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
}

declare global {
  interface Window {
    browserApi: IpcRendererApi;
  }
}
