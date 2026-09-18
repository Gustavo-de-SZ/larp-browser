import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { TabSwitcher } from './components/TabSwitcher';
import { NewTabPage } from './components/NewTabPage';
import { SettingsModal, type SettingsTabType } from './components/SettingsModal';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { QuickFavoritesPopover } from './components/QuickFavoritesPopover';
import { FindInPageBar } from './components/FindInPageBar';
import { getPalette, applyPalette } from './theme/palettes';
import type { BrowserState, BrowserSettings } from '@/shared/types';

export type ThemeMode = 'dark' | 'light';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('larp-theme') as ThemeMode) || 'dark';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabType>('appearance');

  const [state, setState] = useState<BrowserState>({
    tabs: [],
    activeTabId: null,
    isSwitcherOpen: false,
    selectedSwitcherIndex: 0,
    mruTabIds: [],
    bookmarks: [],
    settings: {
      theme: 'dark',
      darkPaletteId: 'graphite',
      lightPaletteId: 'paper',
      forcePageDarkMode: true,
      defaultSearchEngine: 'google',
      autoHibernateTabs: true,
      showBookmarksBar: false,
      showFavoritesOnNewTab: true,
      startupBehavior: 'new-tab',
      startupCustomUrl: 'https://duckduckgo.com',
    },
  });

  // Apply active palette whenever theme or palette ID changes
  useEffect(() => {
    const paletteId =
      theme === 'dark'
        ? state.settings?.darkPaletteId || 'graphite'
        : state.settings?.lightPaletteId || 'paper';
    const customAccent =
      theme === 'dark'
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

  // Persist theme choice and sync Electron nativeTheme
  useEffect(() => {
    localStorage.setItem('larp-theme', theme);
    if (window.browserApi) {
      window.browserApi.setTheme(theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, theme: nextTheme },
    }));
    if (window.browserApi) {
      window.browserApi
        .updateSettings({ theme: nextTheme })
        .then((updated) => {
          if (updated) {
            setState((prev) => ({ ...prev, settings: updated }));
          }
        })
        .catch(console.error);
    }
  };

  const handleUpdateSettings = (newSettings: Partial<BrowserSettings>) => {
    if (newSettings.theme && newSettings.theme !== theme) {
      setTheme(newSettings.theme);
    }
    // Optimistically update React state immediately: 0ms latency!
    setState((prev) => {
      const updated = { ...prev.settings };
      for (const [key, value] of Object.entries(newSettings)) {
        if (value === null || value === undefined) {
          delete (updated as any)[key];
        } else {
          (updated as any)[key] = value;
        }
      }
      return {
        ...prev,
        settings: updated as BrowserSettings,
      };
    });
    if (window.browserApi) {
      window.browserApi
        .updateSettings(newSettings)
        .then((updated) => {
          if (updated) {
            setState((prev) => ({ ...prev, settings: updated }));
          }
        })
        .catch(console.error);
    }
  };

  // Listen for toggle modal / shortcuts / find / favorites commands sent from Electron main process shortcuts
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    if (window.browserApi?.onToggleModal) {
      cleanups.push(
        window.browserApi.onToggleModal((modal) => {
          if (modal === 'settings') {
            setSettingsTab('appearance');
            setIsSettingsOpen((prev) => !prev);
          } else if (modal === 'shortcuts') {
            setIsShortcutsOpen((prev) => !prev);
          } else if (modal === 'history') {
            setSettingsTab('history');
            setIsSettingsOpen(true);
          }
        })
      );
    }

    if (window.browserApi?.onToggleFavorites) {
      cleanups.push(
        window.browserApi.onToggleFavorites(() => {
          setIsFavoritesOpen((prev) => !prev);
        })
      );
    }

    if (window.browserApi?.onToggleFind) {
      cleanups.push(
        window.browserApi.onToggleFind(() => {
          setIsFindOpen((prev) => !prev);
        })
      );
    }

    return () => {
      cleanups.forEach((c) => c());
    };
  }, []);

  // Global renderer keyboard shortcuts when focused in shell
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setSettingsTab('appearance');
        setIsSettingsOpen((prev) => !prev);
        return;
      }
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }
      if (e.ctrlKey && (e.key === 'b' || e.key === 'B') && !e.shiftKey) {
        e.preventDefault();
        setIsFavoritesOpen((prev) => !prev);
        return;
      }
      if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setIsFindOpen((prev) => !prev);
        return;
      }
      if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setSettingsTab('history');
        setIsSettingsOpen(true);
        return;
      }
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
    if (window.browserApi) {
      window.browserApi.getState().then((initialState) => {
        if (initialState) {
          setState(initialState);
          if (initialState.settings?.theme) {
            setTheme(initialState.settings.theme);
          }
        }
      });

      const unsubscribe = window.browserApi.onStateUpdate((updatedState) => {
        setState(updatedState);
        if (updatedState.settings?.theme) {
          setTheme(updatedState.settings.theme);
        }
      });

      return () => unsubscribe();
    }
  }, []);

  // Synchronize modal open state with Electron main process so native WebContentsView is detached
  useEffect(() => {
    const isAnyModalOpen = isSettingsOpen || isShortcutsOpen || isFavoritesOpen;
    if (window.browserApi?.setModalOpen) {
      window.browserApi.setModalOpen(isAnyModalOpen);
    }
  }, [isSettingsOpen, isShortcutsOpen, isFavoritesOpen]);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const isNewTab = !activeTab || !activeTab.url || activeTab.url === 'about:blank';

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden transition-colors duration-150 relative"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      {/* Top Bar with Omnibar, Star Bookmark, Controls, and optional Bookmarks Bar */}
      <TopBar
        state={state}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={(tab) => {
          if (tab) setSettingsTab(tab as SettingsTabType);
          setIsSettingsOpen(true);
        }}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onToggleFavorites={() => setIsFavoritesOpen((prev) => !prev)}
        isFavoritesOpen={isFavoritesOpen}
      />

      {/* Docked In-Page Find Bar */}
      <FindInPageBar
        isOpen={isFindOpen}
        onClose={() => setIsFindOpen(false)}
        theme={theme}
      />

      {/* Main Content Area */}
      <main
        className="flex-1 w-full relative overflow-hidden"
        style={{ backgroundColor: 'var(--bg-app)' }}
      >
        {isNewTab ? (
          <NewTabPage state={state} theme={theme} />
        ) : (
          (state.isSwitcherOpen || isSettingsOpen || isShortcutsOpen || isFavoritesOpen) && activeTab?.previewImage ? (
            <img
              src={activeTab.previewImage}
              alt="Active tab preview"
              className="w-full h-full object-cover object-top"
            />
          ) : null
        )}
      </main>

      {/* Quick Favorites Popover */}
      <QuickFavoritesPopover
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        state={state}
        theme={theme}
        onOpenSettingsToBookmarks={() => {
          setSettingsTab('bookmarks');
          setIsFavoritesOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      {/* Alt-Tab / Ctrl-Shift-Tab Switcher HUD */}
      {state.isSwitcherOpen && <TabSwitcher state={state} theme={theme} />}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={state.settings}
        bookmarks={state.bookmarks}
        theme={theme}
        initialTab={settingsTab}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Keyboard Shortcuts Cheatsheet */}
      {isShortcutsOpen && (
        <KeyboardShortcuts
          onClose={() => setIsShortcutsOpen(false)}
          theme={theme}
          customShortcuts={state.settings?.customShortcuts}
        />
      )}
    </div>
  );
};
