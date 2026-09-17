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
} from 'lucide-react';
import { DARK_PALETTES, LIGHT_PALETTES, ColorPalette, getPalette } from '../theme/palettes';
import type { BrowserSettings } from '../../shared/types';
import type { ThemeMode } from '../App';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BrowserSettings;
  theme: ThemeMode;
  onUpdateSettings: (settings: Partial<BrowserSettings>) => void;
}

type TabType = 'appearance' | 'switcher' | 'search' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  theme,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('appearance');
  const [paletteModeTab, setPaletteModeTab] = useState<ThemeMode>(theme);
  const isDark = theme === 'dark';

  // Keep sub-tab in sync if main theme changes
  useEffect(() => {
    setPaletteModeTab(theme);
  }, [theme]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const safeSettings = settings || {
    theme: 'dark',
    darkPaletteId: 'graphite',
    lightPaletteId: 'paper',
    forcePageDarkMode: true,
    defaultSearchEngine: 'google',
    autoHibernateTabs: true,
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
    // When switching to a curated palette, reset any custom accent overrides for that mode so its authentic colors shine
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
    // Explicitly send null instead of undefined so IPC and JSON serializer preserve the key deletion
    if (paletteModeTab === 'dark') {
      onUpdateSettings({ customDarkAccent: null });
    } else {
      onUpdateSettings({ customLightAccent: null });
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
        className="w-full max-w-3xl rounded-2xl border shadow-xl overflow-hidden flex flex-col md:flex-row h-[560px] animate-scale-up"
        style={{
          backgroundColor: 'var(--bg-app)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-main)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar */}
        <div
          className="w-full md:w-52 p-3 border-b md:border-b-0 md:border-r flex flex-col justify-between"
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
            Shortcut: <kbd className="px-1 py-0.2 rounded border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 font-semibold">Ctrl+,</kbd>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div
            className="p-3.5 px-5 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {activeTab === 'appearance' && 'Appearance & Colors'}
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
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Sun className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-[var(--text-main)]">Light Mode</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Clean, paper-like light tones</div>
                      </div>
                      {!isDark && <Check className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />}
                    </button>
                  </div>
                </div>

                {/* Customizable Color Palettes */}
                <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-medium text-[var(--text-main)]">
                        Curated Palettes
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Select a humane, grounded colorway for {paletteModeTab} mode.
                      </p>
                    </div>

                    {/* Mode tab toggle */}
                    <div
                      className="flex items-center p-0.5 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <button
                        onClick={() => setPaletteModeTab('dark')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          paletteModeTab === 'dark'
                            ? 'bg-black/20 dark:bg-white/20 text-[var(--text-main)] shadow-xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        Dark
                      </button>
                      <button
                        onClick={() => setPaletteModeTab('light')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          paletteModeTab === 'light'
                            ? 'bg-black/20 dark:bg-white/20 text-[var(--text-main)] shadow-xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        Light
                      </button>
                    </div>
                  </div>

                  {/* Palette Presets Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                    {currentPalettes.map((p) => {
                      const isSelected = p.id === currentActivePaletteId;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPalette(p)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between group ${
                            isSelected
                              ? 'border-[var(--border-selected)] bg-[var(--bg-card-selected)] ring-1 ring-[var(--accent-primary)]/20 shadow-xs'
                              : 'border-[var(--border-card)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/50 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] hover:scale-[1.01]'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-xs font-semibold text-[var(--text-main)]">
                                {p.name}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                                {p.description}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 flex-shrink-0 ml-1.5" style={{ color: 'var(--accent-primary)' }} />
                            )}
                          </div>

                          {/* Color Swatches */}
                          <div
                            className="flex items-center space-x-1.5 mt-2.5 pt-1.5 border-t"
                            style={{ borderColor: 'var(--border-subtle)' }}
                          >
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10"
                              style={{ backgroundColor: p.colors.bgApp }}
                              title="Background"
                            />
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10"
                              style={{ backgroundColor: p.colors.bgCardSelected }}
                              title="Surface"
                            />
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10"
                              style={{ backgroundColor: p.colors.accentPrimary }}
                              title="Primary Accent"
                            />
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10"
                              style={{ backgroundColor: p.colors.accentSecondary }}
                              title="Secondary Accent"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom Accent Color */}
                  <div
                    className="p-3 rounded-xl border flex items-center justify-between mt-1 border-[var(--border-card)] bg-[var(--bg-card)]"
                  >
                    <div>
                      <div className="text-xs font-medium text-[var(--text-main)] flex items-center space-x-1.5">
                        <span>Custom Accent Color ({paletteModeTab})</span>
                        {currentCustomAccent && (
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
                            {currentCustomAccent}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Overrides the primary highlight color for {paletteModeTab} mode.
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <input
                        type="color"
                        value={currentCustomAccent || currentPaletteDefaultAccent}
                        onChange={(e) => handleCustomAccentChange(e.target.value)}
                        onInput={(e) => handleCustomAccentChange((e.target as HTMLInputElement).value)}
                        className="w-7 h-7 rounded-md cursor-pointer bg-transparent border-0 p-0 transition-transform hover:scale-105"
                        title="Pick custom accent color"
                      />
                      {currentCustomAccent && (
                        <button
                          onClick={handleResetAccent}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          title="Reset to palette default"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dark Mode Sync with Web Pages */}
                <div
                  onClick={() => onUpdateSettings({ forcePageDarkMode: !safeSettings.forcePageDarkMode })}
                  className="p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all border-[var(--border-card)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/40 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                >
                  <div className="space-y-0.5 mr-3 select-none">
                    <div className="text-xs font-medium text-[var(--text-main)]">
                      Sync Webpage Theme
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Websites (like Google, GitHub, YouTube) automatically match your Larp theme.
                    </p>
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

            {/* 2. Tab Switcher */}
            {activeTab === 'switcher' && (
              <div className="space-y-3">
                <div
                  className="p-3.5 rounded-xl border space-y-1 border-[var(--border-card)] bg-[var(--bg-card)]"
                >
                  <div className="text-xs font-medium text-[var(--text-main)]">
                    Fast Live Snapshot Previews
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Tabs are captured as downscaled thumbnails with non-blocking snapshots, ensuring instantaneous cycling with zero latency when pressing <kbd className="font-mono px-1 py-0.2 rounded border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">Ctrl+Tab</kbd>.
                  </p>
                </div>

                <div
                  onClick={() => onUpdateSettings({ autoHibernateTabs: !safeSettings.autoHibernateTabs })}
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

            {/* 3. Search Engine */}
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

            {/* 4. About */}
            {activeTab === 'about' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center">
                    <Info className="w-5 h-5 text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-main)]">Larp Browser</h4>
                    <p className="text-[11px] text-[var(--text-muted)]">Version 1.2.1</p>
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
                    A clean, distraction-free web browser built around a keyboard-driven visual Alt-Tab tab switcher HUD (<kbd className="font-mono px-1 py-0.2 rounded border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">Ctrl+Tab</kbd>).
                  </p>
                  <p className="text-[11px] pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    Built with Electron WebContentsView, React 19, and Tailwind CSS.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="p-3 px-5 border-t flex items-center justify-end"
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
