import { app, BrowserWindow, WebContents } from 'electron';
import { TabManager } from './tab-manager';

export function registerShortcuts(window: BrowserWindow, tabManager: TabManager) {
  let isCtrlPressed = false;

  const handleInputEvent = (event: Electron.Event, input: Electron.Input) => {
    // Track Ctrl modifier state
    if (input.key === 'Control') {
      if (input.type === 'keyUp') {
        isCtrlPressed = false;
        // If switcher is open and Ctrl was released, commit selection!
        if (tabManager.getState().isSwitcherOpen) {
          event.preventDefault();
          tabManager.commitSwitcher();
        }
      } else if (input.type === 'keyDown') {
        isCtrlPressed = true;
      }
      return;
    }

    if (input.type === 'keyDown') {
      // Ctrl+Shift+Tab or Ctrl+Tab
      if (input.control && input.key.toLowerCase() === 'tab') {
        event.preventDefault();
        const state = tabManager.getState();
        if (!state.isSwitcherOpen) {
          tabManager.openSwitcher();
        } else {
          tabManager.cycleSwitcher(input.shift ? 'backward' : 'forward');
        }
        return;
      }

      // Escape to cancel switcher
      if (input.key === 'Escape' && tabManager.getState().isSwitcherOpen) {
        event.preventDefault();
        tabManager.closeSwitcher();
        return;
      }

      // Arrow keys in switcher
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

      // Global Tab shortcuts
      if (input.control && !input.shift && !input.alt) {
        const key = input.key.toLowerCase();
        // Ctrl + T: New Tab
        if (key === 't') {
          event.preventDefault();
          tabManager.createTab();
          return;
        }
        // Ctrl + W: Close Active Tab
        if (key === 'w') {
          event.preventDefault();
          const state = tabManager.getState();
          if (state.activeTabId) {
            tabManager.closeTab(state.activeTabId);
          }
          return;
        }
        // Ctrl + R: Reload Tab
        if (key === 'r') {
          event.preventDefault();
          const state = tabManager.getState();
          if (state.activeTabId) {
            tabManager.reloadTab(state.activeTabId);
          }
          return;
        }
      }

      // Alt + Left: Go Back
      if (input.alt && input.key === 'ArrowLeft') {
        event.preventDefault();
        const state = tabManager.getState();
        if (state.activeTabId) {
          tabManager.goBack(state.activeTabId);
        }
        return;
      }

      // Alt + Right: Go Forward
      if (input.alt && input.key === 'ArrowRight') {
        event.preventDefault();
        const state = tabManager.getState();
        if (state.activeTabId) {
          tabManager.goForward(state.activeTabId);
        }
        return;
      }
    }
  };

  // Register on window webContents
  window.webContents.on('before-input-event', handleInputEvent);

  // When any new webContents is created (including WebContentsView tabs), attach listener
  app.on('web-contents-created', (_e, contents: WebContents) => {
    contents.on('before-input-event', handleInputEvent);
  });
}
