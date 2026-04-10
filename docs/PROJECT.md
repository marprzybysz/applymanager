# ApplyManager - Zakres projektu

## Cel

Aplikacja do:

- zarządzania danymi CV,
- śledzenia aplikacji o pracę,
- pracy lokalnej (web) oraz środowiska testowego w Dockerze.

## Obecny zakres (MVP)

- Frontend: React + TypeScript.
- Lokalny scaffold UI: Qt6 + C++ (`local/`).
- Tryb web/docker do testów: React + backend FastAPI.
- Baza testowa: PostgreSQL w osobnym kontenerze.
- Podstawowe endpointy API:
  - `/api/greet`
  - `/api/health`
  - `/api/modules`
  - `/api/local/health`
  - `/api/local/modules`
  - `/api/scrape/sources`
  - `/api/scrape`
  - `/api/scrape/link`
- Zarządzanie ofertami:
  - `/api/offers` (listowanie + dodawanie)
  - `/api/offers/import-excel` (import xlsx/xls)
  - `/api/offers/export-excel` (eksport xlsx)
- Moduł scrapowania ofert pracy dla:
  - OLX
  - Pracuj.pl
  - NoFluffJobs
  - RocketJobs
  - Indeed
  - JustJoin.it

## Kierunek rozwoju

- Moduł CV (wersje CV, eksport/import).
- Moduł Applications (statusy, timeline, notatki).
- Integracja z lokalną bazą (docelowo SQLite dla desktop).
- Ewentualna synchronizacja online w przyszłości.
