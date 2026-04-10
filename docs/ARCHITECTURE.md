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

## Moduł ofert

- `GET /api/offers` - lista ofert z bazy.
- `POST /api/offers` - ręczne dodanie oferty.
- `POST /api/offers/import-excel` - import ofert z pliku Excel (`xlsx/xls`).
- `GET /api/offers/export-excel` - eksport ofert do pliku Excel (`xlsx`).
- Backend podczas startu zapewnia strukturę tabeli `applications` (w tym pola `source`, `source_url`).

## Scraping moduł

- `server/scrapers/http.js` - pobieranie HTML z timeoutem i nagłówkami.
- `server/scrapers/parsers.js` - parser JSON-LD (`JobPosting`).
- `server/scrapers/providers/index.js` - providerzy i selektory per portal.
- `server/scrapers/index.js` - orkiestracja scrapowania wielu źródeł.
- `POST /api/scrape/link` - scrapowanie pojedynczego URL oferty.

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
- `src/App.tsx` - podstawowy interfejs: ręczne dodawanie, scraping, import Excel, lista ofert.
- `docker-compose.yml` - orkiestracja app + db.
- `db/init/001_init.sql` - inicjalna struktura tabel.
