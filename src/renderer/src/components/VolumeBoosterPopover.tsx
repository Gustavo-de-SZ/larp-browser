import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Volume1,
  X,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import type { TabInfo } from '@/shared/types';
import type { ToastItem } from './Toast';

interface VolumeBoosterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabInfo | null;
  domainVolumeBoost?: Record<string, number>;
  onShowToast?: (toast: Omit<ToastItem, 'id'>) => void;
}

const PRESETS = [
  { label: '0%', value: 0 },
  { label: '100%', value: 100 },
  { label: '150%', value: 150 },
  { label: '200%', value: 200 },
  { label: '300%', value: 300 },
  { label: '600%', value: 600 },
];

export const VolumeBoosterPopover: React.FC<VolumeBoosterPopoverProps> = ({
  isOpen,
  onClose,
  activeTab,
  domainVolumeBoost,
  onShowToast,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
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

  // Sync state when tab or active status changes
  useEffect(() => {
    if (activeTab) {
      setBoost(activeTab.volumeBoost ?? 100);
      if (hostname) {
        setRememberDomain(domainVolumeBoost?.[hostname] !== undefined);
      }
    }
  }, [activeTab?.id, activeTab?.volumeBoost, hostname, domainVolumeBoost]);

  // Click-outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
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
    if (window.browserApi?.setTabVolumeBoost) {
      window.browserApi.setTabVolumeBoost(activeTab.id, clamped, persistDomain);
    }
  };

  const handleRememberToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setRememberDomain(checked);
    if (window.browserApi?.setTabVolumeBoost) {
      window.browserApi.setTabVolumeBoost(activeTab.id, boost, checked);
      if (checked && hostname) {
        onShowToast?.({
          type: 'success',
          message: `Saved ${boost}% volume boost for ${hostname}`,
        });
      }
    }
  };

  const getBoostLabel = () => {
    if (boost === 0) return 'Muted';
    if (boost === 100) return 'Standard (100%)';
    if (boost < 100) return `Quiet (${boost}%)`;
    if (boost <= 200) return `Boosted (+${boost - 100}%)`;
    if (boost <= 350) return `High Boost (+${boost - 100}%)`;
    return `Max Amplification (+${boost - 100}%)`;
  };

  const getBoostColor = () => {
    if (boost === 0) return 'text-zinc-400';
    if (boost <= 100) return 'text-[var(--accent-primary)]';
    if (boost <= 250) return 'text-amber-400';
    if (boost <= 400) return 'text-orange-400';
    return 'text-rose-500';
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
      ref={popoverRef}
      className="fixed top-12 right-24 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl overflow-hidden animate-scale-up select-none flex flex-col"
      style={{
        backgroundColor: 'var(--bg-app)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center space-x-2">
          {boost === 0 ? (
            <VolumeX className="w-4 h-4 text-zinc-400" />
          ) : boost > 200 ? (
            <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
          ) : (
            <Volume1 className="w-4 h-4 text-[var(--accent-primary)]" />
          )}
          <span className="text-xs font-semibold tracking-tight">Volume Booster</span>

          {activeTab.audioPlaying ? (
            <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Playing</span>
            </span>
          ) : activeTab.isMuted ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
              Muted
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] text-[var(--text-muted)] bg-black/5 dark:bg-white/5">
              Ready
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Controls Section */}
      <div className="p-4 space-y-4">
        {/* Big Display Badge */}
        <div
          className="flex items-center justify-between p-3 rounded-xl border"
          style={{
            backgroundColor: 'rgba(128, 128, 128, 0.04)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div>
            <div className={`text-2xl font-black font-mono tracking-tight ${getBoostColor()}`}>
              {boost}%
            </div>
            <div className="text-[11px] font-medium text-[var(--text-muted)] flex items-center space-x-1 mt-0.5">
              <span>{getBoostLabel()}</span>
            </div>
          </div>

          {boost !== 100 && (
            <button
              onClick={() => handleBoostChange(100)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
              title="Reset volume to 100%"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Slider & Range Marks */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
            <span>0%</span>
            <span className="font-semibold text-[var(--text-main)]">100%</span>
            <span>300%</span>
            <span>600%</span>
          </div>

          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max="600"
              step="5"
              value={boost}
              onChange={(e) => handleBoostChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)] focus:outline-none transition-all"
              style={{
                background: getSliderTrackGradient(),
              }}
            />
          </div>
        </div>

        {/* Quick Presets Grid */}
        <div className="grid grid-cols-6 gap-1.5 pt-1">
          {PRESETS.map((preset) => {
            const isSelected = boost === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => handleBoostChange(preset.value)}
                className={`py-1.5 text-center rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer border ${
                  isSelected
                    ? 'border-[var(--accent-primary)] shadow-sm'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: isSelected
                    ? 'var(--accent-primary)'
                    : 'rgba(128, 128, 128, 0.05)',
                  borderColor: isSelected
                    ? 'var(--accent-primary)'
                    : 'var(--border-subtle)',
                  color: isSelected ? 'var(--text-on-accent)' : 'var(--text-main)',
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Domain Persistence Toggle */}
        {hostname && (
          <label className="flex items-center space-x-2 pt-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberDomain}
              onChange={handleRememberToggle}
              className="w-3.5 h-3.5 rounded border-[var(--border-subtle)] accent-[var(--accent-primary)] cursor-pointer"
            />
            <span className="truncate">
              Remember for <span className="font-semibold text-[var(--text-main)]">{hostname}</span>
            </span>
          </label>
        )}
      </div>

      {/* Footer Info: Anti-Clipping Compressor */}
      <div
        className="px-4 py-2.5 border-t flex items-center space-x-2 text-[10px] text-[var(--text-muted)]"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'rgba(128, 128, 128, 0.03)',
        }}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="leading-tight">
          Anti-clipping limiter active to prevent sound distortion at high volumes.
        </span>
      </div>
    </div>
  );
};
