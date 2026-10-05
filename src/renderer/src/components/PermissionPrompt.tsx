import React, { useState } from 'react';
import { Camera, Mic, Video, Bell, MapPin, Clipboard, ShieldAlert, X } from 'lucide-react';
import type { SitePermissionRequest } from '@/shared/types';
import type { ThemeMode } from '../App';

interface PermissionPromptProps {
  request: SitePermissionRequest | null;
  onRespond: (id: string, decision: 'allow' | 'deny' | 'dismiss', remember: boolean) => void;
  theme: ThemeMode;
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
          icon: <Video className="w-5 h-5 text-indigo-400" />,
          title: 'Camera & Microphone',
          description: 'wants to use your camera and microphone',
        };
      }
      if (hasVideo) {
        return {
          icon: <Camera className="w-5 h-5 text-sky-400" />,
          title: 'Camera Access',
          description: 'wants to use your camera',
        };
      }
      if (hasAudio) {
        return {
          icon: <Mic className="w-5 h-5 text-rose-400" />,
          title: 'Microphone Access',
          description: 'wants to use your microphone',
        };
      }
      return {
        icon: <Video className="w-5 h-5 text-indigo-400" />,
        title: 'Media Devices',
        description: 'wants to access media devices',
      };
    }

    if (permission === 'notifications') {
      return {
        icon: <Bell className="w-5 h-5 text-amber-400" />,
        title: 'Notifications',
        description: 'wants to show notifications',
      };
    }

    if (permission === 'geolocation') {
      return {
        icon: <MapPin className="w-5 h-5 text-emerald-400" />,
        title: 'Location Access',
        description: 'wants to know your location',
      };
    }

    if (permission.startsWith('clipboard')) {
      return {
        icon: <Clipboard className="w-5 h-5 text-purple-400" />,
        title: 'Clipboard Access',
        description: 'wants to read your clipboard',
      };
    }

    return {
      icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
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
    <div className="fixed top-14 left-8 z-50 select-none animate-in fade-in slide-in-from-top-2 duration-150">
      <div
        className="w-80 rounded-2xl shadow-2xl border p-4 backdrop-blur-md transition-colors"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-card)',
          color: 'var(--text-main)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center space-x-3">
            <div
              className="p-2 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {details.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate leading-tight">
                {formattedOrigin}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
                {details.description}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onRespond(request.id, 'dismiss', false)}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Remember choice toggle */}
        <div className="mb-3.5 px-0.5">
          <label className="flex items-center space-x-2 text-[11px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-main)] transition-colors">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded accent-[var(--accent-primary)] cursor-pointer w-3.5 h-3.5"
            />
            <span>Remember this decision</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-1">
          <button
            type="button"
            onClick={() => onRespond(request.id, 'deny', remember)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            Block
          </button>
          <button
            type="button"
            onClick={() => onRespond(request.id, 'allow', remember)}
            className="px-4 py-1.5 rounded-xl text-xs font-medium text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: 'var(--accent-primary)',
            }}
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
};
