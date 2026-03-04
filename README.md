# ChronoLog

![Version](https://img.shields.io/badge/version-MVP-blue)
![Platform](https://img.shields.io/badge/platform-Desktop-informational)
![License](https://img.shields.io/badge/license-MIT-green)

> Turn hidden time into visible insight.\
> A context-aware, automatic time tracking desktop application.

------------------------------------------------------------------------

## Overview

ChronoLog is a desktop-based productivity tool designed to help students
understand where their time actually goes.

Many people feel busy and mentally exhausted --- yet struggle to explain
what they actually accomplished. This "productivity paradox" happens
because time fragmentation and context switching are invisible.

ChronoLog passively tracks application-level activity and transforms it
into meaningful insights --- without manual timers or workflow
disruption.

------------------------------------------------------------------------

## Problem

From our user research with digitally intensive university students:

-   Users feel busy but cannot explain where time went
-   Frequent unconscious context switching
-   Manual tracking tools create friction and stress
-   Existing tools are designed for freelancers & enterprises, not
    students

**Core Insight:** \> The problem is not productivity --- it is
visibility.

------------------------------------------------------------------------

## Solution

ChronoLog is a passive, context-aware desktop tracker that:

-   Automatically tracks active applications
-   Detects session-level context switching
-   Provides visualized timelines
-   Offers behavioral insights
-   Stores data locally for privacy
------------------------------------------------------------------------

## Key Features

### Contextual Tracker

Track how your screen time is distributed across applications and
categories.

### Context Switching Analysis

Visualize attention fragmentation and switching density.

### Behavioral Insights

AI-assisted feedback on productivity awareness and patterns.

### Customization

-   Select what to track
-   Define custom categories
-   Control auto-categorization

### Privacy-First Design

-   Local data storage
-   No external APIs
-   No cloud tracking
-   No ads

------------------------------------------------------------------------

## Architecture

### Platform

-   Desktop application
-   Requires OS-level signals (window focus, active applications)

Web and mobile platforms cannot reliably detect cross-application
activity.

### Development Approach

-   Traditional development
-   Background process support
-   Custom session inference logic

### Storage

-   Local-based storage only
-   No external infrastructure required

------------------------------------------------------------------------

## Tech Stack

**Frontend** — React · TailwindCSS · Recharts

**Backend (Local Process)** — Node.js · Fastify · TypeScript

**Tracker** — active-win (window focus detection)

**Storage** — Local JSON files (no database required)

**AI** — OpenAI GPT-4o-mini (optional, for Insights)

**Design** - Figma - Inter font - Dark-mode-first UI

------------------------------------------------------------------------

## Project Architecture

### How the system works

```
┌─────────────────────────────────────────────────────────────┐
│                     USER'S COMPUTER                         │
│                                                             │
│  ┌──────────────┐   polls every    ┌────────────────────┐   │
│  │   tracker.ts │   5 seconds      │  active-win (npm)  │   │
│  │              │ ◄──────────────► │  reads active      │   │
│  │  Detects     │                  │  window from OS    │   │
│  │  app changes │                  └────────────────────┘   │
│  └──────┬───────┘                                           │
│         │ POST /api/activities                              │
│         ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              backend  (localhost:3001)               │   │
│  │                                                      │   │
│  │  Fastify API  ──►  services  ──►  store              │   │
│  │                                    │                 │   │
│  │                               data/ (JSON files)     │   │
│  │                               ├── activities/        │   │
│  │                               │   └── 2026-02-27.json│   │
│  │                               ├── config.json        │   │
│  │                               └── insights.json      │   │
│  └──────────────────────────────────────────────────────┘   │
│         ▲                                                   │
│         │  REST API calls (fetch)                          │
│         │                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           frontend  (localhost:3000)                 │   │
│  │                                                      │   │
│  │  React app in the browser – shows charts,            │   │
│  │  timelines, insights, and category settings          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Only when generating AI Insights
                          ▼
                   OpenAI API (internet)
```

> Everything runs locally. The only external call is to OpenAI when

---

### Folder structure

```
ChronoLog/
│
├── frontend/                        # React app (runs in the browser)
│   └── src/
│       ├── main.tsx                 # Entry point – mounts React app
│       ├── App.tsx                  # Router – maps URLs to page components
│       ├── index.css                # Global styles (Tailwind)
│       ├── api/
│       │   └── index.ts             # Frontend API client – always calls backend
│       ├── data/                    # Design-time mock JSON (not used at runtime)
│       │   ├── mock-activities.json
│       │   ├── mock-stats-daily.json
│       │   ├── mock-stats-weekly.json
│       │   ├── mock-category-rules.json
│       │   └── mock-insights.json
│       ├── types/
│       │   └── index.ts             # Frontend types mirroring backend responses
│       ├── constants.ts             # Shared constants (e.g. category colors)
│       ├── utils.ts                 # Date helpers used across components
│       ├── vite-env.d.ts            # Type declarations for Vite env variables
│       └── components/
│           ├── Layout.tsx           # Outer shell: sidebar + page content area
│           ├── Sidebar.tsx          # Left nav (Dashboard, Timeline, Insights…)
│           ├── Dashboard.tsx        # Home page: today's stats, pie chart, top apps
│           ├── ActivityTimeline.tsx # Chronological list of app sessions for a day
│           ├── Insights.tsx         # AI insight cards + habit tracker + trend charts
│           ├── Categories.tsx       # Manage app categorisation rules
│           ├── Settings.tsx         # Tracker settings (poll interval, idle threshold)
│           └── StatCard.tsx         # Reusable card component used in Dashboard
│
└── backend/                         # Node.js local server + tracker process
    ├── .env.example                 # Copy this to .env and fill in your values
    ├── data/                        # Auto-created on first run – never commit this
    │   ├── activities/
    │   │   └── YYYY-MM-DD.json      # One file per day – array of Activity objects
    │   ├── config.json              # Category rules + tracker settings
    │   └── insights.json            # AI-generated insights (persisted)
    └── src/
        │
        ├── server.ts                # Entry point – starts Fastify on localhost:3001
        ├── app.ts                   # Configures CORS and registers all route handlers
        ├── tracker.ts               # Separate process – polls active window via
        │                            # active-win and POSTs sessions to the API
        │
        ├── types/
        │   └── index.ts             # All shared TypeScript interfaces:
        │                            # Activity, CategoryRule, Insight, DailyStats…
        │
        ├── routes/                  # HTTP handlers – thin layer, no business logic
        │   ├── activities.ts        # POST /api/activities, GET /api/activities
        │   ├── category-rules.ts    # CRUD /api/category-rules + /settings
        │   ├── stats.ts             # GET /api/stats/daily, /api/stats/weekly
        │   └── insights.ts          # GET /api/insights, POST /api/insights/generate
        │
        ├── services/                # Business logic lives here
        │   ├── activity.service.ts  # Create/list/delete activities; calls autoCategory
        │   ├── category.service.ts  # Manages rules; autoCategory() maps appName+URL
        │   │                        # to Work/Study/Entertainment/Communication/…
        │   ├── stats.service.ts     # Computes focus score, context switches,
        │   │                        # top apps, longest session from raw activities
        │   └── ai.service.ts        # Calls OpenAI to generate insights from stats;
        │                            # also reads/writes insights.json
        │
        └── store/                   # File I/O layer – only place that touches disk
            ├── activity.store.ts    # Reads/writes data/activities/YYYY-MM-DD.json
            │                        # Uses atomic write (tmp file → rename) to prevent
            │                        # data corruption if the process crashes mid-write
            └── config.store.ts      # Reads/writes config.json and insights.json;
                                     # seeds default category rules on first run
```

------------------------------------------------------------------------

## Frontend Development

### 1. Clone the repository

``` bash
git clone https://github.com/HProsperouS/ChronoLog.git
cd ChronoLog
```

### 2. Install frontend dependencies

``` bash
cd frontend
npm install
```

### 3. Run the frontend in dev mode

``` bash
npm run dev
```

The app will be available at `http://localhost:3000` (or the next free port if 3000 is taken).

### 4. Build frontend for production

``` bash
npm run build
```

------------------------------------------------------------------------

## Backend Development

The backend is a local Fastify API server. It stores all data as JSON files on your machine and never sends data to any external server (except OpenAI if you enable AI Insights).

### Prerequisites

- Node.js 18+
- npm

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set the following:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | API server port |
| `DATA_DIR` | `./data` | Where JSON data files are stored |
| `OPENAI_API_KEY` | — | Required only for AI Insights feature |
| `POLL_INTERVAL_SECONDS` | `5` | How often the tracker checks the active window |
| `IDLE_THRESHOLD_MINUTES` | `5` | Minutes of inactivity before a session is closed |

> CORS is configured in `app.ts` to allow any `http://localhost:<port>` origin by default, so you usually do not need to change origin settings during local development.

### 3. Start the API server

```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:3001`. You can verify it is running:

```bash
curl http://localhost:3001/health
```

### 4. Start the tracker (separate terminal)

The tracker monitors your active window and sends activity records to the API.

```bash
cd backend
npm run tracker
```

> **Windows note:** The tracker uses `active-win` which reads the foreground window via Win32 APIs. No elevated permissions are required. Browser URLs (Chrome, Edge, Firefox) are also captured for accurate categorization.

### 5. Data files

All data is stored locally under `backend/data/`:

```
data/
  activities/
    2026-02-27.json   ← activity records per day
  config.json         ← category rules & settings
  insights.json       ← AI-generated insights
```

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/activities` | Record a new activity (used by tracker) |
| `GET` | `/api/activities?date=YYYY-MM-DD` | Get activities for a day |
| `GET` | `/api/activities?from=...&to=...` | Get activities for a date range |
| `GET` | `/api/activities/dates` | Get list of dates that have activity data |
| `DELETE` | `/api/activities/:id?date=YYYY-MM-DD` | Delete a single activity on a given day |
| `GET` | `/api/stats/daily?date=YYYY-MM-DD` | Daily stats (focus score, context switches, top apps…) |
| `GET` | `/api/stats/weekly` | Weekly breakdown (optionally `from`/`to` query) |
| `GET` | `/api/category-rules` | List categorization rules |
| `POST` | `/api/category-rules` | Add a rule |
| `PATCH` | `/api/category-rules/:id` | Update a rule |
| `DELETE` | `/api/category-rules/:id` | Delete a rule |
| `GET` | `/api/category-rules/settings` | Get tracker settings (poll interval, idle threshold) |
| `PATCH` | `/api/category-rules/settings` | Update tracker settings |
| `GET` | `/api/insights?date=YYYY-MM-DD` | Get AI insights |
| `POST` | `/api/insights/generate` | Generate new AI insights for a day |

------------------------------------------------------------------------
## Target Market

-   University students (18--25)
-   6--10+ hours daily laptop usage
-   Digitally intensive programs

Singapore market indicator: - 140,000+ tertiary students - 86% rely on
laptops/desktops

------------------------------------------------------------------------
## 👥 Team

-   Marc Lim
-   Amos Young
-   Orvin Wirawan
-   JiaJun Liu
-   Jeremy Tan
-   Steven Nathenial
------------------------------------------------------------------------

## License

MIT License

------------------------------------------------------------------------

If you find this project interesting, feel free to star the repository.
