import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { TabSwitcher } from './components/TabSwitcher';
import { NewTabPage } from './components/NewTabPage';
import { SettingsModal } from './components/SettingsModal';
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
      forcePageDarkMode: true,
      defaultSearchEngine: 'duckduckgo',
      autoHibernateTabs: true,
    },
  });

  // Sync theme with document element and Electron nativeTheme
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
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleUpdateSettings = async (newSettings: Partial<BrowserSettings>) => {
    if (newSettings.theme) {
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
        if (updatedState.settings?.theme && updatedState.settings.theme !== theme) {
          setTheme(updatedState.settings.theme);
        }
      });

      return () => unsubscribe();
    }
  }, []);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const isNewTab = !activeTab || activeTab.url === 'about:blank';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-slate-100 transition-colors duration-200">
      {/* Top Floating / Minimal Bar */}
      <TopBar
        state={state}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area:
          When active tab is about:blank or empty, render the native React New Tab dashboard.
          When active tab has a real web URL, the WebContentsView is attached by the main process
          directly below the TopBar.
      */}
      <main className="flex-1 w-full h-[calc(100vh-44px)] relative overflow-hidden">
        {isNewTab && <NewTabPage state={state} theme={theme} />}
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
