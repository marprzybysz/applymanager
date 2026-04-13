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

## 2026-04-11

### Migracja backendu na FastAPI + porządki repo

- Przepisano backend na Python/FastAPI.
- Uporządkowano strukturę backendu:
  - `server/web/`
  - `server/local/`
  - `server/modules/`
  - `server/scrapers/`
- Usunięto stary backend Node.
- Zostawiono scaffold desktop Qt (`local/`).

### API ofert i preferencji

- Dodano/ustabilizowano endpointy:
  - `GET /api/offers`
  - `GET /api/offers/stats`
  - `POST /api/offers`
  - `PUT /api/offers/{offer_id}`
  - `DELETE /api/offers/{offer_id}`
  - `POST /api/offers/import-excel`
  - `GET /api/offers/export-excel`
  - `GET /api/preferences`
  - `PUT /api/preferences`
- Rozszerzono model ofert o pola związane z datami i warunkami pracy.

### Scraping

- Utrzymano tryb `query` oraz `single link`.
- Dodano normalizację URL (w tym warianty Pracuj.pl).
- Utrzymano provider-based scraping dla wielu źródeł.

### Frontend - duży refactor UI

- Wdrożono top-level zakładki `Oferty` i `Statystyki`.
- Dodano table UX:
  - sortowanie po kolumnach,
  - filtrowanie po statusie, źródle i okresie,
  - wyszukiwanie z rozwijanym polem,
  - tryb prosty/zaawansowany.
- Dodano modal szczegółów oferty:
  - podgląd,
  - edycja,
  - zapis,
  - usuwanie z osobnym potwierdzeniem.
- Dodano kolorowanie statusów.
- Uproszczono tabelę (link oferty jako hyperlink w kolumnie stanowiska).
- Ukryto `applied` w UI i wyliczanie tej wartości przeniesiono do logiki zapisu na podstawie `status`.
- Poprawiono zachowanie i styl akcji modalnych (`Edytuj`, `Anuluj`, `Usuń`).

### Dokumentacja

- Zaktualizowano `README.md` i dokumenty w `docs/` do aktualnej architektury i funkcji.
- Dodano wpis roadmapy dla planowanej funkcji akcji zbiorczych:
  - zaznaczanie wielu ofert,
  - przenoszenie do archiwum,
  - usuwanie zaznaczonych rekordów.

## 2026-04-13

### Scraping - parsery direct-link

- Dodano parsery direct-link dla:
  - OLX,
  - RocketJobs,
  - NoFluffJobs,
  - JustJoinIt.
- Dostosowano reguły wyliczania `expiresAt/daysToExpire`:
  - OLX bez wymuszania inferencji czasu wygaśnięcia,
  - pozostałe źródła nadal wspierają inferencję zgodnie z logiką backendu.

### Eksport i strefy czasowe

- Dodano obsługę lokalnej strefy użytkownika przy eksporcie Excel:
  - frontend przekazuje `tzOffsetMinutes`,
  - backend przelicza `createdAt` do strefy użytkownika na potrzeby pliku eksportu.

### Frontend - UX i nawigacja

- Dopracowano empty-state (`Import` zamiast błędnego `ExportManager`).
- Przywrócono i przebudowano stopkę:
  - klasyczna stopka pod treścią strony,
  - link do GitHub autora.
- Dodano/udoskonalono animacje i zachowanie przycisków akcji w headerze.

### Powiadomienia

- Ujednolicono kolorystykę `warning/error` między toastami i panelem powiadomień.
- Dodano zamykanie pojedynczych wpisów w menu powiadomień.
- Rozdzielono "zamknięcie na surface" od "historii w menu":
  - zamknięcie toastu nie usuwa wpisu z historii,
  - wpis można usunąć osobno z menu dzwonka.
- Dodano animacje zamykania w menu powiadomień.

### Sekcja "Informacje" (Alpha)

- W menu użytkownika dodano pozycję `Informacje`.
- Modal zawiera dane wersji Alpha, stack technologiczny, autora oraz roadmap.
- Dodano sekcję podziękowań i linki do wskazanych osób.
