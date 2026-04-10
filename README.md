# ApplyManager

Starter scaffold for a desktop app to manage CV data and track job applications.

## Stack

- Tauri 2 (desktop shell + Rust commands)
- React + TypeScript (UI)
- Vite (frontend tooling)

## Run (development)

1. Install dependencies:

```bash
npm install
```

2. Start app:

```bash
npm run tauri dev
```

## Build installer

```bash
npm run tauri build
```

Installers are generated in `src-tauri/target/release/bundle`.
