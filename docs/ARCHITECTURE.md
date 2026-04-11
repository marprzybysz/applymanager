# Architektura

## 1. Przegląd

ApplyManager działa w modelu web + API + DB:

- Frontend React (Vite)
- Backend FastAPI
- PostgreSQL
- Moduł scrapowania ofert (provider-based)

Dodatkowo projekt zawiera lokalny scaffold desktop (`local/`, Qt6/C++).

## 2. Warstwy systemu

### Frontend (`src/`)

- renderowanie tabeli ofert, statystyk i modali,
- filtrowanie/sortowanie po stronie UI,
- obsługa importu/eksportu i preferencji użytkownika,
- komunikacja z API przez `/api/*`.

### Backend (`server/`)

- `server/main.py`:
  - tworzy aplikację FastAPI,
  - uruchamia `ensure_schema()` przy starcie,
  - serwuje build frontendu (`dist/`) i fallback SPA.
- `server/web/routes.py`:
  - endpointy webowe `/api/*`.
- `server/local/routes.py`:
  - endpointy lokalne `/api/local/*`.
- `server/modules/*`:
  - logika biznesowa i dostęp do danych.

### Database (`db/`)

- PostgreSQL 16,
- schema inicjalna: `db/init/001_init.sql`.

## 3. Moduły backendu

### `server/modules/offers.py`

- listowanie ofert,
- tworzenie, edycja, usuwanie,
- import/export Excel,
- agregacja statystyk.

### `server/modules/preferences.py`

- odczyt i zapis preferencji użytkownika.

### `server/modules/scrape.py`

- normalizacja query/URL,
- rozróżnianie trybu `search` vs `link`,
- delegacja do warstwy scraperów.

### `server/modules/db.py`

- połączenie DB,
- zapewnienie schematu (`ensure_schema`).

### `server/modules/registry.py`

- metadane użycia modułów (`/api/modules`, `/api/local/modules`).

## 4. Scraping

Warstwa scrapera:

- `server/scrapers/http.py` - pobieranie HTML,
- `server/scrapers/parsers.py` - parsowanie treści,
- `server/scrapers/providers.py` - mapowanie źródeł,
- `server/scrapers/index.py` - orkiestracja.

Obsługiwane źródła:

- Pracuj.pl
- OLX
- NoFluffJobs
- RocketJobs
- Indeed
- JustJoin.it

## 5. Endpointy (web)

### System

- `GET /api/health`
- `GET /api/greet`
- `GET /api/modules`

### Oferty

- `GET /api/offers`
- `GET /api/offers/stats`
- `POST /api/offers`
- `PUT /api/offers/{offer_id}`
- `DELETE /api/offers/{offer_id}`
- `POST /api/offers/import-excel`
- `GET /api/offers/export-excel`

### Preferencje

- `GET /api/preferences`
- `PUT /api/preferences`

### Scraping

- `GET /api/scrape/sources`
- `POST /api/scrape`
- `POST /api/scrape/link`

## 6. Endpointy (local)

- `GET /api/local/health`
- `GET /api/local/modules`

## 7. Tryby uruchamiania

### Docker dev

- `api` (FastAPI) - `localhost:3000`
- `web` (Vite) - `localhost:1420`
- `db` (PostgreSQL) - `localhost:5432`

### Docker prod

- `app` (frontend build + API) - `localhost:3000`
- `db` - `localhost:5432`

## 8. Uwaga techniczna

Frontend ukrywa część pól pomocniczych (np. `applied`), ale backend nadal je utrzymuje dla kompatybilności danych i importu historycznego.
