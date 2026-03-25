/** Preload bridge — see electron/src/preload.ts */
interface ChronoLogElectronAPI {
  platform: NodeJS.Platform;
  getBackendPort: () => Promise<number>;
  showWindow: () => void;
  showNotification: (title: string, body: string) => Promise<boolean>;
}

interface Window {
  electronAPI?: ChronoLogElectronAPI;
}
