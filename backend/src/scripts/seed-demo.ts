import fs from 'fs';
import path from 'path';
import { createActivity } from '../services/activity.service';
import { createRule } from '../services/category.service';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const ACTIVITIES_DIR = path.join(DATA_DIR, 'activities');
const RULES_FILE = path.join(DATA_DIR, 'category-rules.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const TRACKER_STATE_FILE = path.join(DATA_DIR, 'tracker-state.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
console.log('*** seed-demo.ts loaded ***');

// All times are UTC. Singapore time (SGT) = UTC+8.
// So 09:00 SGT = 01:00 UTC, 14:00 SGT = 06:00 UTC, 22:00 SGT = 14:00 UTC etc.
//
// Day themes:
//   Monday    – study heavy       (~7.5h)
//   Tuesday   – deep work heavy   (~7.5h)
//   Wednesday – distraction heavy (~6.5h, starts ok, falls apart, partial evening recovery)
//   Thursday  – balanced          (~7h)
//   Friday    – meeting heavy     (~6.5h)
//   Saturday  – sparse / leisure  (~4h)
//   Sunday    – context-switch heavy (~5.5h, rapid-fire switches throughout)

type SeedRule = {
  appName: string;
  category: string;
  isAutomatic: boolean;
  keywords?: string[];
};

type SeedActivity = {
  appName: string;
  windowTitle?: string;
  url?: string;
  category?: string;
  startTime: string;
  endTime: string;
  duration: number;
  excludeFromAnalytics?: boolean;
};

// ─── Rules ────────────────────────────────────────────────────────────────────

const seedRules: SeedRule[] = [
  // Automatic rules
  { appName: 'Visual Studio Code', category: 'Deep Work',      isAutomatic: true },
  { appName: 'Cursor',             category: 'Deep Work',      isAutomatic: true },
  { appName: 'IntelliJ IDEA',      category: 'Deep Work',      isAutomatic: true },
  { appName: 'PyCharm',            category: 'Deep Work',      isAutomatic: true },
  { appName: 'WebStorm',           category: 'Deep Work',      isAutomatic: true },
  { appName: 'DataGrip',           category: 'Deep Work',      isAutomatic: true },
  { appName: 'Sublime Text',       category: 'Deep Work',      isAutomatic: true },
  { appName: 'Obsidian',           category: 'Deep Work',      isAutomatic: true },
  { appName: 'JupyterLab',         category: 'Deep Work',      isAutomatic: true },
  { appName: 'Postman',            category: 'Deep Work',      isAutomatic: true },
  { appName: 'Docker Desktop',     category: 'Deep Work',      isAutomatic: true },
  { appName: 'Terminal',           category: 'Deep Work',      isAutomatic: true },
  { appName: 'Windows Terminal',   category: 'Deep Work',      isAutomatic: true },
  { appName: 'iTerm2',             category: 'Deep Work',      isAutomatic: true },
  { appName: 'GitHub Desktop',     category: 'Deep Work',      isAutomatic: true },
  { appName: 'Notion',             category: 'Study',          isAutomatic: true },
  { appName: 'Adobe Acrobat',      category: 'Study',          isAutomatic: true },
  { appName: 'Microsoft Word',     category: 'Study',          isAutomatic: true },
  { appName: 'Microsoft PowerPoint', category: 'Study',        isAutomatic: true },
  { appName: 'Microsoft OneNote',  category: 'Study',          isAutomatic: true },
  { appName: 'Microsoft Excel',    category: 'Study',          isAutomatic: true },
  { appName: 'Google Docs',        category: 'Study',          isAutomatic: true },
  { appName: 'Google Sheets',      category: 'Study',          isAutomatic: true },
  { appName: 'Zotero',             category: 'Study',          isAutomatic: true },
  { appName: 'Mendeley Desktop',   category: 'Study',          isAutomatic: true },
  { appName: 'Slack',              category: 'Communication',  isAutomatic: true },
  { appName: 'Discord',            category: 'Communication',  isAutomatic: true },
  { appName: 'Microsoft Outlook',  category: 'Communication',  isAutomatic: true },
  { appName: 'Mail',               category: 'Communication',  isAutomatic: true },
  { appName: 'Telegram',           category: 'Communication',  isAutomatic: true },
  { appName: 'Zoom',               category: 'Meetings',       isAutomatic: true },
  { appName: 'Microsoft Teams',    category: 'Meetings',       isAutomatic: true },
  { appName: 'Google Meet',        category: 'Meetings',       isAutomatic: true },
  { appName: 'Webex',              category: 'Meetings',       isAutomatic: true },
  { appName: 'File Explorer',      category: 'Admin',          isAutomatic: true },
  { appName: 'Finder',             category: 'Admin',          isAutomatic: true },
  { appName: 'Settings',           category: 'Admin',          isAutomatic: true },
  { appName: 'Control Panel',      category: 'Admin',          isAutomatic: true },
  { appName: 'Task Manager',       category: 'Admin',          isAutomatic: true },
  { appName: 'Steam',              category: 'Gaming',         isAutomatic: true },
  { appName: 'Spotify',            category: 'Entertainment',  isAutomatic: true },
  { appName: 'YouTube',            category: 'Entertainment',  isAutomatic: true },
  { appName: 'ChronoLog',          category: 'ChronoLog',      isAutomatic: true },

  // Manual keyword rules – Firefox
  { appName: 'Firefox', category: 'Meetings',      isAutomatic: false, keywords: ['meet.google.com', 'zoom.us', 'teams.microsoft.com', 'webex'] },
  { appName: 'Firefox', category: 'Gaming',        isAutomatic: false, keywords: ['store.steampowered.com', 'steam'] },
  { appName: 'Firefox', category: 'Study',         isAutomatic: false, keywords: ['lecture', 'course', 'tutorial', 'revision', 'slides', 'assignment', 'notes', 'canvas', 'lms', 'moodle', 'elearn'] },
  { appName: 'Firefox', category: 'Deep Work',     isAutomatic: false, keywords: ['chatgpt', 'openai', 'documentation', 'docs', 'stackoverflow', 'github', 'jira', 'figma', 'confluence'] },
  { appName: 'Firefox', category: 'Entertainment', isAutomatic: false, keywords: ['netflix', 'spotify', 'twitch', 'disneyplus', 'youtube', 'reddit', 'instagram'] },

  // Manual keyword rules – Google Chrome
  { appName: 'Google Chrome', category: 'Meetings',      isAutomatic: false, keywords: ['meet.google.com', 'zoom.us', 'teams.microsoft.com', 'webex'] },
  { appName: 'Google Chrome', category: 'Gaming',        isAutomatic: false, keywords: ['store.steampowered.com', 'steam'] },
  { appName: 'Google Chrome', category: 'Study',         isAutomatic: false, keywords: ['lecture', 'course', 'tutorial', 'revision', 'slides', 'assignment', 'notes', 'canvas', 'lms', 'moodle', 'elearn'] },
  { appName: 'Google Chrome', category: 'Deep Work',     isAutomatic: false, keywords: ['chatgpt', 'openai', 'documentation', 'docs', 'stackoverflow', 'github', 'jira', 'figma', 'confluence'] },
  { appName: 'Google Chrome', category: 'Entertainment', isAutomatic: false, keywords: ['netflix', 'spotify', 'twitch', 'disneyplus', 'youtube', 'reddit', 'instagram'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function iso(date: string, time: string) {
  return `${date}T${time}:00.000Z`;
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeekMondayYmd(): string {
  const today = new Date();
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatLocalYmd(d);
}

function addDaysYmd(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return formatLocalYmd(d);
}

function minutesBetween(startIso: string, endIso: string) {
  return Math.round(((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000) * 10) / 10;
}

function makeActivity(
  date: string,
  start: string,   // UTC "HH:MM"
  end: string,     // UTC "HH:MM"
  appName: string,
  windowTitle: string,
  url?: string,
  category?: string,
  excludeFromAnalytics?: boolean
): SeedActivity {
  const startTime = iso(date, start);
  const endTime = iso(date, end);
  return {
    appName, windowTitle, url, category,
    startTime, endTime,
    duration: minutesBetween(startTime, endTime),
    excludeFromAnalytics,
  };
}

// ─── Days ─────────────────────────────────────────────────────────────────────

const monday    = startOfWeekMondayYmd();
const tuesday   = addDaysYmd(monday, 1);
const wednesday = addDaysYmd(monday, 2);
const thursday  = addDaysYmd(monday, 3);
const friday    = addDaysYmd(monday, 4);
const saturday  = addDaysYmd(monday, 5);
const sunday    = addDaysYmd(monday, 6);

// ─── Seed Activities ──────────────────────────────────────────────────────────
// All times UTC. Quick reference: SGT = UTC+8
//   09:00 SGT = 01:00 UTC    14:00 SGT = 06:00 UTC
//   10:00 SGT = 02:00 UTC    15:00 SGT = 07:00 UTC
//   11:00 SGT = 03:00 UTC    16:00 SGT = 08:00 UTC
//   12:00 SGT = 04:00 UTC    18:00 SGT = 10:00 UTC
//   13:00 SGT = 05:00 UTC    20:00 SGT = 12:00 UTC
//                             22:00 SGT = 14:00 UTC

const seedActivities: SeedActivity[] = [

  // ══════════════════════════════════════════════════════════════════
  // MONDAY – Study Heavy  (~7.5h active)
  // Narrative: Starts with lecture catch-up, deep afternoon study
  // block, winds down with light planning.
  // ══════════════════════════════════════════════════════════════════

  // Morning session – 09:00–12:30 SGT (01:00–04:30 UTC)
  makeActivity(monday, '01:00', '01:50', 'Notion',        'SPM Notes – Product Roadmaps',                      undefined,                                           'Study'),
  makeActivity(monday, '01:50', '02:40', 'Firefox',       'YouTube – Dynamic Programming Lecture',             'https://www.youtube.com/watch?v=dp-lecture-1',      'Study'),
  makeActivity(monday, '02:40', '02:42', 'Discord',       'General Chat – quick check',                        undefined,                                           'Communication'),
  makeActivity(monday, '02:42', '03:40', 'Visual Studio Code', 'ChronoLog – tracker.ts',                       undefined,                                           'Deep Work'),
  makeActivity(monday, '03:40', '03:41', 'Firefox',       'Steam Store – weekend sale',                        'https://store.steampowered.com/app/123',             'Gaming'),
  makeActivity(monday, '03:41', '03:42', 'Firefox',       'YouTube – lofi mix',                                'https://www.youtube.com/watch?v=lofi-1',            'Entertainment'),
  makeActivity(monday, '03:42', '04:30', 'Adobe Acrobat', 'CN Week 8 Slides.pdf',                              undefined,                                           'Study'),
  // 12:30–13:30 SGT – lunch break (idle, no entries)

  // Afternoon session – 13:30–18:00 SGT (05:30–10:00 UTC)
  makeActivity(monday, '05:30', '05:45', 'Slack',         'Study Group – assignment planning',                 undefined,                                           'Communication'),
  makeActivity(monday, '05:45', '06:30', 'Firefox',       'ChatGPT – algorithm explanation',                   'https://chat.openai.com/c/demo-mon-1',              'Deep Work'),
  makeActivity(monday, '06:30', '06:32', 'File Explorer', 'Lecture Downloads',                                 undefined,                                           'Admin'),
  makeActivity(monday, '06:32', '06:35', 'Firefox',       'Zoom – quick team check-in',                        'https://zoom.us/j/demo-mon-1',                      'Meetings'),
  makeActivity(monday, '06:35', '07:25', 'Adobe Acrobat', 'CN Week 9 Slides.pdf',                              undefined,                                           'Study'),
  makeActivity(monday, '07:25', '08:15', 'Visual Studio Code', 'Assignment 1 – dp-solution.ts',                undefined,                                           'Deep Work'),
  makeActivity(monday, '08:15', '08:30', 'Spotify',       'Study Chill Playlist',                              undefined,                                           'Entertainment'),
  makeActivity(monday, '08:30', '09:00', 'Notion',        'Weekly Study Planner',                              undefined,                                           'Study'),
  makeActivity(monday, '09:00', '09:05', 'File Explorer', 'Organise Downloads Folder',                         undefined,                                           'Admin'),
  // 18:05–20:00 SGT – dinner break (idle)

  // Evening session – 20:00–22:30 SGT (12:00–14:30 UTC)
  makeActivity(monday, '12:00', '12:50', 'Firefox',       'YouTube – CS lecture playlist',                     'https://www.youtube.com/watch?v=cs-lecture-2',      'Study'),
  makeActivity(monday, '12:50', '13:20', 'Notion',        'CN Summary Notes',                                  undefined,                                           'Study'),
  makeActivity(monday, '13:20', '13:50', 'Visual Studio Code', 'Assignment 1 – final polish',                  undefined,                                           'Deep Work'),
  makeActivity(monday, '13:50', '14:00', 'Discord',       'Assignment check-in with team',                     undefined,                                           'Communication'),
  makeActivity(monday, '14:00', '14:30', 'Spotify',       'Late Night Focus Playlist',                         undefined,                                           'Entertainment'),

  // ══════════════════════════════════════════════════════════════════
  // TUESDAY – Deep Work Heavy  (~7.5h active)
  // Narrative: Internship-style work day. Long coding blocks,
  // meetings, then a late push on a personal project.
  // ══════════════════════════════════════════════════════════════════

  // Morning session – 09:00–12:30 SGT (01:00–04:30 UTC)
  makeActivity(tuesday, '01:00', '01:55', 'Cursor',        'Insights.tsx – AI feedback component',              undefined,                                           'Deep Work'),
  makeActivity(tuesday, '01:55', '02:30', 'Firefox',       'ChatGPT – prompt tuning',                           'https://chat.openai.com/c/demo-tue-1',              'Deep Work'),
  makeActivity(tuesday, '02:30', '03:05', 'Slack',         'Deloitte Intern – daily standup thread',            undefined,                                           'Communication'),
  makeActivity(tuesday, '03:05', '03:40', 'Firefox',       'Google Meet – weekly sync',                         'https://meet.google.com/abc-defg-hij',              'Meetings'),
  makeActivity(tuesday, '03:40', '04:10', 'File Explorer', 'Evidence Folder Review',                            undefined,                                           'Admin'),
  makeActivity(tuesday, '04:10', '04:25', 'Adobe Acrobat', 'Client Briefing Notes.pdf',                         undefined,                                           'Study'),
  makeActivity(tuesday, '04:25', '04:30', 'Notion',        'Sprint Checklist',                                  undefined,                                           'Study'),
  // 12:30–13:30 SGT – lunch break (idle)

  // Afternoon session – 13:30–18:30 SGT (05:30–10:30 UTC)
  makeActivity(tuesday, '05:30', '06:30', 'Cursor',        'activity.service.ts – refactor',                    undefined,                                           'Deep Work'),
  makeActivity(tuesday, '06:30', '06:35', 'Firefox',       'YouTube – productivity music mix',                  'https://www.youtube.com/watch?v=focus-mix',         'Entertainment'),
  makeActivity(tuesday, '06:35', '06:38', 'Steam',         'Store – quick browse',                              undefined,                                           'Gaming'),
  makeActivity(tuesday, '06:38', '06:40', 'Adobe Acrobat', 'Reference Snippet.pdf',                             undefined,                                           'Study'),
  makeActivity(tuesday, '06:40', '07:40', 'Visual Studio Code', 'category.service.ts',                          undefined,                                           'Deep Work'),
  makeActivity(tuesday, '07:40', '08:00', 'Firefox',       'StackOverflow – TypeScript generics',               'https://stackoverflow.com/questions/ts-generics',   'Deep Work'),
  makeActivity(tuesday, '08:00', '08:20', 'Slack',         'PR review comments',                                undefined,                                           'Communication'),
  makeActivity(tuesday, '08:20', '08:50', 'Firefox',       'GitHub – pull request review',                      'https://github.com/team/chronolog/pull/42',         'Deep Work'),
  makeActivity(tuesday, '08:50', '09:30', 'Google Docs',   'Internship Report – Week 3 Draft',                  undefined,                                           'Study'),
  makeActivity(tuesday, '09:30', '09:35', 'File Explorer', 'Screenshots Folder',                                undefined,                                           'Admin'),
  // 18:35–20:30 SGT – dinner + break (idle)

  // Evening session – 20:30–23:00 SGT (12:30–15:00 UTC)
  makeActivity(tuesday, '12:30', '13:30', 'Cursor',        'seed-demo.ts – data seeding',                       undefined,                                           'Deep Work'),
  makeActivity(tuesday, '13:30', '13:50', 'Firefox',       'ChatGPT – architecture ideas',                      'https://chat.openai.com/c/demo-tue-2',              'Deep Work'),
  makeActivity(tuesday, '13:50', '14:10', 'Notion',        'Personal Project Roadmap',                          undefined,                                           'Study'),
  makeActivity(tuesday, '14:10', '14:30', 'Spotify',       'Late Night Deep Work Playlist',                     undefined,                                           'Entertainment'),
  makeActivity(tuesday, '14:30', '14:50', 'Visual Studio Code', 'seed-demo.ts – final tweaks',                  undefined,                                           'Deep Work'),

  // ══════════════════════════════════════════════════════════════════
  // WEDNESDAY – Distraction Heavy  (~6.5h active)
  // Narrative: Starts with a short productive burst, then gaming
  // takes over mid-morning. Guilt-driven recovery attempt in the
  // afternoon. Evening is mixed and unfocused.
  // ══════════════════════════════════════════════════════════════════

  // Morning – starts ok, derails fast (09:00–12:00 SGT = 01:00–04:00 UTC)
  makeActivity(wednesday, '01:00', '01:45', 'Visual Studio Code', 'Assignment 2 – data structures',             undefined,                                           'Deep Work'),
  makeActivity(wednesday, '01:45', '01:46', 'Firefox',     'Steam Store – Helldivers 2',                        'https://store.steampowered.com/app/553850',         'Gaming'),
  makeActivity(wednesday, '01:46', '01:47', 'Firefox',     'YouTube – funny clips',                             'https://www.youtube.com/watch?v=funny-1',           'Entertainment'),
  makeActivity(wednesday, '01:47', '01:48', 'Firefox',     'ChatGPT – random question',                         'https://chat.openai.com/c/demo-wed-1',              'Deep Work'),
  makeActivity(wednesday, '01:48', '01:49', 'Discord',     'Meme channel',                                      undefined,                                           'Communication'),
  makeActivity(wednesday, '01:49', '03:15', 'Steam',       'Monster Hunter Wilds',                              undefined,                                           'Gaming'),
  makeActivity(wednesday, '03:15', '03:45', 'Discord',     'Gaming voice chat',                                 undefined,                                           'Communication'),
  makeActivity(wednesday, '03:45', '03:50', 'Firefox',     'YouTube – game highlights',                         'https://www.youtube.com/watch?v=mhw-highlights',    'Entertainment'),
  makeActivity(wednesday, '03:50', '04:00', 'Steam',       'Achievement Review',                                undefined,                                           'Gaming'),
  // 12:00–13:30 SGT – lunch (idle)

  // Afternoon – guilt-driven recovery (13:30–17:30 SGT = 05:30–09:30 UTC)
  makeActivity(wednesday, '05:30', '05:35', 'File Explorer', 'Screenshots Cleanup',                             undefined,                                           'Admin'),
  makeActivity(wednesday, '05:35', '06:05', 'Firefox',     'Zoom – casual team catchup',                        'https://zoom.us/j/987654321',                       'Meetings'),
  makeActivity(wednesday, '06:05', '07:00', 'Visual Studio Code', 'Assignment 2 – catch-up',                    undefined,                                           'Deep Work'),
  makeActivity(wednesday, '07:00', '07:05', 'Firefox',     'YouTube – another clip',                            'https://www.youtube.com/watch?v=funny-2',           'Entertainment'),
  makeActivity(wednesday, '07:05', '07:10', 'Discord',     'Quick ping',                                        undefined,                                           'Communication'),
  makeActivity(wednesday, '07:10', '07:55', 'Adobe Acrobat', 'Game Review Notes.pdf (repurposed for study)',    undefined,                                           'Study'),
  makeActivity(wednesday, '07:55', '08:10', 'Notion',      'Catch-up Notes',                                    undefined,                                           'Study'),
  makeActivity(wednesday, '08:10', '08:20', 'Firefox',     'StackOverflow – array algorithm',                   'https://stackoverflow.com/questions/arrays',        'Deep Work'),
  makeActivity(wednesday, '08:20', '08:25', 'Steam',       'Store Wishlist',                                    undefined,                                           'Gaming'),
  makeActivity(wednesday, '08:25', '09:00', 'Spotify',     'Chill Mix',                                         undefined,                                           'Entertainment'),
  // 17:30–20:00 SGT – dinner + gaming break (idle)

  // Evening – unfocused (20:00–22:30 SGT = 12:00–14:30 UTC)
  makeActivity(wednesday, '12:00', '12:02', 'Firefox',     'YouTube – trailer',                                 'https://www.youtube.com/watch?v=trailer-2',         'Entertainment'),
  makeActivity(wednesday, '12:02', '12:03', 'Discord',     'Gaming server',                                     undefined,                                           'Communication'),
  makeActivity(wednesday, '12:03', '12:50', 'Steam',       'Monster Hunter Wilds – evening session',            undefined,                                           'Gaming'),
  makeActivity(wednesday, '12:50', '13:20', 'Visual Studio Code', 'Assignment 2 – last attempt',                undefined,                                           'Deep Work'),
  makeActivity(wednesday, '13:20', '13:40', 'Firefox',     'YouTube – lo-fi study',                             'https://www.youtube.com/watch?v=lofi-wed',          'Entertainment'),
  makeActivity(wednesday, '13:40', '14:10', 'Spotify',     'Late Night Playlist',                               undefined,                                           'Entertainment'),

  // ══════════════════════════════════════════════════════════════════
  // THURSDAY – Balanced  (~7h active)
  // Narrative: Healthy mix of study, deep work, a meeting, and
  // intentional short breaks. A model productive day.
  // ══════════════════════════════════════════════════════════════════

  // Morning session – 09:00–12:30 SGT (01:00–04:30 UTC)
  makeActivity(thursday, '01:00', '01:40', 'Notion',       'DAA Quiz Revision',                                 undefined,                                           'Study'),
  makeActivity(thursday, '01:40', '02:20', 'Firefox',      'StackOverflow – TypeScript generics',               'https://stackoverflow.com/questions/ts-12345',      'Deep Work'),
  makeActivity(thursday, '02:20', '02:25', 'Spotify',      'Focus Playlist',                                    undefined,                                           'Entertainment'),
  makeActivity(thursday, '02:25', '03:00', 'Adobe Acrobat', 'Research Paper – Attention Span.pdf',              undefined,                                           'Study'),
  makeActivity(thursday, '03:00', '03:35', 'Slack',        'Project Updates + code review comments',            undefined,                                           'Communication'),
  makeActivity(thursday, '03:35', '04:05', 'Firefox',      'YouTube – music focus mix',                         'https://www.youtube.com/watch?v=music-focus-1',     'Entertainment'),
  makeActivity(thursday, '04:05', '04:30', 'Microsoft Excel', 'CS206 Group Data Analysis',                      undefined,                                           'Study'),
  // 12:30–13:30 SGT – lunch break (idle)

  // Afternoon session – 13:30–18:00 SGT (05:30–10:00 UTC)
  makeActivity(thursday, '05:30', '06:05', 'Firefox',      'Google Meet – project sync',                        'https://meet.google.com/thu-sync',                  'Meetings'),
  makeActivity(thursday, '06:05', '07:05', 'Visual Studio Code', 'tracker.ts – idle detection logic',           undefined,                                           'Deep Work'),
  makeActivity(thursday, '07:05', '07:10', 'File Explorer', 'Project Archive',                                  undefined,                                           'Admin'),
  makeActivity(thursday, '07:10', '07:13', 'Discord',      'Quick reply',                                       undefined,                                           'Communication'),
  makeActivity(thursday, '07:13', '07:55', 'Cursor',       'activity.store.ts – refactor',                      undefined,                                           'Deep Work'),
  makeActivity(thursday, '07:55', '08:10', 'Firefox',      'GitHub – push and PR',                              'https://github.com/team/chronolog/pull/45',         'Deep Work'),
  makeActivity(thursday, '08:10', '08:15', 'Steam',        'Store – browse wishlist',                           undefined,                                           'Gaming'),
  makeActivity(thursday, '08:15', '08:20', 'File Explorer', 'Rename project files',                             undefined,                                           'Admin'),
  makeActivity(thursday, '08:20', '09:00', 'Notion',       'Weekly Reflection + Goals',                         undefined,                                           'Study'),
  makeActivity(thursday, '09:00', '09:05', 'Discord',      'Group check-in',                                    undefined,                                           'Communication'),
  // 18:05–20:00 SGT – dinner break (idle)

  // Evening session – 20:00–22:30 SGT (12:00–14:30 UTC)
  makeActivity(thursday, '12:00', '12:45', 'Adobe Acrobat', 'CN Week 10 Slides.pdf',                            undefined,                                           'Study'),
  makeActivity(thursday, '12:45', '13:20', 'Visual Studio Code', 'Assignment 2 – final submission',             undefined,                                           'Deep Work'),
  makeActivity(thursday, '13:20', '13:50', 'Spotify',      'Wind Down Playlist',                                undefined,                                           'Entertainment'),
  makeActivity(thursday, '13:50', '14:20', 'Notion',       'Tomorrow\'s Task List',                             undefined,                                           'Study'),
  makeActivity(thursday, '14:20', '14:30', 'Discord',      'Goodnight messages',                                undefined,                                           'Communication'),

  // ══════════════════════════════════════════════════════════════════
  // FRIDAY – Meeting Heavy  (~6.5h active)
  // Narrative: Back-to-back morning meetings, deep work in the
  // afternoon, ChronoLog dashboard check, ends early.
  // ══════════════════════════════════════════════════════════════════

  // Morning session – 09:00–13:00 SGT (01:00–05:00 UTC)
  makeActivity(friday, '01:00', '01:50', 'Firefox',        'Zoom Workplace – team standup',                     'https://zoom.us/j/123456789',                       'Meetings'),
  makeActivity(friday, '01:50', '02:20', 'Slack',          'Ops channel – follow-ups',                          undefined,                                           'Communication'),
  makeActivity(friday, '02:20', '02:25', 'File Explorer',  'Shared Drive Review',                               undefined,                                           'Admin'),
  makeActivity(friday, '02:25', '03:05', 'Firefox',        'Google Meet – retrospective',                       'https://meet.google.com/fri-retro',                 'Meetings'),
  makeActivity(friday, '03:05', '03:20', 'Microsoft Outlook', 'Action items from retro',                        undefined,                                           'Communication'),
  makeActivity(friday, '03:20', '03:50', 'Firefox',        'Google Meet – stakeholder review',                  'https://meet.google.com/fri-stakeholder',           'Meetings'),
  makeActivity(friday, '03:50', '04:05', 'Notion',         'Meeting notes & decisions',                         undefined,                                           'Study'),
  makeActivity(friday, '04:05', '04:50', 'Google Chrome',  'ChatGPT – architecture brainstorming',              'https://chat.openai.com/c/demo-fri-1',              'Deep Work'),
  // 13:00–14:00 SGT – lunch break (idle)

  // Afternoon session – 14:00–18:30 SGT (06:00–10:30 UTC)
  makeActivity(friday, '06:00', '06:55', 'Visual Studio Code', 'activity.service.ts – cleanup',                 undefined,                                           'Deep Work'),
  makeActivity(friday, '06:55', '07:00', 'ChronoLog',      'ChronoLog – Dashboard review',                      undefined,                                           'ChronoLog', true),
  makeActivity(friday, '07:00', '07:30', 'Adobe Acrobat',  'Meeting Summary.pdf',                               undefined,                                           'Study'),
  makeActivity(friday, '07:30', '08:00', 'Notion',         'Follow-up task list',                               undefined,                                           'Study'),
  makeActivity(friday, '08:00', '08:15', 'Steam',          'Store – weekend wishlist',                          undefined,                                           'Gaming'),
  makeActivity(friday, '08:15', '08:30', 'Spotify',        'Friday Wind-Down',                                  undefined,                                           'Entertainment'),
  makeActivity(friday, '08:30', '09:00', 'Slack',          'End of week wrap-up messages',                      undefined,                                           'Communication'),
  makeActivity(friday, '09:00', '09:05', 'File Explorer',  'Archive project files',                             undefined,                                           'Admin'),
  // Finish early – no evening session (Friday vibes)
  makeActivity(friday, '10:00', '10:30', 'Steam',          'Monster Hunter Wilds – weekend warm-up',            undefined,                                           'Gaming'),
  makeActivity(friday, '10:30', '10:35', 'Discord',        'Gaming group chat',                                 undefined,                                           'Communication'),

  // ══════════════════════════════════════════════════════════════════
  // SATURDAY – Sparse / Leisure  (~4h active)
  // Narrative: Relaxed day. Some light study, then gaming and music.
  // ══════════════════════════════════════════════════════════════════

  // Late morning – 10:00–12:30 SGT (02:00–04:30 UTC)
  makeActivity(saturday, '02:00', '02:25', 'Adobe Acrobat', 'Algorithm Notes.pdf',                              undefined,                                           'Study'),
  makeActivity(saturday, '02:25', '02:50', 'Firefox',       'YouTube – recursion tutorial',                     'https://www.youtube.com/watch?v=recursion-1',       'Study'),
  makeActivity(saturday, '02:50', '03:15', 'Notion',        'Weekend light notes',                              undefined,                                           'Study'),
  makeActivity(saturday, '03:15', '03:30', 'Discord',       'Weekend group chat',                               undefined,                                           'Communication'),
  makeActivity(saturday, '03:30', '04:00', 'Firefox',       'ChatGPT – study planning',                         'https://chat.openai.com/c/demo-sat-1',              'Deep Work'),
  makeActivity(saturday, '04:00', '04:10', 'File Explorer', 'Desktop cleanup',                                  undefined,                                           'Admin'),
  // Afternoon – leisure
  makeActivity(saturday, '05:00', '05:20', 'Firefox',       'Zoom – weekend check-in with friends',             'https://zoom.us/j/24681012',                        'Meetings'),
  makeActivity(saturday, '05:20', '05:50', 'Spotify',       'Weekend Chill Mix',                                undefined,                                           'Entertainment'),
  makeActivity(saturday, '05:50', '06:50', 'Steam',         'Monster Hunter Wilds',                             undefined,                                           'Gaming'),
  makeActivity(saturday, '06:50', '07:00', 'Discord',       'Post-game voice chat',                             undefined,                                           'Communication'),
  makeActivity(saturday, '07:00', '07:30', 'Firefox',       'YouTube – music mix',                              'https://www.youtube.com/watch?v=sat-music',         'Entertainment'),
  makeActivity(saturday, '07:30', '08:00', 'Spotify',       'Saturday Evening Playlist',                        undefined,                                           'Entertainment'),

  // ══════════════════════════════════════════════════════════════════
  // SUNDAY – Context-Switch Heavy  (~5.5h active)
  // Narrative: Pre-week anxiety. Rapidly bouncing between tabs,
  // apps, distractions. A clear demo of ChronoLog's core value.
  // ══════════════════════════════════════════════════════════════════

  // Morning – rapid-fire context switches (09:00–11:30 SGT = 01:00–03:30 UTC)
  makeActivity(sunday, '01:00', '01:01', 'Firefox',        'Steam Store – sale page',                           'https://store.steampowered.com/sale/demo',          'Gaming'),
  makeActivity(sunday, '01:01', '01:02', 'Firefox',        'YouTube – networking lecture',                      'https://www.youtube.com/watch?v=net-lecture',       'Study'),
  makeActivity(sunday, '01:02', '01:03', 'Firefox',        'ChatGPT – CN question',                             'https://chat.openai.com/c/demo-sun-1',              'Deep Work'),
  makeActivity(sunday, '01:03', '01:04', 'Firefox',        'YouTube – funny trailer',                           'https://www.youtube.com/watch?v=trailer-1',         'Entertainment'),
  makeActivity(sunday, '01:04', '01:05', 'Discord',        'Meme channel',                                      undefined,                                           'Communication'),
  makeActivity(sunday, '01:05', '01:06', 'Firefox',        'Reddit – r/programming',                            'https://www.reddit.com/r/programming',              'Entertainment'),
  makeActivity(sunday, '01:06', '01:07', 'Slack',          'Sunday check',                                      undefined,                                           'Communication'),
  makeActivity(sunday, '01:07', '01:08', 'Firefox',        'GitHub – browsing issues',                          'https://github.com/team/chronolog',                 'Deep Work'),
  makeActivity(sunday, '01:08', '01:09', 'File Explorer',  'Random desktop browse',                             undefined,                                           'Admin'),
  makeActivity(sunday, '01:09', '01:10', 'Firefox',        'YouTube – lo-fi',                                   'https://www.youtube.com/watch?v=lofi-sun',          'Entertainment'),
  makeActivity(sunday, '01:10', '01:45', 'Visual Studio Code', 'tracker.ts – attempted focus',                  undefined,                                           'Deep Work'),
  makeActivity(sunday, '01:45', '01:47', 'Discord',        'Sunday group chat',                                 undefined,                                           'Communication'),
  makeActivity(sunday, '01:47', '01:48', 'Firefox',        'Steam Store – new releases',                        'https://store.steampowered.com/explore/new',        'Gaming'),
  makeActivity(sunday, '01:48', '02:00', 'Firefox',        'YouTube – CN lecture',                              'https://www.youtube.com/watch?v=cn-lecture-1',      'Study'),
  makeActivity(sunday, '02:00', '02:05', 'Adobe Acrobat',  'CN Week 10 Slides.pdf',                             undefined,                                           'Study'),
  makeActivity(sunday, '02:05', '02:06', 'Spotify',        'Quick switch to music',                             undefined,                                           'Entertainment'),
  makeActivity(sunday, '02:06', '02:07', 'Firefox',        'Reddit – r/learnprogramming',                       'https://www.reddit.com/r/learnprogramming',         'Entertainment'),
  makeActivity(sunday, '02:07', '02:30', 'Notion',         'Weekly review attempt',                             undefined,                                           'Study'),
  makeActivity(sunday, '02:30', '02:35', 'Slack',          'Weekend project messages',                          undefined,                                           'Communication'),
  makeActivity(sunday, '02:35', '02:50', 'Adobe Acrobat',  'Weekly Review Notes.pdf',                           undefined,                                           'Study'),
  // 11:30–13:30 SGT – brunch break (idle)

  // Afternoon – more switches, some recovery (13:30–17:30 SGT = 05:30–09:30 UTC)
  makeActivity(sunday, '05:30', '05:31', 'Discord',        'Gaming ping',                                       undefined,                                           'Communication'),
  makeActivity(sunday, '05:31', '05:32', 'Firefox',        'YouTube – quick clip',                              'https://www.youtube.com/watch?v=clip-sun-1',        'Entertainment'),
  makeActivity(sunday, '05:32', '05:33', 'Steam',          'Store wishlist',                                    undefined,                                           'Gaming'),
  makeActivity(sunday, '05:33', '05:34', 'Slack',          'Group message reply',                               undefined,                                           'Communication'),
  makeActivity(sunday, '05:34', '05:35', 'Firefox',        'ChatGPT – random question',                         'https://chat.openai.com/c/demo-sun-2',              'Deep Work'),
  makeActivity(sunday, '05:35', '05:36', 'Firefox',        'GitHub – checking PRs',                             'https://github.com/team/chronolog/pulls',           'Deep Work'),
  makeActivity(sunday, '05:36', '05:37', 'Discord',        'Another ping',                                      undefined,                                           'Communication'),
  makeActivity(sunday, '05:37', '06:20', 'Visual Studio Code', 'Trying to code – low focus',                    undefined,                                           'Deep Work'),
  makeActivity(sunday, '06:20', '06:50', 'Firefox',        'Google Meet – study group',                         'https://meet.google.com/sun-demo-sync',             'Meetings'),
  makeActivity(sunday, '06:50', '07:05', 'Steam',          'Store wishlist',                                    undefined,                                           'Gaming'),
  makeActivity(sunday, '07:05', '07:20', 'Adobe Acrobat',  'Short reading memo.pdf',                            undefined,                                           'Study'),
  makeActivity(sunday, '07:20', '07:23', 'Discord',        'Weekend ping',                                      undefined,                                           'Communication'),
  makeActivity(sunday, '07:23', '07:26', 'Firefox',        'YouTube – one more clip',                           'https://www.youtube.com/watch?v=clip-sun-2',        'Entertainment'),
  makeActivity(sunday, '07:26', '08:00', 'Notion',         'Actual weekly review',                              undefined,                                           'Study'),
  makeActivity(sunday, '08:00', '08:30', 'Microsoft Excel', 'Week tracking spreadsheet',                        undefined,                                           'Study'),
  makeActivity(sunday, '08:30', '09:00', 'Spotify',        'Sunday Evening Playlist',                           undefined,                                           'Entertainment'),
  // Sunday wind-down
  makeActivity(sunday, '10:00', '10:30', 'Notion',         'Goals for next week',                               undefined,                                           'Study'),
  makeActivity(sunday, '10:30', '10:35', 'Discord',        'Goodnight',                                         undefined,                                           'Communication'),
];

// ─── Settings ─────────────────────────────────────────────────────────────────

function writeDemoSettings() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const settingsPayload = {
    settings: {
      trackingEnabled: false,
      idleDetectionEnabled: true,
      notificationsEnabled: true,
      launchAtStartup: true,
      runInBackground: true,
      pollIntervalSeconds: 5,
      idleThresholdMinutes: 5,
      retentionDays: 90,
    },
    privacy: {
      excludedApps: [
        'GitHub Desktop',
        'IntelliJ IDEA',
      ],
      respectPrivateBrowsing: true,
    },
  };

  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsPayload, null, 2), 'utf8');
  console.log('Created default demo settings.json');
}

// ─── Store helpers ─────────────────────────────────────────────────────────────

function resetDemoStore() {
  if (fs.existsSync(ACTIVITIES_DIR))   fs.rmSync(ACTIVITIES_DIR,   { recursive: true, force: true });
  if (fs.existsSync(RULES_FILE))       fs.rmSync(RULES_FILE,       { force: true });
  if (fs.existsSync(SETTINGS_FILE))    fs.rmSync(SETTINGS_FILE,    { force: true });
  if (fs.existsSync(TRACKER_STATE_FILE)) fs.rmSync(TRACKER_STATE_FILE, { force: true });
  if (fs.existsSync(CATEGORIES_FILE))  fs.rmSync(CATEGORIES_FILE,  { force: true });
  console.log('Reset demo data store.');
}

function seedRulesToStore() {
  for (const rule of seedRules) {
    createRule({
      appName: rule.appName,
      category: rule.category as any,
      isAutomatic: rule.isAutomatic,
      keywords: rule.keywords ?? [],
    });
  }
}

function seedActivitiesToStore() {
  for (const activity of seedActivities) {
    createActivity({
      appName: activity.appName,
      windowTitle: activity.windowTitle,
      url: activity.url,
      category: activity.category as any,
      startTime: activity.startTime,
      endTime: activity.endTime,
      duration: activity.duration,
      excludeFromAnalytics: activity.excludeFromAnalytics,
    });
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('*** main() started ***');
  resetDemoStore();

  console.log('Creating demo settings...');
  writeDemoSettings();

  console.log('Seeding ChronoLog demo rules...');
  seedRulesToStore();

  console.log('Seeding ChronoLog demo activities...');
  seedActivitiesToStore();

  console.log(`Done. Seeded ${seedRules.length} rules and ${seedActivities.length} activities.`);
}

main();