import { contextBridge, ipcRenderer } from 'electron';

/**
 * Exposes a minimal, typed API to the renderer process.
 * All node/electron APIs must go through this bridge — never enable
 * nodeIntegration in the renderer.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /** The OS platform string, e.g. "darwin" | "win32" | "linux" */
  platform: process.platform as NodeJS.Platform,

  /** Returns the port the embedded backend is listening on */
  getBackendPort: (): Promise<number> =>
    ipcRenderer.invoke('get-backend-port'),

  /** Bring the main window to the front (e.g. from a notification click) */
  showWindow: (): void => ipcRenderer.send('show-window'),
});
