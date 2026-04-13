# ApplyManager - Zakres projektu

## Cel

Aplikacja do prowadzenia procesu aplikowania na oferty pracy:

- zbieranie i porządkowanie ofert,
- śledzenie statusów i terminów,
- import/eksport danych,
- szybkie pobieranie danych oferty z linku.

## Zakres aktualny (2026-04)

### Web UI

- zakładki: `Oferty`, `Statystyki`,
- tabela ofert (sortowanie + filtrowanie + wyszukiwarka),
- tryb widoku prosty/zaawansowany,
- modal szczegółów oferty (podgląd, edycja, usuwanie),
- statusy ofert oznaczane kolorami,
- menu użytkownika:
  - preferencje,
  - import,
  - eksport.

### API / Backend

- pełna obsługa ofert (`GET/POST/PUT/DELETE`),
- statystyki ofert,
- preferencje użytkownika,
- import i eksport Excel,
- scraping URL i query.

### Baza danych

- tabela `applications`,
- tabela `user_preferences`,
- tabela `cvs` (pod przyszły moduł CV).

### Desktop scaffold

- `local/` (Qt6/C++) jako baza pod przyszły klient desktop.

## Poza zakresem (na teraz)

- autoryzacja użytkowników,
- synchronizacja cloud,
- zaawansowany workflow ATS,
- pełny moduł CV (UI + operacje).

## Roadmap (skrót)

1. Stabilizacja modelu statusów i timeline aplikacji.
2. Rozszerzenie raportowania i statystyk.
3. Lepsza normalizacja danych importowanych.
4. Rozbudowa klienta desktop (Qt) jako równoległego interfejsu.
5. Akcje zbiorcze na ofertach:
   - zaznaczanie wielu rekordów (checkboxy + "zaznacz wszystko"),
   - operacje zbiorcze: `Usuń` i `Archiwizuj`,
   - osobny widok/filtr `Archiwum`,
   - backendowe endpointy bulk (`/api/offers/bulk/*`).

## Known UI issues (TODO)

- Tryb edycji - panel akcji pod prawym blokiem (`Widok/Filtry/Szukaj`) ma sporadyczne problemy z pełnym wyrównaniem wysokości i "pływaniem" przycisków (`Wyczyść zaznaczenie` vs przyciski ikonowe) podczas hover/animacji.
- Plan naprawy:
  - ujednolicić jedną wysokość i box-model dla całego dolnego rzędu,
  - ograniczyć animacje do transform/opacity (bez reflow szerokości kontenera),
  - dodać test wizualny/regresyjny dla układu prawego panelu w trybie edycji.
