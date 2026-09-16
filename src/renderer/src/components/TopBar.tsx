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
} from 'lucide-react';
import type { BrowserState } from '../../shared/types';

interface TopBarProps {
  state: BrowserState;
}

export const TopBar: React.FC<TopBarProps> = ({ state }) => {
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

  return (
    <header
      className="h-11 w-full bg-surface-900/90 backdrop-blur-md border-b border-white/[0.08] flex items-center justify-between px-3 select-none z-40 transition-colors"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left controls: Brand & Navigation */}
      <div className="flex items-center space-x-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Logo / Brand */}
        <div className="flex items-center space-x-1.5 px-2 py-1 mr-1 rounded-md bg-white/[0.03] border border-white/[0.06]">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <span className="text-xs font-semibold tracking-wider text-slate-200">AERO</span>
        </div>

        {/* Back Button */}
        <button
          onClick={() => activeTab && window.browserApi.goBack(activeTab.id)}
          disabled={!activeTab?.canGoBack}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Back (Alt+Left)"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Forward Button */}
        <button
          onClick={() => activeTab && window.browserApi.goForward(activeTab.id)}
          disabled={!activeTab?.canGoForward}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Forward (Alt+Right)"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Reload Button */}
        <button
          onClick={() => activeTab && window.browserApi.reloadTab(activeTab.id)}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all ${
            activeTab?.isLoading ? 'animate-spin text-cyan-400' : ''
          }`}
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
              <Search className="w-3.5 h-3.5" />
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
            className="w-full h-8 pl-9 pr-20 bg-surface-800/80 border border-white/[0.09] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all shadow-inner"
          />

          {/* Right badges in Omnibar */}
          <div className="absolute right-2 flex items-center space-x-1.5">
            {activeTab?.audioPlaying && (
              <button
                type="button"
                onClick={handleToggleMute}
                className="p-1 rounded text-cyan-400 hover:bg-white/[0.08]"
                title={activeTab.isMuted ? 'Unmute Tab' : 'Mute Tab'}
              >
                {activeTab.isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 animate-pulse" />}
              </button>
            )}
            <span className="text-[10px] text-slate-500 font-mono bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.05]">
              Ctrl+L
            </span>
          </div>
        </form>
      </div>

      {/* Right controls: Tab Switcher Trigger, New Tab, Window Controls */}
      <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Alt-Tab Switcher Trigger Button */}
        <button
          onClick={() => window.browserApi.openSwitcher()}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] hover:border-cyan-500/40 rounded-xl text-xs text-slate-200 transition-all group"
          title="Open Tab Switcher HUD (Ctrl+Shift+Tab)"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-medium text-slate-300">
            {state.tabs.length} {state.tabs.length === 1 ? 'Tab' : 'Tabs'}
          </span>
          <span className="text-[9px] text-slate-500 font-mono bg-white/[0.06] px-1 py-0.2 rounded ml-1">
            Ctrl+Shift+Tab
          </span>
        </button>

        {/* New Tab Button */}
        <button
          onClick={() => window.browserApi.createTab()}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
          title="New Tab (Ctrl+T)"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Window Controls (Minimize, Maximize, Close) */}
        <div className="flex items-center ml-2 border-l border-white/[0.08] pl-2 space-x-1">
          <button
            onClick={() => window.browserApi.minimizeWindow()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.browserApi.maximizeWindow()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
            title="Maximize"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.browserApi.closeWindow()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
