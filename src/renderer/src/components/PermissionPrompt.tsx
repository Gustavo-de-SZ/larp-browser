import React, { useState } from 'react';
import { Camera, Mic, Video, Bell, MapPin, Clipboard, ShieldAlert, X } from 'lucide-react';
import type { SitePermissionRequest } from '@/shared/types';
import type { ThemeMode } from '../App';

interface PermissionPromptProps {
  request: SitePermissionRequest | null;
  onRespond: (id: string, decision: 'allow' | 'deny' | 'dismiss', remember: boolean) => void;
  theme?: ThemeMode;
}

export const PermissionPrompt: React.FC<PermissionPromptProps> = ({
  request,
  onRespond,
}) => {
  const [remember, setRemember] = useState(true);

  if (!request) return null;

  const getPermissionDetails = () => {
    const { permission, mediaTypes } = request;

    if (permission === 'media') {
      const hasVideo = mediaTypes?.includes('video');
      const hasAudio = mediaTypes?.includes('audio');

      if (hasVideo && hasAudio) {
        return {
          icon: <Video className="w-3.5 h-3.5 text-indigo-400" />,
          title: 'Camera & Microphone',
          description: 'wants to use your camera and microphone',
        };
      }
      if (hasVideo) {
        return {
          icon: <Camera className="w-3.5 h-3.5 text-sky-400" />,
          title: 'Camera Access',
          description: 'wants to use your camera',
        };
      }
      if (hasAudio) {
        return {
          icon: <Mic className="w-3.5 h-3.5 text-rose-400" />,
          title: 'Microphone Access',
          description: 'wants to use your microphone',
        };
      }
      return {
        icon: <Video className="w-3.5 h-3.5 text-indigo-400" />,
        title: 'Media Devices',
        description: 'wants to access media devices',
      };
    }

    if (permission === 'notifications') {
      return {
        icon: <Bell className="w-3.5 h-3.5 text-amber-400" />,
        title: 'Notifications',
        description: 'wants to show notifications',
      };
    }

    if (permission === 'geolocation') {
      return {
        icon: <MapPin className="w-3.5 h-3.5 text-emerald-400" />,
        title: 'Location Access',
        description: 'wants to know your location',
      };
    }

    if (permission.startsWith('clipboard')) {
      return {
        icon: <Clipboard className="w-3.5 h-3.5 text-purple-400" />,
        title: 'Clipboard Access',
        description: 'wants to read your clipboard',
      };
    }

    return {
      icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
      title: 'Site Permission',
      description: `wants to use ${permission}`,
    };
  };

  const details = getPermissionDetails();

  let formattedOrigin = request.origin;
  try {
    formattedOrigin = new URL(request.origin).hostname;
  } catch {
    // Keep raw
  }

  return (
    <div
      className="h-[38px] w-full flex items-center justify-between px-3 border-b text-xs transition-colors duration-150 z-30 select-none flex-shrink-0 animate-in fade-in slide-in-from-top-1 duration-150"
      style={{
        backgroundColor: 'var(--bg-topbar)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      {/* Left: Icon, Origin, Action Text */}
      <div className="flex items-center space-x-2 min-w-0 overflow-hidden mr-3">
        <div
          className="p-1 rounded-md flex items-center justify-center shrink-0 border"
          style={{
            backgroundColor: 'var(--bg-app)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {details.icon}
        </div>
        <div className="flex items-center space-x-1.5 min-w-0 truncate text-[11px]">
          <span className="font-semibold text-[var(--text-main)] truncate max-w-[180px]">
            {formattedOrigin}
          </span>
          <span className="text-[var(--text-muted)] truncate">
            {details.description}
          </span>
        </div>
      </div>

      {/* Right: Remember checkbox, Block, Allow, Dismiss */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        <label className="flex items-center space-x-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer mr-1">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="rounded accent-[var(--accent-primary)] cursor-pointer w-3.5 h-3.5"
          />
          <span>Remember</span>
        </label>

        <button
          type="button"
          onClick={() => onRespond(request.id, 'deny', remember)}
          className="px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          Block
        </button>

        <button
          type="button"
          onClick={() => onRespond(request.id, 'allow', remember)}
          className="px-3 py-1 rounded-md text-xs font-medium shadow-xs transition-all hover:opacity-90 active:scale-95 cursor-pointer"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--text-on-accent, #ffffff)',
          }}
        >
          Allow
        </button>

        <button
          type="button"
          onClick={() => onRespond(request.id, 'dismiss', false)}
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer ml-0.5"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
