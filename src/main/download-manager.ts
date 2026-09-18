import { app, BrowserWindow, session, shell, dialog, DownloadItem } from 'electron';
import path from 'path';
import fs from 'fs';
import type { DownloadItemInfo, BrowserSettings } from '../shared/types';

export class DownloadManager {
  private window: BrowserWindow;
  private getSettings: () => BrowserSettings;
  private downloads: DownloadItemInfo[] = [];
  private activeItems: Map<string, DownloadItem> = new Map();
  private historyPath: string;

  constructor(window: BrowserWindow, getSettings: () => BrowserSettings) {
    this.window = window;
    this.getSettings = getSettings;
    this.historyPath = path.join(app.getPath('userData'), 'larp-downloads.json');

    this.loadHistory();
    this.initDownloadListener();
  }

  public setWindow(window: BrowserWindow) {
    this.window = window;
  }

  private loadHistory() {
    try {
      if (fs.existsSync(this.historyPath)) {
        const raw = fs.readFileSync(this.historyPath, 'utf8');
        const parsed: DownloadItemInfo[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // If app was closed during download, mark unfinished items as interrupted
          this.downloads = parsed.map((item) => ({
            ...item,
            state: item.state === 'progressing' || item.state === 'paused' ? 'interrupted' : item.state,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load downloads history:', err);
      this.downloads = [];
    }
  }

  private async saveHistory() {
    try {
      // Keep up to 500 records
      const trimmed = this.downloads.slice(0, 500);
      await fs.promises.writeFile(this.historyPath, JSON.stringify(trimmed, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save downloads history:', err);
    }
  }

  private getDownloadsDirectory(): string {
    const settings = this.getSettings();
    if (settings.downloadsPath && fs.existsSync(settings.downloadsPath)) {
      return settings.downloadsPath;
    }
    return app.getPath('downloads');
  }

  private initDownloadListener() {
    session.defaultSession.on('will-download', (_event, item) => {
      const id = 'dl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      const settings = this.getSettings();

      // If user enabled "Always ask where to save each file", let Electron prompt natively
      if (!settings.askDownloadLocation) {
        const dir = this.getDownloadsDirectory();
        try {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        } catch (err) {
          console.warn('Failed to ensure downloads folder exists:', err);
        }

        const filename = item.getFilename();
        let targetPath = path.join(dir, filename);
        let counter = 1;
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);

        while (fs.existsSync(targetPath)) {
          targetPath = path.join(dir, `${base} (${counter})${ext}`);
          counter++;
        }

        item.setSavePath(targetPath);
      }

      const info: DownloadItemInfo = {
        id,
        filename: item.getFilename(),
        savePath: item.getSavePath(),
        totalBytes: item.getTotalBytes(),
        receivedBytes: item.getReceivedBytes(),
        state: 'progressing',
        url: item.getURL(),
        mimeType: item.getMimeType(),
        startTime: Date.now(),
        paused: item.isPaused(),
        canResume: item.canResume(),
      };

      this.activeItems.set(id, item);
      this.downloads.unshift(info);
      this.broadcast('browser:download-started', info);

      item.on('updated', (_e, state) => {
        info.receivedBytes = item.getReceivedBytes();
        info.totalBytes = item.getTotalBytes();
        info.savePath = item.getSavePath();
        info.canResume = item.canResume();
        info.paused = item.isPaused();

        if (state === 'interrupted') {
          info.state = 'interrupted';
        } else if (state === 'progressing') {
          info.state = item.isPaused() ? 'paused' : 'progressing';
        }

        this.broadcast('browser:download-progress', info);
      });

      item.once('done', (_e, state) => {
        info.state = state;
        info.endTime = Date.now();
        info.savePath = item.getSavePath();
        info.receivedBytes = item.getReceivedBytes();
        if (info.totalBytes <= 0) {
          info.totalBytes = item.getReceivedBytes();
        }

        this.activeItems.delete(id);
        this.saveHistory();
        this.broadcast('browser:download-done', info);
      });
    });
  }

  private broadcast(channel: string, payload: any) {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, payload);
    }
  }

  public async getDownloads(): Promise<DownloadItemInfo[]> {
    return [...this.downloads];
  }

  public async pauseDownload(id: string): Promise<boolean> {
    const item = this.activeItems.get(id);
    if (item && !item.isPaused()) {
      item.pause();
      return true;
    }
    return false;
  }

  public async resumeDownload(id: string): Promise<boolean> {
    const item = this.activeItems.get(id);
    if (item && item.canResume()) {
      item.resume();
      return true;
    }
    return false;
  }

  public async cancelDownload(id: string): Promise<boolean> {
    const item = this.activeItems.get(id);
    if (item) {
      item.cancel();
      this.activeItems.delete(id);
      return true;
    }
    return false;
  }

  public async openDownloadFile(id: string): Promise<boolean> {
    const info = this.downloads.find((d) => d.id === id);
    if (info && info.savePath && fs.existsSync(info.savePath)) {
      const err = await shell.openPath(info.savePath);
      return !err;
    }
    return false;
  }

  public async showDownloadInFolder(id: string): Promise<boolean> {
    const info = this.downloads.find((d) => d.id === id);
    if (info && info.savePath) {
      if (fs.existsSync(info.savePath)) {
        shell.showItemInFolder(info.savePath);
        return true;
      } else {
        // Fallback to opening folder itself if file moved/deleted
        const dir = path.dirname(info.savePath);
        if (fs.existsSync(dir)) {
          shell.openPath(dir);
          return true;
        }
      }
    }
    // Fallback to default downloads directory
    shell.openPath(this.getDownloadsDirectory());
    return true;
  }

  public async clearDownloads(): Promise<void> {
    // Only clear finished/interrupted/cancelled downloads, keep currently active
    this.downloads = this.downloads.filter((d) => this.activeItems.has(d.id));
    await this.saveHistory();
  }

  public async deleteDownloadItem(id: string): Promise<void> {
    const active = this.activeItems.get(id);
    if (active) {
      active.cancel();
      this.activeItems.delete(id);
    }
    this.downloads = this.downloads.filter((d) => d.id !== id);
    await this.saveHistory();
  }

  public async selectDownloadDirectory(): Promise<string | null> {
    const result = await dialog.showOpenDialog(this.window, {
      title: 'Select Default Downloads Folder',
      defaultPath: this.getDownloadsDirectory(),
      properties: ['openDirectory', 'createDirectory'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  }
}
