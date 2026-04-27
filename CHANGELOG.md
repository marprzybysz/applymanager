# Changelog

Wszystkie istotne zmiany w projekcie są generowane na podstawie historii commitów (`git log`).

Format jest inspirowany Keep a Changelog, a wersjonowanie opiera się o semver (etap Alpha + szybkie iteracje).

## [Unreleased]

### Changed
- Podniesiono wersję aplikacji do `0.8.1-alpha`.
- Ulepszono czytelność statystyk (chartów) pod szybki podgląd kluczowych informacji.

## [0.8.0-alpha] - 2026-04-13

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

## [0.7.0-alpha] - 2026-04-12

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

## [0.6.0-alpha] - 2026-04-11

### Added
- Migracja API do FastAPI i scraperów Python: `841e8ce`.
- Hot-reload Docker stack FE+API: `4892559`.
- Przebudowa headera i modalu dodawania oferty: `3b82e5a`, `b46b18b`.
- Podział backendu (`web/local/modules`) + Qt scaffold: `52b0f6b`.
- Języki PL/EN w ustawieniach: `fef18f9`.
- Preferences module + warunki pracy z pracuj.pl: `fca1a6e`.
- Metryki/statystyki + endpointy update/delete: `f9938fb`, `8630e15`.
- Modal szczegółów oferty z edycją/usuwaniem: `62ab928`.
- Ulepszenia toolbarów, badge statusów i akcji modalu: `de5cf4a`, `af11e6f`, `bd1b159`.
- Przeniesienie import/export/preferences do top menu: `e2159fe`.
- Filtry okresowe i uproszczony view mode: `ae1201e`.

### Changed
- Refactor backendu do `server/` i usunięcie legacy backendów: `f070abf`.
- Usunięcie plików Tauri + cleanup helpers dla Docker images: `7cc6d74`.
- Aktualizacja dokumentacji architektury/scope/setup: `88b4a14`, `87fb284`.
- Merge pull request FastAPI: `3bb6d62`.

### Fixed
- Dismissible statusy i UX importu z user menu: `31d32a1`.

## [0.1.0] - 2026-04-10

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
