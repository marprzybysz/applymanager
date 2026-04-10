# ApplyManager

Starter scaffold for a desktop app plus Docker test environment.

Project docs: `docs/`

## Stack

- Tauri 2 (desktop shell + Rust commands)
- React + TypeScript (UI)
- Vite (frontend tooling)
- Express (web backend for Docker mode)
- PostgreSQL (test DB in Docker)

## Run (development)

1. Install dependencies:

```bash
npm install
```

2. Start app:

```bash
npm run tauri dev
```

## Docker (frontend + backend + db)

Start containers:

```bash
docker compose up --build
```

Services:

- App: `http://localhost:3000`
- API health: `http://localhost:3000/api/health`
- API greet: `http://localhost:3000/api/greet?name=Marcin`
- API supported sources: `GET /api/scrape/sources`
- API scrape jobs: `POST /api/scrape`
- PostgreSQL: `localhost:5432`

Example scrape request:

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"query":"frontend react","sources":["justjoinit","nofluffjobs"],"limitPerSource":10}'
```

Notes:

- Scraping selectors can change when job portals update their HTML.
- Always verify portal Terms of Service and legal requirements before production use.

Stop containers:

```bash
docker compose down
```

## Build installer

```bash
npm run tauri build
```

Installers are generated in `src-tauri/target/release/bundle`.
