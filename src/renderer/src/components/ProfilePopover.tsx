import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Check,
  Plus,
  Settings,
  X,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Layers,
  Bookmark,
  Key,
} from 'lucide-react';
import type { BrowserState, UserProfile } from '@/shared/types';
import type { ThemeMode } from '../App';

interface ProfilePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  state: BrowserState;
  theme: ThemeMode;
  onOpenSettingsToProfiles: () => void;
  onShowToast?: (toast: { type: 'success' | 'info' | 'warning' | 'danger'; message: string }) => void;
}

export const ProfilePopover: React.FC<ProfilePopoverProps> = ({
  isOpen,
  onClose,
  state,
  theme,
  onOpenSettingsToProfiles,
  onShowToast,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileColor, setNewProfileColor] = useState('#3b82f6');
  const [passwordsCount, setPasswordsCount] = useState<number>(0);

  const activeProfile =
    state.profiles?.find((p) => p.id === state.activeProfileId) ||
    state.profiles?.[0] || {
      id: 'default',
      name: 'Personal',
      color: '#6366f1',
      isDefault: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

  // Load password vault count for active profile stats
  useEffect(() => {
    if (isOpen && window.browserApi?.getPasswords) {
      window.browserApi
        .getPasswords()
        .then((items) => {
          if (items) setPasswordsCount(items.length);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Handle ESC and click outside
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

  const handleLinkGoogle = async () => {
    setIsDetecting(true);
    try {
      const detected = await window.browserApi.detectGoogleAccount();
      if (detected && detected.email) {
        await window.browserApi.linkGoogleAccount(detected as { email: string; name?: string; avatarUrl?: string });
        onShowToast?.({
          type: 'success',
          message: `Linked Google account: ${detected.email}`,
        });
      } else {
        // Offer to open Google login page in a tab
        onShowToast?.({
          type: 'info',
          message: 'No active Google tab found. Opening Google Sign-in...',
        });
        await window.browserApi.createTab('https://accounts.google.com');
        onClose();
      }
    } catch (err: any) {
      onShowToast?.({
        type: 'danger',
        message: err.message || 'Failed to link Google account',
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    try {
      await window.browserApi.saveProfile({
        id: activeProfile.id,
        email: '',
        avatarUrl: '',
      });
      onShowToast?.({
        type: 'info',
        message: 'Google account unlinked from this profile',
      });
    } catch (err: any) {
      onShowToast?.({
        type: 'danger',
        message: err.message || 'Failed to unlink account',
      });
    }
  };

  const handleSwitchProfile = async (profileId: string) => {
    if (profileId === activeProfile.id) return;
    try {
      await window.browserApi.setActiveProfile(profileId);
      const target = state.profiles?.find((p) => p.id === profileId);
      onShowToast?.({
        type: 'success',
        message: `Switched to ${target?.name || 'profile'}`,
      });
      onClose();
    } catch (err: any) {
      onShowToast?.({
        type: 'danger',
        message: err.message || 'Failed to switch profile',
      });
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    try {
      const created = await window.browserApi.saveProfile({
        name: newProfileName.trim(),
        color: newProfileColor,
      });
      setIsAddingProfile(false);
      setNewProfileName('');
      onShowToast?.({
        type: 'success',
        message: `Created profile "${created.name}"`,
      });
    } catch (err: any) {
      onShowToast?.({
        type: 'danger',
        message: err.message || 'Failed to create profile',
      });
    }
  };

  const PRESET_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

  return (
    <div
      ref={popoverRef}
      className="absolute top-[48px] right-3 w-80 rounded-2xl shadow-2xl border flex flex-col z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      style={{
        backgroundColor: 'var(--bg-modal)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      {/* Header Profile Identity Card */}
      <div
        className="p-4 border-b relative overflow-hidden"
        style={{
          borderColor: 'var(--border-subtle)',
          background: `linear-gradient(135deg, ${activeProfile.color}15, transparent 70%)`,
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center space-x-3.5">
          {/* Avatar Ring */}
          <div
            className="w-12 h-12 rounded-full p-0.5 flex-shrink-0 flex items-center justify-center shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${activeProfile.color}, ${activeProfile.color}88)`,
            }}
          >
            {activeProfile.avatarUrl ? (
              <img
                src={activeProfile.avatarUrl}
                alt={activeProfile.name}
                className="w-full h-full rounded-full object-cover bg-[var(--bg-card)]"
              />
            ) : (
              <div
                className="w-full h-full rounded-full flex items-center justify-center font-bold text-base text-white"
                style={{ backgroundColor: activeProfile.color }}
              >
                {activeProfile.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm truncate">{activeProfile.name}</span>
              {activeProfile.isDefault && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-medium bg-black/5 dark:bg-white/10 text-[var(--text-muted)]">
                  Default
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] truncate font-mono mt-0.5">
              {activeProfile.email || 'Local Profile'}
            </p>
          </div>
        </div>

        {/* Google Link Status / Action */}
        <div className="mt-3.5 pt-3 border-t border-[var(--border-subtle)]">
          {activeProfile.email ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-[11px] text-emerald-500 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">Google Account Linked</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={handleLinkGoogle}
                  disabled={isDetecting}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Re-sync Google account details"
                >
                  <RefreshCw className={`w-3 h-3 ${isDetecting ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleUnlinkGoogle}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Unlink Google account"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLinkGoogle}
              disabled={isDetecting}
              className="w-full py-2 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center space-x-2 text-xs font-medium text-[var(--text-main)] shadow-xs cursor-pointer"
            >
              {/* Google G Logo SVG */}
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isDetecting ? 'Detecting account...' : 'Link Active Google Account'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div
        className="grid grid-cols-3 divide-x py-2 px-1 text-center border-b text-xs"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'rgba(128, 128, 128, 0.02)',
        }}
      >
        <div className="py-1">
          <div className="font-semibold text-[var(--text-main)] flex items-center justify-center space-x-1">
            <Layers className="w-3 h-3 text-[var(--text-muted)]" />
            <span>{state.tabs.length}</span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Tabs</div>
        </div>
        <div className="py-1">
          <div className="font-semibold text-[var(--text-main)] flex items-center justify-center space-x-1">
            <Bookmark className="w-3 h-3 text-[var(--text-muted)]" />
            <span>{state.bookmarks.length}</span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Bookmarks</div>
        </div>
        <div className="py-1">
          <div className="font-semibold text-[var(--text-main)] flex items-center justify-center space-x-1">
            <Key className="w-3 h-3 text-[var(--text-muted)]" />
            <span>{passwordsCount}</span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Passwords</div>
        </div>
      </div>

      {/* Profile Switcher List */}
      <div className="p-3 max-h-52 overflow-y-auto space-y-1.5">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Switch Profile
          </span>
          <button
            type="button"
            onClick={() => setIsAddingProfile(!isAddingProfile)}
            className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>

        {/* Inline Add Profile Form */}
        {isAddingProfile && (
          <form
            onSubmit={handleCreateProfile}
            className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-2 mb-2 animate-in fade-in"
          >
            <div className="text-xs font-semibold">New Profile</div>
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="e.g. Work, School, Dev"
              className="w-full h-7 px-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:border-[var(--border-selected)]"
              autoFocus
            />
            <div className="flex items-center space-x-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewProfileColor(c)}
                  className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                    newProfileColor === c ? 'scale-125 ring-2 ring-white/50' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center justify-end space-x-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingProfile(false)}
                className="px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-2.5 py-1 rounded text-xs font-medium text-white shadow-xs cursor-pointer"
                style={{ backgroundColor: newProfileColor }}
              >
                Save
              </button>
            </div>
          </form>
        )}

        {state.profiles && state.profiles.length > 0 ? (
          state.profiles.map((p) => {
            const isActive = p.id === activeProfile.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSwitchProfile(p.id)}
                className={`w-full p-2 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                  isActive
                    ? 'border bg-[var(--bg-card)]'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                }`}
                style={{
                  borderColor: isActive ? p.color : 'transparent',
                }}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate text-[var(--text-main)]">{p.name}</div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate font-mono">
                      {p.email || (p.partition ? 'Isolated partition' : 'Default session')}
                    </div>
                  </div>
                </div>
                {isActive && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: p.color }} />}
              </button>
            );
          })
        ) : null}
      </div>

      {/* Footer Actions */}
      <div
        className="p-2.5 border-t flex items-center justify-between text-xs"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'rgba(128, 128, 128, 0.02)',
        }}
      >
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenSettingsToProfiles();
          }}
          className="flex items-center space-x-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Manage Profiles</span>
        </button>
        <span className="text-[10px] text-[var(--text-muted)] font-mono">
          {state.profiles?.length || 1} {state.profiles?.length === 1 ? 'profile' : 'profiles'}
        </span>
      </div>
    </div>
  );
};
