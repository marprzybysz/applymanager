# ApplyManager - Zakres projektu

## Cel

Aplikacja do:

- zarządzania danymi CV,
- śledzenia aplikacji o pracę,
- pracy lokalnej (desktop) oraz środowiska testowego w Dockerze.

## Obecny zakres (MVP)

- Szkielet desktop: Tauri + React + TypeScript.
- Tryb web/docker do testów: React build + backend Node/Express.
- Baza testowa: PostgreSQL w osobnym kontenerze.
- Podstawowe endpointy API:
  - `/api/greet`
  - `/api/health`
  - `/api/scrape/sources`
  - `/api/scrape`
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
