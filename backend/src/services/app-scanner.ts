import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

export type InstalledAppSource =
  | 'windows-registry'
  | 'windows-start-menu'
  | 'windows-directory'
  | 'mac-applications'
  | 'linux-desktop';

export type InstalledApp = {
  discoveredName: string;
  normalizedName: string;
  source: InstalledAppSource;
  installLocation?: string;
  executablePath?: string;
};

function normalizeAppName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.app$/i, '')
    .replace(/\.exe$/i, '')
    .replace(/\s+/g, ' ');
}

function safeReadDir(dir: string): string[] {
  try {
    return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  } catch {
    return [];
  }
}

function pushUnique(
  map: Map<string, InstalledApp>,
  app: InstalledApp
): void {
  const key =
    app.executablePath?.toLowerCase() ||
    app.installLocation?.toLowerCase() ||
    app.normalizedName;

  if (!map.has(key)) {
    map.set(key, app);
  }
}

function scanWindowsRegistryApps(): InstalledApp[] {
  const results = new Map<string, InstalledApp>();

  const uninstallRoots = [
    'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ];

  for (const root of uninstallRoots) {
    let subkeysOutput = '';
    try {
      subkeysOutput = execFileSync('reg', ['query', root], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      continue;
    }

    const subkeys = subkeysOutput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith(root + '\\'));

    for (const subkey of subkeys) {
      let detail = '';
      try {
        detail = execFileSync('reg', ['query', subkey], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
      } catch {
        continue;
      }

      const displayName =
        detail.match(/^\s*DisplayName\s+REG_\w+\s+(.+)$/m)?.[1]?.trim() ?? '';
      if (!displayName) continue;

      const installLocation =
        detail.match(/^\s*InstallLocation\s+REG_\w+\s+(.+)$/m)?.[1]?.trim() || undefined;

      const displayIconRaw =
        detail.match(/^\s*DisplayIcon\s+REG_\w+\s+(.+)$/m)?.[1]?.trim() || undefined;

      const executablePath = displayIconRaw
        ? displayIconRaw.replace(/,\d+$/, '').replace(/^"|"$/g, '')
        : undefined;

      pushUnique(results, {
        discoveredName: displayName,
        normalizedName: normalizeAppName(displayName),
        source: 'windows-registry',
        installLocation,
        executablePath,
      });
    }
  }

  return [...results.values()];
}

function scanWindowsStartMenuApps(): InstalledApp[] {
  const results = new Map<string, InstalledApp>();

  const dirs = [
    path.join(process.env.ProgramData ?? 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
  ];

  function walk(dir: string): void {
    for (const entry of safeReadDir(dir)) {
      const full = path.join(dir, entry);
      let stat: fs.Stats | undefined;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(full);
        continue;
      }

      if (!entry.toLowerCase().endsWith('.lnk')) continue;

      const discoveredName = entry.replace(/\.lnk$/i, '').trim();
      if (!discoveredName) continue;

      pushUnique(results, {
        discoveredName,
        normalizedName: normalizeAppName(discoveredName),
        source: 'windows-start-menu',
      });
    }
  }

  for (const dir of dirs) {
    if (fs.existsSync(dir)) walk(dir);
  }

  return [...results.values()];
}

function scanWindowsDirectoryApps(): InstalledApp[] {
  const results = new Map<string, InstalledApp>();

  const dirs = [
    'C:\\Program Files',
    'C:\\Program Files (x86)',
    path.join(os.homedir(), 'AppData', 'Local', 'Programs'),
  ];

  for (const dir of dirs) {
    for (const entry of safeReadDir(dir)) {
      const full = path.join(dir, entry);
      try {
        if (!fs.statSync(full).isDirectory()) continue;
      } catch {
        continue;
      }

      pushUnique(results, {
        discoveredName: entry,
        normalizedName: normalizeAppName(entry),
        source: 'windows-directory',
        installLocation: full,
      });
    }
  }

  return [...results.values()];
}

function scanMacApps(): InstalledApp[] {
  const results = new Map<string, InstalledApp>();
  const dirs = ['/Applications', path.join(os.homedir(), 'Applications')];

  for (const dir of dirs) {
    for (const entry of safeReadDir(dir)) {
      if (!entry.endsWith('.app')) continue;

      const full = path.join(dir, entry);
      const discoveredName = entry.replace(/\.app$/i, '');

      pushUnique(results, {
        discoveredName,
        normalizedName: normalizeAppName(discoveredName),
        source: 'mac-applications',
        installLocation: full,
      });
    }
  }

  return [...results.values()];
}

function scanLinuxApps(): InstalledApp[] {
  const results = new Map<string, InstalledApp>();
  const desktopDir = '/usr/share/applications';

  for (const file of safeReadDir(desktopDir)) {
    if (!file.endsWith('.desktop')) continue;

    const full = path.join(desktopDir, file);
    let content = '';
    try {
      content = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }

    const discoveredName = content.match(/^Name=(.+)$/m)?.[1]?.trim();
    if (!discoveredName) continue;

    pushUnique(results, {
      discoveredName,
      normalizedName: normalizeAppName(discoveredName),
      source: 'linux-desktop',
      installLocation: full,
    });
  }

  return [...results.values()];
}

export function scanInstalledApps(): InstalledApp[] {
  const platform = os.platform();
  const merged = new Map<string, InstalledApp>();

  const sources =
    platform === 'win32'
      ? [
          ...scanWindowsRegistryApps(),
          ...scanWindowsStartMenuApps(),
          ...scanWindowsDirectoryApps(),
        ]
      : platform === 'darwin'
      ? scanMacApps()
      : scanLinuxApps();

  for (const app of sources) {
    pushUnique(merged, app);
  }

  return [...merged.values()].sort((a, b) =>
    a.discoveredName.localeCompare(b.discoveredName)
  );
}