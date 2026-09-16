import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Globe,
  Volume2,
  VolumeX,
  ArrowLeftRight,
  Sparkles,
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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-2xl transition-all duration-200 select-none ${
        isDark ? 'bg-black/80' : 'bg-slate-900/40'
      }`}
      onClick={() => window.browserApi.closeSwitcher()}
    >
      {/* Background ambient lighting vignette */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
        isDark
          ? 'bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.18)_0%,rgba(6,182,212,0.1)_45%,rgba(0,0,0,0.85)_100%)]'
          : 'bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.25)_0%,rgba(244,246,251,0.4)_50%,rgba(15,23,42,0.6)_100%)]'
      }`} />

      {/* Main HUD Container */}
      <div
        className={`w-full max-w-5xl flex flex-col max-h-[85vh] rounded-3xl border p-6 relative overflow-hidden animate-scale-up transition-all ${
          isDark
            ? 'bg-[#0f111d]/95 border-purple-500/25 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(168,85,247,0.2)] text-slate-100'
            : 'bg-white/95 border-indigo-100 shadow-2xl text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Search Bar */}
        <div className={`flex items-center justify-between pb-4 border-b mb-6 ${
          isDark ? 'border-purple-500/15' : 'border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl border ${
              isDark
                ? 'bg-purple-900/30 border-purple-500/30 text-purple-300'
                : 'bg-indigo-50 border-indigo-200 text-indigo-600'
            }`}>
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center space-x-2">
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                  Larp Active Tabs
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  isDark
                    ? 'bg-purple-950/60 border-purple-500/30 text-purple-300'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                }`}>
                  {filteredTabs.length} of {state.tabs.length} tabs
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Release <span className="font-mono font-bold text-purple-400">Ctrl</span> or press{' '}
                <span className="font-mono font-semibold">Enter</span> to switch
              </p>
            </div>
          </div>

          {/* Quick Filter Search */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-purple-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter active tabs..."
              className={`w-full h-9 pl-9 pr-4 rounded-xl text-xs focus:outline-none transition-all ${
                isDark
                  ? 'bg-[#16192a] border border-purple-500/20 text-slate-100 placeholder-slate-500 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/40'
                  : 'bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400/40'
              }`}
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
                className={`flex-shrink-0 w-64 h-72 rounded-2xl border flex flex-col cursor-pointer transition-all duration-200 transform snap-center relative overflow-hidden group ${
                  isSelected
                    ? isDark
                      ? 'scale-105 bg-[#191d30] border-purple-400 ring-2 ring-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.45),0_0_10px_rgba(34,211,238,0.3)] -translate-y-1'
                      : 'scale-105 bg-white border-indigo-500 ring-2 ring-indigo-500 shadow-[0_15px_35px_rgba(99,102,241,0.35)] -translate-y-1'
                    : isDark
                    ? 'scale-95 bg-[#131625]/90 border-white/[0.08] hover:border-purple-400/40 hover:bg-[#191d30]/70 opacity-75 hover:opacity-100'
                    : 'scale-95 bg-slate-50 border-slate-200 hover:border-indigo-300 hover:bg-white opacity-85 hover:opacity-100 shadow-sm'
                }`}
              >
                {/* Card Top: Favicon, Domain, Title & Close Button */}
                <div className={`p-3 border-b flex items-center justify-between ${
                  isDark ? 'border-white/[0.06] bg-black/20' : 'border-slate-100 bg-slate-50/70'
                }`}>
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
                      <Globe className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-purple-400' : 'text-indigo-500'}`} />
                    )}
                    <div className="truncate">
                      <div className={`text-xs font-bold truncate leading-snug ${
                        isDark ? 'text-slate-100' : 'text-slate-800'
                      }`}>
                        {tab.title || 'Untitled'}
                      </div>
                      <div className={`text-[10px] truncate font-medium ${
                        isDark ? 'text-purple-300/80' : 'text-indigo-600/80'
                      }`}>
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
                      className={`p-1 rounded-md transition-colors ${
                        isDark
                          ? 'text-slate-400 hover:text-rose-400 hover:bg-white/[0.08]'
                          : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'
                      }`}
                      title="Close Tab (w)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Center: Live Snapshot Preview */}
                <div className={`flex-1 relative overflow-hidden flex items-center justify-center ${
                  isDark ? 'bg-black/40' : 'bg-slate-100/70'
                }`}>
                  {tab.previewImage ? (
                    <img
                      src={tab.previewImage}
                      alt="Tab preview"
                      className="w-full h-full object-cover object-top filter brightness-95 contrast-105 group-hover:scale-102 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <Globe className={`w-8 h-8 animate-pulse ${isDark ? 'text-purple-500/40' : 'text-indigo-400/50'}`} />
                      <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatUrlHost(tab.url)}
                      </span>
                    </div>
                  )}

                  {/* Selected Indicator Badge */}
                  {isSelected && (
                    <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider text-white ${
                      isDark
                        ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 shadow-purple-500/40'
                        : 'bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-500/30'
                    }`}>
                      Selected
                    </div>
                  )}
                </div>

                {/* Card Footer: Index hint & Timestamp */}
                <div className={`px-3 py-2 border-t flex items-center justify-between text-[10px] ${
                  isDark
                    ? 'bg-black/30 border-white/[0.06] text-slate-400'
                    : 'bg-slate-50/80 border-slate-100 text-slate-500'
                }`}>
                  <span className={`font-mono font-bold px-1.5 py-0.5 rounded border ${
                    isDark
                      ? 'bg-purple-950/40 border-purple-500/30 text-purple-300'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  }`}>
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
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
            <Search className="w-8 h-8 opacity-40 text-purple-400" />
            <p className="text-sm">No active tabs match "{filterQuery}"</p>
          </div>
        )}

        {/* Bottom Keyboard Shortcuts Legend */}
        <div className={`pt-4 mt-2 border-t flex items-center justify-between text-[11px] ${
          isDark ? 'border-purple-500/15 text-slate-400' : 'border-slate-200 text-slate-500'
        }`}>
          <div className="flex items-center space-x-5">
            <span className="flex items-center space-x-1.5">
              <kbd className={`px-1.5 py-0.5 rounded font-mono font-semibold ${
                isDark ? 'bg-purple-950/40 border border-purple-500/30 text-purple-200' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
              }`}>
                Ctrl+Shift+Tab
              </kbd>
              <span>Prev</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <kbd className={`px-1.5 py-0.5 rounded font-mono font-semibold ${
                isDark ? 'bg-purple-950/40 border border-purple-500/30 text-purple-200' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
              }`}>
                Ctrl+Tab
              </kbd>
              <span>Next</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <kbd className={`px-1.5 py-0.5 rounded font-mono font-semibold ${
                isDark ? 'bg-purple-950/40 border border-purple-500/30 text-purple-200' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
              }`}>
                Enter
              </kbd>
              <span>Switch</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <kbd className={`px-1.5 py-0.5 rounded font-mono font-semibold ${
                isDark ? 'bg-purple-950/40 border border-purple-500/30 text-purple-200' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
              }`}>
                W
              </kbd>
              <span>Close Tab</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <kbd className={`px-1.5 py-0.5 rounded font-mono font-semibold ${
                isDark ? 'bg-purple-950/40 border border-purple-500/30 text-purple-200' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
              }`}>
                Esc
              </kbd>
              <span>Cancel</span>
            </span>
          </div>

          <div className="text-[10px] font-mono font-semibold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Larp Browser Switcher
          </div>
        </div>
      </div>
    </div>
  );
};
