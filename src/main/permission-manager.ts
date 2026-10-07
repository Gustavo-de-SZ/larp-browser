import { app, BrowserWindow, Session, WebContents } from 'electron';
import fs from 'fs';
import path from 'path';
import type {
  SitePermissionDecision,
  SitePermissionRequest,
} from '../shared/types';

const DANGEROUS_PERMISSIONS = [
  'usb',
  'serial',
  'bluetooth',
  'hid',
  'midi',
  'midiSysex',
  'openExternal',
  'system-audio',
];

const SAFE_PERMISSIONS = ['fullscreen', 'pointerLock'];

interface PendingRequest {
  id: string;
  origin: string;
  permission: string;
  mediaTypes?: ('video' | 'audio')[];
  callback: (permissionGranted: boolean) => void;
  webContentsId: number;
  tabId?: string | null;
}

export class PermissionManager {
  private permissionsPath: string;
  private permissions: Record<string, Record<string, SitePermissionDecision>> = {};
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private attachedSessions: WeakSet<Session> = new WeakSet();
  private getWindow: () => BrowserWindow | null;
  private getTabIdForWebContents: (wc: WebContents) => string | null;
  private onPendingChange?: () => void;

  constructor(
    getWindow: () => BrowserWindow | null,
    getTabIdForWebContents: (wc: WebContents) => string | null
  ) {
    this.getWindow = getWindow;
    this.getTabIdForWebContents = getTabIdForWebContents;
    this.permissionsPath = path.join(app.getPath('userData'), 'permissions.json');
    this.loadPermissions();
  }

  private loadPermissions() {
    try {
      if (fs.existsSync(this.permissionsPath)) {
        const raw = fs.readFileSync(this.permissionsPath, 'utf8');
        this.permissions = JSON.parse(raw);
      }
    } catch (err) {
      console.error('[PermissionManager] Failed to load permissions.json:', err);
      this.permissions = {};
    }
  }

  private savePermissions() {
    try {
      fs.writeFileSync(this.permissionsPath, JSON.stringify(this.permissions, null, 2), 'utf8');
    } catch (err) {
      console.error('[PermissionManager] Failed to save permissions.json:', err);
    }
  }

  public getPermissions(): Record<string, Record<string, SitePermissionDecision>> {
    return { ...this.permissions };
  }

  public getOriginPermissions(origin: string): Record<string, SitePermissionDecision> {
    return this.permissions[origin] ? { ...this.permissions[origin] } : {};
  }

  public setPermission(
    origin: string,
    permission: string,
    decision: 'allow' | 'deny' | 'ask'
  ) {
    if (decision === 'ask') {
      if (this.permissions[origin]) {
        delete this.permissions[origin][permission];
        if (Object.keys(this.permissions[origin]).length === 0) {
          delete this.permissions[origin];
        }
      }
    } else {
      if (!this.permissions[origin]) {
        this.permissions[origin] = {};
      }
      this.permissions[origin][permission] = decision;
    }
    this.savePermissions();
  }

  public clearPermissions(origin?: string) {
    if (origin) {
      delete this.permissions[origin];
    } else {
      this.permissions = {};
    }
    this.savePermissions();
  }

  public setOnPendingChange(cb: () => void) {
    this.onPendingChange = cb;
  }

  public hasPendingRequestForTab(tabId: string | null): boolean {
    if (!tabId) return false;
    for (const req of this.pendingRequests.values()) {
      if (req.tabId === tabId || !req.tabId) return true;
    }
    return false;
  }

  public handleResponse(
    requestId: string,
    decision: 'allow' | 'deny' | 'dismiss',
    remember = true
  ) {
    const pending = this.pendingRequests.get(requestId);
    if (!pending) return;

    this.pendingRequests.delete(requestId);
    this.onPendingChange?.();

    const granted = decision === 'allow';
    pending.callback(granted);

    if (remember && decision !== 'dismiss') {
      if (!this.permissions[pending.origin]) {
        this.permissions[pending.origin] = {};
      }
      this.permissions[pending.origin][pending.permission] = decision;
      if (pending.permission === 'media' && pending.mediaTypes) {
        if (pending.mediaTypes.includes('video')) {
          this.permissions[pending.origin]['camera'] = decision;
        }
        if (pending.mediaTypes.includes('audio')) {
          this.permissions[pending.origin]['microphone'] = decision;
        }
      }
      this.savePermissions();
    }
  }

  public attachToSession(sessionInstance: Session) {
    if (this.attachedSessions.has(sessionInstance)) return;
    this.attachedSessions.add(sessionInstance);

    sessionInstance.setPermissionRequestHandler((webContents, permission, callback, details) => {
      // 1. Dangerous device APIs
      if (DANGEROUS_PERMISSIONS.includes(permission)) {
        console.warn(`[Security] Blocked dangerous permission request: ${permission}`);
        return callback(false);
      }

      // 2. Safe display features
      if (SAFE_PERMISSIONS.includes(permission)) {
        return callback(true);
      }

      // 3. Resolve requesting origin
      let origin = '';
      try {
        const targetUrl = details?.requestingUrl || webContents.getURL();
        if (targetUrl && !targetUrl.startsWith('about:') && !targetUrl.startsWith('data:')) {
          origin = new URL(targetUrl).origin;
        }
      } catch {
        // invalid URL
      }

      if (!origin) {
        return callback(false);
      }

      const mediaTypes = (details as any)?.mediaTypes as ('video' | 'audio')[] | undefined;

      // 4. Check existing permission decision
      const originRules = this.permissions[origin];
      if (originRules) {
        // Specific permission check
        if (originRules[permission]) {
          return callback(originRules[permission] === 'allow');
        }
        // Sub-type check for media
        if (permission === 'media' && mediaTypes) {
          const hasVideo = mediaTypes.includes('video');
          const hasAudio = mediaTypes.includes('audio');
          if (hasVideo && !hasAudio && originRules['camera']) {
            return callback(originRules['camera'] === 'allow');
          }
          if (hasAudio && !hasVideo && originRules['microphone']) {
            return callback(originRules['microphone'] === 'allow');
          }
          if (hasVideo && hasAudio && originRules['camera'] && originRules['microphone']) {
            return callback(
              originRules['camera'] === 'allow' && originRules['microphone'] === 'allow'
            );
          }
        }
      }

      // 5. Prompt user interactively
      const win = this.getWindow();
      if (!win || win.isDestroyed()) {
        return callback(false);
      }

      const tabId = this.getTabIdForWebContents(webContents);
      const requestId = 'req-' + Math.random().toString(36).substring(2, 9);

      this.pendingRequests.set(requestId, {
        id: requestId,
        origin,
        permission,
        mediaTypes,
        callback,
        webContentsId: webContents.id,
        tabId,
      });
      this.onPendingChange?.();

      const requestPayload: SitePermissionRequest = {
        id: requestId,
        tabId,
        origin,
        permission,
        mediaTypes,
      };

      win.webContents.send('browser:permission-request', requestPayload);
    });

    sessionInstance.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
      if (DANGEROUS_PERMISSIONS.includes(permission)) return false;
      if (SAFE_PERMISSIONS.includes(permission)) return true;

      try {
        const origin = requestingOrigin || (webContents ? new URL(webContents.getURL()).origin : '');
        if (!origin) return false;

        const originRules = this.permissions[origin];
        if (originRules && originRules[permission]) {
          return originRules[permission] === 'allow';
        }
      } catch {
        return false;
      }

      return false;
    });
  }

  public cleanupForWebContents(wcId: number) {
    let changed = false;
    const win = this.getWindow();
    for (const [id, req] of this.pendingRequests.entries()) {
      if (req.webContentsId === wcId) {
        req.callback(false);
        this.pendingRequests.delete(id);
        changed = true;
        if (win && !win.isDestroyed()) {
          win.webContents.send('browser:permission-dismiss', id);
        }
      }
    }
    if (changed) {
      this.onPendingChange?.();
    }
  }
}
