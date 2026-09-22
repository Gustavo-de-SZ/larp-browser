import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Globe,
  Volume2,
  VolumeX,
  ArrowLeftRight,
  Moon,
  VenetianMask,
  Copy,
  RotateCw,
  ArrowRightToLine,
  Layers,
} from 'lucide-react';
import type { BrowserState, TabInfo } from '@/shared/types';
import type { ThemeMode } from '../App';

interface TabSwitcherProps {
  state: BrowserState;
  theme: ThemeMode;
}

export const TabSwitcher: React.FC<TabSwitcherProps> = ({ state, theme }) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'audio' | 'sleeping' | 'private'>('all');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tab: TabInfo;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const switcherContainerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // Ensure HUD container and window have immediate keyboard focus on mount
  useEffect(() => {
    switcherContainerRef.current?.focus();
    window.focus();
  }, []);

  const sortOrder = state.settings?.switcherSortOrder || 'mru';
  const isCompact = state.settings?.switcherLayout === 'compact';
  const showPreviews = state.settings?.switcherShowPreviews !== false;
  const showUrls = state.settings?.switcherShowUrls !== false;

  // Order tabs based on user preference: Creation order or MRU order
  const baseTabs: TabInfo[] =
    sortOrder === 'creation'
      ? [...state.tabs]
      : state.mruTabIds
          .map((id) => state.tabs.find((t) => t.id === id))
          .filter((t): t is TabInfo => Boolean(t));

  const audioCount = baseTabs.filter((t) => t.audioPlaying || t.isMuted).length;
  const sleepingCount = baseTabs.filter((t) => t.isHibernated).length;
  const privateCount = baseTabs.filter((t) => t.isPrivate).length;

  let tabsToDisplay = baseTabs;
  if (categoryFilter === 'audio') {
    tabsToDisplay = tabsToDisplay.filter((t) => t.audioPlaying || t.isMuted);
  } else if (categoryFilter === 'sleeping') {
    tabsToDisplay = tabsToDisplay.filter((t) => t.isHibernated);
  } else if (categoryFilter === 'private') {
    tabsToDisplay = tabsToDisplay.filter((t) => t.isPrivate);
  }

  // Filter tabs based on search query
  const filteredTabs = filterQuery.trim()
    ? tabsToDisplay.filter(
        (t) =>
          t.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
          t.url.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : tabsToDisplay;

  const selectedIndex = Math.min(
    state.selectedSwitcherIndex,
    Math.max(0, filteredTabs.length - 1)
  );

  // Auto-scroll selected card into view
  useEffect(() => {
    if (cardsContainerRef.current) {
      const selectedCard = cardsContainerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedCard) {
        selectedCard.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }
    }
  }, [selectedIndex]);

  // Dismiss context menu on click outside or right-click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = () => setContextMenu(null);
    window.addEventListener('click', handleClose);
    window.addEventListener('contextmenu', handleClose);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('contextmenu', handleClose);
    };
  }, [contextMenu]);

  // Keyboard navigation within HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.isSwitcherOpen) return;
      const keyLower = e.key.toLowerCase();

      if (keyLower === 'escape') {
        e.preventDefault();
        if (contextMenu) {
          setContextMenu(null);
          return;
        }
        if (document.activeElement === searchInputRef.current) {
          if (filterQuery) {
            setFilterQuery('');
          } else {
            searchInputRef.current?.blur();
          }
          return;
        }
        window.browserApi.closeSwitcher();
        return;
      }

      if (keyLower === 'enter' || keyLower === 'return') {
        e.preventDefault();
        window.browserApi.commitSwitcher();
        return;
      }

      // '/' triggers instant search input focus
      if (keyLower === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // 'm' toggles mute on highlighted tab
      if (keyLower === 'm' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        const currentTab = filteredTabs[selectedIndex];
        if (currentTab) {
          window.browserApi.toggleMuteTab(currentTab.id);
        }
        return;
      }

      // 'z' sleeps/hibernates highlighted tab
      if (keyLower === 'z' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        const currentTab = filteredTabs[selectedIndex];
        if (currentTab && !currentTab.isHibernated) {
          window.browserApi.hibernateTab(currentTab.id);
        }
        return;
      }

      // If typing in search input, ArrowDown jumps into the card grid, while other keys type normally
      if (document.activeElement === searchInputRef.current) {
        if (keyLower === 'arrowdown' || keyLower === 'down') {
          e.preventDefault();
          searchInputRef.current?.blur();
          if (filteredTabs.length > 0) {
            window.browserApi.selectSwitcherIndex(0);
          }
        }
        return;
      }

      // Calculate actual rendered column count from DOM or viewport width
      const getColumns = () => {
        if (cardsContainerRef.current && cardsContainerRef.current.children.length >= 2) {
          const first = (cardsContainerRef.current.children[0] as HTMLElement).offsetTop;
          for (let i = 1; i < cardsContainerRef.current.children.length; i++) {
            if ((cardsContainerRef.current.children[i] as HTMLElement).offsetTop > first) {
              return i;
            }
          }
          return cardsContainerRef.current.children.length;
        }
        if (typeof window !== 'undefined') {
          if (window.innerWidth >= 768) return 4;
          if (window.innerWidth >= 640) return 3;
        }
        return 2;
      };

      if (keyLower === 'arrowright' || (keyLower === 'tab' && !e.shiftKey)) {
        e.preventDefault();
        const next = (selectedIndex + 1) % filteredTabs.length;
        window.browserApi.selectSwitcherIndex(next);
        return;
      }

      if (keyLower === 'arrowleft' || (keyLower === 'tab' && e.shiftKey)) {
        e.preventDefault();
        const prev = (selectedIndex - 1 + filteredTabs.length) % filteredTabs.length;
        window.browserApi.selectSwitcherIndex(prev);
        return;
      }

      if (filteredTabs.length === 0) return;

      if (keyLower === 'arrowdown' || keyLower === 'down') {
        e.preventDefault();
        if (isCompact) {
          const next = (selectedIndex + 1) % filteredTabs.length;
          window.browserApi.selectSwitcherIndex(next);
        } else {
          const cols = Math.max(1, getColumns());
          if (selectedIndex + cols < filteredTabs.length) {
            window.browserApi.selectSwitcherIndex(selectedIndex + cols);
          } else {
            const currentRow = Math.floor(selectedIndex / cols);
            const totalRows = Math.ceil(filteredTabs.length / cols);
            if (currentRow < totalRows - 1) {
              // Target slot in bottom row doesn't exist; drop to last available tab
              window.browserApi.selectSwitcherIndex(filteredTabs.length - 1);
            } else {
              // Wrap to top row in the same column
              const sameColTop = selectedIndex % cols;
              window.browserApi.selectSwitcherIndex(sameColTop);
            }
          }
        }
        return;
      }

      if (keyLower === 'arrowup' || keyLower === 'up') {
        e.preventDefault();
        if (isCompact) {
          const prev = (selectedIndex - 1 + filteredTabs.length) % filteredTabs.length;
          window.browserApi.selectSwitcherIndex(prev);
        } else {
          const cols = Math.max(1, getColumns());
          if (selectedIndex - cols >= 0) {
            window.browserApi.selectSwitcherIndex(selectedIndex - cols);
          } else {
            // Wrap to bottom row in the same column
            const col = selectedIndex % cols;
            const lastRowStart = Math.floor((filteredTabs.length - 1) / cols) * cols;
            const candidate = lastRowStart + col;
            const target = candidate < filteredTabs.length ? candidate : filteredTabs.length - 1;
            window.browserApi.selectSwitcherIndex(Math.max(0, target));
          }
        }
        return;
      }

      // 'w' or 'Delete' closes current tab if not typing in search
      if (
        (keyLower === 'w' || keyLower === 'delete') &&
        document.activeElement !== searchInputRef.current
      ) {
        e.preventDefault();
        const currentTab = filteredTabs[selectedIndex];
        if (currentTab) {
          window.browserApi.closeTab(currentTab.id);
        }
        return;
      }

      // Number keys 1-9 to switch directly
      if (
        !e.ctrlKey &&
        !e.altKey &&
        !isNaN(Number(e.key)) &&
        Number(e.key) >= 1 &&
        Number(e.key) <= 9 &&
        document.activeElement !== searchInputRef.current
      ) {
        const targetIdx = Number(e.key) - 1;
        if (targetIdx < filteredTabs.length) {
          e.preventDefault();
          window.browserApi.selectSwitcherIndex(targetIdx);
          window.browserApi.commitSwitcher();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!state.isSwitcherOpen) return;
      if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        window.browserApi.commitSwitcher(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [state.isSwitcherOpen, selectedIndex, filteredTabs]);

  const handleCardClick = (index: number) => {
    window.browserApi.selectSwitcherIndex(index);
    window.browserApi.commitSwitcher();
  };

  const handleTabContextMenu = (e: React.MouseEvent, tab: TabInfo) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 210;
    const menuHeight = 280;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    setContextMenu({ x, y, tab });
  };

  const handleCloseTab = (e: React.MouseEvent | undefined, tabId: string) => {
    if (e) e.stopPropagation();
    window.browserApi.closeTab(tabId);
  };

  const formatUrlHost = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url || 'New Tab';
    }
  };

  const formatLastAccessed = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 30) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const formatMediaTime = (seconds: number) => {
    const totalSecs = Math.floor(seconds);
    const m = Math.floor(totalSecs / 60);
    const s = Math.floor(totalSecs % 60);
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h > 0) {
      return `${h}:${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${remM}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-md transition-all duration-150 select-none bg-black/35"
      onClick={() => window.browserApi.closeSwitcher()}
    >
      {/* Main HUD Container */}
      <div
        ref={switcherContainerRef}
        tabIndex={-1}
        className="w-full max-w-4xl flex flex-col max-h-[82vh] rounded-2xl border p-5 relative overflow-hidden animate-scale-up outline-none"
        style={{
          backgroundColor: 'var(--bg-app)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-main)',
          boxShadow: 'var(--shadow-hud)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Search Bar */}
        <div
          className="flex items-center justify-between pb-3.5 border-b mb-4"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center space-x-2.5">
            <div
              className="p-1.5 rounded-lg text-[var(--text-on-accent)]"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-on-accent)' }}
            >
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold tracking-tight text-[var(--text-main)]">
                  Open Tabs
                </h2>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.2 rounded border"
                  style={{
                    backgroundColor: 'rgba(128, 128, 128, 0.08)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {filteredTabs.length} of {state.tabs.length}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Navigate with Arrows or Tab • Press Enter to switch • Esc to cancel
              </p>
            </div>
          </div>

          {/* Quick Filter Search & Category Chips */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 mr-1">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                All ({baseTabs.length})
              </button>
              {audioCount > 0 && (
                <button
                  onClick={() => setCategoryFilter(categoryFilter === 'audio' ? 'all' : 'audio')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                    categoryFilter === 'audio'
                      ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  title="Filter tabs with audio"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Audio ({audioCount})</span>
                </button>
              )}
              {sleepingCount > 0 && (
                <button
                  onClick={() => setCategoryFilter(categoryFilter === 'sleeping' ? 'all' : 'sleeping')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                    categoryFilter === 'sleeping'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-sky-400 hover:bg-sky-500/10'
                  }`}
                  title="Filter sleeping tabs"
                >
                  <Moon className="w-3 h-3" />
                  <span>Sleeping ({sleepingCount})</span>
                </button>
              )}
              {privateCount > 0 && (
                <button
                  onClick={() => setCategoryFilter(categoryFilter === 'private' ? 'all' : 'private')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                    categoryFilter === 'private'
                      ? 'bg-purple-500 text-white shadow-xs'
                      : 'text-purple-400 hover:bg-purple-500/10'
                  }`}
                  title="Filter private tabs"
                >
                  <VenetianMask className="w-3 h-3" />
                  <span>Private ({privateCount})</span>
                </button>
              )}
            </div>

            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                ref={searchInputRef}
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search tabs (or press /)..."
                className="w-full h-8 pl-8 pr-3 rounded-lg text-xs focus:outline-none transition-all border"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-selected)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              />
            </div>
          </div>
        </div>

        {/* Tab Cards Carousel or Compact List */}
        {isCompact ? (
          <div
            ref={cardsContainerRef}
            className="flex flex-col space-y-1.5 overflow-y-auto max-h-[50vh] py-1 px-1"
          >
            {filteredTabs.map((tab, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={tab.id}
                  onClick={() => handleCardClick(index)}
                  onContextMenu={(e) => handleTabContextMenu(e, tab)}
                  className={`flex items-center justify-between p-2.5 px-3 rounded-xl border cursor-pointer transition-all duration-100 ${
                    isSelected
                      ? 'scale-[1.005] shadow-xs'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-card-selected)' : 'var(--bg-card)',
                    borderColor: isSelected ? 'var(--border-selected)' : 'var(--border-card)',
                  }}
                >
                  <div className="flex items-center space-x-3 overflow-hidden flex-1 mr-3">
                    <span
                      className="font-mono text-[10px] font-semibold min-w-[28px] text-center flex-shrink-0"
                      style={{
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                      }}
                    >
                      #{index + 1}
                    </span>

                    {tab.favicon ? (
                      <img
                        src={tab.favicon}
                        alt="favicon"
                        className="w-4 h-4 rounded-xs flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Globe className="w-4 h-4 flex-shrink-0 text-[var(--text-muted)]" />
                    )}

                    <div className="truncate flex-1 flex items-center space-x-2">
                      <span className="text-xs font-medium text-[var(--text-main)] truncate">
                        {tab.title || 'Untitled'}
                      </span>
                      {showUrls && (
                        <span className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                          {formatUrlHost(tab.url)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    {tab.isPrivate && (
                      <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20">
                        <VenetianMask className="w-2.5 h-2.5" />
                        <span>Private</span>
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (tab.isHibernated) {
                          window.browserApi.wakeTab(tab.id);
                        } else {
                          window.browserApi.hibernateTab(tab.id);
                        }
                      }}
                      className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        tab.isHibernated
                          ? 'text-sky-400 bg-sky-500/15 border border-sky-500/20'
                          : 'text-[var(--text-muted)] hover:text-sky-400 hover:bg-sky-500/10'
                      }`}
                      title={
                        tab.isHibernated
                          ? tab.savedMediaTime
                            ? `Sleeping (Paused at ${formatMediaTime(tab.savedMediaTime)}) · Click to wake`
                            : 'Sleeping · Click to wake'
                          : 'Put tab to sleep (Z)'
                      }
                    >
                      <Moon className="w-3 h-3" />
                      {tab.isHibernated && tab.savedMediaTime && (
                        <span className="font-mono text-[9px]">{formatMediaTime(tab.savedMediaTime)}</span>
                      )}
                    </button>
                    {(tab.audioPlaying || tab.isMuted) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.browserApi.toggleMuteTab(tab.id);
                        }}
                        className="p-1 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        title={tab.isMuted ? 'Unmute Tab (M)' : 'Mute Tab (M)'}
                      >
                        {tab.isMuted ? (
                          <VolumeX className="w-3 h-3 text-rose-400" />
                        ) : (
                          <Volume2 className="w-3 h-3 text-[var(--accent-primary)] animate-pulse" />
                        )}
                      </button>
                    )}
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {formatLastAccessed(tab.lastAccessed)}
                    </span>
                    <button
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Close Tab (W or Middle Click)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            ref={cardsContainerRef}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 overflow-y-auto max-h-[58vh] py-2 px-1"
          >
            {filteredTabs.map((tab, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={tab.id}
                  onClick={() => handleCardClick(index)}
                  onContextMenu={(e) => handleTabContextMenu(e, tab)}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      handleCloseTab(e, tab.id);
                    }
                  }}
                  className={`w-full ${showPreviews ? 'h-52' : 'h-28'} rounded-xl border flex flex-col cursor-pointer transition-all duration-150 relative overflow-hidden group ${
                    isSelected
                      ? 'scale-[1.02] shadow-md'
                      : 'opacity-75 hover:opacity-100 hover:scale-[1.01]'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-card-selected)' : 'var(--bg-card)',
                    borderColor: isSelected ? 'var(--border-selected)' : 'var(--border-card)',
                    boxShadow: isSelected ? 'var(--shadow-selected)' : 'none',
                  }}
                >
                  {/* Card Top: Favicon, Domain, Title & Close Button */}
                  <div
                    className="p-2.5 border-b flex items-center justify-between"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'rgba(128, 128, 128, 0.03)',
                    }}
                  >
                    <div className="flex items-center space-x-2 truncate flex-1 mr-1">
                      {tab.favicon ? (
                        <img
                          src={tab.favicon}
                          alt="favicon"
                          className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Globe className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-muted)]" />
                      )}
                      <div className="truncate">
                        <div className="text-xs font-semibold truncate leading-tight text-[var(--text-main)]">
                          {tab.title || 'Untitled'}
                        </div>
                        {showUrls && (
                          <div className="text-[10px] truncate text-[var(--text-muted)]">
                            {formatUrlHost(tab.url)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Audio / Sleeping / Private / Close */}
                    <div className="flex items-center space-x-1">
                      {tab.isPrivate && (
                        <span title="Private Tab" className="p-0.5 rounded text-purple-400 bg-purple-500/15 border border-purple-500/25">
                          <VenetianMask className="w-3 h-3" />
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (tab.isHibernated) {
                            window.browserApi.wakeTab(tab.id);
                          } else {
                            window.browserApi.hibernateTab(tab.id);
                          }
                        }}
                        className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          tab.isHibernated ? 'text-sky-400 bg-sky-500/15 border border-sky-500/20' : 'text-[var(--text-muted)] hover:text-sky-400 hover:bg-sky-500/10'
                        }`}
                        title={
                          tab.isHibernated
                            ? tab.savedMediaTime
                              ? `Sleeping (Paused at ${formatMediaTime(tab.savedMediaTime)}) · Click to wake`
                              : 'Sleeping · Click to wake'
                            : 'Put tab to sleep (Z)'
                        }
                      >
                        <Moon className="w-3 h-3" />
                        {tab.isHibernated && tab.savedMediaTime && (
                          <span className="font-mono text-[9px]">{formatMediaTime(tab.savedMediaTime)}</span>
                        )}
                      </button>
                      {(tab.audioPlaying || tab.isMuted) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.browserApi.toggleMuteTab(tab.id);
                          }}
                          className="p-1 rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          title={tab.isMuted ? 'Unmute Tab (M)' : 'Mute Tab (M)'}
                        >
                          {tab.isMuted ? (
                            <VolumeX className="w-3 h-3 text-rose-400" />
                          ) : (
                            <Volume2 className="w-3 h-3 text-[var(--accent-primary)] animate-pulse" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={(e) => handleCloseTab(e, tab.id)}
                        className="p-1 rounded transition-colors text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10"
                        title="Close Tab (W or Middle Click)"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Card Center: Snapshot Preview (if showPreviews is true) */}
                  {showPreviews && (
                    <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black/5 dark:bg-black/20">
                      {tab.previewImage ? (
                        <img
                          src={tab.previewImage}
                          alt="Tab preview"
                          className="w-full h-full object-cover object-top filter brightness-95 group-hover:brightness-100 transition-all duration-150"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-3 text-center space-y-1 text-[var(--text-muted)]">
                          {tab.isPrivate ? (
                            <VenetianMask className="w-7 h-7 text-purple-400/60" />
                          ) : (
                            <Globe className="w-6 h-6 opacity-40" />
                          )}
                          <span className="text-[10px] font-mono opacity-70">
                            {tab.isPrivate ? 'Private Tab' : formatUrlHost(tab.url)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Footer: Index & Timestamp */}
                  <div
                    className="px-2.5 py-1.5 border-t flex items-center justify-between text-[10px]"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span
                      className="font-mono font-medium px-1.5 py-0.2 rounded border"
                      style={{
                        backgroundColor: 'rgba(128, 128, 128, 0.08)',
                        borderColor: 'var(--border-subtle)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                      }}
                    >
                      #{index + 1}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {tab.isPrivate && (
                        <span className="flex items-center space-x-1 text-[9px] text-purple-400 font-semibold">
                          <VenetianMask className="w-2.5 h-2.5" />
                          <span>Private</span>
                        </span>
                      )}
                      {tab.isHibernated && (
                        <span className="text-[9px] text-sky-400 font-medium">Sleeping</span>
                      )}
                      <span>{formatLastAccessed(tab.lastAccessed)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {filteredTabs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)] space-y-1.5">
            <Search className="w-6 h-6 opacity-40" />
            <p className="text-xs">No active tabs match "{filterQuery}"</p>
          </div>
        )}

        {/* Bottom Shortcuts Legend */}
        <div
          className="pt-3 mt-2 border-t flex items-center justify-between text-[11px]"
          style={{
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          <div className="flex items-center space-x-3.5 flex-wrap gap-y-1">
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">
                ← ↑ → ↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">
                Ctrl+Tab
              </kbd>
              <span>Cycle</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">
                Enter
              </kbd>
              <span>Switch</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">
                W
              </kbd>
              <span>Close</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">
                M
              </kbd>
              <span>Mute</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">
                Z
              </kbd>
              <span>Sleep</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">
                /
              </kbd>
              <span>Search</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">
                Esc
              </kbd>
              <span>Cancel</span>
            </span>
          </div>

          <div className="text-[11px] font-medium text-[var(--text-muted)] pl-2">
            larp switcher
          </div>
        </div>
      </div>

      {/* Tab Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 py-1.5 rounded-xl border shadow-xl backdrop-blur-md min-w-[210px] flex flex-col text-xs transition-opacity duration-100"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'var(--bg-card-selected)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b mb-1 flex items-center space-x-2" style={{ borderColor: 'var(--border-subtle)' }}>
            {contextMenu.tab.favicon ? (
              <img src={contextMenu.tab.favicon} alt="" className="w-3.5 h-3.5 rounded-xs" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            )}
            <span className="truncate font-semibold text-[11px] text-[var(--text-muted)] max-w-[150px]">
              {contextMenu.tab.title || 'Tab'}
            </span>
          </div>

          <button
            onClick={() => {
              window.browserApi.duplicateTab(contextMenu.tab.id);
              setContextMenu(null);
            }}
            className="flex items-center px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left space-x-2.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span className="flex-1">Duplicate Tab</span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Ctrl+Shift+D</span>
          </button>

          <button
            onClick={() => {
              window.browserApi.reloadTab(contextMenu.tab.id);
              setContextMenu(null);
            }}
            className="flex items-center px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left space-x-2.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="flex-1">Reload Tab</span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Ctrl+R</span>
          </button>

          <button
            onClick={() => {
              window.browserApi.toggleMuteTab(contextMenu.tab.id);
              setContextMenu(null);
            }}
            className="flex items-center px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left space-x-2.5 cursor-pointer"
          >
            {contextMenu.tab.isMuted ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="flex-1">{contextMenu.tab.isMuted ? 'Unmute Tab' : 'Mute Tab'}</span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">M</span>
          </button>

          <button
            onClick={() => {
              if (contextMenu.tab.isHibernated) {
                window.browserApi.wakeTab(contextMenu.tab.id);
              } else {
                window.browserApi.hibernateTab(contextMenu.tab.id);
              }
              setContextMenu(null);
            }}
            className="flex items-center px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left space-x-2.5 cursor-pointer"
          >
            <Moon className="w-3.5 h-3.5 text-sky-400" />
            <span className="flex-1">
              {contextMenu.tab.isHibernated
                ? contextMenu.tab.savedMediaTime
                  ? `Wake Tab (Paused at ${formatMediaTime(contextMenu.tab.savedMediaTime)})`
                  : 'Wake Tab'
                : 'Put Tab to Sleep'}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Z</span>
          </button>

          <div className="my-1 border-t" style={{ borderColor: 'var(--border-subtle)' }} />

          <button
            onClick={() => {
              handleCloseTab(undefined, contextMenu.tab.id);
              setContextMenu(null);
            }}
            className="flex items-center px-3 py-1.5 hover:bg-rose-500/15 text-rose-400 transition-colors text-left space-x-2.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span className="flex-1">Close Tab</span>
            <span className="text-[10px] opacity-70 font-mono">Ctrl+W</span>
          </button>

          <button
            onClick={() => {
              window.browserApi.closeOtherTabs(contextMenu.tab.id);
              setContextMenu(null);
            }}
            className="flex items-center px-3 py-1.5 hover:bg-rose-500/15 text-rose-400 transition-colors text-left space-x-2.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="flex-1">Close Other Tabs</span>
          </button>

          <button
            onClick={() => {
              window.browserApi.closeTabsToRight(contextMenu.tab.id);
              setContextMenu(null);
            }}
            className="flex items-center px-3 py-1.5 hover:bg-rose-500/15 text-rose-400 transition-colors text-left space-x-2.5 cursor-pointer"
          >
            <ArrowRightToLine className="w-3.5 h-3.5" />
            <span className="flex-1">Close Tabs to the Right</span>
          </button>
        </div>
      )}
    </div>
  );
};
