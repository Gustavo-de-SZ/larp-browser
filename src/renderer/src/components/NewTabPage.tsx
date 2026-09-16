import React, { useState } from 'react';
import { Search, Globe, Code, Terminal, Sparkles, Layers, BookOpen, Compass } from 'lucide-react';
import type { BrowserState } from '../../shared/types';

interface NewTabPageProps {
  state: BrowserState;
}

const DEFAULT_SHORTCUTS = [
  { title: 'GitHub', url: 'https://github.com', icon: Code },
  { title: 'Hacker News', url: 'https://news.ycombinator.com', icon: Terminal },
  { title: 'Wikipedia', url: 'https://wikipedia.org', icon: BookOpen },
  { title: 'Reddit', url: 'https://reddit.com', icon: Globe },
  { title: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: Compass },
];

export const NewTabPage: React.FC<NewTabPageProps> = ({ state }) => {
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

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-surface-900 select-none relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="w-full max-w-xl flex flex-col items-center space-y-8 z-10">
        {/* Brand logo & title */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Aero Browser</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono border border-cyan-500/30">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-slate-400 text-center max-w-sm">
            Distraction-free browsing with instant Alt-Tab visual tab switching.
          </p>
        </div>

        {/* Center Search Input */}
        <form onSubmit={handleSearch} className="w-full relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the web or type a URL..."
            autoFocus
            className="w-full h-12 pl-12 pr-4 bg-surface-800/90 border border-white/[0.1] rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-500/20 shadow-xl transition-all"
          />
        </form>

        {/* Quick Speed Dial Shortcuts */}
        <div className="grid grid-cols-5 gap-3 w-full">
          {DEFAULT_SHORTCUTS.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <button
                key={shortcut.url}
                onClick={() => handleShortcutClick(shortcut.url)}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-800/50 hover:bg-surface-700 border border-white/[0.06] hover:border-cyan-500/40 transition-all group"
              >
                <div className="p-2.5 rounded-lg bg-white/[0.04] group-hover:bg-cyan-500/10 text-slate-300 group-hover:text-cyan-400 mb-2 transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-300 font-medium truncate w-full text-center">
                  {shortcut.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feature Hint Box */}
        <div className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-200 font-mono">Ctrl+Shift+Tab</kbd> to pop up your active tabs overview.
            </span>
          </div>
          <button
            onClick={() => window.browserApi.openSwitcher()}
            className="text-cyan-400 hover:underline flex items-center space-x-1"
          >
            <span>Try Switcher</span>
          </button>
        </div>
      </div>
    </div>
  );
};
