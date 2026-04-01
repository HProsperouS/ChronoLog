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

export type BrowserAdvancedRuleBlueprint = {
  category: Category;
  matchMode: 'all';
  terms: string[];
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
    canonicalName: 'google chrome',
    isBrowser: true,
    aliases: ['chrome'],
    exeNames: ['chrome.exe'],
    pathContains: ['google\\chrome\\application\\chrome.exe'],
  },
  {
    canonicalName: 'microsoft edge',
    isBrowser: true,
    aliases: ['edge', 'msedge'],
    exeNames: ['msedge.exe'],
    pathContains: ['microsoft\\edge\\application\\msedge.exe'],
  },
  {
    canonicalName: 'safari',
    isBrowser: true,
  },
  {
    canonicalName: 'arc',
    isBrowser: true,
    aliases: ['arc browser'],
  },
  {
    canonicalName: 'brave',
    isBrowser: true,
    aliases: ['brave browser'],
    exeNames: ['brave.exe'],
    pathContains: ['braveSoftware\\brave-browser\\application\\brave.exe'],
  },
  {
    canonicalName: 'opera',
    isBrowser: true,
    aliases: ['opera browser'],
    exeNames: ['opera.exe'],
    pathContains: ['opera\\launcher.exe', 'opera\\opera.exe'],
  },
  {
    canonicalName: 'chromium',
    isBrowser: true,
    aliases: ['chromium'],
    exeNames: ['chromium.exe'],
  },

  { canonicalName: 'visual studio code', category: 'Deep Work', aliases: ['vs code', 'code', 'visual studio code - insiders'], exeNames: ['code.exe'], pathContains: ['microsoft vs code\\code.exe', 'microsoft vscode\\code.exe', 'microsoft vs code insiders\\code - insiders.exe'] },
  { canonicalName: 'cursor', category: 'Deep Work', exeNames: ['cursor.exe'], pathContains: ['cursor\\cursor.exe'] },
  { canonicalName: 'xcode', category: 'Deep Work' },
  { canonicalName: 'android studio', category: 'Deep Work', exeNames: ['studio64.exe'], pathContains: ['android\\android studio\\bin\\studio64.exe'] },
  { canonicalName: 'sublime text', category: 'Deep Work' },
  { canonicalName: 'sublime merge', category: 'Deep Work' },
  { canonicalName: 'zed', category: 'Deep Work' },
  { canonicalName: 'intellij idea', category: 'Deep Work' },
  { canonicalName: 'pycharm', category: 'Deep Work' },
  { canonicalName: 'webstorm', category: 'Deep Work' },
  { canonicalName: 'datagrip', category: 'Deep Work' },
  { canonicalName: 'docker desktop', category: 'Deep Work', aliases: ['docker'], exeNames: ['docker desktop.exe'], pathContains: ['docker\\docker\\docker desktop.exe'] },
  { canonicalName: 'wireshark', category: 'Deep Work' },
  { canonicalName: 'notepad++', category: 'Deep Work' },
  { canonicalName: 'terminal', category: 'Deep Work', aliases: ['apple terminal'] },
  { canonicalName: 'iterm', category: 'Deep Work', aliases: ['iterm2', 'i term', 'i term 2'] },
  { canonicalName: 'postman', category: 'Deep Work' },
  { canonicalName: 'windows terminal', category: 'Deep Work', aliases: ['windows terminal preview', 'terminal'], exeNames: ['windowsterminal.exe', 'windowsterminalpreview.exe'] },
  { canonicalName: 'powershell', category: 'Deep Work', aliases: ['windows powershell'], exeNames: ['powershell.exe', 'pwsh.exe'] },
  { canonicalName: 'cmd', category: 'Deep Work', aliases: ['command prompt'], exeNames: ['cmd.exe'] },
  { canonicalName: 'git bash', category: 'Deep Work', aliases: ['git-bash', 'mingw64'], exeNames: ['git-bash.exe', 'mintty.exe'], pathContains: ['git\\usr\\bin\\mintty.exe', 'git\\git-bash.exe'] },
  { canonicalName: 'windows subsystem for linux', category: 'Deep Work', aliases: ['wsl'], exeNames: ['wsl.exe'] },
  { canonicalName: 'filezilla', category: 'Deep Work', exeNames: ['filezilla.exe'] },
  { canonicalName: 'winscp', category: 'Deep Work', exeNames: ['winscp.exe'] },
  { canonicalName: 'putty', category: 'Deep Work', exeNames: ['putty.exe'] },
  { canonicalName: 'dbeaver', category: 'Deep Work', exeNames: ['dbeaver.exe'] },
  { canonicalName: 'pgadmin', category: 'Deep Work', aliases: ['pgadmin 4'], exeNames: ['pgadmin4.exe'] },
  { canonicalName: 'mysql workbench', category: 'Deep Work', exeNames: ['mysqlworkbench.exe'] },

  { canonicalName: 'notion', category: 'Study' },
  { canonicalName: 'obsidian', category: 'Study' },
  { canonicalName: 'adobe acrobat', category: 'Study', aliases: ['adobe acrobat reader'] },
  { canonicalName: 'microsoft word', category: 'Study', aliases: ['word'] },
  { canonicalName: 'microsoft excel', category: 'Study', aliases: ['excel'] },
  { canonicalName: 'microsoft powerpoint', category: 'Study', aliases: ['powerpoint'] },
  { canonicalName: 'microsoft onenote', category: 'Study', aliases: ['onenote'] },
  { canonicalName: 'pages', category: 'Study' },
  { canonicalName: 'numbers', category: 'Study' },
  { canonicalName: 'keynote', category: 'Study' },

  { canonicalName: 'slack', category: 'Communication' },
  { canonicalName: 'discord', category: 'Communication' },
  { canonicalName: 'telegram', category: 'Communication', aliases: ['telegram desktop'] },
  { canonicalName: 'outlook', category: 'Communication', aliases: ['microsoft outlook'] },
  { canonicalName: 'outlook', category: 'Communication', aliases: ['microsoft outlook'], exeNames: ['outlook.exe'] },
  { canonicalName: 'microsoft teams', category: 'Meetings', aliases: ['teams'], exeNames: ['teams.exe', 'ms-teams.exe', 'msteams.exe'] },
  { canonicalName: 'discord', category: 'Communication', exeNames: ['discord.exe'] },
  { canonicalName: 'slack', category: 'Communication', exeNames: ['slack.exe'] },
  { canonicalName: 'telegram', category: 'Communication', aliases: ['telegram desktop'], exeNames: ['telegram.exe', 'telegram desktop.exe'] },
  { canonicalName: 'whatsapp', category: 'Communication', aliases: ['whatsapp beta', 'whatsapp desktop'], exeNames: ['whatsapp.exe'] },
  { canonicalName: 'messages', category: 'Communication', aliases: ['imessage'] },
  { canonicalName: 'mail', category: 'Communication', aliases: ['apple mail'] },
  { canonicalName: 'signal', category: 'Communication' },
  { canonicalName: 'wechat', category: 'Communication', aliases: ['weixin'] },

  { canonicalName: 'zoom', category: 'Meetings', aliases: ['zoom workplace', 'zoom.us'], exeNames: ['zoom.exe'] },
  { canonicalName: 'microsoft teams', category: 'Meetings', aliases: ['teams'] },
  { canonicalName: 'google meet', category: 'Meetings' },
  { canonicalName: 'webex', category: 'Meetings' },
  { canonicalName: 'slack huddle', category: 'Meetings' },

  { canonicalName: 'steam', category: 'Gaming', exeNames: ['steam.exe'] },
  { canonicalName: 'battle.net', category: 'Gaming', exeNames: ['battle.net.exe', 'battle.net launcher.exe'] },
  { canonicalName: 'epic games launcher', category: 'Gaming', exeNames: ['epicgameslauncher.exe'] },
  { canonicalName: 'minecraft', category: 'Gaming' },
  { canonicalName: 'riot client', category: 'Gaming', exeNames: ['riotclientservices.exe'], pathContains: ['riot games\\riot client\\riotclientservices.exe'] },
  { canonicalName: 'valorant', category: 'Gaming', exeNames: ['valorant.exe'] },
  { canonicalName: 'league of legends', category: 'Gaming', exeNames: ['leagueclient.exe', 'leagueclientux.exe'] },
  { canonicalName: 'genshin impact', category: 'Gaming', exeNames: ['genshinimpact.exe', 'launcher.exe'] },

  { canonicalName: 'bitwarden', category: 'Admin', exeNames: ['bitwarden.exe'] },
  { canonicalName: 'file explorer', category: 'Admin', aliases: ['windows explorer', 'finder'] },
  { canonicalName: 'task manager', category: 'Admin' },
  { canonicalName: 'control panel', category: 'Admin' },
  { canonicalName: 'system settings', category: 'Admin', aliases: ['settings'] },
  { canonicalName: 'activity monitor', category: 'Admin' },
  { canonicalName: '1password', category: 'Admin', aliases: ['1password 7', '1password 8'] },
  { canonicalName: 'keepass', category: 'Admin', aliases: ['keepass password safe'], exeNames: ['keepass.exe'] },
  { canonicalName: 'keepassxc', category: 'Admin', aliases: ['keepassxc'], exeNames: ['keepassxc.exe'] },

  { canonicalName: 'chronolog', category: 'ChronoLog' },
];

// Broad fallback browser rules.
// These are intentionally general and should lose to more specific advanced defaults.
export const BROWSER_STUDY_KEYWORDS = [
  'lecture',
  'course',
  'tutorial',
  'revision',
  'slides',
  'assignment',
  'notes',
  'canvas',
  'lms',
  'moodle',
  'coursera',
  'edx',
  'udemy',
  'khan academy',
];

export const BROWSER_DEEP_WORK_KEYWORDS = [
  'chatgpt',
  'openai',
  'github',
  'gitlab',
  'bitbucket',
  'stackoverflow',
  'stackoverflow.com',
  'docs',
  'documentation',
  'mdn',
  'localhost',
  '127.0.0.1',
  'jira',
  'confluence',
  'linear',
  'notion',
  'figma',
  'vercel',
  'netlify',
  'aws',
  'azure',
  'gcp',
  'console.cloud',
  'google docs',
  'google sheets',
  'google slides',
  'calendar.google',
];

export const BROWSER_MEETING_KEYWORDS = [
  'meet.google.com',
  'google meet',
  'zoom',
  'teams.microsoft.com',
  'microsoft teams',
  'webex',
];

export const BROWSER_GAMING_KEYWORDS = [
  'store.steampowered.com',
  'steam',
  'epic games',
  'battle.net',
  'riot games',
  'valorant',
  'league of legends',
  'genshin',
  'honkai',
];

export const BROWSER_ENTERTAINMENT_KEYWORDS = [
  'netflix',
  'hulu',
  'disneyplus',
  'disney+',
  'twitch',
  'kick.com',
  'reddit',
  'twitter',
  'x.com',
  'instagram',
  'tiktok',
  'facebook',
  'fb.com',
  '9gag',
  'imgur',
  'bilibili',
  'spotify',
];

// Curated advanced defaults.
// These are title-based "all conditions" rules designed to beat broad keyword rules.
export const BROWSER_ADVANCED_RULE_BLUEPRINTS: BrowserAdvancedRuleBlueprint[] = [
  // Communication / email
  { category: 'Communication', matchMode: 'all', terms: ['gmail', 'inbox'] },
  { category: 'Communication', matchMode: 'all', terms: ['outlook', 'inbox'] },
  { category: 'Communication', matchMode: 'all', terms: ['mail', 'inbox'] },

  // Meetings
  { category: 'Meetings', matchMode: 'all', terms: ['google meet', 'meeting'] },
  { category: 'Meetings', matchMode: 'all', terms: ['zoom', 'meeting'] },
  { category: 'Meetings', matchMode: 'all', terms: ['teams', 'meeting'] },

  // Google workspace / productivity
  { category: 'Deep Work', matchMode: 'all', terms: ['google docs', 'docs'] },
  { category: 'Deep Work', matchMode: 'all', terms: ['google sheets', 'sheets'] },
  { category: 'Deep Work', matchMode: 'all', terms: ['google slides', 'slides'] },
  { category: 'Deep Work', matchMode: 'all', terms: ['github', 'github'] },
  { category: 'Deep Work', matchMode: 'all', terms: ['stackoverflow', 'stackoverflow'] },
  { category: 'Deep Work', matchMode: 'all', terms: ['chatgpt', 'chatgpt'] },
  { category: 'Deep Work', matchMode: 'all', terms: ['openai', 'chatgpt'] },

  // Tech learning / study
  { category: 'Study', matchMode: 'all', terms: ['youtube', 'tutorial'] },
  { category: 'Study', matchMode: 'all', terms: ['youtube', 'lecture'] },
  { category: 'Study', matchMode: 'all', terms: ['youtube', 'course'] },
  { category: 'Study', matchMode: 'all', terms: ['youtube', 'revision'] },
  { category: 'Study', matchMode: 'all', terms: ['youtube', 'assignment'] },
  { category: 'Study', matchMode: 'all', terms: ['youtube', 'notes'] },

  // Specific technical work / learning
  { category: 'Deep Work', matchMode: 'all', terms: ['youtube', 'wireshark'] },
  { category: 'Deep Work', matchMode: 'all', terms: ['youtube', 'python'] },
  { category: 'Deep Work', matchMode: 'all', terms: ['youtube', 'javascript'] },
  { category: 'Deep Work', matchMode: 'all', terms: ['youtube', 'typescript'] },
  { category: 'Deep Work', matchMode: 'all', terms: ['youtube', 'react'] },
  { category: 'Deep Work', matchMode: 'all', terms: ['youtube', 'docker'] },
  { category: 'Deep Work', matchMode: 'all', terms: ['youtube', 'networking'] },

  // Entertainment
  { category: 'Entertainment', matchMode: 'all', terms: ['youtube', 'music'] },
  { category: 'Entertainment', matchMode: 'all', terms: ['youtube', 'official video'] },
  { category: 'Entertainment', matchMode: 'all', terms: ['youtube', 'trailer'] },
  { category: 'Entertainment', matchMode: 'all', terms: ['youtube', 'episode'] },
  { category: 'Entertainment', matchMode: 'all', terms: ['youtube', 'reaction'] },
  { category: 'Entertainment', matchMode: 'all', terms: ['youtube', 'highlights'] },
  { category: 'Entertainment', matchMode: 'all', terms: ['netflix', 'netflix'] },
  { category: 'Entertainment', matchMode: 'all', terms: ['spotify', 'spotify'] },

  // Gaming content in browser
  { category: 'Gaming', matchMode: 'all', terms: ['youtube', 'gameplay'] },
  { category: 'Gaming', matchMode: 'all', terms: ['youtube', 'walkthrough'] },
  { category: 'Gaming', matchMode: 'all', terms: ['youtube', 'boss fight'] },
  { category: 'Gaming', matchMode: 'all', terms: ['youtube', 'valorant'] },
  { category: 'Gaming', matchMode: 'all', terms: ['youtube', 'league of legends'] },
  { category: 'Gaming', matchMode: 'all', terms: ['youtube', 'genshin'] },
  { category: 'Gaming', matchMode: 'all', terms: ['youtube', 'honkai'] },
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