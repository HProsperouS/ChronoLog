import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import path from 'path';

let tray: Tray | null = null;

/**
 * Creates a system-tray icon that lets users:
 *  - Toggle the main window visibility
 *  - Quit the app entirely (bypassing the "hide on close" behaviour)
 */
export function setupTray(window: BrowserWindow): void {
  const iconPath = resolveIconPath();
  const icon = nativeImage.createFromPath(iconPath);

  // Resize for high-DPI trays on macOS (template image = auto dark/light mode)
  const trayIcon = process.platform === 'darwin'
    ? icon.resize({ width: 16, height: 16 })
    : icon.resize({ width: 32, height: 32 });

  if (process.platform === 'darwin') {
    trayIcon.setTemplateImage(true);
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('ChronoLog');

  const buildMenu = (): Menu =>
    Menu.buildFromTemplate([
      {
        label: window.isVisible() ? 'Hide ChronoLog' : 'Show ChronoLog',
        click: () => {
          if (window.isVisible()) window.hide();
          else { window.show(); window.focus(); }
          // Rebuild so the label stays accurate
          tray?.setContextMenu(buildMenu());
        },
      },
      { type: 'separator' },
      {
        label: 'Quit ChronoLog',
        click: () => {
          // Trigger before-quit which sets isQuitting in main.ts
          app.quit();
        },
      },
    ]);

  tray.setContextMenu(buildMenu());

  // Left-click on the tray icon toggles the window
  tray.on('click', () => {
    if (window.isVisible()) {
      window.hide();
    } else {
      window.show();
      window.focus();
    }
    tray?.setContextMenu(buildMenu());
  });

  // Keep the label up-to-date when the window state changes
  window.on('show', () => tray?.setContextMenu(buildMenu()));
  window.on('hide', () => tray?.setContextMenu(buildMenu()));
}

function resolveIconPath(): string {
  const fs = require('fs') as typeof import('fs');

  const fileName =
    process.platform === 'darwin'
      ? 'tray-iconTemplate.png'
      : 'tray-icon.png';

  const prodIcon = path.join(process.resourcesPath, 'assets', fileName);
  const devIcon = path.join(__dirname, '../../electron/assets', fileName);

  if (fs.existsSync(prodIcon)) return prodIcon;
  if (fs.existsSync(devIcon)) return devIcon;

  return '';
}
