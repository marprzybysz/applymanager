# Changelog

Wszystkie istotne zmiany w projekcie są generowane na podstawie historii commitów (`git log`).

Format jest inspirowany Keep a Changelog, a wersjonowanie opiera się o semver (etap Alpha + szybkie iteracje).

## [0.8.1-beta] - 2026-04-30

### Added
- Nowe widgety wykresowe na dashboardzie statystyk: **Kumulacja ofert** (`chartCumulativeOffers`) i **Trend statusów top 3** (`chartStatusTrend`).
- Wizualny wskaźnik zamiany widgetów (zielone podświetlenie po najechaniu na zajęty slot podczas przeciągania).
- Napis w centrum wykresu kołowego **Źródła** — po najechaniu na wycinek wyświetla nazwę i wartość w dziurce donuta.

### Changed
- Tooltip wszystkich wykresów dostosowany do motywu jasnego i ciemnego przez zmienne CSS (`var(--surface)`, `var(--border)`, `var(--text-main)`).
- Wykresy liniowe i słupkowe wyśrodkowane przez zmniejszenie szerokości osi Y (`width={28}`) zamiast ujemnego marginu, co naprawiło pozycjonowanie tooltipów.
- Podświetlenie kolumny w wykresie **Statusy** stonowane semi-transparentnym kolorem pasującym do obu motywów.
- Poprawki literówek i brakujących polskich znaków w całym tłumaczeniu PL.

### Fixed
- Naprawiono "ghost boxy" pojawiające się nad podglądem upuszczenia wykresu podczas przeciągania z biblioteki.
- Naprawiono otwarte dolne obramowanie podglądu upuszczenia wykresu w wierszu 5 gridu.
- Naprawiono błędne pozycjonowanie tooltipów recharts spowodowane ujemnym `margin.left`.
- Naprawiono migotanie napisu w centrum wykresu kołowego przy przechodzeniu między wycinkami.

## [0.8.0-beta] — Charts Update - 2026-04-13

### Added
- Tryb edycji wierszy tabeli i szybkie akcje: `d5ec770`, `5eb1d34`.
- Operacje zbiorcze (status/pin): `2a77258`, `ce3a59f`, `4a830c9`.
- Parsery direct-link (OLX, RocketJobs, NoFluffJobs, JustJoinIt): `d88e6b7`.
- Rozbudowane centrum powiadomień i historia: `1f12f0f`, `6c34b5b`.
- Dodatkowe informacje w modalu About: `e653902`.

### Changed
- Dopracowany układ paneli edytora i selection bara: `62c1053`, `6d0a22f`, `ffc9632`.
- Aktualizacja README/docs dla Alpha: `beb94fd`.
- Merge zmian parserów i editor mode: `70646fd`, `d87f5d0`.

### Fixed
- Poprawki warstwowania quick-status dropdown (`z-index`): `26a3a9c`, `3e3cbb6`, `71f4db3`.
- Poprawka eksportu względem strefy czasowej: `18f7c97`.

## [0.7.0-beta] — Assistant & Notifications Update - 2026-04-12

### Added
- Dockowany floating filter island i standaryzacja polskich statusów: `3674164`.
- Resilient Excel import issues + ExportAssistant fill flow: `6ece182`.
- Rozbudowa ExportAssistant (split raw/edit windows): `bcefe44`.
- Przeniesienie statusów do navbar notifications center: `1ec873f`.
- Electron scaffold: `1de629a`.
- Landing empty-state i ukrywanie oferty card przy pustej liście: `dad45ac`.
- Animacje sortowania/filtrowania i podświetlenia: `45268c8`, `1d8d877`.
- Color tiers wygasania i inferencja posted date: `db92fe3`.

### Changed
- Narzędzia dockowane przy navbarze i pełne etykiety: `0746d15`.
- Ulepszenia UX importu manualnego i potwierdzeń: `20dea87`, `c136993`.
- Dopracowanie nagłówka oraz akcji/notyfikacji: `5f396b2`, `b367550`.
- Merge gałęzi export assistant: `56b179c`.
- Zabezpieczenie konfiguracji serwera przez `.env`: `5cd4887`.

### Fixed
- Zapobieganie stale index cache po rollbacku: `34b6ed4`.
- Poprawna serializacja dat i miasta w kolumnie location: `597a027`.
- Oznaczanie źródła importu Excel jako `import_excel`: `2bf9854`.
- Poprawa mapowania `expiresAt/datePosted` w imporcie: `6c9b865`.
- Poprawa warstw i zachowania docked tools: `5ba5ec6`, `faa3c75`.

## [0.5.0-alpha] — 2026-04-11

### Added
- Modal szczegółów oferty z edycją, usuwaniem i lepszymi filtrami: `62ab928`.
- Ulepszenia toolbara ofert i badge kolorystyczne statusów: `de5cf4a`.
- Ulepszenia akcji modalu oferty i potwierdzenie usunięcia: `af11e6f`.
- Rola oferty jako klikalny hyperlink; usunięcie zbędnej kolumny Link: `bd1b159`.
- Dockowanie narzędzi ofert bezpośrednio pod headerem: `c1951ed`.

### Changed
- Aktualizacja dokumentacji architektury, scope i worklogu: `87fb284`.
- Przepisanie README: setup, API i aktualne funkcje UI: `88b4a14`.

## [0.4.0-alpha] — 2026-04-11

### Added
- Metryki wygasania ofert, statystyki i plumbing preferencji API: `f9938fb`.
- Endpointy update i delete dla ofert: `8630e15`.
- Filtry czasowe (7d / 30d / 90d) i uproszczony tryb widoku: `ae1201e`.
- Przeniesienie import/export/preferencji do górnego menu: `e2159fe`.

## [0.3.0-indev] — 2026-04-11

### Added
- Selektor języka PL/EN w ustawieniach: `fef18f9`.
- Moduł preferencji użytkownika + scraping warunków pracy z pracuj.pl: `fca1a6e`.
- Ulepszony modal dodawania oferty: tryb manualny, akcje zamknięcia, domyślna data: `b46b18b`.

### Changed
- Podział backendu na moduły `web/local/modules` + scaffold Qt (local desktop): `52b0f6b`.
- Usunięcie plików Tauri i dodanie pomocników do czyszczenia obrazów Docker: `7cc6d74`.
- Refactor backendu do katalogu `server/`, usunięcie legacy backendów: `f070abf`.

## [0.2.0-indev] — 2026-04-11

### Added
- Migracja backendu do FastAPI z natywnym wsparciem Python scraperów: `841e8ce`.
- Hot-reload Docker stack dla frontendu i API: `48925594`.
- Przebudowa headera aplikacji i modal dodawania oferty oparty o link: `3b82e5a`.
- Usunięcie sekcji Scrape Jobs z głównego widoku: `a1d10ae`.

### Changed
- Merge pull request #1 (FastAPI migration): `3bb6d62`.

### Fixed
- Dismissible statusy i UX importu Excel z menu użytkownika: `31d32a1`.

## [0.1.0-indev] — 2026-04-10

### Added
- Inicjalny scaffold Tauri + React: `8ab995d`.
- Docker test stack i dokumentacja projektu: `a86ea15`.
- Multi-source scraping module: `c896e26`.
- Skrypt helper dla Docker stacku: `9b36f7b`.
- Dashboard ofert z importem Excel: `91c2269`.
- Single-link scraping i eksport Excel: `c4f9fc9`.
- Auto-detekcja URL w scrape query: `fefa04a`.
- Uproszczenie scrape UI + React dev proxy: `38fb946`.
- Recruitment window scoring, `applied` flag, theme modes: `8eae156`.

### Changed
- Ulepszenie mapowania importu Excel i fallbacków direct-link: `5763cbc`.
- Refactor stacku scrapingu + Docker Playwright fallback: `859a2de`.
