import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { TabSwitcher } from './components/TabSwitcher';
import { NewTabPage } from './components/NewTabPage';
import type { BrowserState } from '../shared/types';

export const App: React.FC = () => {
  const [state, setState] = useState<BrowserState>({
    tabs: [],
    activeTabId: null,
    isSwitcherOpen: false,
    selectedSwitcherIndex: 0,
    mruTabIds: [],
  });

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-900 text-slate-100">
      {/* Top Floating / Minimal Bar */}
      <TopBar state={state} />

      {/* Main Content Area:
          When active tab is about:blank or empty, render the native React New Tab dashboard.
          When active tab has a real web URL, the WebContentsView is attached by the main process
          directly below the TopBar.
      */}
      <main className="flex-1 w-full h-[calc(100vh-44px)] relative overflow-hidden bg-surface-900">
        {isNewTab && <NewTabPage state={state} />}
      </main>

      {/* Alt-Tab / Ctrl-Shift-Tab Switcher HUD Modal */}
      {state.isSwitcherOpen && <TabSwitcher state={state} />}
    </div>
  );
};
