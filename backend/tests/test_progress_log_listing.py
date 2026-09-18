from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from tests.helpers import _create_book, _create_engagement, _log_progress


def test_list_progress_logs_returns_empty_list_when_engagement_has_no_logs(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.get(f"/api/engagements/{engagement['id']}/progress-logs")

    assert response.status_code == 200
    assert response.json() == []


def test_list_progress_logs_unknown_engagement_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/engagements/{uuid.uuid4()}/progress-logs")

    assert response.status_code == 404


def test_list_progress_logs_orders_same_day_logs_by_creation(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    first = _log_progress(client, engagement["id"], 100, logged_on="2026-01-10")
    second = _log_progress(client, engagement["id"], 200, logged_on="2026-01-10")

    response = client.get(f"/api/engagements/{engagement['id']}/progress-logs")

    assert response.status_code == 200
    assert [log["id"] for log in response.json()] == [first["id"], second["id"]]


def test_list_progress_logs_orders_logs_by_logged_on(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    first = _log_progress(client, engagement["id"], 100)
    second = _log_progress(client, engagement["id"], 200)
    third = _log_progress(client, engagement["id"], 300)

    # Creating a log behind an existing later day is rejected, so date edits create
    # the out-of-creation-order history needed to isolate the listing contract.
    new_dates = [
        (first, "2026-01-30"),
        (second, "2026-01-10"),
        (third, "2026-01-20"),
    ]
    for log, logged_on in new_dates:
        response = client.patch(
            f"/api/engagements/{engagement['id']}/progress-logs/{log['id']}",
            json={"logged_on": logged_on},
        )
        assert response.status_code == 200

    response = client.get(f"/api/engagements/{engagement['id']}/progress-logs")

    assert response.status_code == 200
    assert [(log["id"], log["logged_on"]) for log in response.json()] == [
        (second["id"], "2026-01-10"),
        (third["id"], "2026-01-20"),
        (first["id"], "2026-01-30"),
    ]
