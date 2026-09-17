import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ThemeMode } from '../App';

interface KeyboardShortcutsProps {
  onClose: () => void;
  theme: ThemeMode;
}

interface Shortcut {
  keys: string[];
  description: string;
}

interface Group {
  label: string;
  shortcuts: Shortcut[];
}

const SHORTCUT_GROUPS: Group[] = [
  {
    label: 'Navigation',
    shortcuts: [
      { keys: ['Alt', '←'], description: 'Go back' },
      { keys: ['Alt', '→'], description: 'Go forward' },
      { keys: ['Ctrl', 'R'], description: 'Reload page' },
      { keys: ['F5'], description: 'Reload page' },
      { keys: ['Ctrl', 'Shift', 'R'], description: 'Hard reload (bypass cache)' },
      { keys: ['Ctrl', 'L'], description: 'Focus address bar' },
    ],
  },
  {
    label: 'Tabs',
    shortcuts: [
      { keys: ['Ctrl', 'T'], description: 'New tab' },
      { keys: ['Ctrl', 'W'], description: 'Close current tab' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate current tab' },
      { keys: ['Ctrl', '1'], description: 'Switch to 1st tab' },
      { keys: ['Ctrl', '2–8'], description: 'Switch to tab by position' },
      { keys: ['Ctrl', '9'], description: 'Switch to last tab' },
    ],
  },
  {
    label: 'Tab Switcher',
    shortcuts: [
      { keys: ['Ctrl', 'Tab'], description: 'Open / cycle forwards' },
      { keys: ['Ctrl', 'Shift', 'Tab'], description: 'Cycle backwards' },
      { keys: ['← →'], description: 'Navigate cards while open' },
      { keys: ['Enter'], description: 'Switch to selected tab' },
      { keys: ['W'], description: 'Close selected tab' },
      { keys: ['Esc'], description: 'Cancel and close' },
    ],
  },
  {
    label: 'Interface',
    shortcuts: [
      { keys: ['Ctrl', ','], description: 'Open Settings' },
      { keys: ['Ctrl', '/'], description: 'Show / hide this cheatsheet' },
      { keys: ['F11'], description: 'Toggle maximize window' },
    ],
  },
];

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

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ onClose, theme }) => {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 animate-scale-up"
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
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-main)]">Keyboard Shortcuts</h2>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Press <Kbd text="Ctrl" /> + <Kbd text="/" /> or <Kbd text="?" /> to show/hide
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Grid of groups */}
        <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-5 max-h-[70vh] overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2.5">
              <h3
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--accent-primary)' }}
              >
                {group.label}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)]">{s.description}</span>
                    <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                      {s.keys.map((k, ki) => (
                        <React.Fragment key={ki}>
                          <Kbd text={k} />
                          {ki < s.keys.length - 1 && (
                            <span className="text-[10px] text-[var(--text-muted)]">+</span>
                          )}
                        </React.Fragment>
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
          className="px-5 py-2.5 border-t flex items-center justify-end"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'rgba(128, 128, 128, 0.03)',
          }}
        >
          <span className="text-[10px] text-[var(--text-muted)]">
            Press <Kbd text="Esc" /> to close
          </span>
        </div>
      </div>
    </div>
  );
};
