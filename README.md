# ChronoLog

![Version](https://img.shields.io/badge/version-MVP-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-informational)
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

### Folder Structure

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
        ├── tracker.ts           # Separate process: polls active window → POST /api/activities
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
- macOS, Windows, or Linux

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

### 4. Run in development mode

```bash
npm run dev
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
npm run dist:linux  # Linux AppImage
```

Output is placed in `dist-electron/`.

In production, the user's data is stored in the OS-standard location:

| Platform | Data directory |
|---|---|
| macOS | `~/Library/Application Support/ChronoLog/data/` |
| Windows | `%APPDATA%\ChronoLog\data\` |
| Linux | `~/.config/ChronoLog/data/` |

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
