import { app, BrowserWindow } from 'electron';
import type { UpdateCheckResult, UpdateAssetInfo } from '../shared/types';

export function compareSemver(v1: string, v2: string): number {
  const clean = (s: string) => s.replace(/^v/i, '').trim().split('-')[0];
  const parts1 = clean(v1).split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean(v2).split('.').map((p) => parseInt(p, 10) || 0);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

export class UpdateManager {
  private window: BrowserWindow;
  private latestResult: UpdateCheckResult | null = null;
  private isChecking = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  public setWindow(window: BrowserWindow) {
    this.window = window;
  }

  public getLatestResult(): UpdateCheckResult | null {
    return this.latestResult;
  }

  public async checkForUpdates(_manual = false): Promise<UpdateCheckResult> {
    if (this.isChecking && this.latestResult) {
      return this.latestResult;
    }

    this.isChecking = true;
    const currentVersion = app.getVersion();

    try {
      const response = await fetch(
        'https://api.github.com/repos/Gustavo-de-SZ/larp-browser/releases/latest',
        {
          headers: {
            'User-Agent': 'LarpBrowser-Desktop-App',
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }

      const data = await response.json();
      const rawTag: string = data.tag_name || '';
      const latestVersion = rawTag.replace(/^v/i, '').trim();
      const hasUpdate = compareSemver(latestVersion, currentVersion) > 0;

      const allAssets: UpdateAssetInfo[] = Array.isArray(data.assets)
        ? data.assets.map((a: any) => {
            const name: string = a.name || '';
            let platform: 'windows' | 'linux' | 'all' = 'all';
            let format: 'exe' | 'zip' | 'appimage' | 'pacman' | 'other' = 'other';

            if (name.endsWith('.exe')) {
              platform = 'windows';
              format = 'exe';
            } else if (name.endsWith('-win.zip') || (name.includes('win') && name.endsWith('.zip'))) {
              platform = 'windows';
              format = 'zip';
            } else if (name.endsWith('.AppImage')) {
              platform = 'linux';
              format = 'appimage';
            } else if (name.endsWith('.pkg.tar.zst') || name.includes('pacman')) {
              platform = 'linux';
              format = 'pacman';
            }

            return {
              name,
              downloadUrl: a.browser_download_url,
              size: a.size || 0,
              platform,
              format,
            };
          })
        : [];

      // Find matched asset for this user's platform
      let matchedAsset: UpdateAssetInfo | undefined;
      if (process.platform === 'win32') {
        matchedAsset =
          allAssets.find((a) => a.format === 'exe') ||
          allAssets.find((a) => a.platform === 'windows');
      } else if (process.platform === 'linux') {
        if (process.env.APPIMAGE) {
          matchedAsset = allAssets.find((a) => a.format === 'appimage');
        } else {
          matchedAsset =
            allAssets.find((a) => a.format === 'appimage') ||
            allAssets.find((a) => a.format === 'pacman') ||
            allAssets.find((a) => a.platform === 'linux');
        }
      }

      const result: UpdateCheckResult = {
        currentVersion,
        latestVersion,
        hasUpdate,
        releaseName: data.name || `Release v${latestVersion}`,
        releaseNotes: data.body || '',
        releaseUrl: data.html_url || 'https://github.com/Gustavo-de-SZ/larp-browser/releases',
        publishedAt: data.published_at || new Date().toISOString(),
        matchedAsset,
        allAssets,
        checkedAt: Date.now(),
        status: hasUpdate ? 'available' : 'up-to-date',
      };

      this.latestResult = result;
      this.isChecking = false;

      if (hasUpdate && this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('browser:update-available', result);
      }

      return result;
    } catch (err: any) {
      this.isChecking = false;
      const errorResult: UpdateCheckResult = {
        currentVersion,
        latestVersion: currentVersion,
        hasUpdate: false,
        releaseName: '',
        releaseNotes: '',
        releaseUrl: 'https://github.com/Gustavo-de-SZ/larp-browser/releases',
        publishedAt: '',
        allAssets: [],
        checkedAt: Date.now(),
        status: 'error',
        errorMessage: err?.message || 'Failed to connect to GitHub update server',
      };
      this.latestResult = errorResult;
      return errorResult;
    }
  }

  public downloadUpdate(url: string) {
    if (this.window && !this.window.isDestroyed() && url) {
      this.window.webContents.downloadURL(url);
    }
  }

  public startPeriodicChecks(intervalMs = 24 * 60 * 60 * 1000) {
    if (this.checkInterval) clearInterval(this.checkInterval);
    // Initial check after 5s
    setTimeout(() => {
      this.checkForUpdates(false).catch(() => {});
    }, 5000);

    // Periodic interval
    this.checkInterval = setInterval(() => {
      this.checkForUpdates(false).catch(() => {});
    }, intervalMs);
  }

  public stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}
