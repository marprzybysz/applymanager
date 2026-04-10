# Worklog

## 2026-04-10

### Bootstrap projektu

- Utworzono bazowy scaffold: Tauri + React + TypeScript + Vite.
- Dodano konfigurację `src-tauri` i testową komendę Rust `greet`.
- Dodano podstawowe pliki build i konfigurację TypeScript.
- Repozytorium utworzone na GitHub: `marprzybysz/ApplyManager`.

### Docker test environment

- Dodano backend Node/Express (`server/index.js`).
- Dodano obsługę PostgreSQL przez `pg`.
- Dodano endpointy:
  - `GET /api/greet`
  - `GET /api/health`
- Dodano obraz `app` (`Dockerfile`).
- Dodano obraz `db` (`db/Dockerfile`) oraz init SQL (`db/init/001_init.sql`).
- Dodano `docker-compose.yml` z serwisami `app` i `db`.
- Zaktualizowano frontend, aby działał zarówno w Tauri, jak i Docker/web.
- Zaktualizowano `README.md` o instrukcję uruchamiania Dockera.

### Scraping job boards

- Dodano moduł scrapowania po stronie backendu:
  - `server/scrapers/http.js`
  - `server/scrapers/parsers.js`
  - `server/scrapers/providers/index.js`
  - `server/scrapers/index.js`
- Dodano endpointy:
  - `GET /api/scrape/sources`
  - `POST /api/scrape`
- Dodano wspierane źródła:
  - OLX
  - Pracuj.pl
  - NoFluffJobs
  - RocketJobs
  - Indeed
  - JustJoin.it
- Dodano zależność `cheerio` do parsowania HTML.
- Zaktualizowano dokumentację (`README`, `docs/PROJECT.md`, `docs/ARCHITECTURE.md`).

### Bash startup script

- Dodano skrypt `scripts/run-all.sh` do zarządzania całym stackiem Docker:
  - `up`
  - `down`
  - `logs`
  - `restart`
- Skrypt czeka na gotowość API (`/api/health`) po starcie.
- Zaktualizowano `README.md` o sposób użycia skryptu.

### Podstawowy interfejs ofert + import Excel

- Rozbudowano backend (`server/index.js`) o endpointy:
  - `GET /api/offers`
  - `POST /api/offers`
  - `POST /api/offers/import-excel`
- Dodano import plików Excel (`xlsx/xls`) z mapowaniem kolumn PL/EN.
- Dodano automatyczne zapewnienie schematu tabeli `applications` (kolumny `source`, `source_url`).
- Rozbudowano frontend (`src/App.tsx`) o:
  - formularz ręcznego dodawania oferty,
  - sekcję scrapowania ofert i zapisu wyniku do bazy,
  - sekcję importu Excela,
  - listę aktualnych ofert z bazy.
- Przebudowano style (`src/styles.css`) pod nowy układ interfejsu.
- Dodano zależności `multer` i `xlsx`.
