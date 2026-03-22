# ChronoLog

![Version](https://img.shields.io/badge/version-MVP-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-informational)
![License](https://img.shields.io/badge/license-MIT-green)

> Turn hidden time into visible insight.\
> A context-aware, automatic time tracking desktop application.

---

## Overview

ChronoLog is a desktop-based productivity tool designed to help students understand where their time actually goes.

Many people feel busy and mentally exhausted — yet struggle to explain what they actually accomplished. This "productivity paradox" happens because time fragmentation and context switching are invisible.

ChronoLog passively tracks application-level activity and transforms it into meaningful insights — without manual timers or workflow disruption.

---

## Problem

From our user research with digitally intensive university students:

- Users feel busy but cannot explain where time went
- Frequent unconscious context switching
- Manual tracking tools create friction and stress
- Existing tools are designed for freelancers & enterprises, not students

**Core Insight:** The problem is not productivity — it is **visibility**.

---

## Solution

ChronoLog is a passive, context-aware desktop tracker that:

- Automatically tracks active applications
- Detects session-level context switching
- Provides visualized timelines
- Offers behavioral insights
- Stores all data locally for privacy

---

## Key Features

### Contextual Tracker
Track how your screen time is distributed across applications and categories.

### Context Switching Analysis
Visualize attention fragmentation and switching density.

### Behavioral Insights
AI-assisted feedback on productivity awareness and patterns.

### Habit Tracker
Daily goals with color-coded progress (context switches, productive hours, entertainment limits).

### Customization
- Define custom category rules
- Auto-categorization on first launch based on installed apps
- Control what gets tracked

### Privacy-First Design
- Local data storage only
- No cloud sync, no ads
- Excluded apps list (e.g. password managers, banking)
- Private browsing mode respected

### Live UI refresh (frontend polling)
The React UI **polls the backend every 30 seconds** on open pages so numbers update without a manual reload:

| Screen | What refreshes |
|---|---|
| **Dashboard** | Today’s daily stats, yesterday (for trend badges), rolling 7-day weekly stats |
| **Insights** | AI insights list for today + 14-day stats window (summary cards & charts) |
| **Activity** | Only when the selected calendar day is **today**; historical dates load once per selection |

The Activity screen also runs a **60-second** check for the local calendar date rolling over (so “today” advances after midnight for late-night use).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Desktop shell** | Electron 35 (main process + system tray) |
| **Frontend** | React 18 · Vite · TailwindCSS v4 · shadcn/ui · Recharts |
| **Backend** | Node.js · Fastify 4 · TypeScript |
| **Tracker** | active-win (cross-platform window focus detection) |
| **Storage** | Local JSON files — no database required |
| **AI Insights** | OpenAI GPT-4o-mini (optional, user-supplied key) |
| **Design** | Figma · Dark-mode-first UI |

Figma: https://www.figma.com/design/A0ckoTrM9lhRRZXZQryYya/ChronoLog?node-id=0-1&t=FPzoA59Dcc1iliIc-1

---

## Architecture

### How the system works

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER'S COMPUTER                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Electron Main Process                  │    │
│  │  (electron/src/main.ts)                                 │    │
│  │                                                         │    │
│  │  • Creates BrowserWindow (loads React frontend)         │    │
│  │  • Spawns backend + tracker as child processes          │    │
│  │  • Manages system tray (hide / show / quit)             │    │
│  │  • Sets DATA_DIR → ~/Library/Application Support/...    │    │
│  └──────────┬──────────────────────────┬────────────────────┘   │
│             │ spawn                    │ spawn                  │
│             ▼                          ▼                        │
│  ┌──────────────────┐      ┌────────────────────────────────┐   │
│  │   tracker.ts     │      │   backend  (localhost:3001)    │   │
│  │                  │      │                                │   │
│  │  Polls every     │      │  Fastify API                   │   │
│  │  5 s via         │ POST │  ├── routes/                   │   │
│  │  active-win  ────┼─────►│  ├── services/                 │   │
│  │                  │      │  └── store/ → data/ (JSON)     │   │
│  └──────────────────┘      │       ├── activities/          │   │
│                             │       ├── settings.json        │   │
│                             │       ├── category-rules.json  │   │
│                             │       └── insights.json        │   │
│                             └──────────────┬───────────────┘    │
│                                            │ REST API (fetch)   │
│                                            ▼                    │
│                             ┌──────────────────────────────┐    │
│                             │  React Frontend (Renderer)   │    │
│                             │  Dashboard · Timeline ·      │    │
│                             │  Insights · Categories ·     │    │
│                             │  Settings                    │    │
│                             └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Only for AI Insights generation
                              ▼
                       OpenAI API (internet)
```

> Everything runs locally on the user's machine. The only optional external call is to OpenAI when generating AI Insights.

---

## Tracker Logic

The tracker (`backend/src/tracker.ts`) is a lightweight background process that continuously monitors what the user is doing and records it into the local data store.

### What the tracker can detect

| Data | Details |
|---|---|
| **App name** | The name of the currently focused application (e.g. `Google Chrome`, `Cursor`, `Spotify`) |
| **Window title** | The title bar text — e.g. `"JavaScript Tutorial - YouTube"`, `"project.ts — Cursor"` |
| **URL** | Full URL for supported browsers (Chrome, Safari, Firefox, Arc, Brave, Edge) |
| **Duration** | Exact time spent, measured from session start to end, accurate to the second |
| **Start / end timestamps** | ISO 8601, stored in UTC |
| **System idle time** | OS-level time since last keyboard or mouse input |
| **Private browsing** | Detected via window title keywords; URL is stripped but app is still recorded |

> The tracker does **not** capture screenshots, keystrokes, clipboard contents, or any window content beyond the title and URL.

---

### Poll loop

Every N seconds (default 5, configurable via Settings), the tracker runs one poll cycle:

```
trackingEnabled? ─── No ──► flush current session → return
      │
     Yes
      │
idleDetectionEnabled? ── Yes ──► getSystemIdleSeconds() >= threshold?
      │                                │
      │                               Yes ──► close session (back-dated to idle start) → return
      │                                │
      │                               No
      │◄──────────────────────────────┘
      │
active-win() ──► no result (locked screen / UAC)? ──► close session → return
      │
app in excludedApps? ──► Yes ──► close session → return
      │
     No
      │
private browsing? ──► Yes ──► record app, strip URL
      │
     No ──► record app + URL
      │
same session? (see "Session grouping" below)
      ├── Yes ──► update windowTitle + URL in place
      │          elapsed ≥ 2 min? ──► checkpoint: POST session, restart timer
      │
      └── No  ──► POST old session → start new session
```

Sessions shorter than **5 seconds** are silently discarded to filter out accidental focus (e.g. quick Alt+Tab glances).

---

### Session grouping

The tracker decides whether the current poll belongs to the **same session** as the previous one:

- **Non-browser apps** (Cursor, Notion, Figma, etc.): same session if `appName` **and** `windowTitle` are unchanged. A new document or project in the same app creates a new session.
- **Browser apps** (Chrome, Safari, Firefox, Arc, Brave, Edge, Opera): same session if `appName` **and** URL **hostname** are unchanged. This means navigating between videos on YouTube or pages within GitHub does **not** split the session — only switching to a different website does.

Within a session, `windowTitle` and `url` are updated live on every poll. This ensures that when the session is eventually written, it captures the **most recent** title — keeping category auto-detection accurate even if content changed mid-session (e.g. switching from a tutorial to a music video on YouTube).

---

### Session checkpoints (2-minute writes)

If the user stays in the same session for more than **2 minutes**, the tracker automatically:

1. Writes the current session to disk (POST to backend)
2. Restarts the session timer from the current moment

This prevents two problems:
- **Data loss** if the tracker crashes or the machine shuts down unexpectedly
- **Timeline gaps** — the Activity Timeline chart would show blank space for any unwritten session

---

### Idle detection

The tracker uses **real OS-level idle time** — the time since the last keyboard or mouse input — not inferred from window-switching activity.

| Platform | API used |
|---|---|
| macOS | `ioreg -c IOHIDSystem` → `HIDIdleTime` (nanoseconds) |
| Windows | `GetLastInputInfo` Win32 API via inline PowerShell |

When idle is detected, the session end time is **back-dated** to when idle actually started — so the minutes the user was away are not counted as usage time.

---

### Private browsing

If `respectPrivateBrowsing` is enabled (default: on), the tracker detects private windows by checking for keywords in the window title:

- `incognito` → Chrome
- `private` → Firefox, Safari
- `InPrivate` → Edge

In private mode: the **app activity is still recorded** (total screen time stays accurate), but the **URL is stripped** (no visited sites are stored).

---

### Settings sync

On startup and every 60 seconds, the tracker fetches the latest settings from the backend API so changes take effect without restarting:

| Setting | Effect |
|---|---|
| `trackingEnabled` | Pause or resume tracking instantly |
| `idleDetectionEnabled` | Toggle idle detection on/off |
| `idleThresholdMinutes` | How long before a session is considered idle |
| `pollIntervalSeconds` | Poll frequency — timer is automatically rescheduled if changed |
| `excludedApps` | Updated list of apps to ignore (e.g. password managers, banking) |
| `respectPrivateBrowsing` | Toggle URL stripping in private windows |

---

### Data written per session

Each recorded session is appended to `backend/data/activities/YYYY-MM-DD.json`, where `YYYY-MM-DD` is derived from the **server's local calendar day** (the same \"today\" you see in the UI), not UTC. Timestamps remain in UTC so they can be safely reinterpreted in any timezone later.

```json
{
  "id":          "a1b2c3d4",
  "appName":     "Google Chrome",
  "windowTitle": "JavaScript Tutorial - YouTube",
  "url":         "https://www.youtube.com/watch?v=abc123",
  "duration":    2.0,
  "startTime":   "2026-03-18T13:00:00.000Z",
  "endTime":     "2026-03-18T13:02:00.000Z",
  "date":        "2026-03-18",
  "category":    "Study"
}
```

`category` is assigned by the backend at write time, by matching `appName`, `windowTitle`, and `url` against the user's category rules (stored in `category-rules.json`).

---

### Context switches

A **context switch** is counted when the user moves **away from a focused session** — specifically when the previous activity's category was `Work` or `Study` and the next activity's category is something else (e.g. `Entertainment`, `Communication`).

Switching back into `Work`/`Study` does not count — only the interruptions that pulled the user out of focus are tracked. This gives a meaningful measure of how many times focused work was broken.

---

### Focus Score (0–100)

The Focus Score combines three dimensions to reflect both **how much** and **how well** the user focused:

| Dimension | Weight | Max 100% when |
|---|---|---|
| **Productive time ratio** | 50% | All tracked time is Work or Study |
| **Longest focus block** | 25% | Longest continuous Work/Study block ≥ 90 minutes |
| **Context-switch penalty** | 25% | 0 switches away from focus; 10+ switches = 0 |

**Formula:**
```
score = (productiveTime / totalTime) × 50
      + min(longestFocusBlockMins / 90, 1) × 25
      + max(0, 1 − contextSwitches / 10) × 25
```

**Longest focus block** merges consecutive Work/Study activities that are within 5 minutes of each other — so 2-minute checkpoint writes don't fragment a long session into many short pieces.

**Examples:**
- 3h Work, 2 context switches, longest block 90 min → ~95
- 30 min Work, 8 context switches, longest block 15 min → ~30

---

### System Notifications

ChronoLog passively monitors your activity and sends desktop reminders to help
you stay aware of unproductive patterns — without interrupting your flow unnecessarily.

Every **1 minute**, ChronoLog checks your current daily stats against a set of thresholds. When a threshold is exceeded, a desktop notification is fired. Each notification type has a **15-minute cooldown** to avoid repeat alerts for the same issue.

Notifications respect the `notificationsEnabled` toggle in Settings — they can be disabled at any time.

| Notification | Trigger | Cooldown | Basis |
|---|---|---|---|
| 🔀 Focus Fragmentation | Context switches exceed **8** in a day | 15 min | UC Irvine research on interruption & stress |
| 🎮 Entertainment Check | Entertainment time exceeds **45 minutes** | 15 min | Pomodoro principle — breaks beyond 45 min become distractions |
| 📉 Low Focus Score | Focus score drops below **40%** | 15 min | Calibrated across productive time ratio, focus block length, and switch penalty |
| ⏰ Take a Break | Longest session exceeds **90 minutes** | 15 min | 90-min ultradian rhythm — attention drops sharply beyond this point |
| 💡 Productivity Reminder | Less than **30%** of screen time is productive (min. 60 mins tracked) | 15 min | Below average productive ratio for university students |

**Scientific basis:**

- **90-minute break threshold** — Based on the ultradian rhythm cycle, focus and retention drop significantly after 90 continuous minutes of work. Information studied in a fatigued state is substantially less likely to be recalled later.
- **Context switch threshold (8)** — Research from the University of California, Irvine found that repeated task-switching causes measurable increases in stress and frustration. ChronoLog only counts meaningful category switches (Utilities and Uncategorized are excluded), making 8 a strict but fair limit for deep study work.
- **Productive ratio threshold (30%)** — Studies of university students show that productive screen time (Work + Study) typically falls between 30–50% of total screen time. A warning fires when a student falls below this average range, indicating a genuinely off day rather than a normal one.

> **Note:** Notifications are currently implemented via the browser Web Notification API (`frontend/src/hooks/useNotifications.ts`). When Electron is integrated, this will be replaced with Electron's native notification system for a cleaner desktop experience.

---

## Folder Structure

```
ChronoLog/
│
├── package.json                 # Root: Electron entry + all dev scripts
├── electron/
│   ├── tsconfig.json            # Compiles electron/src → electron/dist (CJS)
│   ├── assets/
│   │   └── tray-icon.png        # System tray icon
│   └── src/
│       ├── main.ts              # Main process: window, child processes, lifecycle
│       ├── preload.ts           # Secure contextBridge API for renderer
│       └── tray.ts              # System tray: show/hide/quit
│
├── frontend/                    # React renderer process
│   └── src/
│       ├── main.tsx             # Entry point
│       ├── App.tsx              # Router
│       ├── index.css            # Global styles (Tailwind)
│       ├── api/
│       │   └── index.ts         # API client — all calls go to backend REST API
│       ├── types/
│       │   └── index.ts         # Frontend TypeScript interfaces
│       ├── constants.ts         # Category colours, shared constants
│       ├── utils.ts             # Date helpers
│       ├── vite-env.d.ts        # Vite env variable type declarations
│       └── components/
│           ├── Layout.tsx       # Sidebar shell
│           ├── Sidebar.tsx      # Navigation
│           ├── Dashboard.tsx    # Today's stats, pie chart, weekly activity
│           ├── ActivityTimeline.tsx  # Chronological session list + calendar
│           ├── Insights.tsx     # AI insight cards + habit tracker + trends
│           ├── Categories.tsx   # Category rule CRUD
│           ├── Settings.tsx     # Tracker settings, privacy, data management
│           └── StatCard.tsx     # Reusable stat card
│
└── backend/                     # Fastify API + tracker process
    ├── .env.example
    ├── data/                    # Auto-created on first run — do not commit
    │   ├── activities/
    │   │   └── YYYY-MM-DD.json  # One file per day
    │   ├── settings.json        # Tracker settings + privacy exclusions
    │   ├── category-rules.json  # Auto-generated on first launch from installed apps
    │   └── insights.json        # AI-generated insights (persisted)
    └── src/
        ├── server.ts            # Fastify entry point (localhost:3001)
        ├── app.ts               # CORS, route registration
        ├── tracker.ts           # Background process: polls active window → POST /api/activities
        ├── types/
        │   └── index.ts         # Shared interfaces: Activity, CategoryRule, Settings…
        ├── routes/
        │   ├── activities.ts    # Activities + app listing + app icons
        │   ├── category-rules.ts
        │   ├── stats.ts
        │   ├── settings.ts      # Settings, privacy, data management, export
        │   └── insights.ts
        ├── services/
        │   ├── activity.service.ts   # Activity CRUD, app scanning, icon extraction
        │   ├── category.service.ts   # Category rules, auto-categorisation
        │   ├── stats.service.ts      # Focus score, context switches, top apps
        │   ├── settings.service.ts   # Settings, privacy, data retention, export
        │   ├── ai.service.ts         # OpenAI integration
        │   └── app-catalog.ts        # 230+ app → category mapping for first-launch seeding
        └── store/
            ├── activity.store.ts       # Reads/writes activities/YYYY-MM-DD.json
            ├── settings.store.ts       # Reads/writes settings.json (seeds defaults)
            ├── category-rules.store.ts # Reads/writes category-rules.json (auto-seeds)
            └── config.store.ts         # Reads/writes insights.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- macOS or Windows

### 1. Clone the repository

```bash
git clone https://github.com/HProsperouS/ChronoLog.git
cd ChronoLog
```

### 2. Install all dependencies

```bash
# Root (Electron + build tools)
npm install

# Frontend
cd frontend && npm install && cd ..

# Backend
cd backend && npm install && cd ..
```

### 3. Configure the backend (optional)

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | API server port |
| `DATA_DIR` | `./data` | Where JSON data files are stored |
| `OPENAI_API_KEY` | — | Required only for AI Insights |

### 4. Run in development mode (Browser Mode)

```bash
# Frontend
cd frontend && npm run dev
# Backend
cd backend && npm run dev
# Tracker
cd backend && npm run tracker
```

This single command starts all three processes concurrently:

| Label | Process | URL |
|---|---|---|
| `BACKEND` | Fastify API server | localhost:3001 |
| `VITE` | React dev server | localhost:3000 |
| `ELECTRON` | Desktop window | loads localhost:3000 |

The Electron window opens automatically once the Vite dev server is ready.

> **First launch:** `settings.json` and `category-rules.json` are auto-created in `backend/data/`. Category rules are seeded by scanning your installed applications against a built-in catalog of 230+ apps.

---

## Building for Production

```bash
# Build all layers (frontend + backend + electron)
npm run build

# Package into a distributable installer
npm run dist        # current platform
npm run dist:mac    # macOS .dmg (arm64 + x64)
npm run dist:win    # Windows NSIS installer
```

Output is placed in `dist-electron/`.

In production, the user's data is stored in the OS-standard location:

| Platform | Data directory |
|---|---|
| macOS | `~/Library/Application Support/ChronoLog/data/` |
| Windows | `%APPDATA%\ChronoLog\data\` |

---

## API Reference

### Activities

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/activities` | Record a new activity (used by tracker) |
| `GET` | `/api/activities?date=YYYY-MM-DD` | Get activities for a specific day |
| `GET` | `/api/activities?from=...&to=...` | Get activities for a date range |
| `GET` | `/api/activities/dates` | List all dates that have activity data |
| `DELETE` | `/api/activities/:id?date=YYYY-MM-DD` | Delete a single activity |
| `GET` | `/api/activities/apps` | List installed application names |
| `GET` | `/api/activities/app-icon?name=<app>` | Get PNG icon for an app (macOS only) |

### Stats

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/stats/daily?date=YYYY-MM-DD` | Daily stats: focus score, context switches, top apps |
| `GET` | `/api/stats/weekly` | Weekly breakdown (optional `from`/`to` query) |

### Category Rules

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/category-rules` | List all rules |
| `POST` | `/api/category-rules` | Create a rule |
| `PATCH` | `/api/category-rules/:id` | Update a rule |
| `DELETE` | `/api/category-rules/:id` | Delete a rule |

### Settings & Privacy

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/settings` | Get tracker settings |
| `PATCH` | `/api/settings` | Update tracker settings |
| `GET` | `/api/settings/privacy` | Get privacy preferences + excluded apps |
| `PATCH` | `/api/settings/privacy` | Update privacy preferences |
| `GET` | `/api/settings/data-size` | Get size of stored data |
| `DELETE` | `/api/settings/data` | Delete data older than N days |
| `GET` | `/api/settings/export` | Export all data as JSON |

### Insights

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/insights?date=YYYY-MM-DD` | Get AI insights for a day |
| `POST` | `/api/insights/generate` | Generate new AI insights |

---

## Target Market

- University students (18–25)
- 6–10+ hours daily laptop usage
- Digitally intensive programs

Singapore market indicator: 140,000+ tertiary students, 86% rely on laptops/desktops.

---

## Team

- Marc Lim
- Amos Young
- Orvin Wirawan
- JiaJun Liu
- Jeremy Tan
- Steven Nathenial

---

## License

MIT License

---

If you find this project interesting, feel free to star the repository.
