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
  Sparkles,
} from 'lucide-react';
import type { BrowserState } from '../../shared/types';
import type { ThemeMode } from '../App';

interface TopBarProps {
  state: BrowserState;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ state, theme, onToggleTheme }) => {
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const [urlInput, setUrlInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab && !isFocused) {
      setUrlInput(activeTab.url === 'about:blank' ? '' : activeTab.url);
    }
  }, [activeTab, isFocused]);

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

  const isDark = theme === 'dark';

  return (
    <header
      className={`h-11 w-full backdrop-blur-xl border-b flex items-center justify-between px-3 select-none z-40 transition-colors duration-200 ${
        isDark
          ? 'bg-[#0f111a]/90 border-purple-500/15 text-slate-100'
          : 'bg-white/85 border-indigo-200/50 text-slate-800 shadow-sm'
      }`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left controls: Brand & Navigation */}
      <div className="flex items-center space-x-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Logo / Brand */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 mr-1 rounded-lg border transition-all ${
          isDark
            ? 'bg-purple-950/40 border-purple-500/30 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
            : 'bg-indigo-50/80 border-indigo-200 text-indigo-700 shadow-sm'
        }`}>
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-400 animate-pulse" />
          <span className="text-xs font-black tracking-widest bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            LARP
          </span>
        </div>

        {/* Back Button */}
        <button
          onClick={() => activeTab && window.browserApi.goBack(activeTab.id)}
          disabled={!activeTab?.canGoBack}
          className={`p-1.5 rounded-lg transition-all ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-25'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-25'
          }`}
          title="Back (Alt+Left)"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Forward Button */}
        <button
          onClick={() => activeTab && window.browserApi.goForward(activeTab.id)}
          disabled={!activeTab?.canGoForward}
          className={`p-1.5 rounded-lg transition-all ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-25'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-25'
          }`}
          title="Forward (Alt+Right)"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Reload Button */}
        <button
          onClick={() => activeTab && window.browserApi.reloadTab(activeTab.id)}
          className={`p-1.5 rounded-lg transition-all ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
          } ${activeTab?.isLoading ? 'animate-spin text-purple-400' : ''}`}
          title="Reload (Ctrl+R)"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Center: Unified Omnibar */}
      <div className="flex-1 max-w-2xl mx-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
            {activeTab?.url.startsWith('https://') ? (
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Search className="w-3.5 h-3.5 text-purple-400" />
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
            placeholder="Search or enter URL..."
            className={`w-full h-8 pl-9 pr-20 rounded-xl text-xs transition-all shadow-inner border focus:outline-none ${
              isDark
                ? 'bg-[#151827]/90 border-purple-500/20 text-slate-100 placeholder-slate-500 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50'
                : 'bg-slate-100/90 border-indigo-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400/50'
            }`}
          />

          {/* Right badges in Omnibar */}
          <div className="absolute right-2 flex items-center space-x-1.5">
            {activeTab?.audioPlaying && (
              <button
                type="button"
                onClick={handleToggleMute}
                className="p-1 rounded text-purple-400 hover:bg-white/[0.08]"
                title={activeTab.isMuted ? 'Unmute Tab' : 'Mute Tab'}
              >
                {activeTab.isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                )}
              </button>
            )}
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              isDark
                ? 'text-slate-400 bg-white/[0.04] border-white/[0.06]'
                : 'text-slate-500 bg-slate-200/80 border-slate-300'
            }`}>
              Ctrl+L
            </span>
          </div>
        </form>
      </div>

      {/* Right controls: Theme Toggle, Tab Switcher Trigger, New Tab, Window Controls */}
      <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className={`p-1.5 rounded-xl border transition-all ${
            isDark
              ? 'bg-purple-950/30 border-purple-500/20 text-amber-300 hover:bg-purple-900/40 hover:text-amber-200 hover:shadow-[0_0_12px_rgba(251,191,36,0.3)]'
              : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:shadow-sm'
          }`}
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Alt-Tab Switcher Trigger Button */}
        <button
          onClick={() => window.browserApi.openSwitcher()}
          className={`flex items-center space-x-1.5 px-2.5 py-1 border rounded-xl text-xs transition-all group ${
            isDark
              ? 'bg-[#181b2e] hover:bg-[#20243d] border-purple-500/25 hover:border-purple-400/60 text-slate-200 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]'
              : 'bg-slate-100 hover:bg-slate-200/80 border-indigo-200 hover:border-indigo-400 text-slate-800 shadow-sm'
          }`}
          title="Open Tab Switcher HUD (Ctrl+Shift+Tab)"
        >
          <Layers className={`w-3.5 h-3.5 group-hover:scale-110 transition-transform ${
            isDark ? 'text-cyan-400' : 'text-indigo-600'
          }`} />
          <span className="text-[11px] font-semibold">
            {state.tabs.length} {state.tabs.length === 1 ? 'Tab' : 'Tabs'}
          </span>
          <span className={`text-[9px] font-mono px-1 py-0.2 rounded ml-1 ${
            isDark
              ? 'text-purple-300 bg-purple-900/40 border border-purple-500/30'
              : 'text-indigo-600 bg-indigo-100 border border-indigo-200'
          }`}>
            Ctrl+Shift+Tab
          </span>
        </button>

        {/* New Tab Button */}
        <button
          onClick={() => window.browserApi.createTab()}
          className={`p-1.5 rounded-lg transition-all ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
          }`}
          title="New Tab (Ctrl+T)"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Window Controls (Minimize, Maximize, Close) */}
        <div className={`flex items-center ml-2 border-l pl-2 space-x-1 ${
          isDark ? 'border-white/[0.08]' : 'border-slate-300'
        }`}>
          <button
            onClick={() => window.browserApi.minimizeWindow()}
            className={`p-1.5 rounded-lg transition-all ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.browserApi.maximizeWindow()}
            className={`p-1.5 rounded-lg transition-all ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
            title="Maximize"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.browserApi.closeWindow()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
