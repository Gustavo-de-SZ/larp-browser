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
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Edit2,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { DARK_PALETTES, LIGHT_PALETTES, ColorPalette, getPalette } from '../theme/palettes';
import {
  BrowserSettings,
  BookmarkItem,
  HistoryItem,
  PasswordEntry,
  ClearBrowsingDataOptions,
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
  | 'passwords'
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
  const [historyTimeRange, setHistoryTimeRange] = useState<'all' | 'today' | 'yesterday' | '7days'>('all');
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearOptions, setClearOptions] = useState<ClearBrowsingDataOptions>({
    timeRange: 'all',
    clearHistory: true,
    clearCookies: true,
    clearCache: true,
  });
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [customStartupInput, setCustomStartupInput] = useState('');

  // Password Vault state
  const [passwordsList, setPasswordsList] = useState<PasswordEntry[]>([]);
  const [passwordFilter, setPasswordFilter] = useState('');
  const [revealedPasswordIds, setRevealedPasswordIds] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isAddPasswordOpen, setIsAddPasswordOpen] = useState(false);
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ site: '', username: '', password: '' });

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

  // Load passwords when opening passwords tab
  useEffect(() => {
    if (isOpen && activeTab === 'passwords' && window.browserApi?.getPasswords) {
      window.browserApi.getPasswords().then((items) => {
        if (items) setPasswordsList(items);
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

  const filteredHistory = historyList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(historyFilter.toLowerCase()) ||
      item.url.toLowerCase().includes(historyFilter.toLowerCase());
    if (!matchesSearch) return false;

    if (historyTimeRange === 'all') return true;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;

    if (historyTimeRange === 'today') {
      return item.visitedAt >= startOfToday;
    } else if (historyTimeRange === 'yesterday') {
      return item.visitedAt >= startOfYesterday && item.visitedAt < startOfToday;
    } else if (historyTimeRange === '7days') {
      return item.visitedAt >= Date.now() - 7 * 86400000;
    }
    return true;
  });

  const handleDeleteHistoryItem = (id: string) => {
    setHistoryList((prev) => prev.filter((h) => h.id !== id));
    if (window.browserApi?.deleteHistoryItem) {
      window.browserApi.deleteHistoryItem(id);
    }
  };

  const handleClearHistory = () => {
    if (window.browserApi?.clearHistory) {
      window.browserApi.clearHistory();
      setHistoryList([]);
    }
  };

  const handleExecuteClearBrowsingData = async () => {
    if (window.browserApi?.clearBrowsingDataAdvanced) {
      await window.browserApi.clearBrowsingDataAdvanced(clearOptions);
      if (window.browserApi?.getHistory) {
        window.browserApi.getHistory().then((items) => {
          if (items) setHistoryList(items);
        });
      }
      setShowClearModal(false);
    }
  };

  // Passwords filtering & handlers
  const filteredPasswords = passwordsList.filter(
    (p) =>
      p.site.toLowerCase().includes(passwordFilter.toLowerCase()) ||
      p.username.toLowerCase().includes(passwordFilter.toLowerCase())
  );

  const handleSavePasswordForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.site.trim() || !passwordForm.username.trim() || !passwordForm.password) return;

    if (editingPasswordId) {
      const existing = passwordsList.find((p) => p.id === editingPasswordId);
      if (existing) {
        const updated: PasswordEntry = {
          ...existing,
          site: passwordForm.site.trim(),
          username: passwordForm.username.trim(),
          password: passwordForm.password,
          updatedAt: Date.now(),
        };
        await window.browserApi.updatePassword(updated);
      }
    } else {
      await window.browserApi.savePassword({
        site: passwordForm.site.trim(),
        username: passwordForm.username.trim(),
        password: passwordForm.password,
      });
    }

    if (window.browserApi?.getPasswords) {
      const items = await window.browserApi.getPasswords();
      if (items) setPasswordsList(items);
    }

    setIsAddPasswordOpen(false);
    setEditingPasswordId(null);
    setPasswordForm({ site: '', username: '', password: '' });
  };

  const handleDeletePassword = async (id: string) => {
    setPasswordsList((prev) => prev.filter((p) => p.id !== id));
    if (window.browserApi?.deletePassword) {
      await window.browserApi.deletePassword(id);
    }
  };

  const handleCopyText = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
              onClick={() => setActiveTab('passwords')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'passwords'
                  ? 'bg-black/10 dark:bg-white/10 text-[var(--text-main)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <KeyRound className="w-4 h-4 text-[var(--text-muted)]" />
              <span>Passwords</span>
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
                      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={customStartupInput}
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
                        <div className="flex items-center space-x-1.5 flex-wrap pt-0.5 text-[10px] text-[var(--text-muted)]">
                          <span>Quick presets:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const engine = safeSettings.defaultSearchEngine || 'google';
                              const urls: Record<string, string> = {
                                google: 'https://www.google.com',
                                duckduckgo: 'https://duckduckgo.com',
                                brave: 'https://search.brave.com',
                                bing: 'https://www.bing.com',
                              };
                              const target = urls[engine] || 'https://www.google.com';
                              setCustomStartupInput(target);
                              onUpdateSettings({ startupCustomUrl: target });
                            }}
                            className="px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 hover:border-[var(--accent-primary)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                          >
                            Sync with Search Engine
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomStartupInput('https://www.google.com');
                              onUpdateSettings({ startupCustomUrl: 'https://www.google.com' });
                            }}
                            className="px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 hover:border-[var(--accent-primary)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                          >
                            Google
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomStartupInput('https://duckduckgo.com');
                              onUpdateSettings({ startupCustomUrl: 'https://duckduckgo.com' });
                            }}
                            className="px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 hover:border-[var(--accent-primary)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                          >
                            DuckDuckGo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomStartupInput('https://search.brave.com');
                              onUpdateSettings({ startupCustomUrl: 'https://search.brave.com' });
                            }}
                            className="px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-black/5 dark:bg-white/5 hover:border-[var(--accent-primary)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                          >
                            Brave
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. History & Clear Browsing Data */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
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
                      onClick={() => setShowClearModal(true)}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-400 hover:bg-rose-500/20 cursor-pointer flex items-center space-x-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Browsing Data...</span>
                    </button>
                  </div>
                </div>

                {/* Time Range Filter Pills */}
                <div className="flex items-center space-x-1.5 pb-1 border-b border-[var(--border-subtle)] overflow-x-auto text-xs">
                  {[
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: '7days', label: 'Last 7 Days' },
                  ].map((range) => (
                    <button
                      key={range.id}
                      onClick={() => setHistoryTimeRange(range.id as any)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                        historyTimeRange === range.id
                          ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                  <span className="text-[10px] text-[var(--text-muted)] ml-auto pl-2 flex-shrink-0">
                    {filteredHistory.length} {filteredHistory.length === 1 ? 'visit' : 'visits'}
                  </span>
                </div>

                {filteredHistory.length > 0 ? (
                  <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                    {filteredHistory.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          window.browserApi.createTab(item.url);
                          onClose();
                        }}
                        className="p-2.5 px-3 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] flex items-center justify-between hover:border-[var(--accent-primary)]/30 transition-all cursor-pointer group"
                      >
                        <div className="overflow-hidden mr-3 flex-1">
                          <div className="text-xs font-medium text-[var(--text-main)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                            {item.title || item.url}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate font-mono">
                            {item.url}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {new Date(item.visitedAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            {new Date(item.visitedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <button
                            title="Delete entry"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHistoryItem(item.id);
                            }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 text-[var(--text-muted)] hover:text-rose-400 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl border border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center text-center space-y-2 text-[var(--text-muted)]">
                    <Clock className="w-6 h-6 opacity-40" />
                    <div className="text-xs font-medium text-[var(--text-main)]">
                      {historyFilter ? 'No matching history found' : 'No browsing history found'}
                    </div>
                    <p className="text-[11px] max-w-xs">
                      Web pages you visit will appear here for fast revisiting and searching.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 6. Password Vault */}
            {activeTab === 'passwords' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)] pointer-events-none" />
                    <input
                      type="text"
                      value={passwordFilter}
                      onChange={(e) => setPasswordFilter(e.target.value)}
                      placeholder="Search saved passwords..."
                      className="w-full h-8 pl-8 pr-3 rounded-lg text-xs border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--border-selected)]"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setEditingPasswordId(null);
                      setPasswordForm({ site: '', username: '', password: '' });
                      setIsAddPasswordOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-medium shadow-xs flex items-center space-x-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Password</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] px-1">
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Vault is encrypted locally with native OS safeStorage keychain</span>
                  </div>
                  <span>{filteredPasswords.length} saved</span>
                </div>

                {filteredPasswords.length > 0 ? (
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {filteredPasswords.map((pwd) => {
                      const isRevealed = revealedPasswordIds.has(pwd.id);
                      return (
                        <div
                          key={pwd.id}
                          className="p-3 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all hover:border-[var(--accent-primary)]/30"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center space-x-2">
                              <Globe className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                              <span className="text-xs font-semibold text-[var(--text-main)] truncate">
                                {pwd.site}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-[11px] text-[var(--text-muted)] font-mono">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[10px] uppercase text-[var(--text-muted)]/70">User:</span>
                                <span className="text-[var(--text-main)]">{pwd.username}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(pwd.username, `user-${pwd.id}`)}
                                  className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                                  title="Copy username"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                {copiedField === `user-${pwd.id}` && (
                                  <span className="text-[10px] text-emerald-500 font-sans">Copied!</span>
                                )}
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[10px] uppercase text-[var(--text-muted)]/70">Pass:</span>
                                <span className="text-[var(--text-main)] tracking-wider">
                                  {isRevealed ? pwd.password : '••••••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(pwd.id)}
                                  className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                                  title={isRevealed ? 'Hide password' : 'Show password'}
                                >
                                  {isRevealed ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(pwd.password, `pass-${pwd.id}`)}
                                  className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                                  title="Copy password"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                {copiedField === `pass-${pwd.id}` && (
                                  <span className="text-[10px] text-emerald-500 font-sans">Copied!</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 self-end sm:self-center">
                            <button
                              onClick={() => {
                                setEditingPasswordId(pwd.id);
                                setPasswordForm({
                                  site: pwd.site,
                                  username: pwd.username,
                                  password: pwd.password,
                                });
                                setIsAddPasswordOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              title="Edit password"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeletePassword(pwd.id)}
                              className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete password"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl border border-dashed border-[var(--border-subtle)] flex flex-col items-center justify-center text-center space-y-2 text-[var(--text-muted)]">
                    <KeyRound className="w-6 h-6 opacity-40" />
                    <div className="text-xs font-medium text-[var(--text-main)]">
                      {passwordFilter ? 'No matching passwords' : 'No passwords saved yet'}
                    </div>
                    <p className="text-[11px] max-w-xs">
                      Store credentials securely. All passwords are encrypted with native OS keychain before writing to disk.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 7. Tab Switcher Preferences */}
            {activeTab === 'switcher' && (
              <div className="space-y-4">
                {/* Auto-Hibernate idle tabs */}
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
                      Suspends heavy background execution and timers on unused tabs to save memory and CPU.
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

                {/* Idle Timeout Selector (only if enabled) */}
                {safeSettings.autoHibernateTabs && (
                  <div className="p-3.5 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-[var(--text-main)]">
                        Inactivity Timeout
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Tabs become hibernated after this period of inactivity
                      </div>
                    </div>
                    <select
                      value={safeSettings.idleHibernateMinutes ?? 30}
                      onChange={(e) =>
                        onUpdateSettings({ idleHibernateMinutes: Number(e.target.value) })
                      }
                      className="h-8 text-xs px-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--border-selected)] cursor-pointer"
                    >
                      <option value={5}>5 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes (Default)</option>
                      <option value={60}>60 minutes (1 hour)</option>
                    </select>
                  </div>
                )}

                {/* Switcher Layout Selection */}
                <div className="p-3.5 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] space-y-2.5">
                  <div>
                    <div className="text-xs font-medium text-[var(--text-main)]">Switcher Layout Style</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Choose between visual thumbnail cards or a high-density compact list
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ switcherLayout: 'grid' })}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        (safeSettings.switcherLayout || 'grid') === 'grid'
                          ? 'border-[var(--border-selected)] bg-[var(--bg-card-selected)] ring-1 ring-[var(--accent-primary)]/20'
                          : 'border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 bg-black/[0.02] dark:bg-white/[0.02]'
                      }`}
                    >
                      <div className="text-xs font-semibold text-[var(--text-main)]">Visual Cards (Grid)</div>
                      <div className="text-[10px] text-[var(--text-muted)]">2-column cards with web preview</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ switcherLayout: 'compact' })}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        safeSettings.switcherLayout === 'compact'
                          ? 'border-[var(--border-selected)] bg-[var(--bg-card-selected)] ring-1 ring-[var(--accent-primary)]/20'
                          : 'border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 bg-black/[0.02] dark:bg-white/[0.02]'
                      }`}
                    >
                      <div className="text-xs font-semibold text-[var(--text-main)]">Compact List</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Slim rows with high density</div>
                    </button>
                  </div>
                </div>

                {/* Display Toggles */}
                <div className="space-y-2">
                  <div
                    onClick={() =>
                      onUpdateSettings({
                        switcherShowPreviews:
                          safeSettings.switcherShowPreviews === undefined
                            ? false
                            : !safeSettings.switcherShowPreviews,
                      })
                    }
                    className="p-3 rounded-xl border flex items-center justify-between cursor-pointer border-[var(--border-card)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/40"
                  >
                    <div>
                      <div className="text-xs font-medium text-[var(--text-main)]">Show Page Previews</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Render live snapshot thumbnails in tab switcher cards
                      </div>
                    </div>
                    <div className="relative inline-flex items-center flex-shrink-0 pointer-events-none">
                      <input
                        type="checkbox"
                        readOnly
                        checked={safeSettings.switcherShowPreviews !== false}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                    </div>
                  </div>

                  <div
                    onClick={() =>
                      onUpdateSettings({
                        switcherShowUrls:
                          safeSettings.switcherShowUrls === undefined
                            ? false
                            : !safeSettings.switcherShowUrls,
                      })
                    }
                    className="p-3 rounded-xl border flex items-center justify-between cursor-pointer border-[var(--border-card)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/40"
                  >
                    <div>
                      <div className="text-xs font-medium text-[var(--text-main)]">Show Tab URLs</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Display domain and URL path on each tab card
                      </div>
                    </div>
                    <div className="relative inline-flex items-center flex-shrink-0 pointer-events-none">
                      <input
                        type="checkbox"
                        readOnly
                        checked={safeSettings.switcherShowUrls !== false}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                    </div>
                  </div>

                  {/* Tab Switcher Ordering */}
                  <div className="p-3 rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-[var(--text-main)]">Tab Switcher Sort Order</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Order tabs by most recently visited or creation order
                      </div>
                    </div>
                    <select
                      value={safeSettings.switcherSortOrder || 'mru'}
                      onChange={(e) =>
                        onUpdateSettings({ switcherSortOrder: e.target.value as any })
                      }
                      className="h-8 text-xs px-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--border-selected)] cursor-pointer"
                    >
                      <option value="mru">Most Recently Used (Alt-Tab)</option>
                      <option value="creation">Creation Order (Tab Bar)</option>
                    </select>
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
                    <p className="text-[11px] text-[var(--text-muted)]">Version 1.5.0</p>
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
                    Includes an encrypted local password vault, automatic tab idle hibernation,
                    customizable switcher layouts, editable keyboard shortcuts, quick favorites,
                    session restore, in-page search (Ctrl+F), page zoom, and granular browsing data cleanup.
                  </p>
                  <p
                    className="text-[11px] pt-2 border-t"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    Built with Electron WebContentsView, safeStorage native encryption, React 19, and Tailwind CSS.
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

        {/* Clear Browsing Data Modal */}
        {showClearModal && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
            onClick={() => setShowClearModal(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-100"
              style={{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center space-x-2">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <h3 className="text-xs font-semibold text-[var(--text-main)]">Clear Browsing Data</h3>
                </div>
                <button
                  onClick={() => setShowClearModal(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Time range selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-main)] block">Time range</label>
                <select
                  value={clearOptions.timeRange}
                  onChange={(e) =>
                    setClearOptions((prev) => ({
                      ...prev,
                      timeRange: e.target.value as any,
                    }))
                  }
                  className="w-full h-8 text-xs px-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--border-selected)]"
                >
                  <option value="hour">Last hour</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="4w">Last 4 weeks</option>
                  <option value="all">All time</option>
                </select>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2.5 pt-1">
                <label className="flex items-center space-x-2.5 text-xs text-[var(--text-main)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearOptions.clearHistory}
                    onChange={(e) =>
                      setClearOptions((prev) => ({ ...prev, clearHistory: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-[var(--border-subtle)] accent-[var(--accent-primary)]"
                  />
                  <span>Browsing history</span>
                </label>

                <label className="flex items-center space-x-2.5 text-xs text-[var(--text-main)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearOptions.clearCookies}
                    onChange={(e) =>
                      setClearOptions((prev) => ({ ...prev, clearCookies: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-[var(--border-subtle)] accent-[var(--accent-primary)]"
                  />
                  <span>Cookies and other site data</span>
                </label>

                <label className="flex items-center space-x-2.5 text-xs text-[var(--text-main)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearOptions.clearCache}
                    onChange={(e) =>
                      setClearOptions((prev) => ({ ...prev, clearCache: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-[var(--border-subtle)] accent-[var(--accent-primary)]"
                  />
                  <span>Cached images and files</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteClearBrowsingData}
                  disabled={!clearOptions.clearHistory && !clearOptions.clearCookies && !clearOptions.clearCache}
                  className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-medium shadow-xs disabled:opacity-40 cursor-pointer disabled:cursor-default"
                >
                  Clear Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Password Modal */}
        {isAddPasswordOpen && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
            onClick={() => setIsAddPasswordOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-100"
              style={{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-[var(--accent-primary)]" />
                  <h3 className="text-xs font-semibold text-[var(--text-main)]">
                    {editingPasswordId ? 'Edit Password' : 'Add Password'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddPasswordOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePasswordForm} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[var(--text-muted)] block">
                    Website or Service URL
                  </label>
                  <input
                    type="text"
                    required
                    value={passwordForm.site}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, site: e.target.value }))
                    }
                    placeholder="e.g. github.com"
                    className="w-full h-8 text-xs px-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--border-selected)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[var(--text-muted)] block">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={passwordForm.username}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, username: e.target.value }))
                    }
                    placeholder="user@example.com"
                    className="w-full h-8 text-xs px-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--border-selected)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[var(--text-muted)] block">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.password}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="••••••••••••"
                    className="w-full h-8 text-xs px-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--border-selected)]"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setIsAddPasswordOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg text-white text-xs font-medium shadow-xs hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    Save Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
