import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import fs from 'fs';
import path from 'path';

let tray: Tray | null = null;

/**
 * Creates a system-tray icon that lets users:
 *  - Toggle the main window visibility
 *  - Quit the app entirely (bypassing the "hide on close" behaviour)
 */
export function setupTray(window: BrowserWindow): void {
  const iconPath = resolveIconPath();
  if (!iconPath || !fs.existsSync(iconPath)) {
    console.error('[tray] Missing tray icon file. Add electron/assets/tray-icon.png (or tray-iconTemplate.png on macOS).');
    return;
  }

  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    console.error('[tray] Could not load tray image:', iconPath);
    return;
  }

  // Resize for high-DPI trays on macOS
  const trayIcon = process.platform === 'darwin'
    ? icon.resize({ width: 18, height: 18 })
    : icon.resize({ width: 32, height: 32 });

  // Template images must be monochrome (alpha); colorful PNGs look invisible if marked template
  const base = path.basename(iconPath);
  if (process.platform === 'darwin' && /template/i.test(base)) {
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
  const assetsDir = path.join(__dirname, '../assets');
  const tryNames =
    process.platform === 'darwin'
      ? ['tray-iconTemplate.png', 'tray-icon.png', 'tray-icon-18.png', 'tray-icon-16.png']
      : ['tray-icon.png', 'tray-icon-32.png'];

  for (const name of tryNames) {
    const p = path.join(assetsDir, name);
    if (fs.existsSync(p)) return p;
  }
  return '';
}
