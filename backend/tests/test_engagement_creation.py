from __future__ import annotations

import datetime
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.book import Book
from tests.helpers import (
    MINUTES,
    PAGES,
    RULERS,
    Ruler,
    _create_bare_book,
    _create_book,
    _create_edition,
    _create_engagement,
)

COMPLETED_STATUSES = [
    pytest.param("finished", "finished_on", "abandoned_on", id="finished"),
    pytest.param("dnf", "abandoned_on", "finished_on", id="dnf"),
]


# --- Reading and TBR ---


@pytest.mark.parametrize(
    "ruler, expected_length",
    [
        pytest.param(PAGES, 300, id="pages"),
        pytest.param(MINUTES, 600, id="audio"),
    ],
)
def test_create_reading_engagement_with_selected_format_returns_201(
    client: TestClient, ruler: Ruler, expected_length: int
) -> None:
    book = _create_book(client)

    response = client.post(
        "/api/engagements",
        json={"book_id": book["id"], "edition_format": ruler.edition_format},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "reading"
    assert data["started_on"] is not None
    assert data["finished_on"] is None
    assert data["book"]["title"] == "Piranesi"
    assert data["book"]["authors"][0]["name"] == "Susanna Clarke"
    assert data["formats"] == [ruler.edition_format]
    assert data[ruler.length_field] == expected_length
    assert data[ruler.other_length_field] is None


@pytest.mark.parametrize("ruler", RULERS)
def test_create_tbr_engagement_with_format_returns_201(
    client: TestClient, ruler: Ruler
) -> None:
    book = _create_book(client)

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "status": "tbr",
            "edition_format": ruler.edition_format,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "tbr"
    assert data["tbr_added_on"] == datetime.date.today().isoformat()
    assert data["started_on"] is None
    assert data["finished_on"] is None
    assert data["formats"] == [ruler.edition_format]


def test_create_tbr_engagement_without_format_returns_201(client: TestClient) -> None:
    book = _create_book(client)

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "status": "tbr",
            "tbr_added_on": "2026-09-15",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "tbr"
    assert data["finished_on"] is None
    assert data["started_on"] is None
    assert data["formats"] == []
    assert data["tbr_added_on"] == "2026-09-15"


# --- Edition selection and length ---


@pytest.mark.parametrize("ruler", RULERS)
def test_create_reading_engagement_captures_missing_edition_length(
    client: TestClient, ruler: Ruler
) -> None:
    book = _create_bare_book(client)
    edition = _create_edition(client, book["id"], format=ruler.edition_format)

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": ruler.edition_format,
            "edition_length": 250,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data[ruler.length_field] == 250
    assert data[ruler.other_length_field] is None

    book_response = client.get(f"/api/books/{book['id']}")
    assert book_response.status_code == 200
    assert book_response.json()[ruler.book_length_field] == 250

    edition_response = client.get(f"/api/editions/{edition['id']}")
    assert edition_response.status_code == 200
    assert edition_response.json()["length"] == 250


@pytest.mark.parametrize("ruler", RULERS)
def test_create_reading_engagement_rejects_edition_length_when_edition_has_one(
    client: TestClient, ruler: Ruler
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format=ruler.edition_format, length=300)

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": ruler.edition_format,
            "edition_length": 1000,
        },
    )

    assert response.status_code == 422


@pytest.mark.parametrize("ruler", RULERS)
def test_create_reading_engagement_without_a_length_returns_422(
    client: TestClient, ruler: Ruler
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format=ruler.edition_format)

    response = client.post(
        "/api/engagements",
        json={"book_id": book["id"], "edition_format": ruler.edition_format},
    )

    assert response.status_code == 422


@pytest.mark.parametrize("ruler", RULERS)
def test_create_reading_engagement_length_override_drives_completion(
    client: TestClient, ruler: Ruler
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format=ruler.edition_format, length=1100)
    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": ruler.edition_format,
            "length_override": 1000,
        },
    )
    assert response.status_code == 201
    engagement_id = response.json()["id"]
    ruler.log_progress(client, engagement_id, 500)

    engagement_response = client.get(f"/api/engagements/{engagement_id}")

    assert engagement_response.status_code == 200
    assert engagement_response.json()["completion_pct"] == 50


@pytest.mark.parametrize("ruler", RULERS)
def test_create_reading_engagement_length_override_leaves_edition_alone(
    client: TestClient, ruler: Ruler
) -> None:
    book = _create_bare_book(client)
    edition = _create_edition(
        client, book["id"], format=ruler.edition_format, length=1100
    )

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": ruler.edition_format,
            "length_override": 1000,
        },
    )
    assert response.status_code == 201

    edition_response = client.get(f"/api/editions/{edition['id']}")
    assert edition_response.status_code == 200
    assert edition_response.json()["length"] == 1100

    book_response = client.get(f"/api/books/{book['id']}")
    assert book_response.status_code == 200
    assert book_response.json()[ruler.book_length_field] is None


# --- Duplicate engagements ---


def test_create_second_tbr_engagement_for_book_returns_409(client: TestClient) -> None:
    book = _create_book(client)
    _create_engagement(client, book["id"], status="tbr", edition_format=None)

    response = client.post(
        "/api/engagements", json={"book_id": book["id"], "status": "tbr"}
    )

    assert response.status_code == 409


@pytest.mark.parametrize("new_status", ["reading", "finished", "dnf"])
def test_create_non_tbr_engagement_with_active_read_in_same_format_returns_409(
    client: TestClient, new_status: str
) -> None:
    book = _create_book(client)
    _create_engagement(client, book["id"])

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": "print",
            "status": new_status,
        },
    )

    assert response.status_code == 409


@pytest.mark.parametrize(
    "existing_ruler, new_ruler",
    [
        pytest.param(PAGES, MINUTES, id="print-to-audio"),
        pytest.param(MINUTES, PAGES, id="audio-to-print"),
    ],
)
def test_create_reading_engagement_in_different_format_from_active_read_succeeds(
    client: TestClient,
    existing_ruler: Ruler,
    new_ruler: Ruler,
) -> None:
    book = _create_book(client)
    _create_engagement(client, book["id"], edition_format=existing_ruler.edition_format)

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": new_ruler.edition_format,
            "status": "reading",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "reading"
    assert data["formats"] == [new_ruler.edition_format]


@pytest.mark.parametrize("new_status", ["tbr", "reading"])
def test_create_tbr_or_reading_engagement_after_finished_read_succeeds(
    client: TestClient, new_status: str
) -> None:
    book = _create_book(client)
    _create_engagement(client, book["id"], status="finished")

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": "print",
            "status": new_status,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == new_status
    assert data["formats"] == ["print"]


# --- Completed reads ---


@pytest.mark.parametrize(
    "status, end_date_field, other_end_date_field", COMPLETED_STATUSES
)
@pytest.mark.parametrize(
    "edition_length",
    [pytest.param(300, id="with-length"), pytest.param(None, id="without-length")],
)
def test_create_completed_engagement_without_dates_succeeds(
    client: TestClient,
    status: str,
    end_date_field: str,
    other_end_date_field: str,
    edition_length: int | None,
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print", length=edition_length)

    response = client.post(
        "/api/engagements",
        json={"book_id": book["id"], "edition_format": "print", "status": status},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == status
    assert data["started_on"] is None
    assert data[end_date_field] is None
    assert data[other_end_date_field] is None

    logs_response = client.get(f"/api/engagements/{data['id']}/progress-logs")
    assert logs_response.status_code == 200
    assert logs_response.json() == []


@pytest.mark.parametrize(
    "status, end_date_field, other_end_date_field", COMPLETED_STATUSES
)
@pytest.mark.parametrize(
    "started_on",
    [
        pytest.param("2026-03-01", id="with-start"),
        pytest.param(None, id="without-start"),
    ],
)
def test_create_completed_engagement_stores_its_dates(
    client: TestClient,
    status: str,
    end_date_field: str,
    other_end_date_field: str,
    started_on: str | None,
) -> None:
    book = _create_book(client)

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": "print",
            "status": status,
            "started_on": started_on,
            "finished_on": "2026-03-20",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["started_on"] == started_on
    assert data[end_date_field] == "2026-03-20"
    assert data[other_end_date_field] is None


# --- Derived cover ---


def test_cover_url_derived_from_bound_edition(client: TestClient) -> None:
    book = _create_bare_book(client)
    _create_edition(
        client,
        book["id"],
        format="print",
        cover_url="https://covers.example/ed.jpg",
        length=300,
    )

    engagement = _create_engagement(client, book["id"])

    assert engagement["cover_url"] == "https://covers.example/ed.jpg"


def test_cover_url_falls_back_to_book_default_when_edition_has_no_cover(
    client: TestClient, db: Session
) -> None:
    book = _create_bare_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_cover_url = "https://covers.example/default.jpg"
    db.commit()

    _create_edition(client, book["id"], format="print", length=300)
    engagement = _create_engagement(client, book["id"])

    assert engagement["cover_url"] == "https://covers.example/default.jpg"


def test_cover_url_is_null_when_edition_has_no_cover_and_book_has_no_default(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print", length=300)

    engagement = _create_engagement(client, book["id"])

    assert engagement["cover_url"] is None


# --- Validation and errors ---


def test_create_reading_engagement_without_edition_format_returns_422(
    client: TestClient,
) -> None:
    book = _create_book(client)
    response = client.post("/api/engagements", json={"book_id": book["id"]})
    assert response.status_code == 422


def test_create_reading_engagement_without_matching_edition_returns_404(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)

    response = client.post(
        "/api/engagements", json={"book_id": book["id"], "edition_format": "print"}
    )

    assert response.status_code == 404


def test_create_reading_engagement_with_multiple_matching_editions_returns_409(
    client: TestClient,
) -> None:
    book = _create_book(client)
    _create_edition(client, book["id"], format="print", isbn="9781526622426")

    response = client.post(
        "/api/engagements", json={"book_id": book["id"], "edition_format": "print"}
    )

    assert response.status_code == 409


@pytest.mark.parametrize(
    "status, date_field",
    [
        pytest.param("tbr", "tbr_added_on", id="tbr-added-on"),
        pytest.param("reading", "started_on", id="started-on"),
        pytest.param("finished", "finished_on", id="finished-on"),
    ],
)
def test_create_engagement_with_future_lifecycle_date_returns_422(
    client: TestClient, status: str, date_field: str
) -> None:
    book = _create_book(client)
    future = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": "print",
            "status": status,
            date_field: future,
        },
    )

    assert response.status_code == 422


def test_create_engagement_for_unknown_book_returns_404(client: TestClient) -> None:
    response = client.post(
        "/api/engagements",
        json={"book_id": str(uuid.uuid4()), "edition_format": "print"},
    )
    assert response.status_code == 404


def test_create_reading_engagement_with_end_date_returns_422(
    client: TestClient,
) -> None:
    book = _create_book(client)
    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": "print",
            "status": "reading",
            "finished_on": "2026-03-20",
        },
    )
    assert response.status_code == 422


def test_create_finished_engagement_with_end_before_start_returns_409(
    client: TestClient,
) -> None:
    book = _create_book(client)
    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": "print",
            "status": "finished",
            "started_on": "2026-03-20",
            "finished_on": "2026-03-01",
        },
    )
    assert response.status_code == 409


def test_create_engagement_with_invalid_status_returns_422(client: TestClient) -> None:
    book = _create_book(client)
    response = client.post(
        "/api/engagements",
        json={"book_id": book["id"], "edition_format": "print", "status": "bogus"},
    )
    assert response.status_code == 422
