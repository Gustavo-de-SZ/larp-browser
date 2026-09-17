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
} from 'lucide-react';
import type { BrowserState } from '../../shared/types';
import type { ThemeMode } from '../App';

interface TopBarProps {
  state: BrowserState;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  state,
  theme,
  onToggleTheme,
  onOpenSettings,
}) => {
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
      className="h-11 w-full flex items-center justify-between px-3 select-none z-40 transition-colors duration-150 border-b"
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
            className="w-3.5 h-3.5 rounded-sm flex items-center justify-center font-bold text-[10px] text-white"
            style={{ backgroundColor: 'var(--accent-primary)' }}
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
          className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-25 disabled:hover:bg-transparent"
          title="Back (Alt+Left)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        {/* Forward Button */}
        <button
          onClick={() => activeTab && window.browserApi.goForward(activeTab.id)}
          disabled={!activeTab?.canGoForward}
          className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-25 disabled:hover:bg-transparent"
          title="Forward (Alt+Right)"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {/* Reload Button */}
        <button
          onClick={() => activeTab && window.browserApi.reloadTab(activeTab.id)}
          className={`p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 ${
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

      {/* Center: Clean Omnibar */}
      <div
        className="flex-1 max-w-xl mx-3"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="absolute left-2.5 flex items-center pointer-events-none">
            {activeTab?.url.startsWith('https://') ? (
              <Lock className="w-3 h-3 text-emerald-500/80 dark:text-emerald-400/80" />
            ) : (
              <Search className="w-3 h-3 text-[var(--text-muted)]" />
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
            placeholder="Search or enter web address..."
            className="w-full h-7 pl-8 pr-16 rounded-md text-xs transition-all border focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: isFocused ? 'var(--border-selected)' : 'var(--border-subtle)',
              color: 'var(--text-main)',
              boxShadow: isFocused ? '0 0 0 1px var(--border-selected)' : 'none',
            }}
          />

          {/* Right badges in Omnibar */}
          <div className="absolute right-2 flex items-center space-x-1.5">
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
            <span
              className="text-[9px] font-mono px-1 py-0.2 rounded border"
              style={{
                color: 'var(--text-muted)',
                backgroundColor: 'rgba(128, 128, 128, 0.08)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              Ctrl+L
            </span>
          </div>
        </form>
      </div>

      {/* Right controls */}
      <div
        className="flex items-center space-x-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Tab Switcher Trigger Button */}
        <button
          onClick={() => window.browserApi.openSwitcher()}
          className="flex items-center space-x-1.5 px-2 py-1 rounded-md text-xs border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          style={{
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)',
          }}
          title="Switch Tabs (Ctrl+Shift+Tab)"
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
            Ctrl+Shift+Tab
          </span>
        </button>

        {/* New Tab Button */}
        <button
          onClick={() => window.browserApi.createTab()}
          className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5"
          title="New Tab (Ctrl+T)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5"
          title="Settings (Ctrl+,)"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5"
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
            className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.browserApi.maximizeWindow()}
            className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5"
            title="Maximize"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={() => window.browserApi.closeWindow()}
            className="p-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
