from __future__ import annotations

import datetime
import uuid

import pytest
from fastapi.testclient import TestClient

from tests.helpers import (
    _create_bare_book,
    _create_book,
    _create_edition,
    _create_engagement,
    _log_progress,
)

# --- Transition to TBR ---


@pytest.mark.parametrize(
    "payload, expected_tbr_added_on",
    [
        ({"status": "tbr"}, datetime.date.today().isoformat()),
        (
            {"status": "tbr", "effective_on": "2026-06-01"},
            "2026-06-01",
        ),
    ],
    ids=["defaults-to-today", "uses-effective-on"],
)
def test_patch_to_tbr_sets_tbr_added_on_and_clears_started_on(
    client: TestClient,
    payload: dict[str, str],
    expected_tbr_added_on: str,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-05-01")

    response = client.patch(
        f"/api/engagements/{engagement['id']}",
        json=payload,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "tbr"
    assert data["finished_on"] is None
    assert data["started_on"] is None
    assert data["tbr_added_on"] == expected_tbr_added_on


def test_patch_engagement_with_logs_back_to_tbr_returns_422(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)

    response = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": "tbr"}
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "status",
    ["finished", "dnf"],
)
def test_patch_completed_engagement_back_to_tbr_returns_422(
    client: TestClient, status: str
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], status=status)

    response = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": "tbr"}
    )

    assert response.status_code == 422


# --- Transition to reading ---


def test_patch_to_reading_sets_started_on(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(
        client, book["id"], status="tbr", tbr_added_on="2026-06-01"
    )

    response = client.patch(
        f"/api/engagements/{engagement['id']}",
        json={"status": "reading"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "reading"
    assert data["started_on"] == datetime.date.today().isoformat()
    assert data["tbr_added_on"] == "2026-06-01"


def test_patch_to_reading_with_no_edition_returns_422(client: TestClient) -> None:
    book = _create_book(client)
    engagement = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "status": "tbr",
            "tbr_added_on": "2026-09-15",
        },
    ).json()

    response = client.patch(
        f"/api/engagements/{engagement['id']}",
        json={"status": "reading"},
    )
    assert response.status_code == 422


def test_patch_lengthless_engagement_to_reading_returns_422(client: TestClient) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print")
    engagement = client.post(
        "/api/engagements",
        json={"book_id": book["id"], "edition_format": "print", "status": "tbr"},
    ).json()

    response = client.patch(
        f"/api/engagements/{engagement['id']}",
        json={"status": "reading"},
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "status, closing_date_field",
    [("finished", "finished_on"), ("dnf", "abandoned_on")],
)
def test_patch_completed_engagement_with_logs_back_to_reading_clears_end_date(
    client: TestClient, status: str, closing_date_field: str
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)
    completed = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": status}
    ).json()
    assert completed[closing_date_field] is not None

    response = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": "reading"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "reading"
    assert data[closing_date_field] is None


@pytest.mark.parametrize("status", ["finished", "dnf"])
def test_patch_engagement_with_no_logs_back_to_reading_returns_422(
    client: TestClient, status: str
) -> None:
    book = _create_book(client)
    engagement = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": "print",
            "status": status,
        },
    ).json()

    response = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": "reading"}
    )
    assert response.status_code == 422


# --- Transition to finished ---


def test_patch_to_finished_stamps_finished_on(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": "finished"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "finished"
    assert data["finished_on"] is not None
    assert data["started_on"] == engagement["started_on"]


def test_patch_to_finished_catches_up_to_the_corrected_length(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], length=1100)
    engagement = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": "print",
            "length_override": 1000,
        },
    ).json()
    _log_progress(client, engagement["id"], 500)

    response = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": "finished"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["resume_from_page"] == 1000
    assert data["completion_pct"] == 100


def test_patch_to_finished_before_started_on_with_no_logs_returns_409(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-06-01")

    response = client.patch(
        f"/api/engagements/{engagement['id']}",
        json={"status": "finished", "effective_on": "2026-01-01"},
    )
    assert response.status_code == 409


def test_patch_finished_to_finished_does_not_overwrite_date(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-04-01")
    first = client.patch(
        f"/api/engagements/{engagement['id']}",
        json={"status": "finished", "effective_on": "2026-05-01"},
    )
    assert first.status_code == 200
    assert first.json()["finished_on"] == "2026-05-01"

    second = client.patch(
        f"/api/engagements/{engagement['id']}",
        json={"status": "finished", "effective_on": "2026-06-01"},
    )
    assert second.status_code == 200
    assert second.json()["finished_on"] == "2026-05-01"


# --- Transition to DNF ---


@pytest.mark.parametrize(
    "payload, expected_abandoned_on",
    [
        ({"status": "dnf"}, "2026-05-15"),
        (
            {"status": "dnf", "effective_on": "2026-05-20"},
            "2026-05-20",
        ),
    ],
    ids=["uses-last-log", "uses-effective-on"],
)
def test_patch_to_dnf_with_log_sets_abandoned_on(
    client: TestClient,
    payload: dict[str, str],
    expected_abandoned_on: str,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-05-01")
    _log_progress(client, engagement["id"], 100, logged_on="2026-05-15")

    response = client.patch(f"/api/engagements/{engagement['id']}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "dnf"
    assert data["abandoned_on"] == expected_abandoned_on


def test_patch_to_dnf_sets_abandoned_on_to_today_when_no_logs(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": "dnf"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "dnf"
    assert data["abandoned_on"] == datetime.date.today().isoformat()


def test_patch_to_dnf_with_effective_on_before_last_log_returns_409(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-05-01")
    _log_progress(client, engagement["id"], 100, logged_on="2026-05-15")

    response = client.patch(
        f"/api/engagements/{engagement['id']}",
        json={"status": "dnf", "effective_on": "2026-05-10"},
    )
    assert response.status_code == 409


def test_patch_to_dnf_does_not_create_progress_log(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    original_log = _log_progress(client, engagement["id"], 50)

    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "dnf"})

    logs_response = client.get(f"/api/engagements/{engagement['id']}/progress-logs")
    assert logs_response.status_code == 200
    assert [log["id"] for log in logs_response.json()] == [original_log["id"]]


def test_patch_to_dnf_preserves_completion_pct(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 150)

    response = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": "dnf"}
    )
    assert response.status_code == 200
    assert response.json()["completion_pct"] == 50


# --- Transition-wide behavior ---


def test_patch_status_with_future_effective_on_returns_422(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    future = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()

    response = client.patch(
        f"/api/engagements/{engagement['id']}",
        json={"status": "finished", "effective_on": future},
    )
    assert response.status_code == 422


def test_patch_unknown_engagement_returns_404(client: TestClient) -> None:
    response = client.patch(
        f"/api/engagements/{uuid.uuid4()}", json={"status": "finished"}
    )
    assert response.status_code == 404


def test_patch_invalid_status_returns_422(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    response = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": "interested"}
    )
    assert response.status_code == 422


def test_patch_same_status_is_idempotent(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": "reading"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "reading"
    assert data["finished_on"] is None


@pytest.mark.parametrize(
    "old_status, new_status",
    [
        ("finished", "reading"),
        ("reading", "tbr"),
    ],
)
def test_patch_engagement_backwards_conflicts_when_another_active_engagement_exists(
    client: TestClient, old_status: str, new_status: str
) -> None:
    book = _create_book(client)
    eng_a = _create_engagement(
        client, book["id"], edition_format="print", status=old_status
    )
    _create_engagement(client, book["id"], edition_format="print", status=new_status)

    response = client.patch(
        f"/api/engagements/{eng_a['id']}", json={"status": new_status}
    )
    assert response.status_code == 409
