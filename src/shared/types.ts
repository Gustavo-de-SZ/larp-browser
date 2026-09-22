export interface TabInfo {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  previewImage?: string; // base64 data URL for live Alt-Tab card thumbnail
  isLoading: boolean;
  hasLoadedPage?: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  lastAccessed: number;
  audioPlaying?: boolean;
  isMuted?: boolean;
  zoomFactor?: number;
  isHibernated?: boolean;
  isPrivate?: boolean;
  profileId?: string;
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

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  color: string;
  partition?: string;
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
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

export interface DownloadItemInfo {
  id: string;
  filename: string;
  savePath: string;
  totalBytes: number;
  receivedBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted' | 'paused';
  url: string;
  mimeType?: string;
  startTime: number;
  endTime?: number;
  paused?: boolean;
  canResume?: boolean;
  isPrivate?: boolean;
}

export interface FindResult {
  activeMatchOrdinal: number;
  numberOfMatches: number;
  finalUpdate?: boolean;
}

export type ShortcutActionId =
  | 'newTab'
  | 'newPrivateTab'
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
  | 'openDownloads'
  | 'findInPage'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomReset'
  | 'toggleMaximize'
  | 'openDevTools'
  | 'printPage'
  | 'viewSource';

export interface ShortcutDefinition {
  id: ShortcutActionId;
  label: string;
  category: 'Navigation' | 'Tabs' | 'Interface' | 'Bookmarks';
  defaultKey: string;
  description: string;
}

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  { id: 'newTab', label: 'New Tab', category: 'Tabs', defaultKey: 'Ctrl+T', description: 'Open a new blank tab' },
  { id: 'newPrivateTab', label: 'New Private Tab', category: 'Tabs', defaultKey: 'Ctrl+Shift+N', description: 'Open a new private browsing tab' },
  { id: 'closeTab', label: 'Close Tab', category: 'Tabs', defaultKey: 'Ctrl+W', description: 'Close active tab' },
  { id: 'duplicateTab', label: 'Duplicate Tab', category: 'Tabs', defaultKey: 'Ctrl+Shift+D', description: 'Duplicate active tab URL' },
  { id: 'reloadTab', label: 'Reload Tab', category: 'Navigation', defaultKey: 'Ctrl+R', description: 'Reload active page' },
  { id: 'hardReloadTab', label: 'Hard Reload', category: 'Navigation', defaultKey: 'Ctrl+Shift+R', description: 'Reload page bypassing cache' },
  { id: 'goBack', label: 'Go Back', category: 'Navigation', defaultKey: 'Alt+Left', description: 'Navigate backward in history' },
  { id: 'goForward', label: 'Go Forward', category: 'Navigation', defaultKey: 'Alt+Right', description: 'Navigate forward in history' },
  { id: 'focusOmnibar', label: 'Focus Address Bar', category: 'Navigation', defaultKey: 'Ctrl+L', description: 'Focus and select omnibar URL' },
  { id: 'findInPage', label: 'Find in Page', category: 'Navigation', defaultKey: 'Ctrl+F', description: 'Search text on active page' },
  { id: 'printPage', label: 'Print Page', category: 'Navigation', defaultKey: 'Ctrl+P', description: 'Print active page or save as PDF' },
  { id: 'viewSource', label: 'View Page Source', category: 'Navigation', defaultKey: 'Ctrl+U', description: 'View HTML source of current page' },
  { id: 'openSwitcher', label: 'Tab Switcher', category: 'Tabs', defaultKey: 'Ctrl+Tab', description: 'Open visual Alt-Tab switcher HUD' },
  { id: 'toggleBookmark', label: 'Bookmark Page', category: 'Bookmarks', defaultKey: 'Ctrl+D', description: 'Add or remove bookmark for current page' },
  { id: 'toggleBookmarksBar', label: 'Toggle Bookmarks Bar', category: 'Bookmarks', defaultKey: 'Ctrl+Shift+B', description: 'Show or hide the bookmarks bar' },
  { id: 'openFavorites', label: 'Quick Favorites', category: 'Bookmarks', defaultKey: 'Ctrl+B', description: 'Open quick favorites popover' },
  { id: 'openSettings', label: 'Open Settings', category: 'Interface', defaultKey: 'Ctrl+,', description: 'Open preferences modal' },
  { id: 'openShortcuts', label: 'Keyboard Cheatsheet', category: 'Interface', defaultKey: 'Ctrl+/', description: 'Show shortcuts reference cheatsheet' },
  { id: 'openHistory', label: 'Browsing History', category: 'Interface', defaultKey: 'Ctrl+H', description: 'Open browsing history' },
  { id: 'openDownloads', label: 'Downloads', category: 'Interface', defaultKey: 'Ctrl+J', description: 'Open downloads tray and history' },
  { id: 'openDevTools', label: 'Developer Tools', category: 'Interface', defaultKey: 'F12', description: 'Toggle Chrome Developer Tools' },
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
  restoreSessionOnStartup?: boolean;
  newTabBehavior?: 'dashboard' | 'custom-url' | 'blank';
  newTabCustomUrl?: string;
  customShortcuts?: Record<string, string> | null;
  newTabShowClock?: boolean;
  newTabClockFormat?: '12h' | '24h';
  newTabShowWeather?: boolean;
  newTabShowQuickLinks?: boolean;
  downloadsPath?: string;
  askDownloadLocation?: boolean;
  autoCheckUpdates?: boolean;
}

export interface UpdateAssetInfo {
  name: string;
  downloadUrl: string;
  size: number;
  platform: 'windows' | 'linux' | 'all';
  format: 'exe' | 'zip' | 'appimage' | 'pacman' | 'other';
}

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName: string;
  releaseNotes: string;
  releaseUrl: string;
  publishedAt: string;
  matchedAsset?: UpdateAssetInfo;
  allAssets: UpdateAssetInfo[];
  checkedAt: number;
  status: 'idle' | 'checking' | 'up-to-date' | 'available' | 'error';
  errorMessage?: string;
}

export interface BrowserState {
  tabs: TabInfo[];
  activeTabId: string | null;
  isSwitcherOpen: boolean;
  selectedSwitcherIndex: number;
  mruTabIds: string[];
  bookmarks: BookmarkItem[];
  settings: BrowserSettings;
  profiles?: UserProfile[];
  activeProfileId?: string;
}

export type SwitcherDirection = 'forward' | 'backward';

export interface IpcRendererApi {
  // State observation
  onStateUpdate: (callback: (state: BrowserState) => void) => () => void;
  onToggleModal: (callback: (modal: 'settings' | 'shortcuts' | 'history' | 'passwords' | 'downloads') => void) => () => void;
  onFocusOmnibar: (callback: () => void) => () => void;
  onToggleFind: (callback: () => void) => () => void;
  onToggleFavorites: (callback: () => void) => () => void;
  onFindResult: (callback: (result: FindResult) => void) => () => void;
  onHtmlFullscreen: (callback: (isFullscreen: boolean) => void) => () => void;
  getState: () => Promise<BrowserState>;
  getAppVersion: () => Promise<string>;

  // Tab Operations
  createTab: (url?: string, isPrivate?: boolean) => Promise<string>;
  closeTab: (tabId: string) => Promise<void>;
  switchTab: (tabId: string) => Promise<void>;
  navigateTab: (tabId: string, url: string) => Promise<void>;
  goBack: (tabId: string) => Promise<void>;
  goForward: (tabId: string) => Promise<void>;
  reloadTab: (tabId: string) => Promise<void>;
  toggleMuteTab: (tabId: string) => Promise<void>;
  hibernateTab: (tabId: string) => Promise<void>;
  duplicateTab: (tabId?: string) => Promise<string | null>;
  closeOtherTabs: (tabId: string) => Promise<void>;
  closeTabsToRight: (tabId: string) => Promise<void>;
  print: (tabId?: string) => Promise<void>;
  openDevTools: (tabId?: string) => Promise<void>;

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

  // Downloads
  getDownloads: () => Promise<DownloadItemInfo[]>;
  pauseDownload: (id: string) => Promise<boolean>;
  resumeDownload: (id: string) => Promise<boolean>;
  cancelDownload: (id: string) => Promise<boolean>;
  openDownloadFile: (id: string) => Promise<boolean>;
  showDownloadInFolder: (id: string) => Promise<boolean>;
  clearDownloads: () => Promise<void>;
  deleteDownloadItem: (id: string) => Promise<void>;
  selectDownloadDirectory: () => Promise<string | null>;
  onDownloadStarted: (callback: (item: DownloadItemInfo) => void) => () => void;
  onDownloadProgress: (callback: (item: DownloadItemInfo) => void) => () => void;
  onDownloadDone: (callback: (item: DownloadItemInfo) => void) => () => void;

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
  commitSwitcher: (onlyIfModifier?: boolean) => Promise<void>;
  setModalOpen: (isOpen: boolean) => Promise<void>;

  // Window operations
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;

  // Profiles & Accounts
  getProfiles: () => Promise<UserProfile[]>;
  getActiveProfile: () => Promise<UserProfile>;
  setActiveProfile: (id: string) => Promise<void>;
  saveProfile: (profile: Partial<UserProfile>) => Promise<UserProfile>;
  deleteProfile: (id: string) => Promise<boolean>;
  detectGoogleAccount: () => Promise<{ email?: string; name?: string; avatarUrl?: string } | null>;
  linkGoogleAccount: (account: { email: string; name?: string; avatarUrl?: string }) => Promise<UserProfile>;

  // Updates
  checkForUpdates: (manual?: boolean) => Promise<UpdateCheckResult>;
  getUpdateInfo: () => Promise<UpdateCheckResult | null>;
  downloadUpdateAsset: (url: string) => Promise<void>;
  onUpdateAvailable: (callback: (info: UpdateCheckResult) => void) => () => void;
}

declare global {
  interface Window {
    browserApi: IpcRendererApi;
  }
}
