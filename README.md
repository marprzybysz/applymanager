# ApplyManager

Starter scaffold for web app plus Docker test environment.

Project docs: `docs/`

## Stack

- React + TypeScript (UI)
- Vite (frontend tooling)
- FastAPI (Python backend)
- PostgreSQL (test DB in Docker)

## Run (development)

1. Install dependencies:

```bash
npm install
```

2. Start app:

```bash
npm run dev:full
```

## React Dev Mode (with API)

1. Start database (once per session):

```bash
npm run dev:db
```

2. Install Python backend dependencies (local):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. Run frontend + backend together:

```bash
npm run dev:full
```

Open: `http://localhost:1420`

Notes:

- Vite now proxies `/api/*` to `http://localhost:3000`.
- If dependencies changed, run `npm install` again.
- For backend changes, keep `.venv` activated while running `npm run dev:api` or `npm run dev:full`.

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

Example URL scrape via the same endpoint:

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"query":"https://www.pracuj.pl/praca/..."}'
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
./scripts/run-all.sh ports
./scripts/run-all.sh images
./scripts/run-all.sh clean-images
```

## Docker Dev (hot reload)

Use this mode during development. Frontend (`Vite`) and backend (`FastAPI`) reload automatically after file changes.

Start dev stack:

```bash
./scripts/run-dev.sh up
```

Services:

- Web (Vite): `http://localhost:1420`
- API: `http://localhost:3000`
- DB: `localhost:5432`

Other commands:

```bash
./scripts/run-dev.sh restart
./scripts/run-dev.sh logs
./scripts/run-dev.sh down
./scripts/run-dev.sh ports
./scripts/run-dev.sh images
./scripts/run-dev.sh clean-images
```

## Build frontend

```bash
npm run build
```
