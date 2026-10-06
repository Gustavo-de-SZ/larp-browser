import React, { useState } from 'react';
import { Pin, PinOff, Volume2, VolumeX, RotateCw, X, Globe } from 'lucide-react';
import type { TabInfo } from '@/shared/types';

interface PinnedSidebarProps {
  pinnedTabs: TabInfo[];
  activeTabId: string | null;
  onSwitchTab: (tabId: string) => void;
  onUnpinTab: (tabId: string) => void;
  onTogglePinActiveTab?: () => void;
  onToggleMuteTab?: (tabId: string) => void;
  onReloadTab?: (tabId: string) => void;
  onCloseTab?: (tabId: string) => void;
}

export const PinnedSidebar: React.FC<PinnedSidebarProps> = ({
  pinnedTabs,
  activeTabId,
  onSwitchTab,
  onUnpinTab,
  onTogglePinActiveTab,
  onToggleMuteTab,
  onReloadTab,
  onCloseTab,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);

  if (pinnedTabs.length === 0) {
    return null;
  }

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => setContextMenu(null);

  const isCurrentTabPinned = pinnedTabs.some((t) => t.id === activeTabId);

  return (
    <>
      {/* Sidebar Rail */}
      <aside
        className="w-12 h-full flex flex-col items-center py-2.5 z-20 select-none transition-colors border-r shrink-0"
        style={{
          backgroundColor: 'var(--bg-main)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Pinned Tab Icons */}
        <div className="flex-1 flex flex-col items-center space-y-2 w-full overflow-y-auto overflow-x-hidden no-scrollbar px-1.5">
          {pinnedTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div key={tab.id} className="relative group flex items-center justify-center w-full">
                {/* Active Pill Indicator */}
                {isActive && (
                  <div
                    className="absolute left-0 w-1 h-5 rounded-r transition-all"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  />
                )}

                <button
                  type="button"
                  onClick={() => onSwitchTab(tab.id)}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      onUnpinTab(tab.id);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, tab.id)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all relative cursor-pointer border ${
                    isActive
                      ? 'border-[var(--accent-primary)]/40 shadow-sm'
                      : 'border-transparent hover:border-[var(--border-card)] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                  }}
                  title={`${tab.title || tab.url} (Middle-click to unpin)`}
                >
                  {tab.favicon ? (
                    <img
                      src={tab.favicon}
                      alt=""
                      className="w-4 h-4 rounded-sm object-contain pointer-events-none"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Globe className="w-4 h-4 text-[var(--text-muted)]" />
                  )}

                  {/* Audio Playing Badge */}
                  {(tab.audioPlaying || tab.isMuted) && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMuteTab?.(tab.id);
                      }}
                      className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-zinc-800 text-[var(--accent-primary)] border border-zinc-700 shadow-sm hover:scale-110"
                      title={tab.isMuted ? 'Unmute Tab' : 'Mute Tab'}
                    >
                      {tab.isMuted ? (
                        <VolumeX className="w-2.5 h-2.5 text-rose-400" />
                      ) : (
                        <Volume2 className="w-2.5 h-2.5 animate-pulse" />
                      )}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Quick Pin / Unpin Button */}
        {onTogglePinActiveTab && (
          <div className="pt-2 border-t border-[var(--border-subtle)] w-full flex justify-center">
            <button
              type="button"
              onClick={onTogglePinActiveTab}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isCurrentTabPinned
                  ? 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-500/15'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              title={
                isCurrentTabPinned
                  ? 'Unpin Current Tab (Alt+P)'
                  : 'Pin Current Tab to Sidebar (Alt+P)'
              }
            >
              {isCurrentTabPinned ? (
                <PinOff className="w-3.5 h-3.5" />
              ) : (
                <Pin className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </aside>

      {/* Context Menu for Pinned Tab */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={closeMenu}
          onContextMenu={(e) => {
            e.preventDefault();
            closeMenu();
          }}
        >
          <div
            className="absolute rounded-xl shadow-2xl py-1.5 min-w-[170px] border text-xs"
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 150),
              left: contextMenu.x + 8,
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-card)',
              color: 'var(--text-main)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                onUnpinTab(contextMenu.tabId);
                closeMenu();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <PinOff className="w-3.5 h-3.5 text-amber-500" />
              <span>Unpin Tab</span>
            </button>

            {onReloadTab && (
              <button
                onClick={() => {
                  onReloadTab(contextMenu.tabId);
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Reload Tab</span>
              </button>
            )}

            {onToggleMuteTab && (
              <button
                onClick={() => {
                  onToggleMuteTab(contextMenu.tabId);
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Toggle Audio Mute</span>
              </button>
            )}

            {onCloseTab && (
              <>
                <div className="my-1 border-t border-[var(--border-subtle)]" />
                <button
                  onClick={() => {
                    onCloseTab(contextMenu.tabId);
                    closeMenu();
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center space-x-2 text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Close Tab</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
