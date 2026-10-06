import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Volume1,
  X,
  Bookmark,
  Check,
} from 'lucide-react';
import type { TabInfo } from '@/shared/types';
import type { ToastItem } from './Toast';

interface InlineVolumeBoosterProps {
  isOpen: boolean;
  onClose?: () => void;
  activeTab: TabInfo | null;
  domainVolumeBoost?: Record<string, number>;
  onShowToast?: (toast: Omit<ToastItem, 'id'>) => void;
}

const PRESETS = [100, 200, 300, 600];

export const InlineVolumeBooster: React.FC<InlineVolumeBoosterProps> = ({
  isOpen,
  onClose,
  activeTab,
  domainVolumeBoost,
  onShowToast,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentBoost = activeTab?.volumeBoost ?? 100;
  const [boost, setBoost] = useState<number>(currentBoost);

  // Derive active domain
  let hostname = '';
  if (activeTab?.url && activeTab.url.startsWith('http')) {
    try {
      hostname = new URL(activeTab.url).hostname;
    } catch {
      hostname = '';
    }
  }

  const isDomainSaved = hostname && domainVolumeBoost?.[hostname] !== undefined;
  const [rememberDomain, setRememberDomain] = useState<boolean>(!!isDomainSaved);

  useEffect(() => {
    if (activeTab) {
      setBoost(activeTab.volumeBoost ?? 100);
      if (hostname) {
        setRememberDomain(domainVolumeBoost?.[hostname] !== undefined);
      }
    }
  }, [activeTab?.id, activeTab?.volumeBoost, hostname, domainVolumeBoost]);

  // Click-outside and Escape handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !activeTab) return null;

  const handleBoostChange = (newVal: number, persistDomain = rememberDomain) => {
    const clamped = Math.max(0, Math.min(600, Math.round(newVal)));
    setBoost(clamped);
    if (clamped > 0 && activeTab.isMuted && window.browserApi?.toggleMuteTab) {
      window.browserApi.toggleMuteTab(activeTab.id);
    } else if (clamped === 0 && !activeTab.isMuted && window.browserApi?.toggleMuteTab) {
      window.browserApi.toggleMuteTab(activeTab.id);
    }
    if (window.browserApi?.setTabVolumeBoost) {
      window.browserApi.setTabVolumeBoost(activeTab.id, clamped, persistDomain);
    }
  };

  const handleRememberToggle = () => {
    const nextVal = !rememberDomain;
    setRememberDomain(nextVal);
    if (window.browserApi?.setTabVolumeBoost) {
      window.browserApi.setTabVolumeBoost(activeTab.id, boost, nextVal);
      if (nextVal && hostname) {
        onShowToast?.({
          type: 'success',
          message: `Saved ${boost}% volume boost for ${hostname}`,
        });
      }
    }
  };

  const getBoostColor = () => {
    if (boost === 0) return 'text-zinc-400';
    if (boost <= 100) return 'text-[var(--accent-primary)]';
    if (boost <= 250) return 'text-amber-400';
    if (boost <= 400) return 'text-orange-400';
    return 'text-rose-500 font-bold';
  };

  const getSliderTrackGradient = () => {
    const pct = (boost / 600) * 100;
    if (boost <= 100) {
      return `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${pct}%, rgba(128,128,128,0.2) ${pct}%, rgba(128,128,128,0.2) 100%)`;
    }
    if (boost <= 300) {
      return `linear-gradient(to right, var(--accent-primary) 0%, #f59e0b ${pct}%, rgba(128,128,128,0.2) ${pct}%, rgba(128,128,128,0.2) 100%)`;
    }
    return `linear-gradient(to right, var(--accent-primary) 0%, #f59e0b 50%, #f43f5e ${pct}%, rgba(128,128,128,0.2) ${pct}%, rgba(128,128,128,0.2) 100%)`;
  };

  return (
    <div
      ref={containerRef}
      className="flex items-center space-x-2 px-2 py-1 rounded-lg border shadow-sm select-none transition-all animate-in fade-in slide-in-from-right-2 duration-150"
      style={{
        backgroundColor: 'var(--bg-topbar)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      {/* Quick Mute/Unmute toggle button */}
      <button
        type="button"
        onClick={() => window.browserApi?.toggleMuteTab(activeTab.id)}
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          activeTab.isMuted
            ? 'text-rose-400 bg-rose-500/15 hover:bg-rose-500/25'
            : boost > 200
            ? 'text-amber-400 bg-amber-500/15 hover:bg-amber-500/25'
            : 'text-[var(--accent-primary)] hover:bg-black/5 dark:hover:bg-white/5'
        }`}
        title={activeTab.isMuted ? 'Unmute tab' : 'Mute tab'}
      >
        {activeTab.isMuted || boost === 0 ? (
          <VolumeX className="w-3.5 h-3.5 text-rose-400" />
        ) : boost > 200 ? (
          <Volume2 className="w-3.5 h-3.5" />
        ) : (
          <Volume1 className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Slider */}
      <div className="flex items-center space-x-1.5">
        <input
          type="range"
          min="0"
          max="600"
          step="5"
          value={boost}
          onChange={(e) => handleBoostChange(Number(e.target.value))}
          className="w-20 sm:w-24 md:w-28 h-1.5 rounded-lg appearance-none cursor-pointer transition-all focus:outline-none"
          style={{ background: getSliderTrackGradient() }}
          title={`Volume: ${boost}%`}
        />
        <span className={`text-[11px] font-mono w-10 text-right leading-none ${getBoostColor()}`}>
          {boost}%
        </span>
      </div>

      {/* Quick preset buttons */}
      <div className="hidden sm:flex items-center space-x-1">
        {PRESETS.map((val) => {
          const isActive = boost === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => handleBoostChange(val)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {val === 600 ? 'MAX' : `${val}%`}
            </button>
          );
        })}
      </div>

      {/* Remember domain toggle */}
      {hostname && (
        <button
          type="button"
          onClick={handleRememberToggle}
          className={`p-1 rounded transition-colors cursor-pointer ${
            rememberDomain
              ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title={rememberDomain ? `Saved for ${hostname} (click to forget)` : `Save ${boost}% for ${hostname}`}
        >
          <Bookmark className="w-3 h-3" />
        </button>
      )}

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        title="Close volume slider (Escape)"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
