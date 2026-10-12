from __future__ import annotations

import datetime

from fastapi.testclient import TestClient

from tests.helpers import _create_book, _create_engagement, _log_progress


def test_get_streak_no_logs_returns_length_0(
    client: TestClient,
) -> None:
    date = datetime.date.today().isoformat()
    response = client.get(f"/api/insights/streak?date={date}")

    assert response.status_code == 200
    assert response.json() == {"count": 0, "logged_today": False}


def test_get_streak_single_log_today_returns_1_and_logged_today_true(
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


def test_get_streak_five_logs_ending_today_returns_5_and_logged_today_true(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    today = datetime.date.today()
    for day in reversed(range(5)):
        _log_progress(
            client,
            engagement["id"],
            20 * (5 - day + 1),
            logged_on=(today - datetime.timedelta(days=day)).isoformat(),
        )

    response = client.get(f"/api/insights/streak?date={today.isoformat()}")

    assert response.status_code == 200
    assert response.json() == {"count": 5, "logged_today": True}


def test_get_streak_five_logs_ending_yesterday_returns_5_and_logged_today_false(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    today = datetime.date.today()
    for day in reversed(range(5)):
        _log_progress(
            client,
            engagement["id"],
            20 * (5 - day + 1),
            logged_on=(today - datetime.timedelta(days=(day + 1))).isoformat(),
        )

    response = client.get(f"/api/insights/streak?date={today.isoformat()}")

    assert response.status_code == 200
    assert response.json() == {"count": 5, "logged_today": False}


def test_get_streak_five_logs_ending_two_days_ago_returns_0_and_logged_today_false(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    today = datetime.date.today()
    for day in reversed(range(5)):
        _log_progress(
            client,
            engagement["id"],
            20 * (5 - day + 1),
            logged_on=(today - datetime.timedelta(days=(day + 2))).isoformat(),
        )

    response = client.get(f"/api/insights/streak?date={today.isoformat()}")

    assert response.status_code == 200
    assert response.json() == {"count": 0, "logged_today": False}


def test_get_streak_four_logs_two_same_day_returns_3(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    today = datetime.date.today()
    _log_progress(
        client,
        engagement["id"],
        20,
        logged_on=(today - datetime.timedelta(2)).isoformat(),
    )
    _log_progress(
        client,
        engagement["id"],
        40,
        logged_on=(today - datetime.timedelta(2)).isoformat(),
    )
    _log_progress(
        client,
        engagement["id"],
        60,
        logged_on=(today - datetime.timedelta(1)).isoformat(),
    )
    _log_progress(client, engagement["id"], 80, logged_on=(today).isoformat())

    response = client.get(f"/api/insights/streak?date={today.isoformat()}")

    assert response.status_code == 200
    assert response.json() == {"count": 3, "logged_today": True}


def test_finished_auto_log_counts_in_streak(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    today = datetime.date.today()
    _log_progress(
        client,
        engagement["id"],
        20,
        logged_on=(today - datetime.timedelta(2)).isoformat(),
    )
    _log_progress(
        client,
        engagement["id"],
        60,
        logged_on=(today - datetime.timedelta(1)).isoformat(),
    )
    client.post(
        "/api/engagements",
        json={"id": engagement["id"], "status": "finished"},
    )

    response = client.get(f"/api/insights/streak?date={today.isoformat()}")

    assert response.status_code == 200
    assert response.json() == {"count": 3, "logged_today": True}


def test_backdating_repairs_streak(
    client: TestClient,
) -> None:
    book1 = _create_book(client)
    engagement1 = _create_engagement(client, book1["id"], started_on="2026-01-01")
    today = datetime.date.today()
    for day in reversed(range(5)):
        _log_progress(
            client,
            engagement1["id"],
            20 * (5 - day + 1),
            logged_on=(today - datetime.timedelta(days=(day + 3))).isoformat(),
        )
    _log_progress(
        client,
        engagement1["id"],
        150,
        logged_on=(today - datetime.timedelta(days=1)).isoformat(),
    )

    response1 = client.get(f"/api/insights/streak?date={today.isoformat()}")
    assert response1.json() == {"count": 1, "logged_today": False}

    book2 = _create_book(client)
    engagement2 = _create_engagement(client, book2["id"], started_on="2026-01-01")
    _log_progress(
        client,
        engagement2["id"],
        20,
        logged_on=(today - datetime.timedelta(days=2)).isoformat(),
    )
    _log_progress(client, engagement2["id"], 40, logged_on=(today).isoformat())

    response2 = client.get(f"/api/insights/streak?date={today.isoformat()}")
    assert response2.json() == {"count": 8, "logged_today": True}
