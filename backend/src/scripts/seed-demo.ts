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

// If your project exports these store helpers, uncomment and use them.
// import { writeDay, availableDates } from '../store/activity.store';
// import { writeRules } from '../store/category-rules.store';

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
  duration: number; // minutes
  excludeFromAnalytics?: boolean;
};

const seedRules: SeedRule[] = [
  { appName: 'Visual Studio Code', category: 'Work', isAutomatic: true },
  { appName: 'Cursor', category: 'Work', isAutomatic: true },
  { appName: 'Notion', category: 'Study', isAutomatic: true },
  { appName: 'Adobe Acrobat', category: 'Reading', isAutomatic: true },
  { appName: 'Slack', category: 'Communication', isAutomatic: true },
  { appName: 'Discord', category: 'Communication', isAutomatic: true },
  { appName: 'Steam', category: 'Gaming', isAutomatic: true },
  { appName: 'File Explorer', category: 'Utilities', isAutomatic: true },
  { appName: 'Finder', category: 'Utilities', isAutomatic: true },
  { appName: 'ChronoLog', category: 'ChronoLog', isAutomatic: true },

  { appName: 'Firefox', category: 'Study', isAutomatic: false, keywords: ['lecture', 'course', 'tutorial'] },
  { appName: 'Firefox', category: 'Research', isAutomatic: false, keywords: ['chatgpt', 'openai', 'documentation', 'stackoverflow'] },
  { appName: 'Firefox', category: 'Gaming', isAutomatic: false, keywords: ['store.steampowered.com', 'steam'] },
  { appName: 'Firefox', category: 'Entertainment', isAutomatic: false, keywords: ['youtube', 'netflix', 'spotify', 'twitch'] },
  { appName: 'Firefox', category: 'Meetings', isAutomatic: false, keywords: ['meet.google.com', 'zoom', 'weekly sync'] },

  { appName: 'Google Chrome', category: 'Study', isAutomatic: false, keywords: ['lecture', 'course', 'tutorial'] },
  { appName: 'Google Chrome', category: 'Research', isAutomatic: false, keywords: ['chatgpt', 'openai', 'documentation', 'stackoverflow'] },
  { appName: 'Google Chrome', category: 'Gaming', isAutomatic: false, keywords: ['store.steampowered.com', 'steam'] },
  { appName: 'Google Chrome', category: 'Entertainment', isAutomatic: false, keywords: ['youtube', 'netflix', 'spotify', 'twitch'] },
  { appName: 'Google Chrome', category: 'Meetings', isAutomatic: false, keywords: ['meet.google.com', 'zoom', 'weekly sync'] },
];

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
  const day = d.getDay(); // Sun=0, Mon=1, ... Sat=6
  const diff = day === 0 ? -6 : 1 - day; // move back to Monday
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
  start: string,
  end: string,
  appName: string,
  windowTitle: string,
  url?: string,
  category?: string,
  excludeFromAnalytics?: boolean
): SeedActivity {
  const startTime = iso(date, start);
  const endTime = iso(date, end);

  return {
    appName,
    windowTitle,
    url,
    category,
    startTime,
    endTime,
    duration: minutesBetween(startTime, endTime),
    excludeFromAnalytics,
  };
}



// Monday - study heavy
// Tuesday - work heavy
// Wednesday - distraction heavy
// Thursday - balanced
// Friday - meeting heavy
// Saturday - sparse day
// Sunday - context switch heavy

const monday = startOfWeekMondayYmd();
const tuesday = addDaysYmd(monday, 1);
const wednesday = addDaysYmd(monday, 2);
const thursday = addDaysYmd(monday, 3);
const friday = addDaysYmd(monday, 4);
const saturday = addDaysYmd(monday, 5);
const sunday = addDaysYmd(monday, 6);



const seedActivities: SeedActivity[] = [
  // Monday - study heavy
  makeActivity(monday, '01:00', '01:45', 'Notion', 'SPM Notes - Product Roadmaps', undefined, 'Study'),
  makeActivity(monday, '01:45', '02:20', 'Firefox', 'YouTube - Dynamic Programming Lecture', 'https://www.youtube.com/watch?v=dp-lecture-1', 'Study'),
  makeActivity(monday, '02:20', '02:22', 'Discord', 'General Chat', undefined, 'Communication'),
  makeActivity(monday, '02:22', '03:15', 'Visual Studio Code', 'ChronoLog tracker.ts', undefined, 'Work'),
  makeActivity(monday, '03:15', '03:16', 'Firefox', 'Steam Store', 'https://store.steampowered.com/app/123', 'Gaming'),
  makeActivity(monday, '03:16', '03:17', 'Firefox', 'YouTube - lofi mix', 'https://www.youtube.com/watch?v=lofi-1', 'Entertainment'),
  makeActivity(monday, '03:17', '04:00', 'Adobe Acrobat', 'CN Week 8 Slides.pdf', undefined, 'Reading'),
  makeActivity(monday, '04:00', '04:15', 'Slack', 'Study Group Planning', undefined, 'Communication'),
  makeActivity(monday, '04:15', '04:30', 'Firefox', 'ChatGPT - algorithm explanation', 'https://chat.openai.com/c/demo-monday-1', 'Research'),
  makeActivity(monday, '04:30', '04:45', 'File Explorer', 'Lecture Downloads', undefined, 'Admin'),
  makeActivity(monday, '04:45', '04:48', 'Firefox', 'Zoom - quick check-in', 'https://zoom.us/j/demo-mon-1', 'Meetings'),
  makeActivity(monday, '04:48', '04:51', 'File Explorer', 'Temp Files', undefined, 'Admin'),

  // Tuesday - work heavy
  makeActivity(tuesday, '01:00', '01:50', 'Cursor', 'Insights.tsx', undefined, 'Work'),
  makeActivity(tuesday, '01:50', '02:20', 'Firefox', 'ChatGPT - prompt tuning', 'https://chat.openai.com/c/demo-1', 'Research'),
  makeActivity(tuesday, '02:20', '02:55', 'Slack', 'Deloitte Intern Channel', undefined, 'Communication'),
  makeActivity(tuesday, '02:55', '03:30', 'Firefox', 'Google Meet - Weekly Sync', 'https://meet.google.com/abc-defg-hij', 'Meetings'),
  makeActivity(tuesday, '03:30', '04:05', 'File Explorer', 'Evidence Folder Review', undefined, 'Admin'),
  makeActivity(tuesday, '04:05', '04:20', 'Adobe Acrobat', 'Client Notes.pdf', undefined, 'Reading'),
  makeActivity(tuesday, '04:20', '04:35', 'Notion', 'Sprint Checklist', undefined, 'Study'),
  makeActivity(tuesday, '04:35', '04:50', 'Firefox', 'YouTube - productivity mix', 'https://www.youtube.com/watch?v=focus-mix', 'Entertainment'),
  makeActivity(tuesday, '04:50', '04:53', 'Steam', 'Store Browse', undefined, 'Gaming'),
  makeActivity(tuesday, '04:53', '04:56', 'Adobe Acrobat', 'Reference Snippet.pdf', undefined, 'Reading'),

  // Wednesday - distraction heavy
  makeActivity(wednesday, '01:00', '01:01', 'Firefox', 'Steam Store - Helldivers 2', 'https://store.steampowered.com/app/553850', 'Gaming'),
  makeActivity(wednesday, '01:01', '01:02', 'Firefox', 'YouTube - funny clips', 'https://www.youtube.com/watch?v=funny-1', 'Entertainment'),
  makeActivity(wednesday, '01:02', '01:03', 'Firefox', 'ChatGPT - random browsing', 'https://chat.openai.com/c/demo-2', 'Research'),
  makeActivity(wednesday, '01:03', '01:50', 'Steam', 'Monster Hunter Wilds', undefined, 'Gaming'),
  makeActivity(wednesday, '01:50', '02:10', 'Discord', 'Voice Chat', undefined, 'Communication'),
  makeActivity(wednesday, '02:10', '02:40', 'Visual Studio Code', 'Assignment 2', undefined, 'Work'),
  makeActivity(wednesday, '02:40', '02:55', 'Adobe Acrobat', 'Game Review Notes.pdf', undefined, 'Reading'),
  makeActivity(wednesday, '02:55', '03:10', 'Firefox', 'Zoom - casual team catchup', 'https://zoom.us/j/987654321', 'Meetings'),
  makeActivity(wednesday, '03:10', '03:25', 'File Explorer', 'Screenshots Cleanup', undefined, 'Admin'),

  // Thursday - balanced
  makeActivity(thursday, '01:00', '01:35', 'Notion', 'DAA Quiz Revision', undefined, 'Study'),
  makeActivity(thursday, '01:35', '02:10', 'Firefox', 'Stack Overflow - Typescript generics', 'https://stackoverflow.com/questions/12345', 'Research'),
  makeActivity(thursday, '02:10', '02:40', 'Adobe Acrobat', 'Research Paper.pdf', undefined, 'Reading'),
  makeActivity(thursday, '02:40', '03:10', 'Slack', 'Project Updates', undefined, 'Communication'),
  makeActivity(thursday, '03:10', '03:45', 'Firefox', 'YouTube - music mix', 'https://www.youtube.com/watch?v=music-1', 'Entertainment'),
  makeActivity(thursday, '03:45', '04:00', 'Steam', 'Steam Store Browse', undefined, 'Gaming'),
  makeActivity(thursday, '04:00', '04:15', 'Firefox', 'Google Meet - project sync', 'https://meet.google.com/thursday-sync', 'Meetings'),
  makeActivity(thursday, '04:15', '04:30', 'File Explorer', 'Project Archive', undefined, 'Admin'),
  makeActivity(thursday, '04:30', '04:33', 'Discord', 'Quick Reply', undefined, 'Communication'),
  makeActivity(thursday, '04:33', '04:36', 'File Explorer', 'Rename Files', undefined, 'Admin'),

  // Friday - meeting heavy
  makeActivity(friday, '01:00', '01:45', 'Firefox', 'Zoom Workplace - Team Standup', 'https://zoom.us/j/123456789', 'Meetings'),
  makeActivity(friday, '01:45', '02:15', 'Slack', 'Ops Channel', undefined, 'Communication'),
  makeActivity(friday, '02:15', '02:45', 'Google Chrome', 'ChatGPT - architecture brainstorming', 'https://chat.openai.com/c/demo-3', 'Research'),
  makeActivity(friday, '02:45', '03:20', 'Visual Studio Code', 'activity.service.ts', undefined, 'Work'),
  makeActivity(friday, '03:20', '03:24', 'ChronoLog', 'ChronoLog - Dashboard', undefined, 'ChronoLog', true),
  makeActivity(friday, '03:24', '03:40', 'Adobe Acrobat', 'Meeting Summary.pdf', undefined, 'Reading'),
  makeActivity(friday, '03:40', '03:55', 'Notion', 'Follow-up Tasks', undefined, 'Study'),
  makeActivity(friday, '03:55', '04:10', 'Steam', 'Quick Browse', undefined, 'Gaming'),
  makeActivity(friday, '04:10', '04:25', 'File Explorer', 'Shared Drive Review', undefined, 'Admin'),

  // Saturday - sparse day
  makeActivity(saturday, '05:00', '05:20', 'Adobe Acrobat', 'Algorithm Notes.pdf', undefined, 'Reading'),
  makeActivity(saturday, '05:20', '05:40', 'Firefox', 'YouTube - recursion tutorial', 'https://www.youtube.com/watch?v=recursion-1', 'Study'),
  makeActivity(saturday, '05:40', '06:00', 'Steam', 'Steam Library', undefined, 'Gaming'),
  makeActivity(saturday, '06:00', '06:15', 'Discord', 'Weekend Chat', undefined, 'Communication'),
  makeActivity(saturday, '06:15', '06:30', 'Firefox', 'ChatGPT - study planning', 'https://chat.openai.com/c/demo-sat-1', 'Research'),
  makeActivity(saturday, '06:30', '06:45', 'Firefox', 'YouTube - music', 'https://www.youtube.com/watch?v=sat-music', 'Entertainment'),
  makeActivity(saturday, '06:45', '07:00', 'File Explorer', 'Desktop Cleanup', undefined, 'Admin'),
  makeActivity(saturday, '07:00', '07:15', 'Firefox', 'Zoom - weekend check-in', 'https://zoom.us/j/24681012', 'Meetings'),

  // Sunday - context switch heavy
  makeActivity(sunday, '01:00', '01:01', 'Firefox', 'Steam Store - sale page', 'https://store.steampowered.com/sale/demo', 'Gaming'),
  makeActivity(sunday, '01:01', '01:02', 'Firefox', 'YouTube - networking lecture', 'https://www.youtube.com/watch?v=net-lecture', 'Study'),
  makeActivity(sunday, '01:02', '01:03', 'Firefox', 'ChatGPT - CN question', 'https://chat.openai.com/c/demo-4', 'Research'),
  makeActivity(sunday, '01:03', '01:04', 'Firefox', 'YouTube - trailer', 'https://www.youtube.com/watch?v=trailer-1', 'Entertainment'),
  makeActivity(sunday, '01:04', '01:35', 'Visual Studio Code', 'tracker.ts', undefined, 'Work'),
  makeActivity(sunday, '01:35', '01:50', 'Notion', 'Weekly Review', undefined, 'Admin'),
  makeActivity(sunday, '01:50', '02:05', 'Slack', 'Weekend Project Chat', undefined, 'Communication'),
  makeActivity(sunday, '02:05', '02:20', 'Adobe Acrobat', 'Weekly Review Notes.pdf', undefined, 'Reading'),
  makeActivity(sunday, '02:20', '02:35', 'Firefox', 'Google Meet - catchup', 'https://meet.google.com/demo-sync', 'Meetings'),
  makeActivity(sunday, '02:35', '02:50', 'Steam', 'Store Wishlist', undefined, 'Gaming'),
  makeActivity(sunday, '02:50', '02:53', 'Adobe Acrobat', 'Short Memo.pdf', undefined, 'Reading'),
  makeActivity(sunday, '02:53', '02:56', 'Discord', 'Weekend Ping', undefined, 'Communication'),
];

function resetDemoStore() {
  if (fs.existsSync(ACTIVITIES_DIR)) {
    fs.rmSync(ACTIVITIES_DIR, { recursive: true, force: true });
  }

  if (fs.existsSync(RULES_FILE)) {
    fs.rmSync(RULES_FILE, { force: true });
  }

  if (fs.existsSync(SETTINGS_FILE)) {
    fs.rmSync(SETTINGS_FILE, { force: true });
  }

  if (fs.existsSync(TRACKER_STATE_FILE)) {
    fs.rmSync(TRACKER_STATE_FILE, { force: true });
  }

  if (fs.existsSync(CATEGORIES_FILE)) {
    fs.rmSync(CATEGORIES_FILE, { force: true });
  }
  
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

main()