import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import { TabManager } from './tab-manager';
import { DownloadManager } from './download-manager';
import { registerIpcHandlers } from './ipc-handlers';
import { registerShortcuts } from './shortcuts';

// Linux performance, display backend, and hardware GPU acceleration flags
if (process.platform === 'linux') {
  // Prevent multithreaded Mesa driver sandbox crash on Intel Iris Xe / Linux
  app.commandLine.appendSwitch('in-process-gpu');
}

const appStartTime = performance.now();
let mainWindow: BrowserWindow | null = null;
let tabManager: TabManager | null = null;
let downloadManager: DownloadManager | null = null;

const isDev = process.env.NODE_ENV === 'development';

function setupSecurityDefaults() {
  // Security: Block high-risk peripheral device access and OS-level execution
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const dangerousPermissions = [
      'usb',
      'serial',
      'bluetooth',
      'hid',
      'midi',
      'midiSysex',
      'openExternal',
      'system-audio',
    ];
    if (dangerousPermissions.includes(permission)) {
      console.warn(`[Security] Blocked dangerous permission request: ${permission}`);
      return callback(false);
    }

    // Allow safe display features
    if (permission === 'fullscreen' || permission === 'pointerLock') {
      return callback(true);
    }

    // Default deny sensitive hardware (camera, mic, geolocation) until explicit user permission UI
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    const dangerousPermissions = ['usb', 'serial', 'bluetooth', 'hid', 'midi', 'midiSysex', 'openExternal'];
    if (dangerousPermissions.includes(permission)) {
      return false;
    }
    if (permission === 'fullscreen' || permission === 'pointerLock') {
      return true;
    }
    return false;
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 500,
    frame: false, // Sleek frameless window with custom controls
    backgroundColor: '#121214',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true, // Sandboxed renderer for browser shell
    },
  });

  // Security: Lock down mainWindow navigation so the shell can never load untrusted content
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost:5173')) {
      console.warn(`[Security] Blocked main window navigation to: ${url}`);
      event.preventDefault();
    }
  });

  // Security: Prevent window.open from the shell UI
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  tabManager = new TabManager(mainWindow);
  downloadManager = new DownloadManager(mainWindow, () => tabManager!.getSettings());
  tabManager.setDownloadManager(downloadManager);

  // Send state updates to renderer
  tabManager.setOnStateChange((state) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser:state-update', state);
    }
  });

  // Register IPC and keyboard shortcuts
  registerIpcHandlers(mainWindow, tabManager, downloadManager);
  registerShortcuts(mainWindow, tabManager);

  // Keep active WebContentsView bounds in sync with window size
  mainWindow.on('resize', () => {
    tabManager?.updateActiveViewBounds();
  });

  mainWindow.on('maximize', () => {
    setTimeout(() => tabManager?.updateActiveViewBounds(), 50);
  });

  mainWindow.on('unmaximize', () => {
    setTimeout(() => tabManager?.updateActiveViewBounds(), 50);
  });

  // Load UI renderer: use Vite server in development or built bundle
  const indexPath = path.join(__dirname, '../renderer/index.html');
  if (isDev) {
    try {
      await mainWindow.loadURL('http://localhost:5173');
    } catch {
      console.log('Dev server not reachable at http://localhost:5173, loading built bundle.');
      await mainWindow.loadFile(indexPath);
    }
  } else {
    await mainWindow.loadFile(indexPath);
  }

  // Initialize session based on user's startup preferences (new tab, restore previous session, or custom URL)
  await tabManager.initializeSession();

  // Developer automated benchmark harness
  const isBenchmark = process.argv.includes('--benchmark') || process.env.LARP_BENCHMARK === '1';
  if (isBenchmark) {
    const startupTimeMs = performance.now() - appStartTime;
    const { runBenchmark } = await import('./benchmark');
    runBenchmark(mainWindow, tabManager, startupTimeMs);
  }

  mainWindow.on('close', () => {
    tabManager?.saveSession();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    tabManager = null;
  });
}

app.whenReady().then(() => {
  setupSecurityDefaults();

  // Configure high-performance built-in host resolver with DNS-over-HTTPS (DoH)
  // Bypasses unresponsive local DHCP nameservers and eliminates glibc DNS timeout bottlenecks
  try {
    app.configureHostResolver({
      enableBuiltInResolver: true,
      enableHappyEyeballs: true,
      secureDnsMode: 'automatic',
      secureDnsServers: [
        'https://1.1.1.1/dns-query{?dns}',
        'https://8.8.8.8/dns-query{?dns}',
        'https://dns.google/dns-query{?dns}',
        'https://cloudflare-dns.com/dns-query{?dns}',
      ],
    });
  } catch (err) {
    console.warn('Failed to configure host resolver:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
