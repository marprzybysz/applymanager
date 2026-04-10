# Architektura

## Desktop mode (docelowy)

- Frontend: React + TypeScript.
- Shell/natywny runtime: Tauri.
- Lokalna baza: SQLite (plan).

## Docker test mode (obecny)

- `app` container:
  - build React przez Vite,
  - backend Express serwujący `dist` i API.
- `db` container:
  - PostgreSQL 16,
  - inicjalizacja schema z `db/init/001_init.sql`.

## Komunikacja

- Frontend -> Tauri command (`invoke`) w desktop.
- Frontend -> `/api/*` w trybie web/docker.
- Backend -> PostgreSQL przez `pg`.
- Backend -> portale pracy przez HTTP fetch + parsery HTML/JSON-LD.

## Scraping moduł

- `server/scrapers/http.js` - pobieranie HTML z timeoutem i nagłówkami.
- `server/scrapers/parsers.js` - parser JSON-LD (`JobPosting`).
- `server/scrapers/providers/index.js` - providerzy i selektory per portal.
- `server/scrapers/index.js` - orkiestracja scrapowania wielu źródeł.

Wspierane źródła:

- `olx`
- `pracuj`
- `nofluffjobs`
- `rocketjobs`
- `indeed`
- `justjoinit`

## Pliki kluczowe

- `src/` - UI React.
- `src-tauri/` - konfiguracja i kod Rust dla desktop.
- `server/index.js` - backend Express.
- `server/scrapers/` - logika scrapowania ofert.
- `docker-compose.yml` - orkiestracja app + db.
- `db/init/001_init.sql` - inicjalna struktura tabel.
