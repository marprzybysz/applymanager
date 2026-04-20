from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from server.local.routes import router as local_router
from server.web import routes as web_routes


def _build_test_client() -> TestClient:
    app = FastAPI()
    app.include_router(web_routes.router)
    app.include_router(local_router)
    return TestClient(app)


def test_greet_endpoint_smoke() -> None:
    client = _build_test_client()

    response = client.get("/api/greet", params={"name": "User"})

    assert response.status_code == 200
    assert response.json()["message"] == "Hello, User! Python FastAPI backend is connected."


def test_local_health_endpoint_smoke() -> None:
    client = _build_test_client()

    response = client.get("/api/local/health")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["runtime"] == "local"


def test_offers_stats_endpoint_smoke(monkeypatch) -> None:
    monkeypatch.setattr(
        web_routes,
        "get_offer_stats",
        lambda: {
            "totalOffers": 1,
            "appliedOffers": 1,
            "activeOffers": 1,
            "expiredOffers": 0,
            "averageDaysLeft": 7.0,
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
