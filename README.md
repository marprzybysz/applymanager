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

Or use helper script:

```bash
./scripts/run-all.sh up
```

Services:

- App: `http://localhost:3000`
- API health: `http://localhost:3000/api/health`
- API greet: `http://localhost:3000/api/greet?name=Marcin`
- API supported sources: `GET /api/scrape/sources`
- API scrape jobs: `POST /api/scrape`
- API scrape single link: `POST /api/scrape/link`
- API offers list: `GET /api/offers`
- API add offer: `POST /api/offers`
- API import Excel: `POST /api/offers/import-excel` (`multipart/form-data`, file field: `file`)
- API export Excel: `GET /api/offers/export-excel`
- PostgreSQL: `localhost:5432`

Example scrape request:

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"query":"frontend react","sources":["justjoinit","nofluffjobs"],"limitPerSource":10}'
```

Example single-link scrape request:

```bash
curl -X POST http://localhost:3000/api/scrape/link \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.pracuj.pl/praca/..."}'
```

Notes:

- Scraping selectors can change when job portals update their HTML.
- Always verify portal Terms of Service and legal requirements before production use.
- Excel import reads first sheet and maps columns like `company/firma`, `role/stanowisko`, `status`, `location`, `notes`, `date`, `source`, `url`.

Stop containers:

```bash
docker compose down
```

Helper commands:

```bash
./scripts/run-all.sh down
./scripts/run-all.sh logs
./scripts/run-all.sh restart
```

## Build installer

```bash
npm run tauri build
```

Installers are generated in `src-tauri/target/release/bundle`.
