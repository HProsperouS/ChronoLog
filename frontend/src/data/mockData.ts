export interface Activity {
  id: string;
  appName: string;
  category: 'Work' | 'Study' | 'Entertainment' | 'Communication' | 'Utilities' | 'Uncategorized';
  windowTitle?: string;
  url?: string;
  duration: number; // in minutes
  startTime: Date;
  endTime: Date;
}

export interface CategoryRule {
  id: string;
  appName: string;
  category: 'Work' | 'Study' | 'Entertainment' | 'Communication' | 'Utilities' | 'Uncategorized';
  keywords?: string[];
  isAutomatic: boolean;
}

export interface AIInsight {
  id: string;
  type: 'pattern' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  icon: string;
  timestamp: Date;
}

// Joseph's day - showing context switching pattern between IDE and YouTube
const today = new Date(2026, 1, 5); // Feb 5, 2026

export const todayActivities: Activity[] = [
  // Morning - Good focused work
  {
    id: '1',
    appName: 'VS Code',
    category: 'Work',
    windowTitle: 'ProjectManager.java - data-structures-assignment',
    duration: 55,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 55),
  },
  {
    id: '2',
    appName: 'Chrome',
    category: 'Work',
    url: 'stackoverflow.com - Java ArrayList vs LinkedList',
    windowTitle: 'Stack Overflow - Java ArrayList vs LinkedList',
    duration: 12,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 55),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 7),
  },
  {
    id: '3',
    appName: 'VS Code',
    category: 'Work',
    windowTitle: 'LinkedListImpl.java - data-structures-assignment',
    duration: 48,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 7),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 55),
  },
  {
    id: '4',
    appName: 'Slack',
    category: 'Communication',
    windowTitle: '#general - CS Department',
    duration: 8,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 55),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 3),
  },
  
  // Late morning - still focused
  {
    id: '5',
    appName: 'Terminal',
    category: 'Work',
    windowTitle: 'zsh - ~/projects/data-structures',
    duration: 22,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 3),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 25),
  },
  {
    id: '6',
    appName: 'VS Code',
    category: 'Work',
    windowTitle: 'Main.java - data-structures-assignment',
    duration: 35,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 25),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0),
  },

  // Lunch break
  {
    id: '7',
    appName: 'Chrome',
    category: 'Entertainment',
    url: 'youtube.com - Cooking Videos',
    windowTitle: 'YouTube - 15 Minute Lunch Ideas',
    duration: 25,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 25),
  },
  {
    id: '8',
    appName: 'Chrome',
    category: 'Communication',
    url: 'reddit.com - r/cscareerquestions',
    windowTitle: 'Reddit - CS Career Questions',
    duration: 15,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 25),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 40),
  },

  // Afternoon - THE CONTEXT SWITCHING PERIOD (2pm-4pm)
  // This is where Joseph loses focus and switches frequently
  {
    id: '9',
    appName: 'VS Code',
    category: 'Work',
    windowTitle: 'DatabaseHandler.java - web-app-project',
    duration: 18,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 18),
  },
  {
    id: '10',
    appName: 'Chrome',
    category: 'Entertainment',
    url: 'youtube.com - Tech Reviews',
    windowTitle: 'YouTube - M4 MacBook Pro Review',
    duration: 22,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 18),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 40),
  },
  {
    id: '11',
    appName: 'VS Code',
    category: 'Work',
    windowTitle: 'DatabaseHandler.java - web-app-project',
    duration: 12,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 40),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 52),
  },
  {
    id: '12',
    appName: 'Chrome',
    category: 'Entertainment',
    url: 'youtube.com - Programming Memes',
    windowTitle: 'YouTube - When your code finally compiles',
    duration: 15,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 52),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 7),
  },
  {
    id: '13',
    appName: 'VS Code',
    category: 'Work',
    windowTitle: 'DatabaseHandler.java - web-app-project',
    duration: 15,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 7),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 22),
  },
  {
    id: '14',
    appName: 'Chrome',
    category: 'Entertainment',
    url: 'youtube.com - Music',
    windowTitle: 'YouTube - Lofi Hip Hop Radio',
    duration: 25,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 22),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 47),
  },
  {
    id: '15',
    appName: 'VS Code',
    category: 'Work',
    windowTitle: 'UserController.java - web-app-project',
    duration: 9,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 47),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 56),
  },
  {
    id: '16',
    appName: 'Chrome',
    category: 'Entertainment',
    url: 'youtube.com - Gaming',
    windowTitle: 'YouTube - Elden Ring Speedrun Highlights',
    duration: 28,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 56),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 24),
  },
  {
    id: '17',
    appName: 'VS Code',
    category: 'Work',
    windowTitle: 'UserController.java - web-app-project',
    duration: 7,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 24),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 31),
  },
  {
    id: '18',
    appName: 'Chrome',
    category: 'Entertainment',
    url: 'youtube.com - Tech News',
    windowTitle: 'YouTube - Apple Vision Pro Hands-On',
    duration: 18,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 31),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 49),
  },
  {
    id: '19',
    appName: 'VS Code',
    category: 'Work',
    windowTitle: 'AuthService.java - web-app-project',
    duration: 11,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 49),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0),
  },

  // Late afternoon - regaining some focus but still distracted
  {
    id: '20',
    appName: 'Chrome',
    category: 'Entertainment',
    url: 'youtube.com - Podcasts',
    windowTitle: 'YouTube - Lex Fridman Podcast',
    duration: 32,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 32),
  },
  {
    id: '21',
    appName: 'Chrome',
    category: 'Work',
    url: 'github.com - Pull Requests',
    windowTitle: 'GitHub - web-app-project Pull Requests',
    duration: 15,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 18),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 33),
  },
  {
    id: '22',
    appName: 'VS Code',
    category: 'Work',
    windowTitle: 'README.md - web-app-project',
    duration: 22,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 33),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 55),
  },

  // Evening - final push
  {
    id: '23',
    appName: 'Terminal',
    category: 'Work',
    windowTitle: 'zsh - ~/projects/web-app',
    duration: 18,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 18),
  },
  {
    id: '24',
    appName: 'VS Code',
    category: 'Work',
    windowTitle: 'App.jsx - web-app-project',
    duration: 35,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 18),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 53),
  },
  {
    id: '25',
    appName: 'Chrome',
    category: 'Communication',
    url: 'discord.com - Study Group',
    windowTitle: 'Discord - CS Study Group',
    duration: 12,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 53),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 5),
  },
  
  // Background apps (playing throughout the day)
  {
    id: '26',
    appName: 'Spotify',
    category: 'Entertainment',
    windowTitle: 'Focus Flow Playlist',
    duration: 240,
    startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
    endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0),
  },
];

export const weeklyData = [
  { day: 'Mon', Work: 320, Study: 80, Entertainment: 85, Communication: 55 },
  { day: 'Tue', Work: 340, Study: 70, Entertainment: 75, Communication: 55 },
  { day: 'Wed', Work: 245, Study: 60, Entertainment: 185, Communication: 50 }, // Today - Entertainment is highest!
  { day: 'Thu', Work: 0, Study: 0, Entertainment: 0, Communication: 0 }, // Future
  { day: 'Fri', Work: 0, Study: 0, Entertainment: 0, Communication: 0 }, // Future
  { day: 'Sat', Work: 0, Study: 0, Entertainment: 0, Communication: 0 }, // Future
  { day: 'Sun', Work: 0, Study: 0, Entertainment: 0, Communication: 0 }, // Future
];

export const categoryRules: CategoryRule[] = [
  {
    id: '1',
    appName: 'VS Code',
    category: 'Work',
    isAutomatic: true,
  },
  {
    id: '2',
    appName: 'IntelliJ IDEA',
    category: 'Work',
    isAutomatic: true,
  },
  {
    id: '3',
    appName: 'Terminal',
    category: 'Work',
    isAutomatic: true,
  },
  {
    id: '4',
    appName: 'Chrome',
    category: 'Work',
    keywords: ['github', 'stackoverflow', 'docs', 'documentation', 'mdn'],
    isAutomatic: false,
  },
  {
    id: '5',
    appName: 'Chrome',
    category: 'Entertainment',
    keywords: ['youtube', 'netflix', 'twitch', 'reddit'],
    isAutomatic: false,
  },
  {
    id: '6',
    appName: 'Notion',
    category: 'Study',
    isAutomatic: true,
  },
  {
    id: '7',
    appName: 'Obsidian',
    category: 'Study',
    isAutomatic: true,
  },
  {
    id: '8',
    appName: 'Slack',
    category: 'Communication',
    isAutomatic: true,
  },
  {
    id: '9',
    appName: 'Discord',
    category: 'Communication',
    isAutomatic: true,
  },
  {
    id: '10',
    appName: 'Zoom',
    category: 'Communication',
    isAutomatic: true,
  },
  {
    id: '11',
    appName: 'Spotify',
    category: 'Entertainment',
    isAutomatic: true,
  },
  {
    id: '12',
    appName: 'Finder',
    category: 'Utilities',
    isAutomatic: true,
  },
];

export const aiInsights: AIInsight[] = [
  {
    id: '1',
    type: 'pattern',
    title: 'Context Switching Peaks in Afternoon',
    description: 'You switched between VS Code and YouTube 8 times between 2pm-4pm today. These frequent context switches may be reducing your focus and productivity. Consider using website blockers or the Pomodoro technique during this time period.',
    icon: 'TrendingDown',
    timestamp: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 30),
  },
  {
    id: '2',
    type: 'recommendation',
    title: 'Schedule Focused Work Sessions',
    description: 'Your morning sessions (9am-12pm) show much better focus with an average of 45 minutes per task. Try scheduling your most challenging work during these hours and saving routine tasks for the afternoon when you tend to be more distracted.',
    icon: 'AlertCircle',
    timestamp: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 25),
  },
  {
    id: '3',
    type: 'pattern',
    title: 'Short Breaks Accumulating',
    description: 'What felt like "quick YouTube breaks" actually totaled 2 hours 45 minutes today. While breaks are important, these frequent short distractions may be preventing you from entering deep work states. Consider taking fewer, longer breaks instead.',
    icon: 'TrendingDown',
    timestamp: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 20),
  },
  {
    id: '4',
    type: 'achievement',
    title: 'Strong Morning Focus',
    description: 'Great job maintaining focus this morning! You completed 2 hours and 20 minutes of uninterrupted coding work before lunch. This is your longest focused session this week.',
    icon: 'Trophy',
    timestamp: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30),
  },
  {
    id: '5',
    type: 'recommendation',
    title: 'Recategorize Educational YouTube?',
    description: 'Some of your YouTube time was spent on tech podcasts and tutorials. Consider creating a "Learning" category to better distinguish educational entertainment from pure distraction.',
    icon: 'AlertCircle',
    timestamp: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 15),
  },
];

export const categoryColors: Record<string, string> = {
  Work: '#6366f1',
  Study: '#10b981',
  Entertainment: '#f59e0b',
  Communication: '#a855f7',
  Utilities: '#6b7280',
  Uncategorized: '#9ca3af',
};