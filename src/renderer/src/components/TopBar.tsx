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
  Clock,
  Download,
  VenetianMask,
  Zap,
} from 'lucide-react';
import type { BrowserState, HistoryItem } from '@/shared/types';
import type { ThemeMode } from '../App';
import {
  computeUrlSuggestions,
  computeInlineAutocomplete,
  cleanUrlForMatching,
  type UrlSuggestion,
} from '../utils/autocomplete';

interface TopBarProps {
  state: BrowserState;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSettings: (tab?: string) => void;
  onOpenShortcuts: () => void;
  onToggleFavorites: () => void;
  onOpenFind?: () => void;
  isFavoritesOpen?: boolean;
  onToggleDownloads?: () => void;
  isDownloadsOpen?: boolean;
  onShowToast?: (toast: { type: 'success' | 'info' | 'warning' | 'danger'; message: string }) => void;
  onOmnibarDropdownChange?: (isOpen: boolean) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  state,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenShortcuts,
  onToggleFavorites,
  isFavoritesOpen = false,
  onToggleDownloads,
  isDownloadsOpen = false,
  onShowToast,
  onOmnibarDropdownChange,
}) => {
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const [urlInput, setUrlInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<UrlSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeDownloadCount, setActiveDownloadCount] = useState<number>(0);
  const skipNextAutocompleteRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Track active downloads count
  useEffect(() => {
    if (!window.browserApi) return;

    window.browserApi.getDownloads?.().then((items) => {
      if (items) {
        const active = items.filter((d) => d.state === 'progressing' || d.state === 'paused').length;
        setActiveDownloadCount(active);
      }
    });

    const unsubStart = window.browserApi.onDownloadStarted?.(() => {
      setActiveDownloadCount((prev) => prev + 1);
    });

    const unsubDone = window.browserApi.onDownloadDone?.(() => {
      setActiveDownloadCount((prev) => Math.max(0, prev - 1));
    });

    return () => {
      unsubStart?.();
      unsubDone?.();
    };
  }, []);

  const isBookmarked =
    activeTab && activeTab.url && activeTab.url !== 'about:blank'
      ? state.bookmarks?.some((b) => b.url === activeTab.url)
      : false;

  const loadHistory = async () => {
    if (window.browserApi?.getHistory) {
      try {
        const items = await window.browserApi.getHistory();
        setHistoryList(items || []);
      } catch (err) {
        console.warn('Failed to load history for autocomplete:', err);
      }
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (activeTab && !isFocused) {
      setUrlInput(activeTab.url === 'about:blank' ? '' : activeTab.url);
      setIsDropdownOpen(false);
    }
  }, [activeTab, isFocused]);

  useEffect(() => {
    onOmnibarDropdownChange?.(isDropdownOpen);
  }, [isDropdownOpen, onOmnibarDropdownChange]);

  // Listen for focus-omnibar event from global shortcuts and direct keydown
  useEffect(() => {
    const unsubscribe = window.browserApi?.onFocusOmnibar?.(() => {
      setIsFocused(true);
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') ||
        (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && e.key.toLowerCase() === 'd')
      ) {
        e.preventDefault();
        setIsFocused(true);
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe?.();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleFocus = () => {
    setIsFocused(true);
    loadHistory();
    const computed = computeUrlSuggestions(
      urlInput,
      historyList,
      state.bookmarks || [],
      state.settings?.defaultSearchEngine || 'google',
      state.tabs,
      state.activeTabId
    );
    setSuggestions(computed);
    setSelectedIndex(-1);
    if (computed.length > 0) {
      setIsDropdownOpen(true);
    }
    inputRef.current?.select();
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (dropdownRef.current && dropdownRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsFocused(false);
    setIsDropdownOpen(false);
    if (activeTab) {
      setUrlInput(activeTab.url === 'about:blank' ? '' : activeTab.url);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setUrlInput(rawVal);

    const computed = computeUrlSuggestions(
      rawVal,
      historyList,
      state.bookmarks || [],
      state.settings?.defaultSearchEngine || 'google',
      state.tabs,
      state.activeTabId
    );
    setSuggestions(computed);
    setIsDropdownOpen(computed.length > 0);

    if (skipNextAutocompleteRef.current) {
      skipNextAutocompleteRef.current = false;
      setSelectedIndex(-1);
      return;
    }

    if (computed.length > 0 && computed[0].type === 'top-hit') {
      const top = computed[0];
      const inline = computeInlineAutocomplete(rawVal, top);
      if (inline && inputRef.current) {
        setSelectedIndex(0);
        setUrlInput(inline.fullCompletedText);
        const typedLen = rawVal.length;
        const totalLen = inline.fullCompletedText.length;
        requestAnimationFrame(() => {
          inputRef.current?.setSelectionRange(typedLen, totalLen);
        });
        return;
      }
    }

    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      skipNextAutocompleteRef.current = true;
      return;
    }

    if (e.key === 'Escape') {
      if (isDropdownOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsDropdownOpen(false);
        if (activeTab) {
          setUrlInput(activeTab.url === 'about:blank' ? '' : activeTab.url);
        }
        inputRef.current?.blur();
        return;
      }
    }

    if (e.key === 'Tab' || e.key === 'ArrowRight') {
      if (
        inputRef.current &&
        inputRef.current.selectionStart !== null &&
        inputRef.current.selectionEnd !== null
      ) {
        if (
          inputRef.current.selectionStart < inputRef.current.selectionEnd &&
          inputRef.current.selectionEnd === urlInput.length
        ) {
          e.preventDefault();
          inputRef.current.setSelectionRange(urlInput.length, urlInput.length);
          return;
        }
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isDropdownOpen && suggestions.length > 0) {
        setIsDropdownOpen(true);
        setSelectedIndex(0);
      } else if (suggestions.length > 0) {
        const nextIdx = (selectedIndex + 1) % suggestions.length;
        setSelectedIndex(nextIdx);
        const item = suggestions[nextIdx];
        if (item) {
          skipNextAutocompleteRef.current = true;
          setUrlInput(item.type === 'search' ? item.url : item.displayUrl);
        }
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isDropdownOpen && suggestions.length > 0) {
        const prevIdx = (selectedIndex - 1 + suggestions.length) % suggestions.length;
        setSelectedIndex(prevIdx);
        const item = suggestions[prevIdx];
        if (item) {
          skipNextAutocompleteRef.current = true;
          setUrlInput(item.type === 'search' ? item.url : item.displayUrl);
        }
      }
      return;
    }
  };

  const handleSelectSuggestion = (suggestion: UrlSuggestion) => {
    setIsDropdownOpen(false);
    setIsFocused(false);
    inputRef.current?.blur();

    if (suggestion.type === 'tab' && suggestion.tabId) {
      window.browserApi.switchTab(suggestion.tabId);
      return;
    }

    if (!activeTab || !suggestion.url) return;
    window.browserApi.navigateTab(activeTab.id, suggestion.url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isDropdownOpen && selectedIndex >= 0 && selectedIndex < suggestions.length) {
      const selected = suggestions[selectedIndex];
      if (selected.type === 'tab' && selected.tabId) {
        setIsDropdownOpen(false);
        setIsFocused(false);
        inputRef.current?.blur();
        window.browserApi.switchTab(selected.tabId);
        return;
      }
    }

    if (!activeTab) return;

    let targetUrl = urlInput.trim();

    if (isDropdownOpen && selectedIndex >= 0 && selectedIndex < suggestions.length) {
      const selected = suggestions[selectedIndex];
      targetUrl = selected.url;
    }

    if (!targetUrl) return;

    setIsDropdownOpen(false);
    setIsFocused(false);
    window.browserApi.navigateTab(activeTab.id, targetUrl);
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
  const privateKey = state.settings?.customShortcuts?.newPrivateTab || 'Ctrl+Shift+N';

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
              className="w-3.5 h-3.5 rounded-sm flex items-center justify-center font-bold text-[10px] text-[var(--text-on-accent)]"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-on-accent)' }}
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
          className="flex-1 max-w-xl mx-3 relative"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <div className="absolute left-2.5 flex items-center pointer-events-none">
              {activeTab?.isPrivate ? (
                <VenetianMask className="w-3.5 h-3.5 text-purple-400" />
              ) : activeTab?.url.startsWith('https://') ? (
                <Lock className="w-3 h-3 text-emerald-500/80 dark:text-emerald-400/80" />
              ) : (
                <Search className="w-3 h-3 text-[var(--text-muted)]" />
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={urlInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={activeTab?.isPrivate ? "Search privately or enter address..." : "Search or enter web address..."}
              className={`w-full h-7 pl-8 ${activeTab?.isPrivate ? 'pr-36' : 'pr-24'} rounded-md text-xs transition-all border focus:outline-none`}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: activeTab?.isPrivate
                  ? (isFocused ? 'rgba(168, 85, 247, 0.7)' : 'rgba(168, 85, 247, 0.4)')
                  : (isFocused ? 'var(--border-selected)' : 'var(--border-subtle)'),
                color: 'var(--text-main)',
                boxShadow: isFocused
                  ? (activeTab?.isPrivate ? '0 0 0 1px rgba(168, 85, 247, 0.5)' : '0 0 0 1px var(--border-selected)')
                  : 'none',
              }}
            />

            {/* Right badges in Omnibar (Audio, Zoom, Star, Private, Shortcut) */}
            <div className="absolute right-2 flex items-center space-x-1">
              {/* Private Mode Badge */}
              {activeTab?.isPrivate && (
                <span
                  className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/25"
                  title="Private Browsing: History, cookies and site data are not saved"
                >
                  <VenetianMask className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">Private</span>
                </span>
              )}
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

          {/* Omnibar Autocomplete Suggestions Dropdown */}
          {isDropdownOpen && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150 py-1"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-card)',
                boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.35), 0 6px 16px -2px rgba(0, 0, 0, 0.2)',
              }}
            >
              {suggestions.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSuggestion(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-black/10 dark:bg-white/10 text-[var(--text-main)]'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-main)]'
                    }`}
                  >
                    {/* Left: Icon & Text (Title + URL) */}
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                      <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded-md text-[var(--text-muted)]">
                        {item.type === 'tab' ? (
                          item.favicon ? (
                            <img
                              src={item.favicon}
                              alt=""
                              className="w-3.5 h-3.5 rounded-xs"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Layers className="w-3.5 h-3.5 text-sky-400" />
                          )
                        ) : item.type === 'bookmark' ? (
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                        ) : item.type === 'bang' ? (
                          <Zap className="w-3.5 h-3.5 text-violet-400 fill-violet-400/20" />
                        ) : item.type === 'search' ? (
                          <Search className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        ) : item.type === 'top-hit' ? (
                          <Globe className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 opacity-70" />
                        )}
                      </div>

                      <div className="flex items-baseline space-x-2 min-w-0 flex-1 truncate">
                        <span className="text-xs font-medium truncate">
                          {item.title}
                        </span>
                        {item.type !== 'search' && (
                          <span className="text-[11px] font-mono text-[var(--text-muted)] truncate opacity-80">
                            {item.displayUrl}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Badge / Tag */}
                    <div className="shrink-0 flex items-center space-x-1.5">
                      {item.type === 'tab' && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/20">
                          Switch to Tab
                        </span>
                      )}
                      {item.type === 'bang' && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/25 font-mono">
                          !Bang
                        </span>
                      )}
                      {item.type === 'top-hit' && (
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--accent-primary)',
                            color: 'white',
                          }}
                        >
                          Top Hit
                        </span>
                      )}
                      {item.type === 'bookmark' && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/20">
                          Bookmark
                        </span>
                      )}
                      {item.type === 'history' && (
                        <span className="text-[9px] text-[var(--text-muted)] opacity-70">
                          History
                        </span>
                      )}
                      {item.type === 'search' && (
                        <span className="text-[9px] text-[var(--text-muted)] font-mono">
                          ↵ Search
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Footer Navigation Tip */}
              <div
                className="px-3 py-1.5 border-t text-[10px] text-[var(--text-muted)] flex items-center justify-between opacity-70 select-none"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span>↑↓ Navigate • ↵ Open • % Tabs • Tab Complete</span>
                <span>Esc Dismiss</span>
              </div>
            </div>
          )}
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

          {/* Downloads Tray Button */}
          <button
            onClick={onToggleDownloads}
            className={`p-1.5 rounded-md transition-colors cursor-pointer relative ${
              isDownloadsOpen
                ? 'text-[var(--accent-primary)] bg-black/10 dark:bg-white/10'
                : 'text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Downloads (Ctrl+J)"
          >
            <Download className="w-3.5 h-3.5" />
            {activeDownloadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center text-[var(--text-on-accent)] animate-pulse"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-on-accent)' }}
              >
                {activeDownloadCount}
              </span>
            )}
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

          {/* New Private Tab Button */}
          <button
            onClick={() => window.browserApi.createTab('about:blank', true)}
            className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-purple-400 hover:bg-purple-500/10 cursor-pointer"
            title={`New Private Tab (${privateKey})`}
          >
            <VenetianMask className="w-3.5 h-3.5" />
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
