import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { TabSwitcher } from './components/TabSwitcher';
import { NewTabPage } from './components/NewTabPage';
import { SettingsModal } from './components/SettingsModal';
import { getPalette, applyPalette } from './theme/palettes';
import type { BrowserState, BrowserSettings } from '../shared/types';

export type ThemeMode = 'dark' | 'light';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('larp-theme') as ThemeMode) || 'dark';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  // Apply active palette and custom accent colors whenever theme or palette changes
  useEffect(() => {
    const currentTheme = state.settings?.theme || theme;
    const paletteId = currentTheme === 'dark'
      ? (state.settings?.darkPaletteId || 'graphite')
      : (state.settings?.lightPaletteId || 'paper');
    const customAccent = currentTheme === 'dark'
      ? state.settings?.customDarkAccent
      : state.settings?.customLightAccent;

    const palette = getPalette(paletteId, currentTheme);
    applyPalette(palette, customAccent);
  }, [
    theme,
    state.settings?.theme,
    state.settings?.darkPaletteId,
    state.settings?.lightPaletteId,
    state.settings?.customDarkAccent,
    state.settings?.customLightAccent,
  ]);

  // Sync theme with document class and Electron nativeTheme
  useEffect(() => {
    localStorage.setItem('larp-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    if (window.browserApi) {
      window.browserApi.setTheme(theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    handleUpdateSettings({ theme: nextTheme });
  };

  const handleUpdateSettings = async (newSettings: Partial<BrowserSettings>) => {
    if (newSettings.theme && newSettings.theme !== theme) {
      setTheme(newSettings.theme);
    }
    if (window.browserApi) {
      const updated = await window.browserApi.updateSettings(newSettings);
      setState((prev) => ({ ...prev, settings: updated }));
    }
  };

  // Keyboard shortcut Ctrl+, for Settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
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
      {/* Top Floating / Minimal Bar */}
      <TopBar
        state={state}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area:
          When active tab is about:blank or empty, render the native React New Tab dashboard.
          When active tab has a real web URL:
            - While browsing, WebContentsView is attached directly below TopBar.
            - When TabSwitcher HUD is open, activeTab's snapshot preview is rendered here so the background never goes black!
      */}
      <main
        className="flex-1 w-full h-[calc(100vh-44px)] relative overflow-hidden"
        style={{ backgroundColor: 'var(--bg-app)' }}
      >
        {isNewTab ? (
          <NewTabPage state={state} theme={theme} />
        ) : (
          state.isSwitcherOpen && activeTab?.previewImage ? (
            <img
              src={activeTab.previewImage}
              alt="Active tab preview"
              className="w-full h-full object-cover object-top"
            />
          ) : null
        )}
      </main>

      {/* Alt-Tab / Ctrl-Shift-Tab Switcher HUD Modal */}
      {state.isSwitcherOpen && <TabSwitcher state={state} theme={theme} />}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={state.settings}
        theme={theme}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
};
