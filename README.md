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
The React UI polls the backend on open pages so numbers update without a manual reload:

| Screen | What refreshes |
|---|---|
| **Dashboard** | Today’s daily stats, yesterday (for trend badges), rolling 7-day weekly stats (**30s**) |
| **Insights** | AI insights list for today + 14-day stats window (summary cards & charts) (**30s**) |
| **Activity** | Only when the selected calendar day is **today** (**5s**); historical dates load once per selection |

The Activity screen also runs a **60-second** check for the local calendar date rolling over (so “today” advances after midnight for late-night use).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Desktop shell** | Electron 35 (main process + system tray) |
| **Frontend** | React 18 · Vite · TailwindCSS v4 · shadcn/ui · Recharts |
| **Backend** | Node.js · Fastify 5 · TypeScript |
| **Tracker** | get-windows (cross-platform window focus detection) |
| **Storage** | Local JSON files — no database required |
| **AI Insights** | AWS Lambda proxy (GPT-4o-mini in cloud); backend calls Function URL |
| **Design** | Figma · Dark-mode-first UI |

Figma: https://www.figma.com/design/A0ckoTrM9lhRRZXZQryYya/ChronoLog?node-id=0-1&t=FPzoA59Dcc1iliIc-1

---

## macOS Signing Notes

- For stable macOS privacy permissions (Accessibility / Screen Recording / Automation), ship a **Developer ID-signed** app.
- Ad-hoc signing (`TeamIdentifier=not set`) can lead to permissions appearing enabled in System Settings but not being honored at runtime.
- Set `CSC_NAME` to your certificate name when building release artifacts.
- The repository currently does **not** include a custom `afterSign` helper, so if you add one for release signing, also ensure nested binaries (for example `get-windows`) are signed consistently.

Quick verification after build:

```bash
codesign -dv --verbose=4 /Applications/ChronoLog.app/Contents/MacOS/ChronoLog 2>&1 | rg "Identifier=|TeamIdentifier="
codesign -dv --verbose=4 /Applications/ChronoLog.app/Contents/Resources/backend/node_modules/get-windows/main 2>&1 | rg "Identifier=|TeamIdentifier="
```

Both should show a real `TeamIdentifier` (not `not set`).

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
│  │  ~5 s (default)  │ POST │  ├── routes/                   │   │
│  │  configurable    │      │  ├── routes/                   │   │
│  │  get-windows ────┼─────►│  ├── services/                 │   │
│  │                  │      │  └── store/ → data/ (JSON)     │   │
│  └──────────────────┘      │       ├── activities/          │   │
│                            │       ├── settings.json        │   │
│                            │       ├── category-rules.json  │   │
│                            │       └── insights.json        │   │
│                            └───────────────┬────────────────┘   │
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
                              │ POST daily stats (HTTPS)
                              ▼
                       Lambda Function URL → OpenAI (internet)
```

> Core tracking and data stay local. Generating AI Insights sends **aggregated daily stats + a sanitized session timeline (max 240 rows, no window titles/URLs)** to your **Lambda** (see `infra/`); the OpenAI key stays in AWS, not in `backend/.env`.

---

## Tracker Logic

The tracker (`backend/src/tracker.ts`) is a lightweight background process that continuously monitors what the user is doing and records it into the local data store.

### What the tracker can detect

| Data | Details |
|---|---|
| **App name** | The name of the currently focused application (e.g. `Google Chrome`, `Cursor`, `Spotify`) |
| **Window title** | The title bar text — e.g. `"JavaScript Tutorial - YouTube"`, `"project.ts — Cursor"` |
| **URL** | Full URL for supported browsers only (Chrome, Safari, Firefox, Arc, Brave, Edge, Opera). Non-browser apps never store URL. |
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
get-windows() ──► no result (locked screen / UAC)? ──► close session → return
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
      │
      └── No  ──► POST old session → start new session
```

Sessions shorter than **5 seconds** are silently discarded to filter out accidental focus (e.g. quick Alt+Tab glances).

---

### Session grouping

The tracker decides whether the current poll belongs to the **same session** as the previous one:

- **Non-browser apps** (Cursor, Notion, Figma, etc.): same session if `appName` **and** `windowTitle` are unchanged. A new document or project in the same app creates a new session.
- **Browser apps** (Chrome, Safari, Firefox, Arc, Brave, Edge, Opera): same session if `appName`, normalized `url`, and `windowTitle` are unchanged. URL normalization removes hash fragments, common `utm_*` params, and non-root trailing slashes before comparison.

Within a session, `windowTitle` and `url` are updated live on every poll. This ensures that when the session is eventually written, it captures the **most recent** title — keeping category auto-detection accurate even if content changed mid-session (e.g. switching from a tutorial to a music video on YouTube).

---

### Session writes and crash safety

ChronoLog now uses **event-boundary writes** (no forced time slicing):

- A session is written when context actually changes (app/site switch), when idle starts (back-dated), or on tracker shutdown.
- The tracker persists in-progress session state to `backend/data/tracker-state.json`.
- On restart, it attempts to recover that state and writes a safe tail ending at restart time.
- If recovery POST fails (e.g. backend unavailable), the state file is kept for retry on next startup.

---

### Backend anti-fragmentation merge

To reduce accidental tiny sessions from restart/jitter edges, the backend merges adjacent activities on write when:

- category is the same
- session key is the same (browser by normalized URL + title, non-browser by app + title)
- the time gap is very small (<= 15 seconds)

This keeps context-switch metrics closer to real user behavior.

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
- `private` / `navigation privée` → Firefox, Safari
- `InPrivate` → Edge

It also treats `about:blank` and `chrome-extension://...` as non-recordable URLs.

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
  "id":          1234,
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

A **context switch** (`contextSwitches`) is counted when consecutive sessions change category (`prev.category !== curr.category`) across the full timeline.

ChronoLog also computes a second metric: **productivity switches** (`productivitySwitches`), which counts only productive ↔ non-productive transitions.

For productivity switches, category productivity type comes from `categories.json`:

- `productive`
- `non_productive`
- `neutral` (ignored as a bridge, does not itself count as a switch)

To avoid over-counting tiny “blips”, very short (<1 min) segments are merged away when surrounding segments share the same productive/non-productive state (matching the Activity page “Productive ↔ Non-Productive only” view).

---

### Focus Score (0–100)

The Focus Score combines three dimensions to reflect both **how much** and **how well** the user focused:

| Dimension | Weight | Max 100% when |
|---|---|---|
| **Productive time ratio** | 50% | All tracked time is in `productive` categories |
| **Longest focus block** | 25% | Longest continuous `productive` block ≥ 90 minutes |
| **Switch penalty** | 25% | 0 productivity switches; 10+ switches = 0 |

**Formula:**
```
score = (productiveTime / totalTime) × 50
      + min(longestFocusBlockMins / 90, 1) × 25
      + max(0, 1 − productivitySwitches / 10) × 25
```

**Longest focus block** merges consecutive productive activities that are within 5 minutes of each other — so minor write jitter does not fragment a long focus session.

**Examples:**
- 3h productive time, 2 productivity switches, longest block 90 min → ~95
- 30 min productive time, 8 productivity switches, longest block 15 min → ~30

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
- **Context switch threshold (8)** — Research from the University of California, Irvine found that repeated task-switching causes measurable increases in stress and frustration. ChronoLog uses the daily `contextSwitches` metric (category-to-category switches) for this warning.
- **Productive ratio threshold (30%)** — A warning fires when productive time (all categories marked `productive`) drops below a practical baseline.

> **Implementation note:** In Electron, notifications are sent through the main process (`window.electronAPI.showNotification`) and use native OS notifications. In browser-only mode, it falls back to the Web Notification API.

---

## Folder Structure

```
ChronoLog/
│
├── infra/                       # AWS CDK — Lambda + Function URL (AI insights proxy)
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
    │   ├── insights.json        # AI-generated insights (persisted)
    │   └── tracker-state.json   # Last in-progress tracker session (crash/restart recovery)
    └── src/
        ├── server.ts            # Fastify entry point (localhost:3001)
        ├── app.ts               # CORS, route registration
        ├── tracker.ts           # Background process: polls active window → POST /api/activities
        ├── types/
        │   └── index.ts         # Shared interfaces: Activity, CategoryRule, Settings…
        ├── routes/
        │   ├── activities.ts    # Activities + app listing + app icons
        │   ├── category-list.ts # Category CRUD (name/color/productivity type)
        │   ├── category-rules.ts
        │   ├── stats.ts
        │   ├── settings.ts      # Settings, privacy, data management, export
        │   └── insights.ts
        ├── services/
        │   ├── activity.service.ts   # Activity CRUD, app scanning, icon extraction
        │   ├── category-list.service.ts # Category list CRUD
        │   ├── category.service.ts   # Category rules, auto-categorisation
        │   ├── stats.service.ts      # Focus score, context switches, top apps
        │   ├── settings.service.ts   # Settings, privacy, data retention, export
        │   ├── ai.service.ts         # Calls insights Lambda; reads/writes insights.json
        │   ├── app-catalog.ts        # Installed-app signatures + browser rule blueprints
        │   └── app-scanner.ts        # Cross-platform installed app discovery
        └── store/
            ├── activity.store.ts       # Reads/writes activities/YYYY-MM-DD.json
            ├── categories.store.ts     # Reads/writes categories.json (seeds defaults)
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

#### A) Browser mode (without Electron)

```bash
cd frontend && npm install
cd ../backend && npm install
cd ..
```

#### B) Electron mode

Install all layers (root + frontend + backend):

```bash
# Root (Electron + build tools)
npm install

# Frontend
cd frontend && npm install && cd ..

# Backend
cd backend && npm install && cd ..
```

### 3. Configure the backend

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | API server port |
| `DATA_DIR` | `./data` | Where JSON data files are stored |
| `INSIGHTS_FUNCTION_URL` | — | Lambda Function URL for `POST` generate |
| `INSIGHTS_PROXY_SECRET` | — | `Authorization: Bearer` value (same as CDK `ProxySecret`) |

### 4. Run in development mode (choose one)

#### A) Browser mode (without Electron)

Run each service in its own terminal:

```bash
# Terminal 1
cd frontend && npm run dev

# Terminal 2
cd backend && npm run dev

# Terminal 3
cd backend && npm run tracker
```

| Service | URL / Notes |
|---|---|
| Frontend (Vite) | `http://localhost:3000` |
| Backend (Fastify) | `http://localhost:3001` |
| Tracker | posts activity to backend |

#### B) Electron mode

Run from repository root:

```bash
npm run dev
```

This starts Electron + Vite + backend concurrently. Electron will launch the tracker process automatically.

If you want desktop-only mode (no Vite web server), run:

```bash
npm run dev:desktop
```

This builds the frontend once, then starts Electron only. Electron will start backend + tracker internally and load `frontend/dist` directly.

> **First launch:** `settings.json`, `categories.json`, and `category-rules.json` are auto-created in `backend/data/`. Category rules are seeded by scanning installed applications and applying built-in app signatures plus browser rule blueprints.

---

## Building for Production

```bash
# Build all layers (frontend + backend + electron)
npm run build

# Package into a distributable installer
npm run dist        # current platform
npm run dist:mac    # macOS .dmg (arm64)
npm run dist:win    # Windows NSIS installer
npm run dist:linux  # Linux AppImage
```

Output is placed in `dist-electron/`.

### Electron packaging quick reference

| Command | What it does |
|---|---|
| `npm run build` | Compiles frontend (`frontend/dist`), backend (`backend/dist`), and Electron main process (`electron/dist`) |
| `npm run dist` | Builds everything, then creates installer/package for the current OS |
| `npm run dist:win` | Builds everything, then creates Windows installer (`NSIS`) |
| `npm run dist:mac` | Builds everything, then creates macOS installer (`DMG`) |

Packaging includes:
- `frontend/dist/**` (renderer)
- `backend/dist/**` (API + tracker runtime)
- `electron/dist/**` (main/preload)
- `electron/assets/**` (icons/assets)

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
| `GET` | `/api/stats/weekly` | Weekly breakdown (`from`/`to` query supported) |

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
| `GET` | `/api/settings/data-summary` | Get storage summary (`totalBytes`, first/last day, day count) |
| `POST` | `/api/settings/data/clear-old` | Delete activity files older than `olderThanDays` |
| `DELETE` | `/api/settings/data/all` | Delete all local ChronoLog data files |
| `GET` | `/api/settings/data/export` | Export settings/rules/activities/insights JSON payload |
| `POST` | `/api/settings/data/import-activities` | Import activities grouped by date |

### Categories

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/categories` | List category definitions (name/color/productivity type) |
| `POST` | `/api/categories` | Create a category |
| `PATCH` | `/api/categories` | Update category color/productivity type |
| `DELETE` | `/api/categories` | Delete a category (fails if still used by rules) |

### Insights

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/insights?date=YYYY-MM-DD` | Get AI insights for a day |
| `POST` | `/api/insights/generate` | Generate new AI insights (manual trigger, daily limit applies) |
| `GET` | `/api/insights/quota?date=YYYY-MM-DD` | Get today’s insights-generate quota (`used`, `remaining`, `limit`, `canGenerate`, cooldown info) |
| `GET` | `/api/insights/weekly?weekStart=YYYY-MM-DD` | Get weekly insights for a Monday-start week |
| `POST` | `/api/insights/weekly/generate` | Generate weekly insights (manual trigger, weekly limit applies) |
| `GET` | `/api/insights/weekly/quota?weekStart=YYYY-MM-DD` | Get weekly generate quota/cooldown |

### AI Insights generation policy

- Generation is **manual-first** (user clicks **Generate insights** in the Insights page).
- Daily generation cap is currently **3 times per day** per local calendar date.
- A **2-hour cooldown** is enforced between successful generations.
- Weekly insights cap is currently **2 times per week** (week key = Monday `YYYY-MM-DD`).
- Weekly generation cooldown is **6 hours** between successful weekly runs.
- If over limit, backend returns **HTTP 429** with quota details.
- Insights page reads `/api/insights/quota` and disables generate actions when quota is exhausted or cooldown is active.
- Backend also starts a weekly auto-generation scheduler (`Sunday 23:59`, using the backend process timezone), which attempts to generate weekly insights for the current week.

### AI/Lambda Cost Model (Singapore, ap-southeast-1)

This section provides a practical cost estimate for the hosted AI proxy in Singapore.

Assumptions used:
- Region: `ap-southeast-1` (AWS Lambda in Singapore).
- Lambda config: `256 MB` memory (`infra/lib/insights-stack.ts`), avg runtime assumed `~4s` per request.
- Model: `gpt-4o-mini` (`infra/lambda/insights/handler.ts`).
- Daily insight usage tiers below assume power users and this daily range:
  - Low: `1 daily insight/day` (`30/month`)
  - Mid: `2 daily insights/day` (`60/month`)
  - High: `3 daily insights/day` (`90/month`, current cap)
- Weekly insight frequency for this estimate: **once per week** (`52/12 = 4.33 times/month`).

**Lambda cost (Singapore)**
- Requests: `$0.20 / 1M` requests.
- Duration (x86, tier 1): `$0.0000166667 / GB-second`.
- Free tier (account-level): `1M requests + 400,000 GB-seconds / month`.
- Estimated Lambda cost per insight call (before free tier), at `256 MB` and `~4s`:  
  `0.256 * 4 * 0.0000166667 + 0.20/1,000,000 = ~$0.00001727`.

**AI cost (gpt-4o-mini, estimate basis)**
- Estimated Daily Insight AI cost per call: `~$0.00051`.
- Estimated Weekly Insight AI cost per call: `~$0.000405`.

**Weekly Insight cost (once per week)**
- Monthly frequency: `4.33` weekly calls/user/month.
- AI component: `4.33 * 0.000405 = ~$0.001755 / user / month`.
- Lambda component (before free tier): `4.33 * 0.00001727 = ~$0.0000748 / user / month`.
- Total weekly-insight-only cost: `~$0.00183 / user / month`.

**Power user monthly cost range (per user)**
- Formula:  
  `Monthly cost = (DailyCalls * DailyAICost) + (WeeklyCalls * WeeklyAICost) + (TotalCalls * LambdaPerCall)`
- Using `WeeklyCalls = 4.33/month` and the assumptions above:

| Power-user profile | Daily calls/month | Weekly calls/month | AI cost / user / month | Lambda cost / user / month* | Total / user / month* |
|---|---:|---:|---:|---:|---:|
| Low | 30 | 4.33 | `$0.017055` | `$0.000593` | `$0.017648` |
| Mid | 60 | 4.33 | `$0.032355` | `$0.001111` | `$0.033466` |
| High | 90 | 4.33 | `$0.047655` | `$0.001629` | `$0.049284` |

\* Lambda figures above are **before** account-level free tier. Effective Lambda spend may be lower at small scale.

Notes:
- These are planning estimates for budgeting/presentation, not billing guarantees.
- Real spend depends on actual token usage, runtime, retries, and CloudWatch log volume.

### Hosted AI proxy (AWS)

Deploy **`infra/`** (CDK) for the Lambda + Function URL, then set **`INSIGHTS_FUNCTION_URL`** and **`INSIGHTS_PROXY_SECRET`** in `backend/.env`. Prompts live in **`infra/lambda/insights/prompt.ts`** — see **`infra/README.md`**.

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
- Steven Nathaniel

---

## License

MIT License

---

If you find this project interesting, feel free to star the repository.
