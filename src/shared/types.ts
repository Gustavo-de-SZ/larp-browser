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
  zoomFactor?: number;
  isHibernated?: boolean;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt: number;
}

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
}

export interface ClearBrowsingDataOptions {
  timeRange: 'hour' | '24h' | '7d' | '4w' | 'all';
  clearHistory: boolean;
  clearCookies: boolean;
  clearCache: boolean;
}

export interface PasswordEntry {
  id: string;
  site: string;
  username: string;
  password: string;
  createdAt: number;
  updatedAt: number;
}

export interface WeatherData {
  tempC: string;
  tempF: string;
  desc: string;
  area: string;
}

export interface FindResult {
  activeMatchOrdinal: number;
  numberOfMatches: number;
  finalUpdate?: boolean;
}

export type ShortcutActionId =
  | 'newTab'
  | 'closeTab'
  | 'duplicateTab'
  | 'reloadTab'
  | 'hardReloadTab'
  | 'goBack'
  | 'goForward'
  | 'focusOmnibar'
  | 'openSwitcher'
  | 'openSettings'
  | 'openShortcuts'
  | 'toggleBookmark'
  | 'toggleBookmarksBar'
  | 'openFavorites'
  | 'openHistory'
  | 'findInPage'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomReset'
  | 'toggleMaximize';

export interface ShortcutDefinition {
  id: ShortcutActionId;
  label: string;
  category: 'Navigation' | 'Tabs' | 'Interface' | 'Bookmarks';
  defaultKey: string;
  description: string;
}

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  { id: 'newTab', label: 'New Tab', category: 'Tabs', defaultKey: 'Ctrl+T', description: 'Open a new blank tab' },
  { id: 'closeTab', label: 'Close Tab', category: 'Tabs', defaultKey: 'Ctrl+W', description: 'Close active tab' },
  { id: 'duplicateTab', label: 'Duplicate Tab', category: 'Tabs', defaultKey: 'Ctrl+Shift+D', description: 'Duplicate active tab URL' },
  { id: 'reloadTab', label: 'Reload Tab', category: 'Navigation', defaultKey: 'Ctrl+R', description: 'Reload active page' },
  { id: 'hardReloadTab', label: 'Hard Reload', category: 'Navigation', defaultKey: 'Ctrl+Shift+R', description: 'Reload page bypassing cache' },
  { id: 'goBack', label: 'Go Back', category: 'Navigation', defaultKey: 'Alt+Left', description: 'Navigate backward in history' },
  { id: 'goForward', label: 'Go Forward', category: 'Navigation', defaultKey: 'Alt+Right', description: 'Navigate forward in history' },
  { id: 'focusOmnibar', label: 'Focus Address Bar', category: 'Navigation', defaultKey: 'Ctrl+L', description: 'Focus and select omnibar URL' },
  { id: 'findInPage', label: 'Find in Page', category: 'Navigation', defaultKey: 'Ctrl+F', description: 'Search text on active page' },
  { id: 'openSwitcher', label: 'Tab Switcher', category: 'Tabs', defaultKey: 'Ctrl+Tab', description: 'Open visual Alt-Tab switcher HUD' },
  { id: 'toggleBookmark', label: 'Bookmark Page', category: 'Bookmarks', defaultKey: 'Ctrl+D', description: 'Add or remove bookmark for current page' },
  { id: 'toggleBookmarksBar', label: 'Toggle Bookmarks Bar', category: 'Bookmarks', defaultKey: 'Ctrl+Shift+B', description: 'Show or hide the bookmarks bar' },
  { id: 'openFavorites', label: 'Quick Favorites', category: 'Bookmarks', defaultKey: 'Ctrl+B', description: 'Open quick favorites popover' },
  { id: 'openSettings', label: 'Open Settings', category: 'Interface', defaultKey: 'Ctrl+,', description: 'Open preferences modal' },
  { id: 'openShortcuts', label: 'Keyboard Cheatsheet', category: 'Interface', defaultKey: 'Ctrl+/', description: 'Show shortcuts reference cheatsheet' },
  { id: 'openHistory', label: 'Browsing History', category: 'Interface', defaultKey: 'Ctrl+H', description: 'Open browsing history' },
  { id: 'zoomIn', label: 'Zoom In', category: 'Interface', defaultKey: 'Ctrl+=', description: 'Increase page zoom' },
  { id: 'zoomOut', label: 'Zoom Out', category: 'Interface', defaultKey: 'Ctrl+-', description: 'Decrease page zoom' },
  { id: 'zoomReset', label: 'Reset Zoom', category: 'Interface', defaultKey: 'Ctrl+0', description: 'Reset page zoom to 100%' },
  { id: 'toggleMaximize', label: 'Toggle Maximize', category: 'Interface', defaultKey: 'F11', description: 'Toggle window maximize state' },
];

export interface BrowserSettings {
  theme: 'dark' | 'light';
  darkPaletteId: string;
  lightPaletteId: string;
  customDarkAccent?: string | null;
  customLightAccent?: string | null;
  forcePageDarkMode: boolean; // Forces dark theme even on sites without dark mode
  defaultSearchEngine: 'duckduckgo' | 'google' | 'brave' | 'bing';
  autoHibernateTabs: boolean;
  idleHibernateMinutes?: number; // 0 = disabled, 5, 15, 30, 60
  switcherLayout?: 'grid' | 'compact';
  switcherShowPreviews?: boolean;
  switcherShowUrls?: boolean;
  switcherSortOrder?: 'mru' | 'creation';
  showBookmarksBar: boolean;
  showFavoritesOnNewTab: boolean;
  startupBehavior: 'new-tab' | 'continue' | 'custom-url';
  startupCustomUrl?: string;
  customShortcuts?: Record<string, string> | null;
  newTabShowClock?: boolean;
  newTabClockFormat?: '12h' | '24h';
  newTabShowWeather?: boolean;
  newTabShowQuickLinks?: boolean;
}

export interface BrowserState {
  tabs: TabInfo[];
  activeTabId: string | null;
  isSwitcherOpen: boolean;
  selectedSwitcherIndex: number;
  mruTabIds: string[];
  bookmarks: BookmarkItem[];
  settings: BrowserSettings;
}

export type SwitcherDirection = 'forward' | 'backward';

export interface IpcRendererApi {
  // State observation
  onStateUpdate: (callback: (state: BrowserState) => void) => () => void;
  onToggleModal: (callback: (modal: 'settings' | 'shortcuts' | 'history' | 'passwords') => void) => () => void;
  onFocusOmnibar: (callback: () => void) => () => void;
  onToggleFind: (callback: () => void) => () => void;
  onToggleFavorites: (callback: () => void) => () => void;
  onFindResult: (callback: (result: FindResult) => void) => () => void;
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

  // Zoom
  setZoomFactor: (tabId: string, factor: number) => Promise<number>;

  // Find in Page
  findInPage: (text: string, forward?: boolean, findNext?: boolean) => Promise<void>;
  stopFindInPage: (action?: 'clearSelection' | 'keepSelection' | 'activateSelection') => Promise<void>;
  setFindOpen: (isOpen: boolean) => Promise<void>;

  // Bookmarks
  getBookmarks: () => Promise<BookmarkItem[]>;
  addBookmark: (bookmark: { title: string; url: string; favicon?: string }) => Promise<BookmarkItem>;
  removeBookmark: (idOrUrl: string) => Promise<void>;
  toggleBookmark: (bookmark: { title: string; url: string; favicon?: string }) => Promise<{ bookmarked: boolean; item?: BookmarkItem }>;

  // History & Browsing Data
  getHistory: () => Promise<HistoryItem[]>;
  clearHistory: () => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<void>;
  clearBrowsingData: () => Promise<void>;
  clearBrowsingDataAdvanced: (options: ClearBrowsingDataOptions) => Promise<void>;

  // Passwords Vault
  getPasswords: () => Promise<PasswordEntry[]>;
  savePassword: (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PasswordEntry>;
  updatePassword: (entry: PasswordEntry) => Promise<void>;
  deletePassword: (id: string) => Promise<void>;
  exportPasswords: () => Promise<{ success: boolean; count?: number; path?: string; canceled?: boolean; error?: string }>;
  importPasswords: () => Promise<{ success: boolean; importedCount?: number; totalCount?: number; canceled?: boolean; error?: string }>;

  // Settings & Theme
  setTheme: (theme: 'dark' | 'light') => Promise<void>;
  getSettings: () => Promise<BrowserSettings>;
  updateSettings: (settings: Partial<BrowserSettings>) => Promise<BrowserSettings>;
  getWeather: () => Promise<WeatherData | null>;

  // Switcher HUD & Modal operations
  openSwitcher: () => Promise<void>;
  closeSwitcher: () => Promise<void>;
  cycleSwitcher: (direction: SwitcherDirection) => Promise<void>;
  selectSwitcherIndex: (index: number) => Promise<void>;
  commitSwitcher: () => Promise<void>;
  setModalOpen: (isOpen: boolean) => Promise<void>;

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
