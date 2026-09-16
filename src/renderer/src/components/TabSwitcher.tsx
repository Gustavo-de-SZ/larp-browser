import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Globe,
  Volume2,
  VolumeX,
  Command,
  CornerDownLeft,
  ArrowLeftRight,
} from 'lucide-react';
import type { BrowserState, TabInfo } from '../../shared/types';

interface TabSwitcherProps {
  state: BrowserState;
}

export const TabSwitcher: React.FC<TabSwitcherProps> = ({ state }) => {
  const [filterQuery, setFilterQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

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

      // 'w' or 'Delete' closes current tab if not in search input
      if ((e.key.toLowerCase() === 'w' || e.key === 'Delete') && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        const currentTab = filteredTabs[selectedIndex];
        if (currentTab) {
          window.browserApi.closeTab(currentTab.id);
        }
        return;
      }

      // Number keys 1-9 to jump directly
      if (!e.ctrlKey && !e.altKey && !isNaN(Number(e.key)) && Number(e.key) >= 1 && Number(e.key) <= 9) {
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 bg-black/75 backdrop-blur-2xl transition-all duration-200 select-none"
      onClick={() => window.browserApi.closeSwitcher()}
    >
      {/* Background ambient lighting vignette */}
      <div className="absolute inset-0 bg-radial-gradient from-cyan-500/10 via-transparent to-black/80 pointer-events-none" />

      {/* Main HUD Container */}
      <div
        className="w-full max-w-5xl flex flex-col max-h-[85vh] rounded-2xl bg-surface-900/90 border border-white/[0.12] shadow-2xl backdrop-blur-3xl p-6 relative overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Search Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
                <span>Active Tabs Overview</span>
                <span className="text-xs font-normal text-slate-400 bg-white/[0.06] px-2 py-0.5 rounded-full border border-white/[0.06]">
                  {filteredTabs.length} of {state.tabs.length} tabs
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Release <span className="font-mono text-cyan-400 font-semibold">Ctrl</span> or press{' '}
                <span className="font-mono text-slate-200">Enter</span> to switch
              </p>
            </div>
          </div>

          {/* Quick Filter Search */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter tabs..."
              className="w-full h-9 pl-9 pr-4 bg-surface-800/90 border border-white/[0.09] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40"
            />
          </div>
        </div>

        {/* Tab Cards Carousel / Grid */}
        <div
          ref={cardsContainerRef}
          className="flex items-center space-x-6 overflow-x-auto py-4 px-2 scrollbar-none snap-x"
        >
          {filteredTabs.map((tab, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={tab.id}
                onClick={() => handleCardClick(index)}
                className={`flex-shrink-0 w-64 h-72 rounded-xl border flex flex-col cursor-pointer transition-all duration-200 transform snap-center relative overflow-hidden group ${
                  isSelected
                    ? 'scale-105 bg-surface-700/95 border-cyan-400 ring-2 ring-cyan-400/80 shadow-[0_0_30px_rgba(56,189,248,0.35)] -translate-y-1'
                    : 'scale-95 bg-surface-800/80 border-white/[0.08] hover:border-white/[0.2] hover:bg-surface-700/70 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Card Top: Favicon, Domain, Title & Close Button */}
                <div className="p-3 border-b border-white/[0.06] flex items-center justify-between bg-black/20">
                  <div className="flex items-center space-x-2 truncate flex-1 mr-2">
                    {tab.favicon ? (
                      <img
                        src={tab.favicon}
                        alt="favicon"
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-200 truncate leading-snug">
                        {tab.title || 'Untitled'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {formatUrlHost(tab.url)}
                      </div>
                    </div>
                  </div>

                  {/* Right badges & close */}
                  <div className="flex items-center space-x-1">
                    {tab.audioPlaying && (
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    )}
                    {tab.isMuted && (
                      <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <button
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-white/[0.08] transition-colors"
                      title="Close Tab (w)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Center: Live Snapshot Preview */}
                <div className="flex-1 bg-surface-900/60 relative overflow-hidden flex items-center justify-center">
                  {tab.previewImage ? (
                    <img
                      src={tab.previewImage}
                      alt="Tab preview"
                      className="w-full h-full object-cover object-top filter brightness-95 contrast-105 group-hover:scale-102 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <Globe className="w-8 h-8 text-slate-600 animate-pulse" />
                      <span className="text-[11px] text-slate-500 font-mono">
                        {formatUrlHost(tab.url)}
                      </span>
                    </div>
                  )}

                  {/* Selected Indicator Badge */}
                  {isSelected && (
                    <div className="absolute top-2 left-2 bg-cyan-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider">
                      Selected
                    </div>
                  )}
                </div>

                {/* Card Footer: Index hint & Timestamp */}
                <div className="px-3 py-2 bg-black/30 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.06] text-slate-300">
                    {index < 9 ? `#${index + 1}` : ''}
                  </span>
                  <span>{formatLastAccessed(tab.lastAccessed)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state if filter has no matches */}
        {filteredTabs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2">
            <Search className="w-8 h-8 opacity-40" />
            <p className="text-sm">No active tabs match "{filterQuery}"</p>
          </div>
        )}

        {/* Bottom Keyboard Shortcuts Legend */}
        <div className="pt-4 mt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-5">
            <span className="flex items-center space-x-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.1] font-mono text-slate-300">
                Ctrl+Shift+Tab
              </kbd>
              <span>Prev</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.1] font-mono text-slate-300">
                Ctrl+Tab
              </kbd>
              <span>Next</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.1] font-mono text-slate-300">
                Enter
              </kbd>
              <span>Switch</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.1] font-mono text-slate-300">
                W
              </kbd>
              <span>Close Tab</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.1] font-mono text-slate-300">
                Esc
              </kbd>
              <span>Cancel</span>
            </span>
          </div>

          <div className="text-[10px] text-slate-500 font-mono">
            Aero Browser Switcher
          </div>
        </div>
      </div>
    </div>
  );
};
