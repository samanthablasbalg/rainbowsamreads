from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from tests.helpers import (
    COMPLETIONS,
    DNF,
    FINISHED,
    Completion,
    _create_book,
    _create_engagement,
    _log_progress,
)


def _log_dates(client: TestClient, engagement_id: str) -> list[str]:
    response = client.get(f"/api/engagements/{engagement_id}/progress-logs")
    assert response.status_code == 200
    return [log["logged_on"] for log in response.json()]


def _complete_on(
    client: TestClient,
    engagement_id: str,
    completion: Completion,
    on: str,
) -> None:
    response = client.patch(
        f"/api/engagements/{engagement_id}",
        json={"status": completion.status, "effective_on": on},
    )
    assert response.status_code == 200
    assert response.json()[completion.end_date_field] == on


# --- Date fields and status ---


def test_patch_dates_updates_started_on_without_changing_reading_status(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"started_on": "2026-01-01"},
    )

    assert response.status_code == 200
    assert response.json()["started_on"] == "2026-01-01"
    assert response.json()["status"] == "reading"


@pytest.mark.parametrize("completion", COMPLETIONS)
def test_patch_dates_updates_end_date_without_changing_completed_status(
    client: TestClient,
    completion: Completion,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], status=completion.status)

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={completion.end_date_field: "2026-02-01"},
    )

    assert response.status_code == 200
    assert response.json()[completion.end_date_field] == "2026-02-01"
    assert response.json()["status"] == completion.status


@pytest.mark.parametrize("completion", COMPLETIONS)
def test_patch_dates_updates_start_and_end_together_for_completed_engagement(
    client: TestClient,
    completion: Completion,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], status=completion.status)

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={
            "started_on": "2026-01-01",
            completion.end_date_field: "2026-06-01",
        },
    )

    assert response.status_code == 200
    assert response.json()["started_on"] == "2026-01-01"
    assert response.json()[completion.end_date_field] == "2026-06-01"
    assert response.json()["status"] == completion.status


def test_patch_dates_unknown_engagement_returns_404(client: TestClient) -> None:
    response = client.patch(
        f"/api/engagements/{uuid.uuid4()}/dates",
        json={"started_on": "2026-01-01"},
    )
    assert response.status_code == 404


# --- Start-date corrections ---


def test_patch_dates_moving_start_later_shifts_every_log_on_first_day(
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
    assert response.json()["started_on"] == "2026-01-03"
    assert _log_dates(client, engagement["id"]) == [
        "2026-01-03",
        "2026-01-03",
        "2026-01-10",
    ]


def test_patch_dates_moving_start_earlier_leaves_logs_unchanged(
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


def test_patch_dates_moving_start_past_second_log_returns_409(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-01-01")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-05")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"started_on": "2026-01-06"},
    )

    assert response.status_code == 409
    assert "2026-01-05" in response.json()["detail"]


@pytest.mark.parametrize("completion", COMPLETIONS)
def test_patch_dates_moving_start_after_end_returns_409(
    client: TestClient,
    completion: Completion,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _complete_on(client, engagement["id"], completion, "2026-01-05")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={"started_on": "2026-01-06"},
    )

    assert response.status_code == 409
    assert "ended" in response.json()["detail"]


# --- End-date corrections ---


@pytest.mark.parametrize("completion", COMPLETIONS)
def test_patch_dates_end_before_start_in_payload_returns_409(
    client: TestClient,
    completion: Completion,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], status=completion.status)

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={
            "started_on": "2026-06-01",
            completion.end_date_field: "2026-01-01",
        },
    )

    assert response.status_code == 409


@pytest.mark.parametrize("completion", COMPLETIONS)
def test_patch_dates_end_before_existing_start_returns_409(
    client: TestClient,
    completion: Completion,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(
        client,
        book["id"],
        started_on="2026-06-01",
        status=completion.status,
    )

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={completion.end_date_field: "2026-01-01"},
    )

    assert response.status_code == 409


@pytest.mark.parametrize(
    "completion, expected_log_dates",
    [
        pytest.param(
            FINISHED,
            ["2026-01-02", "2026-01-05", "2026-01-07", "2026-01-07"],
            id="finished",
        ),
        pytest.param(
            DNF,
            ["2026-01-02", "2026-01-05", "2026-01-07"],
            id="dnf",
        ),
    ],
)
def test_patch_dates_moving_end_earlier_shifts_every_log_on_last_day(
    client: TestClient,
    completion: Completion,
    expected_log_dates: list[str],
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-01-02")
    _log_progress(client, engagement["id"], 60, logged_on="2026-01-05")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-13")
    _complete_on(client, engagement["id"], completion, "2026-01-13")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={completion.end_date_field: "2026-01-07"},
    )

    assert response.status_code == 200
    assert response.json()[completion.end_date_field] == "2026-01-07"
    assert _log_dates(client, engagement["id"]) == expected_log_dates


@pytest.mark.parametrize(
    "completion, expected_log_dates",
    [
        pytest.param(
            FINISHED,
            ["2026-01-05", "2026-01-09", "2026-01-09"],
            id="finished",
        ),
        pytest.param(DNF, ["2026-01-05", "2026-01-09"], id="dnf"),
    ],
)
def test_patch_dates_moving_end_later_only_shifts_logs_on_current_end(
    client: TestClient,
    completion: Completion,
    expected_log_dates: list[str],
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-01-05")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-07")
    _complete_on(client, engagement["id"], completion, "2026-01-07")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={completion.end_date_field: "2026-01-09"},
    )

    assert response.status_code == 200
    assert response.json()[completion.end_date_field] == "2026-01-09"
    assert _log_dates(client, engagement["id"]) == expected_log_dates


@pytest.mark.parametrize("completion", COMPLETIONS)
def test_patch_dates_moving_end_later_leaves_earlier_logs_unchanged(
    client: TestClient,
    completion: Completion,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 300, logged_on="2026-01-05")
    _complete_on(client, engagement["id"], completion, "2026-01-13")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={completion.end_date_field: "2026-01-15"},
    )

    assert response.status_code == 200
    assert response.json()[completion.end_date_field] == "2026-01-15"
    assert _log_dates(client, engagement["id"]) == ["2026-01-05"]


@pytest.mark.parametrize("completion", COMPLETIONS)
def test_patch_dates_moving_end_between_last_two_logs_shifts_last_log(
    client: TestClient,
    completion: Completion,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-05")
    _log_progress(client, engagement["id"], 300, logged_on="2026-01-09")
    _complete_on(client, engagement["id"], completion, "2026-01-13")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={completion.end_date_field: "2026-01-07"},
    )

    assert response.status_code == 200
    assert response.json()[completion.end_date_field] == "2026-01-07"
    assert _log_dates(client, engagement["id"]) == ["2026-01-05", "2026-01-07"]


@pytest.mark.parametrize("completion", COMPLETIONS)
def test_patch_dates_moving_end_before_penultimate_log_returns_409(
    client: TestClient,
    completion: Completion,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 40, logged_on="2026-01-05")
    _log_progress(client, engagement["id"], 90, logged_on="2026-01-07")
    _complete_on(client, engagement["id"], completion, "2026-01-07")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/dates",
        json={completion.end_date_field: "2026-01-04"},
    )

    assert response.status_code == 409
    assert "2026-01-05" in response.json()["detail"]
