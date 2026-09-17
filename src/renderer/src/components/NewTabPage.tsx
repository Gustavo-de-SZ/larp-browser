import React, { useState } from 'react';
import { Search, Globe, Code, Terminal, BookOpen, Compass, Layers } from 'lucide-react';
import type { BrowserState } from '../../shared/types';
import type { ThemeMode } from '../App';

interface NewTabPageProps {
  state: BrowserState;
  theme: ThemeMode;
}

const DEFAULT_SHORTCUTS = [
  {
    title: 'GitHub',
    url: 'https://github.com',
    icon: Code,
    bg: 'bg-zinc-800 text-zinc-100 dark:bg-zinc-800 dark:text-zinc-200',
  },
  {
    title: 'Hacker News',
    url: 'https://news.ycombinator.com',
    icon: Terminal,
    bg: 'bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
  },
  {
    title: 'Wikipedia',
    url: 'https://wikipedia.org',
    icon: BookOpen,
    bg: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  },
  {
    title: 'Reddit',
    url: 'https://reddit.com',
    icon: Globe,
    bg: 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
  },
  {
    title: 'DuckDuckGo',
    url: 'https://duckduckgo.com',
    icon: Compass,
    bg: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  },
];

export const NewTabPage: React.FC<NewTabPageProps> = ({ state, theme }) => {
  const [query, setQuery] = useState('');
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTab || !query.trim()) return;
    window.browserApi.navigateTab(activeTab.id, query.trim());
  };

  const handleShortcutClick = (url: string) => {
    if (!activeTab) return;
    window.browserApi.navigateTab(activeTab.id, url);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center p-6 select-none relative overflow-hidden transition-colors duration-150"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      <div className="w-full max-w-lg flex flex-col items-center space-y-7 z-10 -mt-10">
        {/* Simple, warm greeting or title */}
        <div className="flex flex-col items-center space-y-1.5 text-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-sm mb-1"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            L
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
            {getGreeting()}
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Where would you like to go?
          </p>
        </div>

        {/* Center Search Input */}
        <form onSubmit={handleSearch} className="w-full relative">
          <div className="absolute left-3.5 top-3 flex items-center pointer-events-none text-[var(--text-muted)]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the web or enter an address..."
            autoFocus
            className="w-full h-11 pl-10 pr-4 rounded-xl text-xs sm:text-sm transition-all border focus:outline-none shadow-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-selected)';
              e.currentTarget.style.boxShadow = '0 0 0 1px var(--border-selected)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </form>

        {/* Quick Speed Dial Shortcuts */}
        <div className="grid grid-cols-5 gap-3 w-full pt-1">
          {DEFAULT_SHORTCUTS.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <button
                key={shortcut.url}
                onClick={() => handleShortcutClick(shortcut.url)}
                className="flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-150 group hover:border-[var(--border-selected)]/50 hover:-translate-y-0.5"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-card)',
                }}
              >
                <div className={`p-2.5 rounded-lg ${shortcut.bg} mb-2 transition-transform group-hover:scale-105`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-medium truncate w-full text-center text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
                  {shortcut.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Subtle, humane feature hint */}
        <div
          className="w-full px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-card)',
            color: 'var(--text-muted)',
          }}
        >
          <div className="flex items-center space-x-2 truncate mr-2">
            <Layers className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
            <span className="truncate text-[11px]">
              Press <kbd className="px-1.5 py-0.5 rounded font-mono font-medium border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">Ctrl+Tab</kbd> to see open tabs
            </span>
          </div>
          <button
            onClick={() => window.browserApi.openSwitcher()}
            className="text-[11px] font-medium hover:underline flex-shrink-0"
            style={{ color: 'var(--accent-primary)' }}
          >
            Open switcher
          </button>
        </div>
      </div>
    </div>
  );
};
