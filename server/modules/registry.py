from __future__ import annotations

MODULES = [
    {
        "name": "offers",
        "description": "CRUD ofert aplikacji i zapis do PostgreSQL",
        "usedIn": {"web": True, "local": True},
    },
    {
        "name": "excel-import-export",
        "description": "Import i eksport ofert do pliku xlsx",
        "usedIn": {"web": True, "local": True},
    },
    {
        "name": "scrape",
        "description": "Scraping portali pracy i mapowanie danych oferty",
        "usedIn": {"web": True, "local": True},
    },
    {
        "name": "preferences",
        "description": "Preferencje użytkownika (typ umowy, czas i forma pracy, zmiany)",
        "usedIn": {"web": True, "local": True},
    },
    {
        "name": "cv-pdf-parser",
        "description": "Wczytywanie danych tekstowych z plikow PDF (modul CV)",
        "usedIn": {"web": True, "local": True},
    },
    {
        "name": "static-web-build",
        "description": "Serwowanie React dist przez FastAPI",
        "usedIn": {"web": True, "local": False},
    },
]


def get_module_usage() -> dict[str, list[dict[str, object]]]:
    return {
        "web": [module for module in MODULES if module["usedIn"]["web"]],
        "local": [module for module in MODULES if module["usedIn"]["local"]],
        "notUsedInLocal": [module for module in MODULES if not module["usedIn"]["local"]],
    }
