import type { Category } from '../types';
import type { InstalledApp } from './app-scanner';

export type AppSignature = {
  canonicalName: string;
  category?: Category;
  isBrowser?: boolean;
  aliases?: string[];
  exeNames?: string[];
  pathContains?: string[];
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\.exe$/i, '').replace(/\s+/g, ' ');
}

export const APP_SIGNATURES: AppSignature[] = [
  {
    canonicalName: 'firefox',
    isBrowser: true,
    aliases: ['mozilla firefox', 'firefox developer edition'],
    exeNames: ['firefox.exe'],
    pathContains: ['mozilla firefox\\firefox.exe'],
  },
  {
    canonicalName: 'arc',
    isBrowser: true,
    aliases: ['arc browser'],
  },
  {
    canonicalName: 'google chrome',
    isBrowser: true,
    aliases: ['chrome'],
    exeNames: ['chrome.exe'],
  },
  {
    canonicalName: 'microsoft edge',
    isBrowser: true,
    aliases: ['edge', 'msedge'],
    exeNames: ['msedge.exe'],
  },

  { canonicalName: 'visual studio code', category: 'Deep Work', aliases: ['vs code'], exeNames: ['code.exe'] },
  { canonicalName: 'cursor', category: 'Deep Work', exeNames: ['cursor.exe'] },
  { canonicalName: 'intellij idea', category: 'Deep Work' },
  { canonicalName: 'pycharm', category: 'Deep Work' },
  { canonicalName: 'webstorm', category: 'Deep Work' },
  { canonicalName: 'datagrip', category: 'Deep Work' },
  { canonicalName: 'docker desktop', category: 'Deep Work', aliases: ['docker'] },
  { canonicalName: 'wireshark', category: 'Deep Work' },
  { canonicalName: 'notepad++', category: 'Deep Work' },

  { canonicalName: 'notion', category: 'Study' },
  { canonicalName: 'obsidian', category: 'Study' },
  { canonicalName: 'adobe acrobat', category: 'Study', aliases: ['adobe acrobat reader'] },
  { canonicalName: 'microsoft word', category: 'Study', aliases: ['word'] },
  { canonicalName: 'microsoft excel', category: 'Study', aliases: ['excel'] },
  { canonicalName: 'microsoft powerpoint', category: 'Study', aliases: ['powerpoint'] },
  { canonicalName: 'microsoft onenote', category: 'Study', aliases: ['onenote'] },

  { canonicalName: 'slack', category: 'Communication' },
  { canonicalName: 'discord', category: 'Communication' },
  { canonicalName: 'telegram', category: 'Communication' },
  { canonicalName: 'outlook', category: 'Communication', aliases: ['microsoft outlook'] },

  { canonicalName: 'zoom', category: 'Meetings', aliases: ['zoom workplace', 'zoom.us'] },
  { canonicalName: 'microsoft teams', category: 'Meetings', aliases: ['teams'] },
  { canonicalName: 'google meet', category: 'Meetings' },
  { canonicalName: 'webex', category: 'Meetings' },

  { canonicalName: 'steam', category: 'Gaming' },
  { canonicalName: 'battle.net', category: 'Gaming' },
  { canonicalName: 'epic games launcher', category: 'Gaming' },

  { canonicalName: 'bitwarden', category: 'Admin' },
  { canonicalName: 'file explorer', category: 'Admin', aliases: ['windows explorer', 'finder'] },
  { canonicalName: 'task manager', category: 'Admin' },
  { canonicalName: 'control panel', category: 'Admin' },

  { canonicalName: 'chronolog', category: 'ChronoLog' },
];

export const BROWSER_STUDY_KEYWORDS = [
  'lecture', 'course', 'tutorial', 'revision',
  'slides', 'assignment', 'notes', 'canvas', 'lms', 'moodle',
  'coursera', 'edx', 'udemy',
];

export const BROWSER_DEEP_WORK_KEYWORDS = [
  'chatgpt', 'openai',
  'github', 'gitlab', 'bitbucket',
  'stackoverflow', 'stackoverflow.com',
  'docs', 'documentation', 'mdn',
  'localhost', '127.0.0.1',
  'jira', 'confluence', 'linear', 'notion',
  'figma', 'vercel', 'netlify',
  'aws', 'azure', 'gcp', 'console.cloud',
  'google docs', 'google sheets', 'google slides',
  'calendar.google',
];

export const BROWSER_MEETING_KEYWORDS = [
  'meet.google.com',
  'zoom',
  'teams.microsoft.com',
  'webex',
];

export const BROWSER_GAMING_KEYWORDS = [
  'store.steampowered.com',
  'steam',
  'epic games',
  'battle.net',
];

export const BROWSER_ENTERTAINMENT_KEYWORDS = [
  'netflix', 'hulu', 'disneyplus', 'disney+',
  'twitch', 'kick.com',
  'reddit',
  'twitter', 'x.com',
  'instagram', 'tiktok',
  'facebook', 'fb.com',
  '9gag', 'imgur',
  'bilibili',
  'spotify',
];

function matchesSignature(app: InstalledApp, sig: AppSignature): boolean {
  const normalized = normalize(app.normalizedName);
  const aliases = (sig.aliases ?? []).map(normalize);

  if (normalized === normalize(sig.canonicalName)) return true;
  if (aliases.includes(normalized)) return true;

  const exeLower = app.executablePath?.toLowerCase() ?? '';
  if ((sig.exeNames ?? []).some((exe) => exeLower.endsWith(exe.toLowerCase()))) return true;

  if ((sig.pathContains ?? []).some((part) => exeLower.includes(part.toLowerCase()))) return true;

  return false;
}

export function resolveInstalledApp(app: InstalledApp): {
  canonicalName: string;
  category?: Category;
  isBrowser: boolean;
} | null {
  for (const sig of APP_SIGNATURES) {
    if (matchesSignature(app, sig)) {
      return {
        canonicalName: sig.canonicalName,
        category: sig.category,
        isBrowser: !!sig.isBrowser,
      };
    }
  }

  return null;
}