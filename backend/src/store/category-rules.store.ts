import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CategoryRule } from '../types';
import {
  APP_CATEGORY_MAP,
  BROWSER_APPS,
  BROWSER_WORK_KEYWORDS,
  BROWSER_ENTERTAINMENT_KEYWORDS,
} from '../services/app-catalog';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const RULES_FILE = path.join(DATA_DIR, 'category-rules.json');

// ─── File helpers ─────────────────────────────────────────────────────────────

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function atomicWrite(file: string, data: unknown): void {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

// ─── App scanning (inline to avoid circular deps with activity.service) ───────

function scanInstalledAppNames(): string[] {
  const platform = os.platform();
  const names = new Set<string>();

  if (platform === 'darwin') {
    const dirs = ['/Applications', path.join(os.homedir(), 'Applications')];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir)) {
        if (entry.endsWith('.app')) names.add(entry.replace(/\.app$/, ''));
      }
    }
  } else if (platform === 'win32') {
    const dirs = [
      'C:\\Program Files',
      'C:\\Program Files (x86)',
      path.join(os.homedir(), 'AppData', 'Local', 'Programs'),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir)) {
        try {
          if (fs.statSync(path.join(dir, entry)).isDirectory()) names.add(entry);
        } catch { /* skip */ }
      }
    }
  } else {
    const desktopDir = '/usr/share/applications';
    if (fs.existsSync(desktopDir)) {
      for (const file of fs.readdirSync(desktopDir)) {
        if (!file.endsWith('.desktop')) continue;
        try {
          const content = fs.readFileSync(path.join(desktopDir, file), 'utf8');
          const match = content.match(/^Name=(.+)$/m);
          if (match) names.add(match[1].trim());
        } catch { /* skip */ }
      }
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}

// ─── First-launch rule generation ─────────────────────────────────────────────

function generateInitialRules(): CategoryRule[] {
  const appNames = scanInstalledAppNames();
  const rules: CategoryRule[] = [];
  let id = 1;

  console.log(`[category-rules.store] Scanned ${appNames.length} installed apps`);

  for (const appName of appNames) {
    const lower = appName.toLowerCase();

    if (BROWSER_APPS.has(lower)) {
      // Browsers get two keyword-based rules (Work + Entertainment)
      rules.push({
        id: String(id++),
        appName,
        category: 'Work',
        isAutomatic: false,
        keywords: BROWSER_WORK_KEYWORDS,
      });
      rules.push({
        id: String(id++),
        appName,
        category: 'Entertainment',
        isAutomatic: false,
        keywords: BROWSER_ENTERTAINMENT_KEYWORDS,
      });
      continue;
    }

    const category = APP_CATEGORY_MAP[lower];
    if (category) {
      rules.push({ id: String(id++), appName, category, isAutomatic: true });
    }
    // Unrecognised apps are skipped — they will appear as 'Uncategorized' at runtime
  }

  const matched = rules.filter((r) => r.isAutomatic).length;
  const browsers = rules.filter((r) => !r.isAutomatic).length / 2;
  console.log(
    `[category-rules.store] Generated ${rules.length} rules ` +
    `(${matched} automatic, ${browsers} browser keyword sets)`
  );

  return rules;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function readRules(): CategoryRule[] {
  ensureDir();
  if (!fs.existsSync(RULES_FILE)) {
    console.log('[category-rules.store] First launch — scanning installed apps and generating rules…');
    const rules = generateInitialRules();
    atomicWrite(RULES_FILE, rules);
    return rules;
  }
  try {
    return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8')) as CategoryRule[];
  } catch {
    console.error('[category-rules.store] Failed to parse category-rules.json — regenerating from scan');
    const rules = generateInitialRules();
    atomicWrite(RULES_FILE, rules);
    return rules;
  }
}

export function writeRules(rules: CategoryRule[]): void {
  ensureDir();
  atomicWrite(RULES_FILE, rules);
}
