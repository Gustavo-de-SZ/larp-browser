import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { TabSwitcher } from './components/TabSwitcher';
import { NewTabPage } from './components/NewTabPage';
import { SettingsModal } from './components/SettingsModal';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { getPalette, applyPalette } from './theme/palettes';
import type { BrowserState, BrowserSettings } from '../shared/types';

export type ThemeMode = 'dark' | 'light';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('larp-theme') as ThemeMode) || 'dark';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const [state, setState] = useState<BrowserState>({
    tabs: [],
    activeTabId: null,
    isSwitcherOpen: false,
    selectedSwitcherIndex: 0,
    mruTabIds: [],
    settings: {
      theme: 'dark',
      darkPaletteId: 'graphite',
      lightPaletteId: 'paper',
      forcePageDarkMode: true,
      defaultSearchEngine: 'google',
      autoHibernateTabs: true,
    },
  });

  // Apply active palette whenever theme or palette ID changes
  useEffect(() => {
    const paletteId = theme === 'dark'
      ? (state.settings?.darkPaletteId || 'graphite')
      : (state.settings?.lightPaletteId || 'paper');
    const customAccent = theme === 'dark'
      ? state.settings?.customDarkAccent
      : state.settings?.customLightAccent;

    const palette = getPalette(paletteId, theme);
    applyPalette(palette, customAccent);
  }, [
    theme,
    state.settings?.darkPaletteId,
    state.settings?.lightPaletteId,
    state.settings?.customDarkAccent,
    state.settings?.customLightAccent,
  ]);

  // Persist theme choice and sync Electron nativeTheme (for web-content dark mode)
  useEffect(() => {
    localStorage.setItem('larp-theme', theme);
    if (window.browserApi) {
      window.browserApi.setTheme(theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (window.browserApi) {
      window.browserApi.updateSettings({ theme: nextTheme }).then((updated) => {
        setState((prev) => ({ ...prev, settings: updated }));
      });
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<BrowserSettings>) => {
    // If theme is changing, update local state immediately so the palette effect fires right away
    if (newSettings.theme && newSettings.theme !== theme) {
      setTheme(newSettings.theme);
    }
    if (window.browserApi) {
      const updated = await window.browserApi.updateSettings(newSettings);
      setState((prev) => ({ ...prev, settings: updated }));
    }
  };

  // Global keyboard shortcuts: Ctrl+, → Settings, Ctrl+/ or ? → Shortcuts overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
        return;
      }
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }
      // '?' without ctrl (Shift+/ on most layouts) when not typing
      if (!typing && !e.ctrlKey && !e.altKey && e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // Fetch initial state
    if (window.browserApi) {
      window.browserApi.getState().then((initialState) => {
        if (initialState) {
          setState(initialState);
          if (initialState.settings?.theme) {
            setTheme(initialState.settings.theme);
          }
        }
      });

      // Listen for updates from Electron main process
      const unsubscribe = window.browserApi.onStateUpdate((updatedState) => {
        setState(updatedState);
        if (updatedState.settings?.theme) {
          setTheme(updatedState.settings.theme);
        }
      });

      return () => unsubscribe();
    }
  }, []);

  // Synchronize modal open state with Electron main process so native WebContentsView is detached when a modal is open
  useEffect(() => {
    const isAnyModalOpen = isSettingsOpen || isShortcutsOpen;
    if (window.browserApi?.setModalOpen) {
      window.browserApi.setModalOpen(isAnyModalOpen);
    }
  }, [isSettingsOpen, isShortcutsOpen]);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const isNewTab = !activeTab || !activeTab.url || activeTab.url === 'about:blank';

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden transition-colors duration-150"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      {/* Top Bar */}
      <TopBar
        state={state}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main Content Area */}
      <main
        className="flex-1 w-full h-[calc(100vh-44px)] relative overflow-hidden"
        style={{ backgroundColor: 'var(--bg-app)' }}
      >
        {isNewTab ? (
          <NewTabPage state={state} theme={theme} />
        ) : (
          (state.isSwitcherOpen || isSettingsOpen || isShortcutsOpen) && activeTab?.previewImage ? (
            <img
              src={activeTab.previewImage}
              alt="Active tab preview"
              className="w-full h-full object-cover object-top"
            />
          ) : null
        )}
      </main>

      {/* Alt-Tab / Ctrl-Shift-Tab Switcher HUD */}
      {state.isSwitcherOpen && <TabSwitcher state={state} theme={theme} />}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={state.settings}
        theme={theme}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Keyboard Shortcuts Cheatsheet */}
      {isShortcutsOpen && (
        <KeyboardShortcuts
          onClose={() => setIsShortcutsOpen(false)}
          theme={theme}
        />
      )}
    </div>
  );
};
