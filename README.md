# ApplyManager

ApplyManager to aplikacja do śledzenia ofert pracy i procesu aplikowania.
Projekt zawiera web UI (React + Vite), backend API (FastAPI), scraping ofert, import/eksport danych oraz środowiska Docker (dev/prod).

## Stack

- Frontend: React 18 + TypeScript + Vite
- Backend: Python 3 + FastAPI
- Baza danych: PostgreSQL 16
- Scraping: requests + parsery HTML/JSON-LD (własne moduły)
- Desktop scaffold: Qt6 + C++ (`local/`)
- Konteneryzacja: Docker Compose

## Szybki start (Docker Dev)

Najwygodniejszy tryb podczas developmentu:

```bash
./scripts/run-dev.sh up
```

Porty:

- Web (Vite): `http://localhost:1420`
- API (FastAPI): `http://localhost:3000`
- Health: `http://localhost:3000/api/health`
- DB: `localhost:5432`

Zarządzanie:

```bash
./scripts/run-dev.sh restart
./scripts/run-dev.sh logs
./scripts/run-dev.sh down
./scripts/run-dev.sh ports
./scripts/run-dev.sh images
./scripts/run-dev.sh clean-images
```

## Szybki start (Docker Prod)

```bash
./scripts/run-all.sh up
```

Porty:

- App (frontend build + backend): `http://localhost:3000`
- Health: `http://localhost:3000/api/health`
- DB: `localhost:5432`

Zarządzanie:

```bash
./scripts/run-all.sh restart
./scripts/run-all.sh logs
./scripts/run-all.sh down
./scripts/run-all.sh ports
./scripts/run-all.sh images
./scripts/run-all.sh clean-images
```

## Konfiguracja serwera (.env)

Na serwerze najlepiej wygenerować własne hasła DB:

```bash
./scripts/setup-server-env.sh
```

To utworzy lokalny plik `.env` (ignorowany przez git) z bezpiecznym `DB_PASSWORD`.

Po zmianie konfiguracji:

```bash
./scripts/run-all.sh restart
```

## Uruchomienie lokalne (bez Dockera)

1. Node dependencies:

```bash
npm install
```

2. Python venv + dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. Uruchom backend + frontend:

```bash
npm run dev:full
```

## Najważniejsze endpointy API

### Core

- `GET /api/health`
- `GET /api/greet?name=...`
- `GET /api/modules`
- `GET /api/local/health`
- `GET /api/local/modules`

### Oferty

- `GET /api/offers` - lista ofert
- `GET /api/offers/stats` - statystyki
- `POST /api/offers` - dodanie oferty
- `PUT /api/offers/{offer_id}` - edycja oferty
- `DELETE /api/offers/{offer_id}` - usunięcie oferty
- `POST /api/offers/import-excel` - import `.xlsx/.xls`
- `GET /api/offers/export-excel` - eksport `.xlsx`

### Preferencje

- `GET /api/preferences`
- `PUT /api/preferences`

### Scraping

- `GET /api/scrape/sources`
- `POST /api/scrape` - query tekstowe lub URL
- `POST /api/scrape/link` - pojedynczy URL

Obsługiwane źródła scrapera:

- `pracuj`
- `olx`
- `nofluffjobs`
- `rocketjobs`
- `indeed`
- `justjoinit`

## Aktualne funkcje UI

- zakładki `Oferty` i `Statystyki`
- tabela ofert z sortowaniem po kolumnach
- filtry: status, źródło, okres (miesiąc/kwartał/rok/wszystko)
- tryb widoku: prosty / zaawansowany
- wyszukiwarka z rozwijanym polem
- statusy kolorowane (np. wysłano, in progress, rozmowa, odrzucenie)
- szczegóły oferty w modalu:
  - edycja i zapis
  - usuwanie z osobnym potwierdzeniem
- import/eksport + preferencje dostępne z menu użytkownika

## Struktura projektu

- `src/` - web frontend
- `server/main.py` - bootstrap FastAPI i serwowanie SPA
- `server/web/` - routery API web (`/api/*`)
- `server/local/` - routery lokalne (`/api/local/*`)
- `server/modules/` - logika domenowa (offers, preferences, db, scrape)
- `server/scrapers/` - providerzy i parsery źródeł
- `db/init/001_init.sql` - schema DB
- `scripts/` - skrypty uruchamiania dev/prod
- `docs/` - dokumentacja techniczna
- `local/` - desktop scaffold Qt6/C++

## Dokumentacja

Pełna dokumentacja techniczna jest w katalogu `docs/`:

- `docs/PROJECT.md`
- `docs/ARCHITECTURE.md`
- `docs/WORKLOG.md`

## Qt local scaffold

`local/` zawiera bazowy interfejs Qt6/C++ (scaffold).

Build:

```bash
cmake -S local -B build/local
cmake --build build/local -j
```

Run:

```bash
./build/local/applymanager_local
```
