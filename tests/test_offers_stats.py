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
    ]
    monkeypatch.setattr(offers, "list_offers", lambda: sample)

    result = offers.get_offer_stats()

    assert result["totalOffers"] == 3
    assert result["appliedOffers"] == 2
    assert result["activeOffers"] == 2
    assert result["expiredOffers"] == 1
    assert result["averageDaysLeft"] == 2.7
    assert result["statusCounts"] == {"Wyslano": 2, "Odrzucono": 1}
    assert result["sourceCounts"] == {"manual": 2, "pracuj": 1}
