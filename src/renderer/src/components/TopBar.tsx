import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Search,
  Plus,
  Layers,
  Minus,
  Square,
  X,
  Lock,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Settings,
  Keyboard,
  Star,
  Globe,
  Bookmark,
} from 'lucide-react';
import type { BrowserState } from '@/shared/types';
import type { ThemeMode } from '../App';

interface TopBarProps {
  state: BrowserState;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSettings: (tab?: string) => void;
  onOpenShortcuts: () => void;
  onToggleFavorites: () => void;
  onOpenFind?: () => void;
  isFavoritesOpen?: boolean;
  onShowToast?: (toast: { type: 'success' | 'info' | 'warning' | 'danger'; message: string }) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  state,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenShortcuts,
  onToggleFavorites,
  isFavoritesOpen = false,
  onShowToast,
}) => {
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const [urlInput, setUrlInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isBookmarked =
    activeTab && activeTab.url && activeTab.url !== 'about:blank'
      ? state.bookmarks?.some((b) => b.url === activeTab.url)
      : false;

  useEffect(() => {
    if (activeTab && !isFocused) {
      setUrlInput(activeTab.url === 'about:blank' ? '' : activeTab.url);
    }
  }, [activeTab, isFocused]);

  // Listen for focus-omnibar event from global shortcuts
  useEffect(() => {
    if (window.browserApi?.onFocusOmnibar) {
      return window.browserApi.onFocusOmnibar(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTab || !urlInput.trim()) return;
    window.browserApi.navigateTab(activeTab.id, urlInput.trim());
    inputRef.current?.blur();
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTab) {
      window.browserApi.toggleMuteTab(activeTab.id);
    }
  };

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeTab || !activeTab.url || activeTab.url === 'about:blank') return;
    const willAdd = !isBookmarked;
    window.browserApi.toggleBookmark({
      title: activeTab.title || activeTab.url,
      url: activeTab.url,
      favicon: activeTab.favicon,
    });
    onShowToast?.({
      type: willAdd ? 'success' : 'info',
      message: willAdd ? 'Saved to Bookmarks' : 'Removed from Bookmarks',
    });
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTab) {
      window.browserApi.setZoomFactor(activeTab.id, 1.0);
    }
  };

  const isDark = theme === 'dark';
  const showBookmarksBar = state.settings?.showBookmarksBar;
  const focusKey = state.settings?.customShortcuts?.focusOmnibar || 'Ctrl+L';
  const bookmarkKey = state.settings?.customShortcuts?.toggleBookmark || 'Ctrl+D';
  const favoritesKey = state.settings?.customShortcuts?.openFavorites || 'Ctrl+B';

  const zoomPercent = activeTab?.zoomFactor ? Math.round(activeTab.zoomFactor * 100) : 100;

  return (
    <div className="flex flex-col w-full select-none z-40">
      {/* Primary Top Bar (44px) */}
      <header
        className="h-11 w-full flex items-center justify-between px-3 transition-colors duration-150 border-b"
        style={{
          backgroundColor: 'var(--bg-topbar)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-main)',
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        {/* Left controls: Brand & Navigation */}
        <div
          className="flex items-center space-x-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Simple, understated brand mark */}
          <div className="flex items-center space-x-1.5 px-2 py-1 mr-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-default">
            <div
              className="w-3.5 h-3.5 rounded-sm flex items-center justify-center font-bold text-[10px] text-white"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              L
            </div>
            <span className="text-xs font-semibold tracking-tight text-[var(--text-main)]">
              larp
            </span>
          </div>

          {/* Back Button */}
          <button
            onClick={() => activeTab && window.browserApi.goBack(activeTab.id)}
            disabled={!activeTab?.canGoBack}
            className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default"
            title="Back (Alt+Left)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          {/* Forward Button */}
          <button
            onClick={() => activeTab && window.browserApi.goForward(activeTab.id)}
            disabled={!activeTab?.canGoForward}
            className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default"
            title="Forward (Alt+Right)"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Reload Button */}
          <button
            onClick={() => activeTab && window.browserApi.reloadTab(activeTab.id)}
            className={`p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer ${
              activeTab?.isLoading ? 'animate-spin' : ''
            }`}
            style={{
              color: activeTab?.isLoading ? 'var(--accent-primary)' : undefined,
            }}
            title="Reload (Ctrl+R)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Clean Omnibar with Star Toggle & Zoom indicator */}
        <div
          className="flex-1 max-w-xl mx-3"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <div className="absolute left-2.5 flex items-center pointer-events-none">
              {activeTab?.url.startsWith('https://') ? (
                <Lock className="w-3 h-3 text-emerald-500/80 dark:text-emerald-400/80" />
              ) : (
                <Search className="w-3 h-3 text-[var(--text-muted)]" />
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onFocus={() => {
                setIsFocused(true);
                inputRef.current?.select();
              }}
              onBlur={() => setIsFocused(false)}
              placeholder="Search or enter web address..."
              className="w-full h-7 pl-8 pr-24 rounded-md text-xs transition-all border focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: isFocused ? 'var(--border-selected)' : 'var(--border-subtle)',
                color: 'var(--text-main)',
                boxShadow: isFocused ? '0 0 0 1px var(--border-selected)' : 'none',
              }}
            />

            {/* Right badges in Omnibar (Audio, Zoom, Star, Shortcut) */}
            <div className="absolute right-2 flex items-center space-x-1">
              {/* Zoom badge when not 100% */}
              {zoomPercent !== 100 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="text-[9px] font-mono px-1 py-0.2 rounded border bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"
                  title="Reset Zoom to 100% (Ctrl+0)"
                >
                  {zoomPercent}%
                </button>
              )}

              {activeTab?.audioPlaying && (
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="p-0.5 rounded text-[var(--accent-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                  title={activeTab.isMuted ? 'Unmute Tab' : 'Mute Tab'}
                >
                  {activeTab.isMuted ? (
                    <VolumeX className="w-3 h-3 text-rose-400" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                </button>
              )}

              {/* Star Bookmark Button */}
              {activeTab && activeTab.url && activeTab.url !== 'about:blank' && (
                <button
                  type="button"
                  onClick={handleToggleBookmark}
                  className={`p-1 rounded transition-colors cursor-pointer ${
                    isBookmarked
                      ? 'text-amber-400 hover:text-amber-300'
                      : 'text-[var(--text-muted)] hover:text-amber-400'
                  }`}
                  title={isBookmarked ? `Remove Bookmark (${bookmarkKey})` : `Bookmark This Tab (${bookmarkKey})`}
                >
                  <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
                </button>
              )}

              <span
                className="text-[9px] font-mono px-1 py-0.2 rounded border hidden sm:inline-block"
                style={{
                  color: 'var(--text-muted)',
                  backgroundColor: 'rgba(128, 128, 128, 0.08)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {focusKey}
              </span>
            </div>
          </form>
        </div>

        {/* Right controls */}
        <div
          className="flex items-center space-x-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Favorites Quick Popover Trigger Button */}
          <button
            onClick={onToggleFavorites}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isFavoritesOpen
                ? 'text-amber-400 bg-black/10 dark:bg-white/10'
                : 'text-[var(--text-muted)] hover:text-amber-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title={`Favorites (${favoritesKey})`}
          >
            <Star className={`w-3.5 h-3.5 ${isFavoritesOpen ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Tab Switcher Trigger Button */}
          <button
            onClick={() => window.browserApi.openSwitcher()}
            className="flex items-center space-x-1.5 px-2 py-1 rounded-md text-xs border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            title="Switch Tabs (Ctrl+Tab)"
          >
            <Layers className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-[11px] font-medium">
              {state.tabs.length} {state.tabs.length === 1 ? 'tab' : 'tabs'}
            </span>
            <span
              className="text-[9px] font-mono px-1 py-0.2 rounded border"
              style={{
                color: 'var(--text-muted)',
                backgroundColor: 'rgba(128, 128, 128, 0.08)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              Ctrl+Tab
            </span>
          </button>

          {/* New Tab Button */}
          <button
            onClick={() => window.browserApi.createTab()}
            className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            title="New Tab (Ctrl+T)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => onOpenSettings()}
            className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            title="Settings (Ctrl+,)"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Keyboard Shortcuts Button */}
          <button
            onClick={onOpenShortcuts}
            className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            title="Keyboard Shortcuts (Ctrl+/)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Window Controls (Minimize, Maximize, Close) */}
          <div
            className="flex items-center ml-1 pl-1 border-l space-x-0.5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <button
              onClick={() => window.browserApi.minimizeWindow()}
              className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.browserApi.maximizeWindow()}
              className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              title="Maximize"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={() => window.browserApi.closeWindow()}
              className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Optional Bookmarks Bar (28px) */}
      {showBookmarksBar && (
        <div
          className="h-7 w-full flex items-center justify-between px-3 border-b text-xs overflow-x-auto no-scrollbar transition-colors duration-150"
          style={{
            backgroundColor: 'var(--bg-topbar)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
            {state.bookmarks && state.bookmarks.length > 0 ? (
              state.bookmarks.map((bm) => (
                <button
                  key={bm.id}
                  onClick={() => activeTab && window.browserApi.navigateTab(activeTab.id, bm.url)}
                  className="flex items-center space-x-1.5 px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-main)] max-w-[170px] truncate cursor-pointer text-[11px]"
                  title={`${bm.title}\n${bm.url}`}
                >
                  {bm.favicon ? (
                    <img src={bm.favicon} alt="" className="w-3 h-3 rounded-xs flex-shrink-0" />
                  ) : (
                    <Globe className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
                  )}
                  <span className="truncate">{bm.title || bm.url}</span>
                </button>
              ))
            ) : (
              <span className="text-[11px] text-[var(--text-muted)] flex items-center space-x-1 italic">
                <Bookmark className="w-3 h-3 inline mr-1 opacity-70" />
                No bookmarks yet. Press the star icon in the omnibar or {bookmarkKey} to save pages.
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1 pl-2 text-[10px] text-[var(--text-muted)] font-mono flex-shrink-0">
            <span>Ctrl+Shift+B</span>
          </div>
        </div>
      )}
    </div>
  );
};
