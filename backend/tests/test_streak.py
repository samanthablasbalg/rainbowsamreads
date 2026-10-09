from __future__ import annotations

import datetime

from fastapi.testclient import TestClient

from tests.helpers import _create_book, _create_engagement, _log_progress


def test_get_streak_no_logs_succeeds(
    client: TestClient,
) -> None:
    date = datetime.date.today().isoformat()
    response = client.get(f"/api/insights/streak?date={date}")

    assert response.status_code == 200
    assert response.json() == {"count": 0, "logged_today": False}


def test_get_streak_logged_today_returns_true(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(
        client, engagement["id"], 20, logged_on=datetime.date.today().isoformat()
    )

    date = datetime.date.today().isoformat()
    response = client.get(f"/api/insights/streak?date={date}")

    assert response.status_code == 200
    assert response.json() == {"count": 1, "logged_today": True}


def test_get_streak_three_logs_counts_3(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 20, logged_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-01-05")
    _log_progress(
        client, engagement["id"], 90, logged_on=datetime.date.today().isoformat()
    )

    date = datetime.date.today().isoformat()
    response = client.get(f"/api/insights/streak?date={date}")

    assert response.status_code == 200
    assert response.json() == {"count": 3, "logged_today": True}


def test_get_streak_three_logs_ending_more_than_one_days_ago_is_inactive(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 20, logged_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-01-05")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-10")

    date = datetime.date.today().isoformat()
    response = client.get(f"/api/insights/streak?date={date}")

    assert response.status_code == 200
    assert response.json() == {"count": 0, "logged_today": False}
