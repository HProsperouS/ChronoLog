import { app, BrowserWindow, ipcMain, shell, Menu, Notification } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { setupTray } from './tray';

const gotSingleInstanceLock = app.requestSingleInstanceLock();
const isDev = !app.isPackaged;
const useDevServer = isDev && process.env.ELECTRON_USE_DEV_SERVER !== 'false';
const BACKEND_PORT = 3001;

// Flag used to distinguish explicit quit (from tray) vs window close
let isQuitting = false;

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let trackerProcess: ChildProcess | null = null;

// ─── Icons (dev & packaged: main lives in electron/dist, assets in electron/assets) ─
function resolveAssetsFile(name: string): string {
  return path.join(__dirname, '../assets', name);
}

function resolveWindowIconPath(): string {
  if (process.platform === 'win32') {
    return resolveAssetsFile('icon.ico');
  }
  if (process.platform === 'darwin') {
    const icns = resolveAssetsFile('icon.icns');
    if (fs.existsSync(icns)) return icns;
  }
  // Fallback: we ship icon-512.png, not icon.png.
  return resolveAssetsFile('icon-512.png');
}

function resolveNotificationIconPath(): string {
  // macOS Notification `icon` is most reliably a PNG.
  const candidates = ['icon-512.png', 'icon.png', 'icon.ico', 'icon.icns'];
  for (const name of candidates) {
    const p = resolveAssetsFile(name);
    if (fs.existsSync(p)) return p;
  }
  return resolveWindowIconPath();
}


// ─── Data directory ───────────────────────────────────────────────────────────

function getDataDir(): string {
  return isDev
    ? path.join(__dirname, '../../backend/data')
    : path.join(app.getPath('userData'), 'data');
}

function getNodeExec(): string {
  return process.env.npm_node_execpath || 'node';
}

function getTsxCliPath(): string {
  return path.join(__dirname, '../../backend/node_modules/tsx/dist/cli.mjs');
}

function getPackagedBackendScript(scriptName: 'server.js' | 'tracker.js'): string {
  return path.join(process.resourcesPath, 'backend', 'dist', scriptName);
}

function spawnPackagedNodeProcess(
  scriptName: 'server.js' | 'tracker.js',
  extraEnv: NodeJS.ProcessEnv,
): ChildProcess {
  return spawn(process.execPath, [getPackagedBackendScript(scriptName)], {
    cwd: process.resourcesPath,
    env: {
      ...process.env,
      ...extraEnv,
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function setupApplicationMenu(): void {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];

  if (isDev) {
    template.push({
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── Backend process ──────────────────────────────────────────────────────────

function startBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PORT: String(BACKEND_PORT),
      DATA_DIR: getDataDir(),
      NODE_ENV: isDev ? 'development' : 'production',
    };

    if (isDev) {
      backendProcess = spawn(getNodeExec(), [getTsxCliPath(), 'src/server.ts'], {
        cwd: path.join(__dirname, '../../backend'),
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } else {
      backendProcess = spawnPackagedNodeProcess('server.js', env);
    }

    let started = false;

    backendProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString();
      console.log('[backend]', msg.trim());
      // Fastify logs "Server listening" once ready
      if (!started && (msg.includes('listening') || msg.includes('Server'))) {
        started = true;
        resolve();
      }
    });

    backendProcess.stderr?.on('data', (data: Buffer) => {
      console.error('[backend:err]', data.toString().trim());
    });

    backendProcess.on('error', (err) => {
      console.error('[backend] Failed to start:', err);
      reject(err);
    });

    // Fallback: resolve after 3 seconds even if we miss the log line
    setTimeout(() => {
      if (!started) { started = true; resolve(); }
    }, 3000);
  });
}

function startTracker(): void {
  const env = {
    ...process.env,
    API_URL: `http://localhost:${BACKEND_PORT}`,
    NODE_ENV: isDev ? 'development' : 'production',
  };

  if (isDev) {
    trackerProcess = spawn(getNodeExec(), [getTsxCliPath(), 'src/tracker.ts'], {
      cwd: path.join(__dirname, '../../backend'),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else {
    trackerProcess = spawnPackagedNodeProcess('tracker.js', env);
  }

  trackerProcess.stdout?.on('data', (data: Buffer) => {
    console.log('[tracker]', data.toString().trim());
  });

  trackerProcess.stderr?.on('data', (data: Buffer) => {
    console.error('[tracker:err]', data.toString().trim());
  });

  trackerProcess.on('error', (err) => {
    console.error('[tracker] Failed to start:', err);
  });
}

// ─── Main window ──────────────────────────────────────────────────────────────

function createWindow(): void {
  const winIcon = resolveWindowIconPath();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0a0a0f',
    show: false, // show after ready-to-show
    icon: fs.existsSync(winIcon) ? winIcon : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: process.platform !== 'darwin',
  });

  if (process.platform !== 'darwin') {
    mainWindow.removeMenu();
  }

  if (useDevServer) {
    void mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    void mainWindow.loadFile(
      path.join(__dirname, '../../frontend/dist/index.html')
    );
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Hide to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('get-backend-port', () => BACKEND_PORT);

ipcMain.handle('get-platform', () => process.platform);

/** Desktop: one icon via native notification; avoids macOS Web Notification (Electron left + icon right). */
ipcMain.handle('show-notification', (_event, title: string, body: string) => {
  if (!Notification.isSupported()) return false;
  try {
    // Intentionally omit `icon` so macOS notification UI does not show a secondary
    // right-side image (you only get the app-level icon on the left).
    const n = new Notification({ title, body });
    n.show();
    return true;
  } catch (err) {
    console.error('[electron] show-notification failed:', err);
    return false;
  }
});

ipcMain.on('show-window', () => mainWindow?.show());

// ─── App lifecycle ────────────────────────────────────────────────────────────

if (!gotSingleInstanceLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (!mainWindow.isVisible()) mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  console.log('[electron] Starting ChronoLog…');
  console.log(`[electron] isDev=${isDev}, dataDir=${getDataDir()}`);

  if (process.platform === 'darwin' && app.dock) {
    const dockPath = resolveWindowIconPath();
    if (fs.existsSync(dockPath)) {
      try {
        app.dock.setIcon(dockPath);
      } catch (e) {
        console.warn('[electron] dock.setIcon failed:', e);
      }
    }
  }

  setupApplicationMenu();
  await startBackend();
  startTracker();
  createWindow();

  if (mainWindow) setupTray(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS keep the app running in the tray
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  console.log('[electron] Shutting down child processes…');
  backendProcess?.kill('SIGTERM');
  trackerProcess?.kill('SIGTERM');
});
