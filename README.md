# ApplyManager (Alpha)

ApplyManager to aplikacja do śledzenia ofert pracy i procesu aplikowania.
Projekt zawiera web UI (React + Vite), backend API (FastAPI), scraping ofert, import/eksport danych oraz środowiska Docker (dev/prod).

## Stack

- Frontend: React 18 + TypeScript + Vite
- Backend: Python 3 + FastAPI
- Baza danych: PostgreSQL 16
- Scraping: requests + parsery HTML/JSON-LD (własne moduły)
- Desktop scaffold: Qt6 + C++ (`local/`)
- Konteneryzacja: Docker Compose

## Status wersji

- Aktualna wersja: `Alpha (v0.8)` (wersja serwerowa)
- Model wydania: szybkie iteracje UI/API + stabilizacja import/scraping

## Instalacja na Dockerze (skrypty .sh)

1. Wejdź do katalogu projektu:

```bash
cd applymanager
```

2. Nadaj uprawnienia do uruchamiania skryptów (jednorazowo):

```bash
chmod +x scripts/*.sh
```

3. Wygeneruj lokalny plik `.env` z bezpiecznym hasłem DB:

```bash
./scripts/setup-server-env.sh
```

4. Uruchom środowisko:

- Dev:

```bash
./scripts/run-dev.sh up
```

- Prod:

```bash
./scripts/run-all.sh up
```

5. Zatrzymanie środowiska:

```bash
./scripts/run-dev.sh down
# lub
./scripts/run-all.sh down
```

## Szybki start (Docker Dev)

Najwygodniejszy tryb podczas developmentu:

```bash
./scripts/setup-server-env.sh
./scripts/run-dev.sh up
```

Uwaga: tryb dev nie używa trwałego volume dla DB, więc `./scripts/run-dev.sh restart` resetuje dane bazy.

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
./scripts/setup-server-env.sh
./scripts/run-all.sh up
```

Uwaga: tryb prod używa trwałego volume Postgresa, więc dane bazy są zachowywane między restartami.

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

## Desktop (Electron - podstawy)

Po instalacji zależności Node:

```bash
npm install
```

Uruchomienie desktop dev (frontend + backend + electron):

```bash
npm run dev:desktop
```

Build desktop (Linux AppImage):

```bash
npm run build:desktop
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
  - opcjonalny query param: `tzOffsetMinutes` (lokalna strefa użytkownika dla dat/czasu w eksporcie)

### Preferencje

- `GET /api/preferences`
- `PUT /api/preferences`

### Scraping

- `GET /api/scrape/sources`
- `POST /api/scrape` - query tekstowe lub URL
- `POST /api/scrape/link` - pojedynczy URL

Obsługiwane źródła scrapera (query + direct-link parsery):

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
- tryb edycji tabeli:
  - akcje na wierszu (przypnij, edytuj, szybki status, usuń),
  - zaznaczanie wielu wierszy,
  - operacje zbiorcze (status/pin/usuwanie z potwierdzeniem)
- szczegóły oferty w modalu:
  - edycja i zapis
  - usuwanie z osobnym potwierdzeniem
- import/eksport + preferencje dostępne z menu użytkownika
- system powiadomień:
  - powiadomienia surface (zielone/pomarańczowe/czerwone),
  - historia powiadomień pod dzwonkiem,
  - niezależne zamykanie na surface i w historii menu
- modal `Informacje` w menu użytkownika:
  - wersja aplikacji, data, autor, stack technologiczny, roadmap

## Tłumaczenia UI

Teksty interfejsu są w jednym pliku:

- `src/i18n/translations.ts`

Dodawanie nowego tłumaczenia:

1. Dodaj nowy klucz w `pl` i `en`.
2. Użyj go w kodzie przez `t.nazwaKlucza` (np. w `src/App.tsx`).

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

## Szybkie testy scrapingu (console)

Przykładowe wywołanie dla pojedynczego linku:

```js
(async () => {
  const url = "https://www.pracuj.pl/praca/specjalista-specjalistka-ds-logistyki-lodz,oferta,1004725992";
  const res = await fetch("/api/scrape/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });
  const data = await res.json();
  console.log("status:", res.status);
  console.table(data.job ? [data.job] : []);
})();
```

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
