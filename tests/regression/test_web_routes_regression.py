from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient
from fastapi.responses import JSONResponse

from server.web import routes


def _build_test_client() -> TestClient:
    app = FastAPI()
    app.include_router(routes.router)
    return TestClient(app)


def test_get_stats_returns_data(monkeypatch) -> None:
    monkeypatch.setattr(
        routes,
        "get_offer_stats",
        lambda: {
            "totalOffers": 1,
            "appliedOffers": 1,
            "activeOffers": 1,
            "expiredOffers": 0,
            "averageDaysLeft": 14.0,
            "recentApplications7d": 1,
            "statusCounts": {"Wyslano": 1},
            "sourceCounts": {"manual": 1},
        },
    )
    client = _build_test_client()

    response = client.get("/api/offers/stats")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["stats"]["totalOffers"] == 1


def test_get_stats_handles_internal_error(monkeypatch) -> None:
    def _raise() -> dict:
        raise RuntimeError("boom")

    monkeypatch.setattr(routes, "get_offer_stats", _raise)
    client = _build_test_client()

    response = client.get("/api/offers/stats")

    assert response.status_code == 500
    body = response.json()
    assert body["ok"] is False
    assert "boom" in body["error"]


def test_create_manual_offer_requires_location(monkeypatch) -> None:
    monkeypatch.setattr(routes, "insert_offer", lambda _: {"id": 1})
    client = _build_test_client()

    response = client.post(
        "/api/offers",
        json={
            "company": "ACME",
            "source": "manual",
            "status": "Wyslano",
            "appliedAt": "2026-04-17",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "location is required for manual offer"


def test_scrape_rate_limit_returns_429(monkeypatch) -> None:
    monkeypatch.setattr(
        routes,
        "_enforce_scrape_rate_limit",
        lambda _request: JSONResponse(
            status_code=429,
            content={"ok": False, "error": "rate limit exceeded for scrape endpoints", "retryAfterSeconds": 10},
        ),
    )
    client = _build_test_client()

    response = client.post("/api/scrape", json={"query": "frontend"})

    assert response.status_code == 429
    assert response.json()["ok"] is False
