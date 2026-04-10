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

## Pliki kluczowe

- `src/` - UI React.
- `src-tauri/` - konfiguracja i kod Rust dla desktop.
- `server/index.js` - backend Express.
- `docker-compose.yml` - orkiestracja app + db.
- `db/init/001_init.sql` - inicjalna struktura tabel.
