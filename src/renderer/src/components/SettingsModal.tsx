import React, { useState, useEffect } from 'react';
import {
  X,
  Palette,
  Layers,
  Search,
  Info,
  Sun,
  Moon,
  Check,
  Globe,
  RotateCcw,
  Keyboard,
  Star,
  Trash2,
  ExternalLink,
  Bookmark,
  AlertTriangle,
  Clock,
  Power,
  ShieldAlert,
} from 'lucide-react';
import { DARK_PALETTES, LIGHT_PALETTES, ColorPalette, getPalette } from '../theme/palettes';
import {
  BrowserSettings,
  BookmarkItem,
  HistoryItem,
  SHORTCUT_DEFINITIONS,
  ShortcutActionId,
} from '@/shared/types';
import type { ThemeMode } from '../App';

export type SettingsTabType =
  | 'appearance'
  | 'shortcuts'
  | 'bookmarks'
  | 'startup'
  | 'history'
  | 'switcher'
  | 'search'
  | 'about';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BrowserSettings;
  bookmarks?: BookmarkItem[];
  theme: ThemeMode;
  initialTab?: SettingsTabType;
  onUpdateSettings: (settings: Partial<BrowserSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  bookmarks = [],
  theme,
  initialTab = 'appearance',
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabType>(initialTab);
  const [paletteModeTab, setPaletteModeTab] = useState<ThemeMode>(theme);
  const [recordingActionId, setRecordingActionId] = useState<ShortcutActionId | null>(null);
  const [bookmarkFilter, setBookmarkFilter] = useState('');
  const [historyFilter, setHistoryFilter] = useState('');
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [customStartupInput, setCustomStartupInput] = useState('');
  const isDark = theme === 'dark';

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Keep sub-tab in sync if main theme changes
  useEffect(() => {
    setPaletteModeTab(theme);
  }, [theme]);

  // Load history when opening history tab
  useEffect(() => {
    if (isOpen && activeTab === 'history' && window.browserApi?.getHistory) {
      window.browserApi.getHistory().then((items) => {
        if (items) setHistoryList(items);
      });
    }
  }, [isOpen, activeTab]);

  // Close on Escape key (when not recording a shortcut)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (recordingActionId) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, recordingActionId]);

  // Interactive Shortcut Recorder listener
  useEffect(() => {
    if (!recordingActionId) return;

    const handleRecordKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingActionId(null);
        return;
      }

      // Ignore solitary modifier keypresses
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        return;
      }

      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Meta');

      let mainKey = e.key;
      if (e.key === 'ArrowLeft') mainKey = 'Left';
      else if (e.key === 'ArrowRight') mainKey = 'Right';
      else if (e.key === 'ArrowUp') mainKey = 'Up';
      else if (e.key === 'ArrowDown') mainKey = 'Down';
      else if (e.key === ' ') mainKey = 'Space';
      else if (e.key.length === 1) mainKey = e.key.toUpperCase();

      parts.push(mainKey);
      const combo = parts.join('+');

      const customShortcuts = { ...(settings.customShortcuts || {}) };
      customShortcuts[recordingActionId] = combo;

      onUpdateSettings({ customShortcuts });
      setRecordingActionId(null);
    };

    window.addEventListener('keydown', handleRecordKey, true);
    return () => window.removeEventListener('keydown', handleRecordKey, true);
  }, [recordingActionId, settings.customShortcuts, onUpdateSettings]);

  if (!isOpen) return null;

  const safeSettings = settings || {
    theme: 'dark',
    darkPaletteId: 'graphite',
    lightPaletteId: 'paper',
    forcePageDarkMode: true,
    defaultSearchEngine: 'google',
    autoHibernateTabs: true,
    showBookmarksBar: false,
    showFavoritesOnNewTab: true,
    startupBehavior: 'new-tab',
    startupCustomUrl: 'https://duckduckgo.com',
  };

  const currentPalettes = paletteModeTab === 'dark' ? DARK_PALETTES : LIGHT_PALETTES;
  const currentActivePaletteId =
    paletteModeTab === 'dark'
      ? safeSettings.darkPaletteId || 'graphite'
      : safeSettings.lightPaletteId || 'paper';

  const activePalette = getPalette(currentActivePaletteId, paletteModeTab);
  const currentPaletteDefaultAccent = activePalette.colors.accentPrimary;

  const currentCustomAccent =
    paletteModeTab === 'dark' ? safeSettings.customDarkAccent : safeSettings.customLightAccent;

  const handleSelectPalette = (palette: ColorPalette) => {
    if (palette.mode === 'dark') {
      onUpdateSettings({ darkPaletteId: palette.id, theme: 'dark', customDarkAccent: null });
    } else {
      onUpdateSettings({ lightPaletteId: palette.id, theme: 'light', customLightAccent: null });
    }
  };

  const handleCustomAccentChange = (color: string) => {
    if (paletteModeTab === 'dark') {
      onUpdateSettings({ customDarkAccent: color });
    } else {
      onUpdateSettings({ customLightAccent: color });
    }
  };

  const handleResetAccent = () => {
    if (paletteModeTab === 'dark') {
      onUpdateSettings({ customDarkAccent: null });
    } else {
      onUpdateSettings({ customLightAccent: null });
    }
  };

  const getEffectiveShortcut = (actionId: ShortcutActionId): string => {
    if (safeSettings.customShortcuts && safeSettings.customShortcuts[actionId]) {
      return safeSettings.customShortcuts[actionId];
    }
    const def = SHORTCUT_DEFINITIONS.find((d) => d.id === actionId);
    return def ? def.defaultKey : '';
  };

  const isShortcutModified = (actionId: ShortcutActionId): boolean => {
    return !!(safeSettings.customShortcuts && safeSettings.customShortcuts[actionId]);
  };

  const handleResetSingleShortcut = (actionId: ShortcutActionId) => {
    const updated = { ...(safeSettings.customShortcuts || {}) };
    delete updated[actionId];
    onUpdateSettings({
      customShortcuts: Object.keys(updated).length > 0 ? updated : null,
    });
  };

  const handleResetAllShortcuts = () => {
    onUpdateSettings({ customShortcuts: null });
  };

  const getConflictAction = (actionId: ShortcutActionId, combo: string): string | null => {
    for (const def of SHORTCUT_DEFINITIONS) {
      if (def.id === actionId) continue;
      const otherCombo = getEffectiveShortcut(def.id);
      if (otherCombo.toLowerCase() === combo.toLowerCase()) {
        return def.label;
      }
    }
    return null;
  };

  const filteredBookmarks = bookmarks.filter(
    (b) =>
      b.title.toLowerCase().includes(bookmarkFilter.toLowerCase()) ||
      b.url.toLowerCase().includes(bookmarkFilter.toLowerCase())
  );

  const filteredHistory = historyList.filter(
    (h) =>
      h.title.toLowerCase().includes(historyFilter.toLowerCase()) ||
      h.url.toLowerCase().includes(historyFilter.toLowerCase())
  );

  const handleClearHistory = () => {
    if (window.browserApi?.clearHistory) {
      window.browserApi.clearHistory();
      setHistoryList([]);
    }
  };

  const handleClearAllBrowsingData = () => {
    if (confirm('Clear all browsing history, cache, cookies, and website storage?')) {
      if (window.browserApi?.clearBrowsingData) {
        window.browserApi.clearBrowsingData();
        setHistoryList([]);
      }
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-150 select-none ${
        isDark ? 'bg-black/60' : 'bg-slate-900/30'
      }`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border shadow-xl overflow-hidden flex flex-col md:flex-row h-[600px] animate-scale-up"
        style={{
          backgroundColor: 'var(--bg-app)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-main)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar */}
        <div
          className="w-full md:w-52 p-3 border-b md:border-b-0 md:border-r flex flex-col justify-between flex-shrink-0"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'rgba(128, 128, 128, 0.03)',
          }}
        >
          <div className="space-y-1">
            <div className="px-3 py-2 flex items-center space-x-2 mb-1">
              <div
                className="w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                L
              </div>
              <span className="text-xs font-semibold tracking-tight text-[var(--text-main)]">
                Settings
              </span>
            </div>

            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'appearance'
                  ? 'bg-black/10 dark:bg-white/10 text-[var(--text-main)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Palette className="w-4 h-4 text-[var(--text-muted)]" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'shortcuts'
                  ? 'bg-black/10 dark:bg-white/10 text-[var(--text-main)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Keyboard className="w-4 h-4 text-[var(--text-muted)]" />
              <span>Shortcuts</span>
            </button>

            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'bookmarks'
                  ? 'bg-black/10 dark:bg-white/10 text-[var(--text-main)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Star className="w-4 h-4 text-[var(--text-muted)]" />
              <span>Bookmarks</span>
            </button>

            <button
              onClick={() => setActiveTab('startup')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'startup'
                  ? 'bg-black/10 dark:bg-white/10 text-[var(--text-main)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Power className="w-4 h-4 text-[var(--text-muted)]" />
              <span>On Startup</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-black/10 dark:bg-white/10 text-[var(--text-main)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Clock className="w-4 h-4 text-[var(--text-muted)]" />
              <span>History</span>
            </button>

            <button
              onClick={() => setActiveTab('switcher')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'switcher'
                  ? 'bg-black/10 dark:bg-white/10 text-[var(--text-main)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Layers className="w-4 h-4 text-[var(--text-muted)]" />
              <span>Tab Switcher</span>
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-black/10 dark:bg-white/10 text-[var(--text-main)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Search className="w-4 h-4 text-[var(--text-muted)]" />
              <span>Search Engine</span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'about'
                  ? 'bg-black/10 dark:bg-white/10 text-[var(--text-main)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Info className="w-4 h-4 text-[var(--text-muted)]" />
              <span>About</span>
            </button>
          </div>

          <div className="text-[10px] text-[var(--text-muted)] font-mono px-3 py-2">
            Shortcut:{' '}
            <kbd className="px-1 py-0.2 rounded border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 font-semibold">
              Ctrl+,
            </kbd>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div
            className="p-3.5 px-5 border-b flex items-center justify-between flex-shrink-0"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {activeTab === 'appearance' && 'Appearance & Colors'}
              {activeTab === 'shortcuts' && 'Keyboard Shortcuts'}
              {activeTab === 'bookmarks' && 'Bookmarks & Favorites'}
              {activeTab === 'startup' && 'Startup Behavior & Default Page'}
              {activeTab === 'history' && 'Browsing History & Clear Data'}
              {activeTab === 'switcher' && 'Tab Switcher (Alt-Tab)'}
              {activeTab === 'search' && 'Default Search Engine'}
              {activeTab === 'about' && 'About Larp Browser'}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section Body */}
          <div className="p-5 flex-1 overflow-y-auto space-y-5">
            {/* 1. Appearance & Palettes */}
            {activeTab === 'appearance' && (
              <div className="space-y-5">
                {/* Active Mode Selector */}
                <div>
                  <label className="text-xs font-medium block text-[var(--text-main)] mb-2">
                    Active Theme Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => onUpdateSettings({ theme: 'dark' })}
                      className={`p-3 rounded-xl border flex items-center space-x-3 transition-all text-left cursor-pointer ${
                        isDark
                          ? 'border-[var(--border-selected)] bg-[var(--bg-card-selected)] ring-1 ring-[var(--accent-primary)]/20 shadow-xs'
                          : 'border-[var(--border-card)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/50 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-black/20 text-slate-200">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-[var(--text-main)]">Dark Mode</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Calm, subdued dark tones</div>
                      </div>
                      {isDark && <Check className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />}
                    </button>

                    <button
                      onClick={() => onUpdateSettings({ theme: 'light' })}
                      className={`p-3 rounded-xl border flex items-center space-x-3 transition-all text-left cursor-pointer ${
                        !isDark
                          ? 'border-[var(--border-selected)] bg-[var(--bg-card-selected)] ring-1 ring-[var(--accent-primary)]/20 shadow-xs'
                          : 'border-[var(--border-card)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/50 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-white text-amber-500 shadow-xs">
                        <Sun className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-[var(--text-main)]">Light Mode</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Clean, breathable light tones</div>
                      </div>
                      {!isDark && <Check className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />}
                    </button>
                  </div>
                </div>

                {/* Palette Sub-Tab */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-[var(--text-main)]">
                      Color Palettes ({paletteModeTab === 'dark' ? 'Dark' : 'Light'})
                    </label>
                    <div className="flex items-center space-x-1 p-0.5 rounded-lg border bg-black/5 dark:bg-white/5 border-[var(--border-subtle)]">
                      <button
                        onClick={() => setPaletteModeTab('dark')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          paletteModeTab === 'dark'
                            ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        Dark Palettes
                      </button>
                      <button
                        onClick={() => setPaletteModeTab('light')}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          paletteModeTab === 'light'
                            ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        Light Palettes
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentPalettes.map((palette) => {
                      const isSelected = palette.id === currentActivePaletteId;
                      return (
                        <button
                          key={palette.id}
                          onClick={() => handleSelectPalette(palette)}
                          className={`p-3 rounded-xl border flex flex-col justify-between transition-all text-left cursor-pointer group ${
                            isSelected
                              ? 'border-[var(--border-selected)] ring-1 ring-[var(--accent-primary)]/20 shadow-xs'
                              : 'border-[var(--border-card)] hover:border-[var(--accent-primary)]/40 hover:scale-[1.01]'
                          }`}
                          style={{
                            backgroundColor: palette.colors.bgApp,
                            borderColor: isSelected ? 'var(--accent-primary)' : undefined,
                          }}
                        >
                          <div className="flex items-start justify-between mb-2 w-full">
                            <div>
                              <div
                                className="text-xs font-semibold tracking-tight"
                                style={{ color: palette.colors.textMain }}
                              >
                                {palette.name}
                              </div>
                              <div
                                className="text-[10px] leading-tight opacity-75"
                                style={{ color: palette.colors.textMuted }}
                              >
                                {palette.description}
                              </div>
                            </div>
                            {isSelected && (
                              <div
                                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-xs"
                                style={{ backgroundColor: palette.colors.accentPrimary }}
                              >
                                ✓
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5 mt-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full border shadow-xs"
                              style={{
                                backgroundColor: palette.colors.bgTopbar,
                                borderColor: palette.colors.borderSubtle,
                              }}
                              title="Topbar"
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border shadow-xs"
                              style={{
                                backgroundColor: palette.colors.bgCard,
                                borderColor: palette.colors.borderSubtle,
                              }}
                              title="Cards"
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full shadow-xs"
                              style={{ backgroundColor: palette.colors.accentPrimary }}
                              title="Accent"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Accent Color Picker */}
                <div
                  className="p-3.5 rounded-xl border flex items-center justify-between"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-[var(--text-main)]">
                      Custom Accent Color Override
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {currentCustomAccent
                        ? `Custom: ${currentCustomAccent}`
                        : `Default (${activePalette.name}): ${currentPaletteDefaultAccent}`}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {currentCustomAccent && (
                      <button
                        onClick={handleResetAccent}
                        className="p-1.5 rounded-lg border text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        title="Reset to active palette's authentic color"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <input
                      type="color"
                      value={currentCustomAccent || currentPaletteDefaultAccent}
                      onChange={(e) => handleCustomAccentChange(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border p-0.5"
                      style={{
                        backgroundColor: 'var(--bg-app)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    />
                  </div>
                </div>

                {/* Smart Page Dark Mode */}
                <div
                  onClick={() =>
                    onUpdateSettings({ forcePageDarkMode: !safeSettings.forcePageDarkMode })
                  }
                  className="p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all border-[var(--border-card)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/40 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                >
                  <div className="space-y-0.5 mr-3 select-none">
                    <div className="text-xs font-medium text-[var(--text-main)]">
                      Smart Inverted Web Page Dark Theme
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Automatically darkens light-themed web pages when Larp is set to Dark Mode.
                    </div>
                  </div>
                  <div className="relative inline-flex items-center flex-shrink-0 pointer-events-none">
                    <input
                      type="checkbox"
                      readOnly
                      checked={safeSettings.forcePageDarkMode}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Shortcuts Editor */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--text-muted)]">
                    Click on any shortcut badge to record a new key combination.
                  </p>
                  {safeSettings.customShortcuts &&
                    Object.keys(safeSettings.customShortcuts).length > 0 && (
                      <button
                        onClick={handleResetAllShortcuts}
                        className="text-[11px] text-[var(--accent-primary)] hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset All Defaults</span>
                      </button>
                    )}
                </div>

                {recordingActionId && (
                  <div className="p-3 rounded-xl border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 flex items-center justify-between text-xs animate-pulse">
                    <div className="flex items-center space-x-2">
                      <Keyboard className="w-4 h-4 text-[var(--accent-primary)]" />
                      <span>
                        Recording shortcut for{' '}
                        <strong>
                          {SHORTCUT_DEFINITIONS.find((d) => d.id === recordingActionId)?.label}
                        </strong>
                        ... Press your desired keys now.
                      </span>
                    </div>
                    <button
                      onClick={() => setRecordingActionId(null)}
                      className="text-[11px] font-mono px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-black/10 dark:bg-white/10 hover:bg-black/20 cursor-pointer"
                    >
                      Cancel (Esc)
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  {SHORTCUT_DEFINITIONS.map((def) => {
                    const currentCombo = getEffectiveShortcut(def.id);
                    const isModified = isShortcutModified(def.id);
                    const isRecording = recordingActionId === def.id;
                    const conflict = getConflictAction(def.id, currentCombo);

                    return (
                      <div
                        key={def.id}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                          isRecording
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                            : 'border-[var(--border-card)] bg-[var(--bg-card)]'
                        }`}
                      >
                        <div className="space-y-0.5 mr-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-[var(--text-main)]">
                              {def.label}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono uppercase bg-black/5 dark:bg-white/5 text-[var(--text-muted)]">
                              {def.category}
                            </span>
                            {isModified && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-blue-500/10 text-blue-400">
                                Customized
                              </span>
                            )}
                            {conflict && (
                              <span
                                className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-amber-500/15 text-amber-400 flex items-center space-x-1"
                                title={`Conflicts with: ${conflict}`}
                              >
                                <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
                                Conflict
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            {def.description}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {isModified && !isRecording && (
                            <button
                              onClick={() => handleResetSingleShortcut(def.id)}
                              className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              title={`Reset to default (${def.defaultKey})`}
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            onClick={() => setRecordingActionId(isRecording ? null : def.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer ${
                              isRecording
                                ? 'bg-[var(--accent-primary)] text-white border-transparent'
                                : 'bg-black/5 dark:bg-white/5 border-[var(--border-subtle)] text-[var(--text-main)] hover:border-[var(--accent-primary)]/60'
                            }`}
                          >
                            {isRecording ? 'Press keys...' : currentCombo}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Bookmarks Manager & Settings */}
            {activeTab === 'bookmarks' && (
              <div className="space-y-4">
                {/* Bookmarks Options Card */}
                <div
                  className="rounded-xl border divide-y overflow-hidden"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-card)',
                  }}
                >
                  {/* Show Bookmarks Bar Toggle */}
                  <div
                    onClick={() =>
                      onUpdateSettings({ showBookmarksBar: !safeSettings.showBookmarksBar })
                    }
                    className="p-3 px-4 flex items-center justify-between cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="space-y-0.5 mr-3 select-none">
                      <div className="text-xs font-medium text-[var(--text-main)]">
                        Show Bookmarks Bar
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Display a fast-access bookmarks bar beneath the address bar (Ctrl+Shift+B)
                      </div>
                    </div>
                    <div className="relative inline-flex items-center flex-shrink-0 pointer-events-none">
                      <input
                        type="checkbox"
                        readOnly
                        checked={safeSettings.showBookmarksBar}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                    </div>
                  </div>

                  {/* Show Favorites on New Tab Page */}
                  <div
                    onClick={() =>
                      onUpdateSettings({
                        showFavoritesOnNewTab: !safeSettings.showFavoritesOnNewTab,
                      })
                    }
                    className="p-3 px-4 flex items-center justify-between cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="space-y-0.5 mr-3 select-none">
                      <div className="text-xs font-medium text-[var(--text-main)]">
                        Show Favorites on New Tab Page
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Surface saved favorites in the quick-links speed dial on blank tabs
                      </div>
                    </div>
                    <div className="relative inline-flex items-center flex-shrink-0 pointer-events-none">
                      <input
                        type="checkbox"
                        readOnly
                        checked={safeSettings.showFavoritesOnNewTab}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                    </div>
                  </div>
                </div>

                {/* Search & List */}
                <div className="flex items-center justify-between pt-1">
                  <div className="relative flex-1 mr-3">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)] pointer-events-none" />
                    <input
                      type="text"
                      value={bookmarkFilter}
                      onChange={(e) => setBookmarkFilter(e.target.value)}
                      placeholder="Search bookmarks..."
                      className="w-full h-8 pl-8 pr-3 rounded-lg text-xs border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--border-selected)]"
                    />
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0">
                    {filteredBookmarks.length}{' '}
                    {filteredBookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
                  </span>
                </div>

                {filteredBookmarks.length > 0 ? (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {filteredBookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        className="p-2.5 px-3 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] flex items-center justify-between hover:border-[var(--accent-primary)]/30 transition-colors"
                      >
                        <div className="flex items-center space-x-3 overflow-hidden mr-3">
                          <div className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                            {bm.favicon ? (
                              <img src={bm.favicon} alt="" className="w-3.5 h-3.5 rounded-xs" />
                            ) : (
                              <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-medium text-[var(--text-main)] truncate">
                              {bm.title || bm.url}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate font-mono">
                              {bm.url}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <button
                            onClick={() => {
                              window.browserApi.createTab(bm.url);
                              onClose();
                            }}
                            className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => window.browserApi.removeBookmark(bm.id)}
                            className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete bookmark"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl border border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center text-center space-y-2 text-[var(--text-muted)]">
                    <Bookmark className="w-6 h-6 opacity-40" />
                    <div className="text-xs font-medium text-[var(--text-main)]">
                      {bookmarkFilter ? 'No matching bookmarks' : 'No bookmarks yet'}
                    </div>
                    <p className="text-[11px] max-w-xs">
                      Click the star in the address bar or press{' '}
                      <kbd className="px-1 py-0.2 rounded font-mono border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">
                        {getEffectiveShortcut('toggleBookmark')}
                      </kbd>{' '}
                      to save pages to your favorites.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 4. Startup & Session Preferences */}
            {activeTab === 'startup' && (
              <div className="space-y-4">
                <label className="text-xs font-medium block text-[var(--text-main)]">
                  On Startup
                </label>
                <div className="space-y-2.5">
                  {/* Option 1: New Tab Page */}
                  <button
                    onClick={() => onUpdateSettings({ startupBehavior: 'new-tab' })}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all text-left cursor-pointer ${
                      safeSettings.startupBehavior === 'new-tab'
                        ? 'border-[var(--border-selected)] bg-[var(--bg-card-selected)] ring-1 ring-[var(--accent-primary)]/20 shadow-xs'
                        : 'border-[var(--border-card)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/40 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-[var(--text-main)]">
                        Open the New Tab page
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        Start with a fresh, clean search canvas and quick links (Default)
                      </div>
                    </div>
                    {safeSettings.startupBehavior === 'new-tab' && (
                      <Check className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    )}
                  </button>

                  {/* Option 2: Continue where you left off */}
                  <button
                    onClick={() => onUpdateSettings({ startupBehavior: 'continue' })}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all text-left cursor-pointer ${
                      safeSettings.startupBehavior === 'continue'
                        ? 'border-[var(--border-selected)] bg-[var(--bg-card-selected)] ring-1 ring-[var(--accent-primary)]/20 shadow-xs'
                        : 'border-[var(--border-card)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/40 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-[var(--text-main)]">
                        Continue where you left off
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        Automatically restore all tabs and active tab from your previous session
                      </div>
                    </div>
                    {safeSettings.startupBehavior === 'continue' && (
                      <Check className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    )}
                  </button>

                  {/* Option 3: Open a specific page */}
                  <div
                    className={`w-full p-3 rounded-xl border transition-all text-left ${
                      safeSettings.startupBehavior === 'custom-url'
                        ? 'border-[var(--border-selected)] bg-[var(--bg-card-selected)] ring-1 ring-[var(--accent-primary)]/20 shadow-xs'
                        : 'border-[var(--border-card)] bg-[var(--bg-card)]'
                    }`}
                  >
                    <div
                      onClick={() => onUpdateSettings({ startupBehavior: 'custom-url' })}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-medium text-[var(--text-main)]">
                          Open a specific page
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          Always open a specified URL upon launch
                        </div>
                      </div>
                      {safeSettings.startupBehavior === 'custom-url' && (
                        <Check className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                      )}
                    </div>

                    {safeSettings.startupBehavior === 'custom-url' && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center space-x-2">
                        <input
                          type="text"
                          defaultValue={safeSettings.startupCustomUrl || 'https://duckduckgo.com'}
                          onChange={(e) => setCustomStartupInput(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 h-7 text-xs px-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--border-selected)]"
                        />
                        <button
                          onClick={() => {
                            if (customStartupInput.trim()) {
                              onUpdateSettings({ startupCustomUrl: customStartupInput.trim() });
                            }
                          }}
                          className="px-3 py-1 text-xs rounded-lg text-white font-medium shadow-xs hover:opacity-90 cursor-pointer"
                          style={{ backgroundColor: 'var(--accent-primary)' }}
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. History & Clear Browsing Data */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 mr-3">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)] pointer-events-none" />
                    <input
                      type="text"
                      value={historyFilter}
                      onChange={(e) => setHistoryFilter(e.target.value)}
                      placeholder="Search history..."
                      className="w-full h-8 pl-8 pr-3 rounded-lg text-xs border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--border-selected)]"
                    />
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={handleClearHistory}
                      disabled={historyList.length === 0}
                      className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                    >
                      Clear History
                    </button>
                    <button
                      onClick={handleClearAllBrowsingData}
                      className="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-400 hover:bg-rose-500/20 cursor-pointer flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear All Data</span>
                    </button>
                  </div>
                </div>

                {filteredHistory.length > 0 ? (
                  <div className="space-y-2 max-h-[340px] overflow-y-auto">
                    {filteredHistory.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          window.browserApi.createTab(item.url);
                          onClose();
                        }}
                        className="p-2.5 px-3 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] flex items-center justify-between hover:border-[var(--accent-primary)]/30 transition-colors cursor-pointer group"
                      >
                        <div className="overflow-hidden mr-3">
                          <div className="text-xs font-medium text-[var(--text-main)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                            {item.title || item.url}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate font-mono">
                            {item.url}
                          </div>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                          {new Date(item.visitedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl border border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center text-center space-y-2 text-[var(--text-muted)]">
                    <Clock className="w-6 h-6 opacity-40" />
                    <div className="text-xs font-medium text-[var(--text-main)]">
                      {historyFilter ? 'No matching history found' : 'No browsing history yet'}
                    </div>
                    <p className="text-[11px] max-w-xs">
                      Web pages you visit will appear here for fast revisiting.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 6. Tab Switcher Preferences */}
            {activeTab === 'switcher' && (
              <div className="space-y-4">
                <div
                  onClick={() =>
                    onUpdateSettings({ autoHibernateTabs: !safeSettings.autoHibernateTabs })
                  }
                  className="p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all border-[var(--border-card)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/40 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                >
                  <div className="space-y-0.5 mr-3 select-none">
                    <div className="text-xs font-medium text-[var(--text-main)]">
                      Auto-Hibernate Idle Tabs
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Suspends heavy background processes on tabs idle for more than 30 minutes.
                    </div>
                  </div>
                  <div className="relative inline-flex items-center flex-shrink-0 pointer-events-none">
                    <input
                      type="checkbox"
                      readOnly
                      checked={safeSettings.autoHibernateTabs}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Search Engine */}
            {activeTab === 'search' && (
              <div className="space-y-3">
                <label className="text-xs font-medium block text-[var(--text-main)]">
                  Default Omnibar Search Engine
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'google', name: 'Google', desc: 'Standard search results (Recommended)' },
                    { id: 'duckduckgo', name: 'DuckDuckGo', desc: 'Privacy-focused search without trackers' },
                    { id: 'brave', name: 'Brave Search', desc: 'Independent search index' },
                    { id: 'bing', name: 'Microsoft Bing', desc: 'Bing web search' },
                  ].map((engine) => {
                    const isSelected = (safeSettings.defaultSearchEngine || 'google') === engine.id;
                    return (
                      <button
                        key={engine.id}
                        onClick={() => onUpdateSettings({ defaultSearchEngine: engine.id as any })}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'border-[var(--border-selected)] bg-[var(--bg-card-selected)] ring-1 ring-[var(--accent-primary)]/20 shadow-xs'
                            : 'border-[var(--border-card)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/50 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] hover:scale-[1.005]'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Globe className="w-4 h-4 text-[var(--text-muted)]" />
                          <div>
                            <div className="text-xs font-medium text-[var(--text-main)]">
                              {engine.name}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)]">{engine.desc}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 8. About */}
            {activeTab === 'about' && (
              <div className="space-y-4">
                <div
                  className="flex items-center space-x-3 p-3.5 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center">
                    <Info className="w-5 h-5 text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-main)]">Larp Browser</h4>
                    <p className="text-[11px] text-[var(--text-muted)]">Version 1.4.0</p>
                  </div>
                </div>

                <div
                  className="p-4 rounded-xl border space-y-2 text-xs leading-relaxed"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-card)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <p>
                    A clean, distraction-free web browser built around a keyboard-driven visual
                    Alt-Tab tab switcher HUD (
                    <kbd className="font-mono px-1 py-0.2 rounded border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">
                      Ctrl+Tab
                    </kbd>
                    ).
                  </p>
                  <p>
                    Includes editable keyboard shortcuts, quick-access favorites, session restore,
                    in-page search (Ctrl+F), page zoom, and browsing history cleanup.
                  </p>
                  <p
                    className="text-[11px] pt-2 border-t"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    Built with Electron WebContentsView, React 19, and Tailwind CSS.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="p-3 px-5 border-t flex items-center justify-end flex-shrink-0"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'rgba(128, 128, 128, 0.03)',
            }}
          >
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-white text-xs font-medium shadow-sm transition-all hover:opacity-90 active:scale-95 cursor-pointer"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
