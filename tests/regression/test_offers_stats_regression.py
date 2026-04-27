from __future__ import annotations

from server.modules import offers


def test_get_offer_stats_empty(monkeypatch) -> None:
    monkeypatch.setattr(offers, "list_offers", lambda: [])

    result = offers.get_offer_stats()

    assert result == {
        "totalOffers": 0,
        "appliedOffers": 0,
        "activeOffers": 0,
        "expiredOffers": 0,
        "averageDaysLeft": None,
        "recentApplications7d": 0,
        "statusCounts": {},
        "sourceCounts": {},
    }


def test_get_offer_stats_aggregations(monkeypatch) -> None:
    sample = [
        {
            "applied": True,
            "daysToExpire": 10,
            "status": "Wyslano",
            "source": "manual",
            "appliedAt": "2026-04-16",
        },
        {
            "applied": False,
            "daysToExpire": -2,
            "status": "Odrzucono",
            "source": "pracuj",
            "appliedAt": "2026-03-01",
        },
        {
            "applied": True,
            "daysToExpire": 0,
            "status": "Wyslano",
            "source": "manual",
            "appliedAt": "invalid",
        },
        {
            "applied": True,
            "daysToExpire": 30,
            "status": "Wyslano",
            "source": "olx",
            "appliedAt": "2026-04-10",
        },
    ]
    monkeypatch.setattr(offers, "list_offers", lambda: sample)

    result = offers.get_offer_stats()

    assert result["totalOffers"] == 4
    assert result["appliedOffers"] == 3
    assert result["activeOffers"] == 3
    assert result["expiredOffers"] == 1
    assert result["averageDaysLeft"] == 5.0
    assert result["statusCounts"] == {"Wyslano": 3, "Odrzucono": 1}
    assert result["sourceCounts"] == {"manual": 2, "pracuj": 1, "olx": 1}
