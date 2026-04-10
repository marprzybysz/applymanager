# Architektura

## Web + Docker mode (obecny)

- `app` container:
  - build React przez Vite,
  - backend FastAPI serwujący `dist` i API.
- `db` container:
  - PostgreSQL 16,
  - inicjalizacja schema z `db/init/001_init.sql`.

## Local mode (Qt scaffold)

- `local/`:
  - podstawowy UI desktop w Qt6/C++,
  - układ zgodny z web: header, status, offers.

## Komunikacja

- Frontend -> `/api/*` w trybie web/docker.
- Backend -> PostgreSQL przez `psycopg2`.
- Backend -> portale pracy przez HTTP fetch + parsery HTML/JSON-LD.

## Moduł ofert

- `GET /api/offers` - lista ofert z bazy.
- `POST /api/offers` - ręczne dodanie oferty.
- `POST /api/offers/import-excel` - import ofert z pliku Excel (`xlsx/xls`).
- `GET /api/offers/export-excel` - eksport ofert do pliku Excel (`xlsx`).
- Backend podczas startu zapewnia strukturę tabeli `applications` (w tym pola `source`, `source_url`).

## Scraping moduł

- `server/scrapers/http.py` - pobieranie HTML z timeoutem i nagłówkami.
- `server/scrapers/parsers.py` - parser JSON-LD (`JobPosting`).
- `server/scrapers/providers.py` - providerzy i selektory per portal.
- `server/scrapers/index.py` - orkiestracja scrapowania wielu źródeł.
- `POST /api/scrape/link` - scrapowanie pojedynczego URL oferty.
- `POST /api/scrape` - auto-tryb:
  - jeśli `query` jest URL, backend scrapuje pojedynczy link,
  - jeśli `query` jest frazą, backend robi scraping search dla źródeł.

Wspierane źródła:

- `olx`
- `pracuj`
- `nofluffjobs`
- `rocketjobs`
- `indeed`
- `justjoinit`

## Pliki kluczowe

- `src/` - UI React.
- `local/` - lokalny scaffold UI Qt6/C++.
- `server/main.py` - bootstrap FastAPI i mount routerów.
- `server/web/` - endpointy webowe (`/api/*`).
- `server/local/` - endpointy lokalne (`/api/local/*`).
- `server/modules/` - logika współdzielona backendu.
- `server/scrapers/` - logika scrapowania ofert.
- `src/App.tsx` - interfejs web: dodawanie, import Excel, lista ofert.
- `docker-compose.yml` - orkiestracja app + db.
- `db/init/001_init.sql` - inicjalna struktura tabel.
