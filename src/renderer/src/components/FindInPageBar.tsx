import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import type { FindResult } from '@/shared/types';
import type { ThemeMode } from '../App';

interface FindInPageBarProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
}

export const FindInPageBar: React.FC<FindInPageBarProps> = ({
  isOpen,
  onClose,
  theme,
}) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<FindResult>({ activeMatchOrdinal: 0, numberOfMatches: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.browserApi?.setFindOpen) {
      window.browserApi.setFindOpen(isOpen);
    }
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setResult({ activeMatchOrdinal: 0, numberOfMatches: 0 });
      if (window.browserApi?.stopFindInPage) {
        window.browserApi.stopFindInPage('clearSelection');
      }
    }
  }, [isOpen]);

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      if (window.browserApi?.setFindOpen) {
        window.browserApi.setFindOpen(false);
      }
      if (window.browserApi?.stopFindInPage) {
        window.browserApi.stopFindInPage('clearSelection');
      }
    };
  }, []);

  // Subscribe to find results
  useEffect(() => {
    if (window.browserApi?.onFindResult) {
      return window.browserApi.onFindResult((findRes) => {
        setResult(findRes);
      });
    }
  }, []);

  // Keyboard navigation inside find bar
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (!query.trim()) return;
      if (e.shiftKey) {
        // Previous match
        window.browserApi.findInPage(query, false, true);
      } else {
        // Next match
        window.browserApi.findInPage(query, true, true);
      }
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResult({ activeMatchOrdinal: 0, numberOfMatches: 0 });
      window.browserApi.stopFindInPage('clearSelection');
    } else {
      window.browserApi.findInPage(val, true, false);
    }
  };

  const handleNext = () => {
    if (!query.trim()) return;
    window.browserApi.findInPage(query, true, true);
  };

  const handlePrev = () => {
    if (!query.trim()) return;
    window.browserApi.findInPage(query, false, true);
  };

  if (!isOpen) return null;

  return (
    <div
      className="h-9 w-full flex items-center justify-end px-3 border-b text-xs transition-colors duration-150 z-30 select-none flex-shrink-0"
      style={{
        backgroundColor: 'var(--bg-topbar)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      <div
        className="flex items-center space-x-1.5 p-1 px-2 rounded-lg border shadow-xs"
        style={{
          backgroundColor: 'var(--bg-app)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <Search className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find in page..."
          className="w-44 h-6 text-xs px-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--border-selected)]"
        />

        {/* Match count */}
        <span className="text-[10px] font-mono text-[var(--text-muted)] min-w-[3.2rem] text-center">
          {query.trim() ? (
            result.numberOfMatches > 0 ? (
              `${result.activeMatchOrdinal} of ${result.numberOfMatches}`
            ) : (
              '0 of 0'
            )
          ) : (
            '—'
          )}
        </span>

        {/* Match Navigation Buttons */}
        <button
          onClick={handlePrev}
          disabled={!query.trim() || result.numberOfMatches === 0}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer disabled:cursor-default"
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleNext}
          disabled={!query.trim() || result.numberOfMatches === 0}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer disabled:cursor-default"
          title="Next match (Enter)"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onClose}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer ml-1"
          title="Close (Escape)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
