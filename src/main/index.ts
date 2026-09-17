import { app, BrowserWindow } from 'electron';
import path from 'path';
import { TabManager } from './tab-manager';
import { registerIpcHandlers } from './ipc-handlers';
import { registerShortcuts } from './shortcuts';

// Linux performance, display backend, and hardware GPU acceleration flags
if (process.platform === 'linux') {
  // Prevent multithreaded Mesa driver sandbox crash on Intel Iris Xe / Linux
  app.commandLine.appendSwitch('in-process-gpu');
}

let mainWindow: BrowserWindow | null = null;
let tabManager: TabManager | null = null;

const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 500,
    frame: false, // Sleek frameless window with custom controls
    backgroundColor: '#0a0b10',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Preload needs to expose contextBridge
    },
  });

  tabManager = new TabManager(mainWindow);

  // Send state updates to renderer
  tabManager.setOnStateChange((state) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser:state-update', state);
    }
  });

  // Register IPC and keyboard shortcuts
  registerIpcHandlers(mainWindow, tabManager);
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

  // Create initial demo tabs asynchronously
  await tabManager.createTab('https://news.ycombinator.com');
  tabManager.createTab('https://github.com');
  tabManager.createTab('https://en.wikipedia.org');

  mainWindow.on('closed', () => {
    mainWindow = null;
    tabManager = null;
  });
}

app.whenReady().then(() => {
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
