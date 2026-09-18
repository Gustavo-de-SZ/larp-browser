import React, { useEffect } from 'react';
import { X, Keyboard, Settings } from 'lucide-react';
import type { ThemeMode } from '../App';
import { SHORTCUT_DEFINITIONS, ShortcutActionId } from '@/shared/types';

interface KeyboardShortcutsProps {
  onClose: () => void;
  theme: ThemeMode;
  customShortcuts?: Record<string, string> | null;
  onOpenSettingsToShortcuts?: () => void;
}

function Kbd({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border min-w-[1.5rem]"
      style={{
        backgroundColor: 'rgba(128, 128, 128, 0.08)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      {text}
    </span>
  );
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  onClose,
  theme,
  customShortcuts = {},
  onOpenSettingsToShortcuts,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const getKey = (actionId: ShortcutActionId): string[] => {
    if (customShortcuts && customShortcuts[actionId]) {
      return customShortcuts[actionId].split('+');
    }
    const def = SHORTCUT_DEFINITIONS.find((d) => d.id === actionId);
    return (def ? def.defaultKey : '').split('+');
  };

  const SHORTCUT_GROUPS = [
    {
      label: 'Navigation',
      shortcuts: [
        { keys: getKey('goBack'), description: 'Go back' },
        { keys: getKey('goForward'), description: 'Go forward' },
        { keys: getKey('reloadTab'), description: 'Reload page' },
        { keys: getKey('hardReloadTab'), description: 'Hard reload (bypass cache)' },
        { keys: getKey('focusOmnibar'), description: 'Focus address bar' },
        { keys: getKey('findInPage'), description: 'Find text in page' },
      ],
    },
    {
      label: 'Tabs & Bookmarks',
      shortcuts: [
        { keys: getKey('newTab'), description: 'New tab' },
        { keys: getKey('newPrivateTab'), description: 'New private tab' },
        { keys: getKey('closeTab'), description: 'Close current tab' },
        { keys: getKey('duplicateTab'), description: 'Duplicate current tab' },
        { keys: getKey('openFavorites'), description: 'Quick favorites popover' },
        { keys: getKey('toggleBookmark'), description: 'Bookmark active page' },
        { keys: getKey('toggleBookmarksBar'), description: 'Toggle bookmarks bar' },
        { keys: ['Ctrl', '1'], description: 'Switch to 1st tab' },
        { keys: ['Ctrl', '2–8'], description: 'Switch to tab by position' },
        { keys: ['Ctrl', '9'], description: 'Switch to last tab' },
      ],
    },
    {
      label: 'Tab Switcher HUD',
      shortcuts: [
        { keys: getKey('openSwitcher'), description: 'Open / cycle forwards' },
        { keys: ['Ctrl', 'Shift', 'Tab'], description: 'Cycle backwards' },
        { keys: ['← →'], description: 'Navigate cards while open' },
        { keys: ['Enter'], description: 'Switch to selected tab' },
        { keys: ['W'], description: 'Close selected tab' },
        { keys: ['Esc'], description: 'Cancel and close' },
      ],
    },
    {
      label: 'Interface & View',
      shortcuts: [
        { keys: getKey('openHistory'), description: 'Browsing history' },
        { keys: getKey('openDownloads'), description: 'Downloads tray & history' },
        { keys: getKey('zoomIn'), description: 'Zoom in' },
        { keys: getKey('zoomOut'), description: 'Zoom out' },
        { keys: getKey('zoomReset'), description: 'Reset zoom (100%)' },
        { keys: getKey('openSettings'), description: 'Open Settings' },
        { keys: getKey('openShortcuts'), description: 'Show / hide this cheatsheet' },
        { keys: getKey('toggleMaximize'), description: 'Toggle maximize window' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 animate-scale-up select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-app)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-main)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 px-6 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center space-x-2">
            <Keyboard className="w-4 h-4 text-[var(--accent-primary)]" />
            <h2 className="text-sm font-semibold tracking-tight text-[var(--text-main)]">
              Keyboard Shortcuts
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenSettingsToShortcuts && (
              <button
                type="button"
                onClick={onOpenSettingsToShortcuts}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-[var(--text-main)]"
                title="Customize in Settings"
              >
                <Settings className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                <span>Customize</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.label} className="space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {group.label}
              </h3>
              <div
                className="rounded-xl border overflow-hidden divide-y"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-card)',
                }}
              >
                {group.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 px-4 text-xs"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <span className="text-[var(--text-main)]">{shortcut.description}</span>
                    <div className="flex items-center space-x-1">
                      {shortcut.keys.map((k, kIdx) => (
                        <Kbd key={kIdx} text={k} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="p-3.5 px-6 border-t flex items-center justify-between text-[11px] text-[var(--text-muted)]"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'rgba(128, 128, 128, 0.03)',
          }}
        >
          {onOpenSettingsToShortcuts ? (
            <button
              type="button"
              onClick={onOpenSettingsToShortcuts}
              className="flex items-center space-x-1.5 px-2 py-1 rounded-lg text-xs font-medium hover:underline cursor-pointer"
              style={{ color: 'var(--accent-primary)' }}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Customize Shortcuts in Settings (Ctrl+,)</span>
            </button>
          ) : (
            <span>Shortcuts can be customized in Settings (Ctrl+,)</span>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-xs font-medium border border-[var(--border-subtle)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-[var(--text-main)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
