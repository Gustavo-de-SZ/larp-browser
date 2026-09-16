import React, { useState } from 'react';
import { Search, Globe, Code, Terminal, Sparkles, Layers, BookOpen, Compass } from 'lucide-react';
import type { BrowserState } from '../../shared/types';
import type { ThemeMode } from '../App';

interface NewTabPageProps {
  state: BrowserState;
  theme: ThemeMode;
}

const DEFAULT_SHORTCUTS = [
  { title: 'GitHub', url: 'https://github.com', icon: Code, color: 'from-violet-500 to-purple-600' },
  { title: 'Hacker News', url: 'https://news.ycombinator.com', icon: Terminal, color: 'from-amber-500 to-orange-600' },
  { title: 'Wikipedia', url: 'https://wikipedia.org', icon: BookOpen, color: 'from-cyan-500 to-blue-600' },
  { title: 'Reddit', url: 'https://reddit.com', icon: Globe, color: 'from-rose-500 to-red-600' },
  { title: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: Compass, color: 'from-emerald-500 to-teal-600' },
];

export const NewTabPage: React.FC<NewTabPageProps> = ({ state, theme }) => {
  const [query, setQuery] = useState('');
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const isDark = theme === 'dark';

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
    <div className={`w-full h-full flex flex-col items-center justify-center p-8 select-none relative overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-[#090a10] text-slate-100' : 'bg-[#f4f6fb] text-slate-800'
    }`}>
      {/* Background ambient lighting orbs */}
      <div className={`absolute w-[450px] h-[450px] rounded-full blur-3xl pointer-events-none -top-24 -left-24 transition-opacity duration-300 ${
        isDark ? 'bg-violet-600/15 opacity-100' : 'bg-indigo-300/30 opacity-70'
      }`} />
      <div className={`absolute w-[450px] h-[450px] rounded-full blur-3xl pointer-events-none -bottom-24 -right-24 transition-opacity duration-300 ${
        isDark ? 'bg-cyan-500/15 opacity-100' : 'bg-fuchsia-300/30 opacity-70'
      }`} />

      <div className="w-full max-w-xl flex flex-col items-center space-y-8 z-10">
        {/* Brand logo & title */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-cyan-400 flex items-center justify-center shadow-xl shadow-purple-500/25 ring-4 ring-white/10 transform hover:scale-105 transition-transform">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-black tracking-tight flex items-center space-x-2.5">
            <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
              Larp Browser
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono border ${
              isDark
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              v1.0
            </span>
          </h1>
          <p className={`text-xs text-center max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Distraction-free browsing with instant visual Alt-Tab tab switching.
          </p>
        </div>

        {/* Center Search Input */}
        <form onSubmit={handleSearch} className="w-full relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-purple-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the web or enter a URL..."
            autoFocus
            className={`w-full h-12 pl-12 pr-4 rounded-2xl text-sm placeholder-slate-400 focus:outline-none transition-all shadow-xl ${
              isDark
                ? 'bg-[#151827]/90 border border-purple-500/25 text-white focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30'
                : 'bg-white border border-indigo-200/80 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25'
            }`}
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
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all group ${
                  isDark
                    ? 'bg-[#141726]/80 hover:bg-[#1d2138] border-purple-500/15 hover:border-purple-400/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md'
                }`}
              >
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${shortcut.color} text-white mb-2 shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-semibold truncate w-full text-center ${
                  isDark ? 'text-slate-300 group-hover:text-purple-300' : 'text-slate-700 group-hover:text-indigo-600'
                }`}>
                  {shortcut.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feature Hint Box */}
        <div className={`w-full p-4 rounded-2xl border flex items-center justify-between text-xs transition-all ${
          isDark
            ? 'bg-[#131522]/90 border-purple-500/20 text-slate-300'
            : 'bg-white border-indigo-100 text-slate-600 shadow-sm'
        }`}>
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>
              Press <kbd className={`px-1.5 py-0.5 rounded font-mono font-semibold ${
                isDark ? 'bg-purple-900/40 text-purple-200 border border-purple-500/30' : 'bg-indigo-100 text-indigo-700'
              }`}>Ctrl+Shift+Tab</kbd> to pop up the active tabs overview.
            </span>
          </div>
          <button
            onClick={() => window.browserApi.openSwitcher()}
            className="font-semibold text-purple-400 hover:text-purple-300 hover:underline flex items-center space-x-1"
          >
            <span>Try Switcher</span>
          </button>
        </div>
      </div>
    </div>
  );
};
