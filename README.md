# ApplyManager

Starter scaffold for a desktop app plus Docker test environment.

Project docs: `docs/`

## Stack

- Tauri 2 (desktop shell + Rust commands)
- React + TypeScript (UI)
- Vite (frontend tooling)
- Express (web backend for Docker mode)
- PostgreSQL (test DB in Docker)

## Run (development)

1. Install dependencies:

```bash
npm install
```

2. Start app:

```bash
npm run tauri dev
```

## Docker (frontend + backend + db)

Start containers:

```bash
docker compose up --build
```

Services:

- App: `http://localhost:3000`
- API health: `http://localhost:3000/api/health`
- API greet: `http://localhost:3000/api/greet?name=Marcin`
- PostgreSQL: `localhost:5432`

Stop containers:

```bash
docker compose down
```

## Build installer

```bash
npm run tauri build
```

Installers are generated in `src-tauri/target/release/bundle`.
