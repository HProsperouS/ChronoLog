import { createActivity } from '../services/activity.service';
import { createRule } from '../services/category.service';

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

function iso(date: string, time: string) {
  return `${date}T${time}:00.000Z`;
}

function ymdDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
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

const day6 = ymdDaysAgo(6);
const day5 = ymdDaysAgo(5);
const day4 = ymdDaysAgo(4);
const day3 = ymdDaysAgo(3);
const day2 = ymdDaysAgo(2);
const day1 = ymdDaysAgo(1);
const day0 = ymdDaysAgo(0);


const seedActivities: SeedActivity[] = [
  // 6 days ago - study heavy
  makeActivity(day6, '01:00', '01:45', 'Notion', 'SPM Notes - Product Roadmaps', undefined, 'Study'),
  makeActivity(day6, '01:45', '02:20', 'Firefox', 'YouTube - Dynamic Programming Lecture', 'https://www.youtube.com/watch?v=dp-lecture-1', 'Study'),
  makeActivity(day6, '02:20', '02:22', 'Discord', 'General Chat', undefined, 'Communication'),
  makeActivity(day6, '02:22', '03:15', 'Visual Studio Code', 'ChronoLog tracker.ts', undefined, 'Work'),
  makeActivity(day6, '03:15', '03:16', 'Firefox', 'Steam Store', 'https://store.steampowered.com/app/123', 'Gaming'),
  makeActivity(day6, '03:16', '03:17', 'Firefox', 'YouTube - lofi mix', 'https://www.youtube.com/watch?v=lofi-1', 'Entertainment'),
  makeActivity(day6, '03:17', '04:00', 'Adobe Acrobat', 'CN Week 8 Slides.pdf', undefined, 'Reading'),

  // 5 days ago - work heavy
  makeActivity(day5, '01:00', '01:50', 'Cursor', 'Insights.tsx', undefined, 'Work'),
  makeActivity(day5, '01:50', '02:20', 'Firefox', 'ChatGPT - prompt tuning', 'https://chat.openai.com/c/demo-1', 'Research'),
  makeActivity(day5, '02:20', '02:55', 'Slack', 'Deloitte Intern Channel', undefined, 'Communication'),
  makeActivity(day5, '02:55', '03:30', 'Firefox', 'Google Meet - Weekly Sync', 'https://meet.google.com/abc-defg-hij', 'Meetings'),
  makeActivity(day5, '03:30', '04:05', 'File Explorer', 'Evidence Folder Review', undefined, 'Admin'),

  // 4 days ago - distraction heavy
  makeActivity(day4, '01:00', '01:01', 'Firefox', 'Steam Store - Helldivers 2', 'https://store.steampowered.com/app/553850', 'Gaming'),
  makeActivity(day4, '01:01', '01:02', 'Firefox', 'YouTube - funny clips', 'https://www.youtube.com/watch?v=funny-1', 'Entertainment'),
  makeActivity(day4, '01:02', '01:03', 'Firefox', 'ChatGPT - random browsing', 'https://chat.openai.com/c/demo-2', 'Research'),
  makeActivity(day4, '01:03', '01:50', 'Steam', 'Monster Hunter Wilds', undefined, 'Gaming'),
  makeActivity(day4, '01:50', '02:10', 'Discord', 'Voice Chat', undefined, 'Communication'),
  makeActivity(day4, '02:10', '02:40', 'Visual Studio Code', 'Assignment 2', undefined, 'Work'),

  // 3 days ago - balanced
  makeActivity(day3, '01:00', '01:35', 'Notion', 'DAA Quiz Revision', undefined, 'Study'),
  makeActivity(day3, '01:35', '02:10', 'Firefox', 'Stack Overflow - Typescript generics', 'https://stackoverflow.com/questions/12345', 'Research'),
  makeActivity(day3, '02:10', '02:40', 'Adobe Acrobat', 'Research Paper.pdf', undefined, 'Reading'),
  makeActivity(day3, '02:40', '03:10', 'Slack', 'Project Updates', undefined, 'Communication'),
  makeActivity(day3, '03:10', '03:45', 'Firefox', 'YouTube - music mix', 'https://www.youtube.com/watch?v=music-1', 'Entertainment'),

  // 2 days ago - meeting heavy
  makeActivity(day2, '01:00', '01:45', 'Firefox', 'Zoom Workplace - Team Standup', 'https://zoom.us/j/123456789', 'Meetings'),
  makeActivity(day2, '01:45', '02:15', 'Slack', 'Ops Channel', undefined, 'Communication'),
  makeActivity(day2, '02:15', '02:45', 'Google Chrome', 'ChatGPT - architecture brainstorming', 'https://chat.openai.com/c/demo-3', 'Research'),
  makeActivity(day2, '02:45', '03:20', 'Visual Studio Code', 'activity.service.ts', undefined, 'Work'),
  makeActivity(day2, '03:20', '03:24', 'ChronoLog', 'ChronoLog - Dashboard', undefined, 'ChronoLog', true),

  // 1 day ago - sparse day
  makeActivity(day1, '05:00', '05:20', 'Adobe Acrobat', 'Algorithm Notes.pdf', undefined, 'Reading'),
  makeActivity(day1, '05:20', '05:40', 'Firefox', 'YouTube - recursion tutorial', 'https://www.youtube.com/watch?v=recursion-1', 'Study'),
  makeActivity(day1, '05:40', '06:00', 'Steam', 'Steam Library', undefined, 'Gaming'),

  // today - context switch heavy
  makeActivity(day0, '01:00', '01:01', 'Firefox', 'Steam Store - sale page', 'https://store.steampowered.com/sale/demo', 'Gaming'),
  makeActivity(day0, '01:01', '01:02', 'Firefox', 'YouTube - networking lecture', 'https://www.youtube.com/watch?v=net-lecture', 'Study'),
  makeActivity(day0, '01:02', '01:03', 'Firefox', 'ChatGPT - CN question', 'https://chat.openai.com/c/demo-4', 'Research'),
  makeActivity(day0, '01:03', '01:04', 'Firefox', 'YouTube - trailer', 'https://www.youtube.com/watch?v=trailer-1', 'Entertainment'),
  makeActivity(day0, '01:04', '01:35', 'Visual Studio Code', 'tracker.ts', undefined, 'Work'),
  makeActivity(day0, '01:35', '01:50', 'Notion', 'Weekly Review', undefined, 'Admin'),
];

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
  console.log('Seeding ChronoLog demo rules...');
  seedRulesToStore();

  console.log('Seeding ChronoLog demo activities...');
  seedActivitiesToStore();

  console.log(`Done. Seeded ${seedRules.length} rules and ${seedActivities.length} activities.`);
}

main();