import { app, BrowserWindow, WebContents } from 'electron';
import { TabManager } from './tab-manager';

export function registerShortcuts(window: BrowserWindow, tabManager: TabManager) {
  let isCtrlPressed = false;

  const handleInputEvent = (event: Electron.Event, input: Electron.Input) => {
    // Track Ctrl modifier state for switcher commit-on-release
    if (input.key === 'Control') {
      if (input.type === 'keyUp') {
        isCtrlPressed = false;
        if (tabManager.getState().isSwitcherOpen) {
          event.preventDefault();
          tabManager.commitSwitcher();
        }
      } else if (input.type === 'keyDown') {
        isCtrlPressed = true;
      }
      return;
    }

    if (input.type !== 'keyDown') return;

    // ── Tab Switcher HUD ────────────────────────────────────────────────────
    if (input.control && input.key.toLowerCase() === 'tab') {
      event.preventDefault();
      if (!tabManager.getState().isSwitcherOpen) {
        tabManager.openSwitcher();
      } else {
        tabManager.cycleSwitcher(input.shift ? 'backward' : 'forward');
      }
      return;
    }

    if (input.key === 'Escape' && tabManager.getState().isSwitcherOpen) {
      event.preventDefault();
      tabManager.closeSwitcher();
      return;
    }

    if (tabManager.getState().isSwitcherOpen) {
      if (input.key === 'ArrowRight' || input.key === 'ArrowDown') {
        event.preventDefault();
        tabManager.cycleSwitcher('forward');
        return;
      }
      if (input.key === 'ArrowLeft' || input.key === 'ArrowUp') {
        event.preventDefault();
        tabManager.cycleSwitcher('backward');
        return;
      }
      if (input.key === 'Enter') {
        event.preventDefault();
        tabManager.commitSwitcher();
        return;
      }
    }

    // ── Navigation ──────────────────────────────────────────────────────────
    if (input.alt && input.key === 'ArrowLeft') {
      event.preventDefault();
      const { activeTabId } = tabManager.getState();
      if (activeTabId) tabManager.goBack(activeTabId);
      return;
    }

    if (input.alt && input.key === 'ArrowRight') {
      event.preventDefault();
      const { activeTabId } = tabManager.getState();
      if (activeTabId) tabManager.goForward(activeTabId);
      return;
    }

    // ── F-key shortcuts ─────────────────────────────────────────────────────
    if (!input.control && !input.alt && !input.shift) {
      // F5 – Reload
      if (input.key === 'F5') {
        event.preventDefault();
        const { activeTabId } = tabManager.getState();
        if (activeTabId) tabManager.reloadTab(activeTabId);
        return;
      }
      // F11 – Toggle maximize
      if (input.key === 'F11') {
        event.preventDefault();
        if (window.isMaximized()) {
          window.unmaximize();
        } else {
          window.maximize();
        }
        return;
      }
    }

    // Ctrl+Shift+R – Hard reload (bypass cache)
    if (input.control && input.shift && input.key.toLowerCase() === 'r') {
      event.preventDefault();
      const { activeTabId } = tabManager.getState();
      if (activeTabId) {
        const tab = tabManager.getTabView(activeTabId);
        if (tab) tab.webContents.reloadIgnoringCache();
      }
      return;
    }

    // ── Ctrl-only shortcuts ─────────────────────────────────────────────────
    if (input.control && !input.shift && !input.alt) {
      const key = input.key.toLowerCase();

      // Ctrl+T – New Tab
      if (key === 't') {
        event.preventDefault();
        tabManager.createTab();
        return;
      }

      // Ctrl+W – Close Active Tab
      if (key === 'w') {
        event.preventDefault();
        const { activeTabId } = tabManager.getState();
        if (activeTabId) tabManager.closeTab(activeTabId);
        return;
      }

      // Ctrl+R – Reload
      if (key === 'r') {
        event.preventDefault();
        const { activeTabId } = tabManager.getState();
        if (activeTabId) tabManager.reloadTab(activeTabId);
        return;
      }

      // Ctrl+D – Duplicate Tab
      if (key === 'd') {
        event.preventDefault();
        const { activeTabId, tabs } = tabManager.getState();
        const current = tabs.find(t => t.id === activeTabId);
        if (current && current.url && current.url !== 'about:blank') {
          tabManager.createTab(current.url);
        } else {
          tabManager.createTab();
        }
        return;
      }

      // Ctrl+1–Ctrl+8 – Switch to tab by 1-based position
      const num = parseInt(key, 10);
      if (num >= 1 && num <= 8) {
        event.preventDefault();
        const { tabs } = tabManager.getState();
        const target = tabs[num - 1];
        if (target) tabManager.switchTab(target.id);
        return;
      }

      // Ctrl+9 – Switch to last tab
      if (key === '9') {
        event.preventDefault();
        const { tabs } = tabManager.getState();
        if (tabs.length > 0) {
          tabManager.switchTab(tabs[tabs.length - 1].id);
        }
        return;
      }
    }
  };

  window.webContents.on('before-input-event', handleInputEvent);

  app.on('web-contents-created', (_e, contents: WebContents) => {
    contents.on('before-input-event', handleInputEvent);
  });
}
