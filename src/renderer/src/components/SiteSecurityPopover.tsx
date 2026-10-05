import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Info,
  Trash2,
  RotateCw,
  X,
  Camera,
  Mic,
  Bell,
  MapPin,
  Lock,
} from 'lucide-react';
import type { SiteSecurityInfo, TabInfo } from '@/shared/types';
import type { ThemeMode } from '../App';
import type { ToastItem } from './Toast';

interface SiteSecurityPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabInfo | null;
  theme: ThemeMode;
  onShowToast: (toast: Omit<ToastItem, 'id'>) => void;
}

export const SiteSecurityPopover: React.FC<SiteSecurityPopoverProps> = ({
  isOpen,
  onClose,
  activeTab,
  onShowToast,
}) => {
  const [securityInfo, setSecurityInfo] = useState<SiteSecurityInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!isOpen || !activeTab) return;

    setLoading(true);
    window.browserApi
      .getSiteSecurityInfo(activeTab.id)
      .then((info) => {
        setSecurityInfo(info);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, activeTab?.id, activeTab?.url]);

  if (!isOpen || !activeTab) return null;

  const url = activeTab.url;
  const isInternal = !url || url.startsWith('about:') || url === 'about:blank';

  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  const handleClearCookies = async () => {
    if (!securityInfo?.origin) return;
    setIsClearing(true);
    try {
      const success = await window.browserApi.clearOriginData(securityInfo.origin);
      if (success) {
        onShowToast({
          type: 'success',
          message: `Cleared cookies and local storage for ${hostname}`,
        });
      } else {
        onShowToast({
          type: 'error',
          message: 'Could not clear site data',
        });
      }
    } catch {
      onShowToast({
        type: 'error',
        message: 'Failed to clear cookies',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handlePermissionChange = async (
    perm: string,
    val: 'allow' | 'deny' | 'ask'
  ) => {
    if (!securityInfo?.origin) return;
    await window.browserApi.setSitePermission(securityInfo.origin, perm, val);
    const updated = await window.browserApi.getSiteSecurityInfo(activeTab.id);
    if (updated) {
      setSecurityInfo(updated);
    }
    onShowToast({
      type: 'info',
      message: `Set ${perm} to ${val} for ${hostname}`,
    });
  };

  const handleReload = () => {
    window.browserApi.reloadTab(activeTab.id);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Popover Card */}
      <div
        className="fixed top-12 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-56 z-50 w-84 rounded-2xl shadow-2xl border p-4 select-none animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-card)',
          color: 'var(--text-main)',
        }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center space-x-2 min-w-0 pr-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-xs truncate">{hostname || 'Site Security'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Security Status Box */}
        <div className="py-3">
          {isInternal ? (
            <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-sky-400">Internal Page</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  This is a local browser shell page.
                </div>
              </div>
            </div>
          ) : securityInfo?.isSecure ? (
            <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-emerald-400">Connection is secure</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
                  Your information (passwords, messages, cookies) is encrypted and private.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-amber-400">Connection is not secure</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
                  You should not enter sensitive info (passwords, credit cards) on this site.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Permissions List */}
        {!isInternal && (
          <div className="py-2 border-t border-[var(--border-subtle)] space-y-2">
            <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Site Permissions
            </div>

            {[
              { id: 'camera', label: 'Camera', icon: Camera },
              { id: 'microphone', label: 'Microphone', icon: Mic },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'geolocation', label: 'Location', icon: MapPin },
            ].map(({ id, label, icon: Icon }) => {
              const currentVal = (securityInfo?.permissions?.[id] || 'ask') as 'allow' | 'deny' | 'ask';
              return (
                <div key={id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center space-x-2 text-[var(--text-main)]">
                    <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>{label}</span>
                  </div>
                  <select
                    value={currentVal}
                    onChange={(e) => handlePermissionChange(id, e.target.value as any)}
                    className="bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] rounded-lg px-2 py-0.5 text-[11px] text-[var(--text-main)] focus:outline-none cursor-pointer"
                  >
                    <option value="ask" className="bg-zinc-800 text-zinc-100">Ask (Default)</option>
                    <option value="allow" className="bg-zinc-800 text-zinc-100">Allow</option>
                    <option value="deny" className="bg-zinc-800 text-zinc-100">Block</option>
                  </select>
                </div>
              );
            })}
          </div>
        )}

        {/* Cookies & Site Data Section */}
        {!isInternal && (
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
            <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Cookies & Storage
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleClearCookies}
                disabled={isClearing}
                className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-xl border border-[var(--border-subtle)] text-xs text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearing ? 'Clearing...' : 'Clear Site Cookies'}</span>
              </button>

              <button
                type="button"
                onClick={handleReload}
                className="p-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Reload Tab"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
