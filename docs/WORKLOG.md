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
