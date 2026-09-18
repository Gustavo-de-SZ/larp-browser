import React, { useState, useEffect, useRef } from 'react';
import {
  Star,
  Globe,
  ExternalLink,
  Trash2,
  X,
  Search,
  Plus,
  SlidersHorizontal,
  Bookmark,
} from 'lucide-react';
import type { BrowserState, BookmarkItem } from '@/shared/types';
import type { ThemeMode } from '../App';

interface QuickFavoritesPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  state: BrowserState;
  theme: ThemeMode;
  onOpenSettingsToBookmarks: () => void;
  onShowToast?: (toast: { type: 'success' | 'info' | 'warning' | 'danger'; message: string }) => void;
}

export const QuickFavoritesPopover: React.FC<QuickFavoritesPopoverProps> = ({
  isOpen,
  onClose,
  state,
  theme,
  onOpenSettingsToBookmarks,
  onShowToast,
}) => {
  const [filter, setFilter] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const isCurrentPageBookmarked =
    activeTab && activeTab.url && activeTab.url !== 'about:blank'
      ? state.bookmarks?.some((b) => b.url === activeTab.url)
      : false;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setFilter('');
    }
  }, [isOpen]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const bookmarks = state.bookmarks || [];
  const filteredBookmarks = bookmarks.filter(
    (b) =>
      b.title.toLowerCase().includes(filter.toLowerCase()) ||
      b.url.toLowerCase().includes(filter.toLowerCase())
  );

  const handleBookmarkCurrentPage = () => {
    if (!activeTab || !activeTab.url || activeTab.url === 'about:blank') return;
    const willAdd = !isCurrentPageBookmarked;
    window.browserApi.toggleBookmark({
      title: activeTab.title || activeTab.url,
      url: activeTab.url,
      favicon: activeTab.favicon,
    });
    onShowToast?.({
      type: willAdd ? 'success' : 'info',
      message: willAdd ? 'Saved to Bookmarks' : 'Removed from Bookmarks',
    });
  };

  const handleToggleBookmarksBar = () => {
    const current = state.settings?.showBookmarksBar || false;
    window.browserApi.updateSettings({ showBookmarksBar: !current });
  };

  return (
    <div
      ref={popoverRef}
      className="fixed top-12 right-16 z-50 w-84 max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl overflow-hidden animate-scale-up select-none flex flex-col max-h-[460px]"
      style={{
        backgroundColor: 'var(--bg-app)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      {/* Header */}
      <div
        className="p-3 px-4 border-b flex items-center justify-between flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center space-x-2">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-xs font-semibold tracking-tight text-[var(--text-main)]">
            Favorites
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-black/5 dark:bg-white/5 text-[var(--text-muted)]">
            {bookmarks.length}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleToggleBookmarksBar}
            className={`p-1 rounded-md text-[10px] transition-colors cursor-pointer border ${
              state.settings?.showBookmarksBar
                ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/40 text-[var(--accent-primary)]'
                : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Toggle Bookmarks Bar (Ctrl+Shift+B)"
          >
            Bar
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bookmark Current Page CTA */}
      {activeTab && activeTab.url && activeTab.url !== 'about:blank' && (
        <div
          className="p-2.5 px-4 border-b flex items-center justify-between flex-shrink-0 bg-black/[0.02] dark:bg-white/[0.02]"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="overflow-hidden mr-2">
            <div className="text-[11px] font-medium text-[var(--text-main)] truncate">
              {activeTab.title || 'Current Page'}
            </div>
            <div className="text-[9px] text-[var(--text-muted)] truncate font-mono">
              {activeTab.url}
            </div>
          </div>
          <button
            onClick={handleBookmarkCurrentPage}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 flex-shrink-0 cursor-pointer ${
              isCurrentPageBookmarked
                ? 'border border-[var(--border-subtle)] text-rose-400 hover:bg-rose-500/10'
                : 'text-[var(--text-on-accent)] shadow-xs hover:opacity-90 active:scale-95'
            }`}
            style={{
              backgroundColor: isCurrentPageBookmarked ? 'transparent' : 'var(--accent-primary)',
              color: isCurrentPageBookmarked ? undefined : 'var(--text-on-accent)',
            }}
          >
            <Star
              className={`w-3 h-3 ${isCurrentPageBookmarked ? 'fill-rose-400 text-rose-400' : ''}`}
            />
            <span>{isCurrentPageBookmarked ? 'Remove' : 'Favorite'}</span>
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="p-2 px-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="relative flex items-center">
          <Search className="w-3 h-3 absolute left-2.5 text-[var(--text-muted)] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search favorites..."
            className="w-full h-7 pl-7 pr-3 rounded-lg text-xs border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--border-selected)]"
          />
        </div>
      </div>

      {/* Bookmarks List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-[var(--border-subtle)]/50">
        {filteredBookmarks.length > 0 ? (
          filteredBookmarks.map((bm) => (
            <div
              key={bm.id}
              className="pt-1 first:pt-0 group flex items-center justify-between p-1.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <button
                onClick={() => {
                  if (activeTab) {
                    window.browserApi.navigateTab(activeTab.id, bm.url);
                    onClose();
                  }
                }}
                className="flex items-center space-x-2.5 overflow-hidden text-left flex-1 mr-2 cursor-pointer"
                title={`${bm.title}\n${bm.url}`}
              >
                <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 bg-black/5 dark:bg-white/5">
                  {bm.favicon ? (
                    <img src={bm.favicon} alt="" className="w-3.5 h-3.5 rounded-xs" />
                  ) : (
                    <Globe className="w-3 h-3 text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-xs font-medium text-[var(--text-main)] truncate">
                    {bm.title || bm.url}
                  </div>
                  <div className="text-[9px] text-[var(--text-muted)] truncate font-mono">
                    {bm.url}
                  </div>
                </div>
              </button>

              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    window.browserApi.createTab(bm.url);
                    onClose();
                  }}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    window.browserApi.removeBookmark(bm.id);
                    onShowToast?.({
                      type: 'info',
                      message: `Removed "${bm.title || bm.url}" from favorites`,
                    });
                  }}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Delete bookmark"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-[var(--text-muted)] space-y-1.5">
            <Bookmark className="w-5 h-5 mx-auto opacity-40" />
            <div className="text-xs font-medium text-[var(--text-main)]">
              {filter ? 'No favorites found' : 'No favorites yet'}
            </div>
            <p className="text-[10px]">
              Press <kbd className="px-1 py-0.2 rounded font-mono border">Ctrl+D</kbd> or click the star in the address bar to bookmark any website.
            </p>
          </div>
        )}
      </div>

      {/* Footer: Manage in Settings */}
      <div
        className="p-2 px-3 border-t flex items-center justify-between text-[11px] text-[var(--text-muted)] flex-shrink-0 bg-black/[0.01] dark:bg-white/[0.01]"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <span className="font-mono text-[9px]">Shortcut: Ctrl+B</span>
        <button
          onClick={() => {
            onClose();
            onOpenSettingsToBookmarks();
          }}
          className="font-medium hover:underline text-[var(--accent-primary)] cursor-pointer flex items-center space-x-1"
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>Manage All</span>
        </button>
      </div>
    </div>
  );
};
