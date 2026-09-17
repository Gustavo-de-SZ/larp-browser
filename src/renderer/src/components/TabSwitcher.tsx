import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Globe,
  Volume2,
  VolumeX,
  ArrowLeftRight,
} from 'lucide-react';
import type { BrowserState, TabInfo } from '../../shared/types';
import type { ThemeMode } from '../App';

interface TabSwitcherProps {
  state: BrowserState;
  theme: ThemeMode;
}

export const TabSwitcher: React.FC<TabSwitcherProps> = ({ state, theme }) => {
  const [filterQuery, setFilterQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // Map MRU tab IDs to TabInfo objects
  const mruTabs: TabInfo[] = state.mruTabIds
    .map((id) => state.tabs.find((t) => t.id === id))
    .filter((t): t is TabInfo => Boolean(t));

  // Filter tabs based on search query
  const filteredTabs = filterQuery.trim()
    ? mruTabs.filter(
        (t) =>
          t.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
          t.url.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : mruTabs;

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
          inline: 'center',
        });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation within HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.isSwitcherOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        window.browserApi.closeSwitcher();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        window.browserApi.commitSwitcher();
        return;
      }

      if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        window.browserApi.cycleSwitcher('forward');
        return;
      }

      if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        window.browserApi.cycleSwitcher('backward');
        return;
      }

      // 'w' or 'Delete' closes current tab if not typing in search
      if (
        (e.key.toLowerCase() === 'w' || e.key === 'Delete') &&
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isSwitcherOpen, selectedIndex, filteredTabs]);

  const handleCardClick = (index: number) => {
    window.browserApi.selectSwitcherIndex(index);
    window.browserApi.commitSwitcher();
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-md transition-all duration-150 select-none bg-black/35"
      onClick={() => window.browserApi.closeSwitcher()}
    >
      {/* Main HUD Container */}
      <div
        className="w-full max-w-4xl flex flex-col max-h-[82vh] rounded-2xl border p-5 relative overflow-hidden animate-scale-up"
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
              className="p-1.5 rounded-lg text-white"
              style={{ backgroundColor: 'var(--accent-primary)' }}
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
                Release Ctrl or press Enter to switch
              </p>
            </div>
          </div>

          {/* Quick Filter Search */}
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              ref={searchInputRef}
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search open tabs..."
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

        {/* Tab Cards Carousel */}
        <div
          ref={cardsContainerRef}
          className="flex items-center space-x-4 overflow-x-auto py-2 px-1 scrollbar-none snap-x"
        >
          {filteredTabs.map((tab, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={tab.id}
                onClick={() => handleCardClick(index)}
                className={`flex-shrink-0 w-60 h-64 rounded-xl border flex flex-col cursor-pointer transition-all duration-150 snap-center relative overflow-hidden group ${
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
                      <div className="text-[10px] truncate text-[var(--text-muted)]">
                        {formatUrlHost(tab.url)}
                      </div>
                    </div>
                  </div>

                  {/* Audio / Close */}
                  <div className="flex items-center space-x-0.5">
                    {tab.audioPlaying && (
                      <Volume2 className="w-3 h-3 text-[var(--accent-primary)] animate-pulse" />
                    )}
                    {tab.isMuted && (
                      <VolumeX className="w-3 h-3 text-rose-400" />
                    )}
                    <button
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      className="p-1 rounded transition-colors text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10"
                      title="Close Tab (W)"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Card Center: Snapshot Preview */}
                <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black/5 dark:bg-black/20">
                  {tab.previewImage ? (
                    <img
                      src={tab.previewImage}
                      alt="Tab preview"
                      className="w-full h-full object-cover object-top filter brightness-95 group-hover:brightness-100 transition-all duration-150"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center space-y-1 text-[var(--text-muted)]">
                      <Globe className="w-6 h-6 opacity-40" />
                      <span className="text-[10px] font-mono opacity-70">
                        {formatUrlHost(tab.url)}
                      </span>
                    </div>
                  )}
                </div>

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
                    {index < 9 ? `#${index + 1}` : ''}
                  </span>
                  <span>{formatLastAccessed(tab.lastAccessed)}</span>
                </div>
              </div>
            );
          })}
        </div>

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
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">
                Ctrl+Shift+Tab
              </kbd>
              <span>Prev</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">
                Ctrl+Tab
              </kbd>
              <span>Next</span>
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
                Esc
              </kbd>
              <span>Cancel</span>
            </span>
          </div>

          <div className="text-[11px] font-medium text-[var(--text-muted)]">
            larp switcher
          </div>
        </div>
      </div>
    </div>
  );
};
