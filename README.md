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

**Frontend** - React / Electron - TailwindCSS - Chart.js

**Backend (Local Process)** - Node.js - OS-level window detection APIs

**Storage** - SQLite / Local JSON

**Design** - Figma - Inter font - Dark-mode-first UI

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
