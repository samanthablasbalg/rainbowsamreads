from __future__ import annotations

import datetime
import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.engagement import Engagement
from tests.helpers import (
    _create_book,
    _create_engagement,
    _log_progress,
)


def test_patch_dates_started_on_persists(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"started_on": "2026-01-01"},
    )

    assert response.status_code == 200
    assert response.json()["started_on"] == "2026-01-01"


def test_patch_dates_finished_on_persists(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"finished_on": "2026-12-01"},
    )

    assert response.status_code == 200
    assert response.json()["finished_on"] == "2026-12-01"


def test_patch_dates_both_persist(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"started_on": "2026-01-01", "finished_on": "2026-06-01"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["started_on"] == "2026-01-01"
    assert data["finished_on"] == "2026-06-01"


def test_patch_dates_unknown_engagement_returns_404(client: TestClient) -> None:
    response = client.patch(
        f"/api/engagements/{uuid.uuid4()}/dates",
        json={"started_on": "2026-01-01"},
    )
    assert response.status_code == 404


def test_patch_dates_does_not_change_status(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"started_on": "2026-01-01", "finished_on": "2026-06-01"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "reading"


def test_patch_dates_finished_before_started_in_payload_returns_409(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"started_on": "2026-06-01", "finished_on": "2026-01-01"},
    )
    assert response.status_code == 409


def test_patch_dates_finished_before_existing_started_returns_409(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    eng_obj = db.get(Engagement, uuid.UUID(engagement["id"]))
    assert eng_obj is not None
    eng_obj.started_on = datetime.date(2026, 6, 1)
    db.commit()

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"finished_on": "2026-01-01"},
    )
    assert response.status_code == 409


def _log_dates(client: TestClient, engagement_id: str) -> list[str]:
    response = client.get(f"/api/engagements/{engagement_id}/progress-logs")
    assert response.status_code == 200
    return [log["logged_on"] for log in response.json()]


def _finish_on(client: TestClient, engagement_id: str, on: str) -> None:
    response = client.patch(
        f"/api/engagements/{engagement_id}",
        json={"status": "finished", "effective_on": on},
    )
    assert response.status_code == 200


def test_patch_dates_start_moved_onto_first_log_drags_it(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-01-01")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-10")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"started_on": "2026-01-03"},
    )

    assert response.status_code == 200
    assert response.json()["started_on"] == "2026-01-03"
    assert _log_dates(client, engagement["id"]) == ["2026-01-03", "2026-01-10"]


def test_patch_dates_start_moved_earlier_leaves_the_first_log(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-01-01")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-10")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"started_on": "2025-12-30"},
    )

    assert response.status_code == 200
    assert response.json()["started_on"] == "2025-12-30"
    assert _log_dates(client, engagement["id"]) == ["2026-01-01", "2026-01-10"]


def test_patch_dates_start_drags_every_log_on_the_first_day(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 20, logged_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-01-01")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-10")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"started_on": "2026-01-03"},
    )

    assert response.status_code == 200
    assert _log_dates(client, engagement["id"]) == [
        "2026-01-03",
        "2026-01-03",
        "2026-01-10",
    ]


def test_patch_dates_start_past_the_second_log_returns_409(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-01-01")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-05")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"started_on": "2026-01-06"},
    )

    assert response.status_code == 409
    # The second session is the blocker, not the one the start is moving onto.
    assert "2026-01-05" in response.json()["detail"]


def test_patch_start_past_end_date_returns_409_with_only_closing_log(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _finish_on(client, engagement["id"], "2026-01-05")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"started_on": "2026-01-06"},
    )

    assert response.status_code == 409
    # With only one session there is no second log to block; the finish date does.
    assert "ended" in response.json()["detail"]


def test_patch_dates_finish_moved_onto_the_last_log_drags_it(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-01-02")
    _log_progress(client, engagement["id"], 60, logged_on="2026-01-05")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-13")
    _finish_on(client, engagement["id"], "2026-01-13")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"finished_on": "2026-01-07"},
    )

    assert response.status_code == 200
    assert response.json()["finished_on"] == "2026-01-07"
    assert _log_dates(client, engagement["id"]) == [
        "2026-01-02",
        "2026-01-05",
        "2026-01-07",
        "2026-01-07",
    ]


def test_patch_dates_finish_moved_later_drags_a_log_sitting_on_it(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-01-05")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-07")
    _finish_on(client, engagement["id"], "2026-01-07")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"finished_on": "2026-01-09"},
    )

    assert response.status_code == 200
    assert response.json()["finished_on"] == "2026-01-09"
    assert _log_dates(client, engagement["id"]) == [
        "2026-01-05",
        "2026-01-09",
        "2026-01-09",
    ]


def test_patch_dates_finish_moved_later_leaves_an_earlier_last_log(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-05")
    _finish_on(client, engagement["id"], "2026-01-13")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"finished_on": "2026-01-09"},
    )

    assert response.status_code == 200
    assert response.json()["finished_on"] == "2026-01-09"
    assert _log_dates(client, engagement["id"]) == ["2026-01-05", "2026-01-09"]


def test_patch_dates_finish_moved_between_last_two_logs_drags_the_last(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-05")
    _log_progress(client, engagement["id"], 300, logged_on="2026-01-09")
    _finish_on(client, engagement["id"], "2026-01-13")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"finished_on": "2026-01-07"},
    )

    assert response.status_code == 200
    assert _log_dates(client, engagement["id"]) == ["2026-01-05", "2026-01-07"]


def test_patch_dates_finish_before_the_penultimate_log_returns_409(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-01-05")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-07")
    _finish_on(client, engagement["id"], "2026-01-07")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"finished_on": "2026-01-04"},
    )

    assert response.status_code == 409
    assert "2026-01-05" in response.json()["detail"]


def test_patch_dates_abandoned_moved_onto_the_last_log_drags_it(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-01-02")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-07")
    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "dnf"})

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"abandoned_on": "2026-01-04"},
    )

    assert response.status_code == 200
    assert response.json()["abandoned_on"] == "2026-01-04"
    assert _log_dates(client, engagement["id"]) == ["2026-01-02", "2026-01-04"]


def test_patch_dates_abandoned_on_persists(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "dnf"})

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"abandoned_on": "2026-02-01"},
    )

    assert response.status_code == 200
    assert response.json()["abandoned_on"] == "2026-02-01"


def test_patch_dates_abandoned_before_started_returns_409(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-06-01")
    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "dnf"})

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"abandoned_on": "2026-01-01"},
    )
    assert response.status_code == 409


def test_patch_dates_abandoned_before_the_penultimate_log_returns_409(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-03-10")
    _log_progress(client, engagement["id"], 90, logged_on="2026-03-15")
    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "dnf"})

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"abandoned_on": "2026-03-01"},
    )
    assert response.status_code == 409
    assert "2026-03-10" in response.json()["detail"]
