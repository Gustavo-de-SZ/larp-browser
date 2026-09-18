import { app, BrowserWindow, WebContents } from 'electron';
import { TabManager } from './tab-manager';
import { SHORTCUT_DEFINITIONS, ShortcutActionId } from '../shared/types';

interface ParsedShortcut {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  key: string;
}

export function parseShortcut(combo: string): ParsedShortcut {
  const parts = combo.split('+').map((p) => p.trim());
  let ctrl = false;
  let alt = false;
  let shift = false;
  let meta = false;
  let key = '';

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'ctrl' || lower === 'control') {
      ctrl = true;
    } else if (lower === 'alt') {
      alt = true;
    } else if (lower === 'shift') {
      shift = true;
    } else if (lower === 'meta' || lower === 'cmd' || lower === 'super') {
      meta = true;
    } else {
      key = part;
    }
  }

  return { ctrl, alt, shift, meta, key };
}

export function matchesInput(input: Electron.Input, parsed: ParsedShortcut): boolean {
  if (input.type !== 'keyDown') return false;

  const ctrlMatch = !!input.control === parsed.ctrl;
  const altMatch = !!input.alt === parsed.alt;
  const shiftMatch = !!input.shift === parsed.shift;
  const metaMatch = !!input.meta === parsed.meta;

  if (!ctrlMatch || !altMatch || !shiftMatch || !metaMatch) return false;

  const targetKey = parsed.key.toLowerCase();
  const inputKey = input.key.toLowerCase();

  if (targetKey === inputKey) return true;

  // Key aliases
  if (targetKey === 'left' && (inputKey === 'arrowleft' || inputKey === 'left')) return true;
  if (targetKey === 'right' && (inputKey === 'arrowright' || inputKey === 'right')) return true;
  if (targetKey === 'up' && (inputKey === 'arrowup' || inputKey === 'up')) return true;
  if (targetKey === 'down' && (inputKey === 'arrowdown' || inputKey === 'down')) return true;

  return false;
}

export function registerShortcuts(window: BrowserWindow, tabManager: TabManager) {
  let isCtrlPressed = false;

  const getShortcutKey = (actionId: ShortcutActionId): string => {
    const settings = tabManager.getSettings();
    if (settings.customShortcuts && settings.customShortcuts[actionId]) {
      return settings.customShortcuts[actionId];
    }
    const def = SHORTCUT_DEFINITIONS.find((d) => d.id === actionId);
    return def ? def.defaultKey : '';
  };

  const isTriggered = (actionId: ShortcutActionId, input: Electron.Input): boolean => {
    const combo = getShortcutKey(actionId);
    if (!combo) return false;
    const parsed = parseShortcut(combo);
    return matchesInput(input, parsed);
  };

  const handleInputEvent = (event: Electron.Event, input: Electron.Input) => {
    // Track Ctrl modifier state
    if (input.key === 'Control') {
      if (input.type === 'keyUp') {
        isCtrlPressed = false;
      } else if (input.type === 'keyDown') {
        isCtrlPressed = true;
      }
      return;
    }

    if (input.type !== 'keyDown') return;

    // ── Tab Switcher HUD Navigation & Esc ──────────────────────────────────
    if (tabManager.getState().isSwitcherOpen) {
      const keyLower = input.key.toLowerCase();

      if (keyLower === 'escape') {
        event.preventDefault();
        tabManager.closeSwitcher();
        return;
      }

      if (
        keyLower === 'arrowright' ||
        keyLower === 'right' ||
        keyLower === 'arrowdown' ||
        keyLower === 'down' ||
        (keyLower === 'tab' && !input.shift)
      ) {
        event.preventDefault();
        tabManager.cycleSwitcher('forward');
        return;
      }

      if (
        keyLower === 'arrowleft' ||
        keyLower === 'left' ||
        keyLower === 'arrowup' ||
        keyLower === 'up' ||
        (keyLower === 'tab' && input.shift)
      ) {
        event.preventDefault();
        tabManager.cycleSwitcher('backward');
        return;
      }

      if (keyLower === 'enter' || keyLower === 'return') {
        event.preventDefault();
        tabManager.commitSwitcher();
        return;
      }
    }

    // ── Dynamic Customizable Shortcuts ─────────────────────────────────────
    // 1. Tab Switcher Toggle / Cycle
    if (isTriggered('openSwitcher', input)) {
      event.preventDefault();
      if (!tabManager.getState().isSwitcherOpen) {
        tabManager.openSwitcher();
      } else {
        tabManager.cycleSwitcher(input.shift ? 'backward' : 'forward');
      }
      return;
    }

    // 2. New Tab
    if (isTriggered('newTab', input)) {
      event.preventDefault();
      tabManager.createTab();
      return;
    }

    // 2b. New Private Tab
    if (isTriggered('newPrivateTab', input)) {
      event.preventDefault();
      tabManager.createTab('about:blank', true);
      return;
    }

    // 3. Close Tab
    if (isTriggered('closeTab', input)) {
      event.preventDefault();
      const { activeTabId } = tabManager.getState();
      if (activeTabId) tabManager.closeTab(activeTabId);
      return;
    }

    // 4. Duplicate Tab
    if (isTriggered('duplicateTab', input)) {
      event.preventDefault();
      const { activeTabId, tabs } = tabManager.getState();
      const current = tabs.find((t) => t.id === activeTabId);
      const isPrivate = current?.isPrivate || false;
      if (current && current.url && current.url !== 'about:blank') {
        tabManager.createTab(current.url, isPrivate);
      } else {
        tabManager.createTab('about:blank', isPrivate);
      }
      return;
    }

    // 5. Bookmark Page
    if (isTriggered('toggleBookmark', input)) {
      event.preventDefault();
      const { activeTabId, tabs } = tabManager.getState();
      const current = tabs.find((t) => t.id === activeTabId);
      if (current && current.url && current.url !== 'about:blank') {
        tabManager.toggleBookmark({
          title: current.title,
          url: current.url,
          favicon: current.favicon,
        });
      }
      return;
    }

    // 6. Toggle Bookmarks Bar
    if (isTriggered('toggleBookmarksBar', input)) {
      event.preventDefault();
      const currentSetting = tabManager.getSettings().showBookmarksBar;
      tabManager.updateSettings({ showBookmarksBar: !currentSetting });
      return;
    }

    // 7. Hard Reload (Bypass cache)
    if (isTriggered('hardReloadTab', input)) {
      event.preventDefault();
      const { activeTabId } = tabManager.getState();
      if (activeTabId) {
        const tab = tabManager.getTabView(activeTabId);
        if (tab) tab.webContents.reloadIgnoringCache();
      }
      return;
    }

    // 8. Normal Reload
    if (isTriggered('reloadTab', input) || (!input.control && !input.alt && !input.shift && input.key === 'F5')) {
      event.preventDefault();
      const { activeTabId } = tabManager.getState();
      if (activeTabId) tabManager.reloadTab(activeTabId);
      return;
    }

    // 9. Go Back
    if (isTriggered('goBack', input)) {
      event.preventDefault();
      const { activeTabId } = tabManager.getState();
      if (activeTabId) tabManager.goBack(activeTabId);
      return;
    }

    // 10. Go Forward
    if (isTriggered('goForward', input)) {
      event.preventDefault();
      const { activeTabId } = tabManager.getState();
      if (activeTabId) tabManager.goForward(activeTabId);
      return;
    }

    // 11. Focus Address Bar (Ctrl+L or Alt+D)
    if (
      isTriggered('focusOmnibar', input) ||
      (input.alt && !input.control && !input.shift && input.key.toLowerCase() === 'd')
    ) {
      event.preventDefault();
      window.focus();
      window.webContents.focus();
      window.webContents.send('browser:focus-omnibar');
      return;
    }

    // 12. Open Settings
    if (isTriggered('openSettings', input)) {
      event.preventDefault();
      window.webContents.send('browser:toggle-modal', 'settings');
      return;
    }

    // 13. Open Shortcuts Cheatsheet
    if (isTriggered('openShortcuts', input)) {
      event.preventDefault();
      window.webContents.send('browser:toggle-modal', 'shortcuts');
      return;
    }

    // 14. Find in Page
    if (isTriggered('findInPage', input)) {
      event.preventDefault();
      window.webContents.send('browser:toggle-find');
      return;
    }

    // 15. Quick Favorites Popover
    if (isTriggered('openFavorites', input)) {
      event.preventDefault();
      window.webContents.send('browser:toggle-favorites');
      return;
    }

    // 16. Browsing History
    if (isTriggered('openHistory', input)) {
      event.preventDefault();
      window.webContents.send('browser:toggle-modal', 'history');
      return;
    }

    // 16.5. Downloads (Ctrl+J)
    if (isTriggered('openDownloads', input) || (input.control && input.key.toLowerCase() === 'j')) {
      event.preventDefault();
      window.webContents.send('browser:toggle-modal', 'downloads');
      return;
    }

    // 17. Zoom Controls (In, Out, Reset)
    if (isTriggered('zoomIn', input) || (input.control && (input.key === '+' || input.key === '='))) {
      event.preventDefault();
      const { activeTabId, tabs } = tabManager.getState();
      if (activeTabId) {
        const currentTab = tabs.find((t) => t.id === activeTabId);
        const currentZoom = currentTab?.zoomFactor || 1.0;
        tabManager.setZoomFactor(activeTabId, currentZoom + 0.1);
      }
      return;
    }

    if (isTriggered('zoomOut', input) || (input.control && (input.key === '-' || input.key === '_'))) {
      event.preventDefault();
      const { activeTabId, tabs } = tabManager.getState();
      if (activeTabId) {
        const currentTab = tabs.find((t) => t.id === activeTabId);
        const currentZoom = currentTab?.zoomFactor || 1.0;
        tabManager.setZoomFactor(activeTabId, currentZoom - 0.1);
      }
      return;
    }

    if (isTriggered('zoomReset', input) || (input.control && input.key === '0')) {
      event.preventDefault();
      const { activeTabId } = tabManager.getState();
      if (activeTabId) {
        tabManager.setZoomFactor(activeTabId, 1.0);
      }
      return;
    }

    // 18. Toggle Maximize Window
    if (isTriggered('toggleMaximize', input) || (!input.control && !input.alt && !input.shift && input.key === 'F11')) {
      event.preventDefault();
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
      return;
    }

    // ── Number keys: Ctrl+1–Ctrl+8 / Ctrl+9 ──────────────────────────────
    if (input.control && !input.shift && !input.alt) {
      const key = input.key.toLowerCase();
      const num = parseInt(key, 10);
      if (num >= 1 && num <= 8) {
        event.preventDefault();
        const { tabs } = tabManager.getState();
        const target = tabs[num - 1];
        if (target) tabManager.switchTab(target.id);
        return;
      }

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
