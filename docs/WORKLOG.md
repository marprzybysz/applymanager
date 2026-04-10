# Worklog

## 2026-04-10

### Bootstrap projektu

- Utworzono bazowy scaffold: React + TypeScript + Vite.
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
- Zaktualizowano frontend pod tryb Docker/web.
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

### Scrapowanie pojedynczego linku + eksport Excel

- Dodano endpoint `POST /api/scrape/link` do pobierania danych oferty z konkretnego URL (np. Pracuj.pl).
- Dodano obsługę wykrywania źródła po domenie i parser JSON-LD dla stron pojedynczych ofert.
- Dodano endpoint `GET /api/offers/export-excel` do eksportu danych z bazy do pliku `.xlsx`.
- Rozszerzono frontend o:
  - pole wklejenia linku oferty i akcję `Scrape Link`,
  - przycisk `Export Offers to Excel`.
- Zaktualizowano dokumentację (`README`, `docs/PROJECT.md`, `docs/ARCHITECTURE.md`).

### Auto-detekcja w jednym polu scrapowania

- Zmieniono `POST /api/scrape`, aby automatycznie wykrywał, czy `query` jest URL:
  - URL -> scrapowanie pojedynczego linku,
  - tekst -> scrapowanie wyszukiwania po źródłach.
- Uproszczono frontend `Scrape Jobs` do jednego pola wejściowego (fraza lub URL).

### Potwierdzenie przed zapisem zescrapowanej oferty

- Dla trybu URL ukryto wybór źródeł i pokazano informację o auto-detekcji źródła.
- Dodano okno modalne potwierdzenia zapisu oferty do bazy:
  - edycja firmy, roli, statusu, lokalizacji, daty,
  - dodanie notatek,
  - podgląd i edycja linku źródłowego.
- Kliknięcie `Save` przy wyniku scrapowania otwiera modal zamiast natychmiastowego zapisu.

### Uproszczenie sekcji Scrape + edycja rekordów scraped

- Sekcja `Scrape Jobs` została uproszczona do:
  - jednego pola tekstowego,
  - jednego przycisku `Scrape`.
- Usunięto UI wyboru źródeł i limitu z widoku frontendu.
- Dodano edycję danych zescrapowanych przed zapisem:
  - `Edit` otwiera modal z pełną edycją,
  - `Update Scraped` aktualizuje rekord w liście wyników,
  - `Save To Database` zapisuje edytowane dane do tabeli `applications`.

### React dev mode fix

- Dodano proxy Vite `/api -> http://localhost:3000` w `vite.config.ts`.
- Dodano skrypty developerskie:
  - `npm run dev:api` - backend z `node --watch`,
  - `npm run dev:full` - frontend + backend równolegle,
  - `npm run dev:db` - szybki start samej bazy `db`.
- Zaktualizowano `README.md` o uruchamianie trybu React dev bez problemu 404 na `/api/*`.

## 2026-04-11

### Podział backendu na web/local/modules

- Refactor backendu FastAPI do struktury:
  - `server/web/` (endpointy webowe),
  - `server/local/` (endpointy lokalne),
  - `server/modules/` (logika współdzielona).
- Dodano rejestr użycia modułów oraz endpointy:
  - `GET /api/modules`,
  - `GET /api/local/modules`.

### Scaffold lokalnego UI Qt

- Dodano katalog `local/` z minimalnym interfejsem desktop:
  - `local/CMakeLists.txt`,
  - `local/src/main.cpp`,
  - `local/src/MainWindow.h`,
  - `local/src/MainWindow.cpp`.
- Układ UI jest zgodny sekcjami z webowym (header, status, offers).
