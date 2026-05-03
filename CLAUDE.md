# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this project

ApplyManager is a job application tracking app (v0.8.1-beta). It lets users track offers, import/export Excel, scrape job listings from 6 sources (pracuj.pl, olx.pl, nofluffjobs.com, rocketjobs.pl, indeed.com, justjoin.it), and visualize stats.

Three deployment modes:
- **Web** (Docker): React SPA served by FastAPI, PostgreSQL in container
- **Dev local**: Vite dev server + uvicorn + local Postgres
- **Desktop**: Electron wrapper around the web app

---

## Commands

### Local dev (without Docker)

```bash
npm run dev:db       # Start only the PostgreSQL container
npm run dev:full     # Vite (port 1420) + uvicorn (port 3000) concurrently
npm run dev:desktop  # Frontend + API + Electron
```

Requires a `.env` file with DB credentials. Generate one:
```bash
./scripts/setup-server-env.sh
```

### Docker dev stack

```bash
./scripts/run-dev.sh up      # Start dev stack (api + web + db)
./scripts/run-dev.sh down
./scripts/run-dev.sh logs
```

### Production Docker

```bash
./scripts/run-all.sh up
./scripts/run-all.sh down
```

### Build

```bash
npm run build           # TypeScript check + Vite build → dist/
npm run build:desktop   # Electron desktop app (AppImage on Linux)
```

### Tests

Tests run in Docker to avoid local env issues:

```bash
# Smoke tests (quick endpoint checks)
docker run --rm -v "$PWD":/app -w /app python:3.10-slim sh -lc \
  "pip install -r requirements.txt -r requirements-dev.txt && pytest -q tests/smoke"

# Regression tests (logic, data transformation)
docker run --rm -v "$PWD":/app -w /app python:3.10-slim sh -lc \
  "pip install -r requirements.txt -r requirements-dev.txt && pytest -q tests/regression"

# Single test file
docker run --rm -v "$PWD":/app -w /app python:3.10-slim sh -lc \
  "pip install -r requirements.txt -r requirements-dev.txt && pytest -q tests/regression/test_excel_import_regression.py"
```

---

## Architecture

### Request flow

```
Browser / Electron
    ↓
Vite dev proxy (/api → localhost:3000)   [dev only]
    ↓
FastAPI  server/main.py
    ↓  lifespan: runs DB schema init
    ├── server/web/routes.py      /api/*         (main web API)
    └── server/local/routes.py   /api/local/*   (desktop-only endpoints)
         ↓
    server/modules/
        ├── db.py          ThreadedConnectionPool, schema init
        ├── offers.py      CRUD, Excel import/export, stats
        ├── scrape.py      orchestration → server/scrapers/
        └── preferences.py user preferences (singleton row in DB)
         ↓
    PostgreSQL (db/ schema in docker, or local)
```

In production, FastAPI also serves the SPA from `dist/` and falls back to `index.html` for all unmatched routes.

### Frontend (src/)

`App.tsx` is a large monolithic component (~223 KB). It owns all state: offer list, filters, modals, notifications, theme, tab routing, drag-and-drop stats layout. Supporting files are thin utilities:

- `domain/status.ts` — status types and color mappings
- `types/app.ts` — all TypeScript interfaces
- `constants/app.ts` — status options, colors, thresholds
- `utils/appHelpers.ts` — date formatting, location/normalization helpers
- `i18n/translations.ts` — Polish/English bilingual strings
- `topTabRouting.ts` — URL pathname ↔ tab sync

### Backend modules

- **offers.py**: The heaviest module. Excel import maps 13+ column name variations per field. Stats aggregation includes status counts, source counts, active/expired/applied breakdowns.
- **scrape.py**: Routes input (URL vs. query string) to the right provider scraper. Rate-limited to 30 req/60s per IP.
- **scrapers/**: One file per concern — `index.py` (orchestration + date logic), `providers.py` (source dispatch), `parsers.py` (HTML/JSON-LD parsing), `http.py` (fetch with headers).
- **db.py**: All DB interaction goes through a `ThreadedConnectionPool`. Schema is applied idempotently on startup from code (not migration files); the SQL source is `db/init/001_init.sql`.

### Database schema

Three tables: `applications` (main), `user_preferences` (singleton, id=1), `cvs` (stub for future CV module). Notable: `applications.applied` (boolean) is kept for backwards compatibility but hidden in UI; status field drives everything.

### Electron

`electron/main.cjs` loads from `localhost:1420` in dev and `dist/index.html` in prod. Sandbox + context isolation enabled. `local/` contains a Qt6/C++ scaffold that is not currently integrated.

---

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `DB_HOST` | `localhost` | |
| `DB_PORT` | `5432` | |
| `DB_USER` | `applymanager` | |
| `DB_PASSWORD` | — | Required, no default |
| `DB_NAME` | `applymanager` | |
| `VITE_API_PROXY_TARGET` | `http://localhost:3000` | Frontend proxy target |
| `CORS_ALLOW_ORIGINS` | `*` | FastAPI CORS |
| `DB_POOL_MIN_CONN` | — | psycopg2 pool sizing |
| `DB_POOL_MAX_CONN` | — | psycopg2 pool sizing |
