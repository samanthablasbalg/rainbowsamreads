from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from tests.helpers import (
    MINUTES,
    PAGES,
    RULERS,
    Ruler,
    _create_book,
    _create_engagement,
    _read_with_length,
)

# --- Successful corrections ---


@pytest.mark.parametrize(
    "ruler, original_length, progress, corrected_length, initial_pct, corrected_pct",
    [
        pytest.param(PAGES, 1100, 500, 1000, 45, 50, id="pages"),
        pytest.param(MINUTES, 600, 300, 500, 50, 60, id="audio"),
    ],
)
def test_write_engagement_length_recomputes_completion(
    client: TestClient,
    ruler: Ruler,
    original_length: int,
    progress: int,
    corrected_length: int,
    initial_pct: int,
    corrected_pct: int,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, original_length)
    ruler.log_progress(client, engagement_id, progress)
    current = client.get(f"/api/engagements/{engagement_id}")
    assert current.status_code == 200
    assert current.json()["completion_pct"] == initial_pct

    response = client.post(
        "/api/engagements",
        json={
            "id": engagement_id,
            "status": "reading",
            "edition_format": ruler.edition_format,
            "length_override": corrected_length,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data[ruler.length_field] == corrected_length
    assert data["completion_pct"] == corrected_pct


@pytest.mark.parametrize("ruler", RULERS)
def test_write_engagement_length_leaves_the_shared_edition_alone(
    client: TestClient, ruler: Ruler
) -> None:
    edition, engagement_id = _read_with_length(client, ruler, 1100)
    response = client.post(
        "/api/engagements",
        json={
            "id": engagement_id,
            "status": "reading",
            "edition_format": ruler.edition_format,
            "length_override": 1000,
        },
    )
    assert response.status_code == 200

    edition_response = client.get(f"/api/editions/{edition['id']}")
    assert edition_response.status_code == 200
    assert edition_response.json()["length"] == 1100


# --- Progress-log adjustment ---


@pytest.mark.parametrize("ruler", RULERS)
def test_write_engagement_length_pulls_back_the_only_entry_past_the_new_end(
    client: TestClient, ruler: Ruler
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 1100)
    for position in (300, 400, 500, 800):
        ruler.log_progress(client, engagement_id, position)

    response = client.post(
        "/api/engagements",
        json={
            "id": engagement_id,
            "status": "reading",
            "edition_format": ruler.edition_format,
            "length_override": 750,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data[ruler.length_field] == 750
    # The entry that ran past the new end came back with it rather than being stranded.
    assert data[ruler.resume_field] == 750
    assert data["completion_pct"] == 100


@pytest.mark.parametrize("ruler", RULERS)
def test_update_length_below_a_finished_reads_catch_up_entry_succeeds(
    client: TestClient, ruler: Ruler
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 1100)
    ruler.log_progress(client, engagement_id, 500)
    finish_response = client.post(
        "/api/engagements", json={"id": engagement_id, "status": "finished"}
    )
    assert finish_response.status_code == 200

    response = client.patch(
        f"/api/engagements/{engagement_id}/length",
        json={ruler.length_field: 1000},
    )

    assert response.status_code == 200
    data = response.json()
    assert data[ruler.length_field] == 1000
    assert data[ruler.resume_field] == 1000
    assert data["completion_pct"] == 100


@pytest.mark.parametrize("ruler", RULERS)
def test_write_engagement_length_past_several_entries_returns_409(
    client: TestClient, ruler: Ruler
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 1100)
    for position in (260, 280, 300):
        ruler.log_progress(client, engagement_id, position)

    response = client.post(
        "/api/engagements",
        json={
            "id": engagement_id,
            "status": "reading",
            "edition_format": ruler.edition_format,
            "length_override": 250,
        },
    )

    assert response.status_code == 409
    assert "300" in response.json()["detail"]
    assert (
        client.get(f"/api/engagements/{engagement_id}").json()[ruler.length_field]
        == 1100
    )


@pytest.mark.parametrize("ruler", RULERS)
def test_update_length_down_to_an_entrys_own_start_returns_409(
    client: TestClient, ruler: Ruler
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 1100)
    ruler.log_progress(client, engagement_id, 200)
    ruler.log_progress(client, engagement_id, 500)

    # Pulling the 200-500 entry back to 200 would leave it ending where it starts,
    # which update_progress_log refuses too.
    response = client.patch(
        f"/api/engagements/{engagement_id}/length",
        json={ruler.length_field: 200},
    )

    assert response.status_code == 409
    assert "500" in response.json()["detail"]


@pytest.mark.parametrize("ruler", RULERS)
def test_update_length_equal_to_the_furthest_log_is_allowed(
    client: TestClient, ruler: Ruler
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 1100)
    ruler.log_progress(client, engagement_id, 500)

    response = client.patch(
        f"/api/engagements/{engagement_id}/length",
        json={ruler.length_field: 500},
    )

    assert response.status_code == 200
    assert response.json()["completion_pct"] == 100


# --- Validation and errors ---


def test_update_length_in_a_format_the_read_is_not_bound_in_returns_404(
    client: TestClient,
) -> None:
    _, engagement_id = _read_with_length(client, PAGES, 1100)

    response = client.patch(
        f"/api/engagements/{engagement_id}/length",
        json={MINUTES.length_field: 500},
    )

    assert response.status_code == 404


def test_write_engagement_edition_length_on_bound_format_returns_422(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], edition_format="print")

    response = client.post(
        "/api/engagements",
        json={
            "id": engagement["id"],
            "status": "reading",
            "edition_format": "print",
            "edition_length": 430,
        },
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "payload",
    [{}, {"length_pages": 300, "length_minutes": 500}],
    ids=["neither", "both"],
)
def test_update_length_needs_exactly_one_unit(
    client: TestClient, payload: dict[str, int]
) -> None:
    _, engagement_id = _read_with_length(client, PAGES, 1100)

    response = client.patch(f"/api/engagements/{engagement_id}/length", json=payload)
    assert response.status_code == 422


@pytest.mark.parametrize("length_field", ["edition_length", "length_override"])
def test_write_engagement_length_without_edition_returns_422(
    client: TestClient, length_field: str
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], edition_format="print")

    response = client.post(
        "/api/engagements",
        json={"id": engagement["id"], "status": "reading", length_field: 300},
    )

    assert response.status_code == 422


@pytest.mark.parametrize("ruler", RULERS)
@pytest.mark.parametrize("length", [0, -1], ids=["zero", "negative"])
def test_update_length_rejects_a_non_positive_length(
    client: TestClient, ruler: Ruler, length: int
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 1100)

    response = client.patch(
        f"/api/engagements/{engagement_id}/length",
        json={ruler.length_field: length},
    )

    assert response.status_code == 422


def test_update_length_unknown_engagement_returns_404(client: TestClient) -> None:
    response = client.patch(
        f"/api/engagements/{uuid.uuid4()}/length",
        json={PAGES.length_field: 300},
    )
    assert response.status_code == 404
