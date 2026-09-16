import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { TabSwitcher } from './components/TabSwitcher';
import { NewTabPage } from './components/NewTabPage';
import type { BrowserState } from '../shared/types';

export type ThemeMode = 'dark' | 'light';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('larp-theme') as ThemeMode) || 'dark';
  });

  const [state, setState] = useState<BrowserState>({
    tabs: [],
    activeTabId: null,
    isSwitcherOpen: false,
    selectedSwitcherIndex: 0,
    mruTabIds: [],
  });

  // Sync theme with document element
  useEffect(() => {
    localStorage.setItem('larp-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    // Fetch initial state
    if (window.browserApi) {
      window.browserApi.getState().then((initialState) => {
        if (initialState) setState(initialState);
      });

      // Listen for updates from Electron main process
      const unsubscribe = window.browserApi.onStateUpdate((updatedState) => {
        setState(updatedState);
      });

      return () => unsubscribe();
    }
  }, []);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const isNewTab = !activeTab || activeTab.url === 'about:blank';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-slate-100 transition-colors duration-200">
      {/* Top Floating / Minimal Bar */}
      <TopBar state={state} theme={theme} onToggleTheme={toggleTheme} />

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
    </div>
  );
};
