import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  FolderOpen,
  FileText,
  Pause,
  Play,
  X,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Settings,
  FileArchive,
  Image,
  Film,
  Music,
  FileCode,
  Search,
} from 'lucide-react';
import type { DownloadItemInfo } from '@/shared/types';

interface DownloadsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettingsToDownloads: () => void;
  onShowToast?: (toast: { type: 'success' | 'info' | 'warning' | 'danger'; message: string }) => void;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const clampedI = Math.min(i, sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, clampedI)).toFixed(dm)) + ' ' + sizes[clampedI];
}

export function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['zip', 'tar', 'gz', '7z', 'rar', 'pacman', 'deb', 'rpm', 'appimage'].includes(ext)) {
    return <FileArchive className="w-4 h-4 text-amber-500" />;
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext)) {
    return <Image className="w-4 h-4 text-blue-500" />;
  }
  if (['mp4', 'webm', 'mkv', 'avi', 'mov'].includes(ext)) {
    return <Film className="w-4 h-4 text-purple-500" />;
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
    return <Music className="w-4 h-4 text-rose-500" />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'py', 'rs', 'go', 'c', 'cpp'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-emerald-500" />;
  }
  return <FileText className="w-4 h-4 text-zinc-400" />;
}

export const DownloadsPopover: React.FC<DownloadsPopoverProps> = ({
  isOpen,
  onClose,
  onOpenSettingsToDownloads,
  onShowToast,
}) => {
  const [downloads, setDownloads] = useState<DownloadItemInfo[]>([]);
  const [filter, setFilter] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const loadDownloads = async () => {
    if (window.browserApi?.getDownloads) {
      try {
        const items = await window.browserApi.getDownloads();
        setDownloads(items || []);
      } catch (err) {
        console.warn('Failed to load downloads:', err);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDownloads();
    } else {
      setFilter('');
    }
  }, [isOpen]);

  // Subscribe to live download progress events
  useEffect(() => {
    if (!window.browserApi) return;

    const unsubStart = window.browserApi.onDownloadStarted?.((item) => {
      setDownloads((prev) => {
        const filtered = prev.filter((d) => d.id !== item.id);
        return [item, ...filtered];
      });
    });

    const unsubProgress = window.browserApi.onDownloadProgress?.((item) => {
      setDownloads((prev) => {
        const idx = prev.findIndex((d) => d.id === item.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = item;
          return updated;
        }
        return [item, ...prev];
      });
    });

    const unsubDone = window.browserApi.onDownloadDone?.((item) => {
      setDownloads((prev) => {
        const idx = prev.findIndex((d) => d.id === item.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = item;
          return updated;
        }
        return [item, ...prev];
      });
    });

    return () => {
      unsubStart?.();
      unsubProgress?.();
      unsubDone?.();
    };
  }, []);

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

  const activeDownloads = downloads.filter((d) => d.state === 'progressing' || d.state === 'paused');
  const pastDownloads = downloads.filter((d) => d.state !== 'progressing' && d.state !== 'paused');

  const filteredPastDownloads = pastDownloads.filter(
    (d) =>
      d.filename.toLowerCase().includes(filter.toLowerCase()) ||
      (d.savePath && d.savePath.toLowerCase().includes(filter.toLowerCase()))
  );

  const handlePause = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await window.browserApi.pauseDownload(id);
  };

  const handleResume = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await window.browserApi.resumeDownload(id);
  };

  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await window.browserApi.cancelDownload(id);
  };

  const handleOpenFile = async (id: string, filename: string) => {
    const success = await window.browserApi.openDownloadFile(id);
    if (!success) {
      onShowToast?.({
        type: 'warning',
        message: `File could not be opened: ${filename}`,
      });
    }
  };

  const handleShowInFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await window.browserApi.showDownloadInFolder(id);
  };

  const handleClearFinished = async () => {
    await window.browserApi.clearDownloads();
    setDownloads((prev) => prev.filter((d) => d.state === 'progressing' || d.state === 'paused'));
    onShowToast?.({
      type: 'info',
      message: 'Cleared download history',
    });
  };

  const handleOpenDefaultFolder = async () => {
    await window.browserApi.showDownloadInFolder('');
  };

  return (
    <div
      ref={popoverRef}
      className="fixed top-12 right-20 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl overflow-hidden animate-scale-up select-none flex flex-col max-h-[500px]"
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
          <Download className="w-4 h-4 text-[var(--accent-primary)]" />
          <span className="text-xs font-semibold tracking-tight">Downloads</span>
          {activeDownloads.length > 0 && (
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold animate-pulse"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
              }}
            >
              {activeDownloads.length} active
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {pastDownloads.length > 0 && (
            <button
              onClick={handleClearFinished}
              className="px-2 py-1 rounded-md text-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Clear finished downloads"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter bar if more than 3 past items */}
      {pastDownloads.length > 3 && (
        <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="relative flex items-center">
            <Search className="w-3 h-3 absolute left-2.5 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search downloads..."
              className="w-full h-6 pl-7 pr-2 rounded-md text-[11px] bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--border-selected)] transition-colors"
            />
          </div>
        </div>
      )}

      {/* Download Items List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1.5">
        {/* Active Downloads Section */}
        {activeDownloads.length > 0 && (
          <div className="space-y-1.5 mb-2">
            <div className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Downloading
            </div>
            {activeDownloads.map((item) => {
              const percent = item.totalBytes > 0 ? Math.round((item.receivedBytes / item.totalBytes) * 100) : 0;
              const isPaused = item.state === 'paused';
              return (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl border space-y-1.5 transition-all"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-card)',
                  }}
                >
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      {getFileIcon(item.filename)}
                      <span className="text-xs font-medium truncate" title={item.filename}>
                        {item.filename}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {isPaused ? (
                        <button
                          onClick={(e) => handleResume(item.id, e)}
                          className="p-1 rounded text-emerald-500 hover:bg-emerald-500/10 cursor-pointer transition-colors"
                          title="Resume download"
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handlePause(item.id, e)}
                          className="p-1 rounded text-amber-500 hover:bg-amber-500/10 cursor-pointer transition-colors"
                          title="Pause download"
                        >
                          <Pause className="w-3 h-3 fill-current" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleCancel(item.id, e)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                        title="Cancel download"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${Math.max(4, percent)}%`,
                        backgroundColor: isPaused ? 'var(--text-muted)' : 'var(--accent-primary)',
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
                    <span>
                      {formatBytes(item.receivedBytes)} of {item.totalBytes > 0 ? formatBytes(item.totalBytes) : 'Unknown'}
                    </span>
                    <span>{isPaused ? 'Paused' : `${percent}%`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Past Downloads Section */}
        {filteredPastDownloads.length > 0 && (
          <div className="space-y-1">
            {activeDownloads.length > 0 && (
              <div className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Completed
              </div>
            )}
            {filteredPastDownloads.map((item) => {
              const isCompleted = item.state === 'completed';
              const isCancelled = item.state === 'cancelled';
              return (
                <div
                  key={item.id}
                  onClick={() => isCompleted && handleOpenFile(item.id, item.filename)}
                  className={`group p-2 rounded-xl flex items-center justify-between space-x-2 transition-colors border ${
                    isCompleted
                      ? 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer'
                      : 'opacity-60 cursor-default'
                  }`}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                  title={isCompleted ? `Open ${item.filename}` : `Download ${item.state}`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <div className="shrink-0">{getFileIcon(item.filename)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{item.filename}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono flex items-center space-x-1.5">
                        <span>{formatBytes(item.totalBytes || item.receivedBytes)}</span>
                        <span>•</span>
                        {isCompleted ? (
                          <span className="text-emerald-500 font-sans flex items-center space-x-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5 inline" />
                            <span>Done</span>
                          </span>
                        ) : isCancelled ? (
                          <span className="text-[var(--text-muted)] font-sans">Cancelled</span>
                        ) : (
                          <span className="text-rose-500 font-sans flex items-center space-x-0.5">
                            <AlertCircle className="w-2.5 h-2.5 inline" />
                            <span>Interrupted</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleShowInFolder(item.id, e)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                      title="Show in folder"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {downloads.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-[var(--text-muted)]">
            <Download className="w-8 h-8 opacity-40 stroke-1" />
            <div className="text-xs font-medium">No downloads yet</div>
            <p className="text-[11px] max-w-[200px] opacity-70">
              Files you download while browsing will be listed here.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-2 border-t flex items-center justify-between text-[11px] text-[var(--text-muted)]"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <button
          onClick={handleOpenDefaultFolder}
          className="flex items-center space-x-1.5 hover:text-[var(--text-main)] transition-colors cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Open downloads folder</span>
        </button>

        <button
          onClick={() => {
            onClose();
            onOpenSettingsToDownloads();
          }}
          className="p-1 rounded hover:text-[var(--text-main)] transition-colors cursor-pointer"
          title="Download Settings (Ctrl+J)"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
