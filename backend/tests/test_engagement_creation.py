from __future__ import annotations

import datetime
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.book import Book
from app.models.enums import (
    ENDED_STATUSES,
    OPEN_STATUSES,
    ReadingStatus,
)
from tests.helpers import (
    COMPLETIONS,
    MINUTES,
    PAGES,
    RULERS,
    Completion,
    Ruler,
    _create_bare_book,
    _create_book,
    _create_edition,
    _create_engagement,
)

_LIFECYCLE_DATE_FIELDS = (
    "tbr_added_on",
    "started_on",
    "finished_on",
    "abandoned_on",
)


@pytest.mark.parametrize(
    ("status", "dates", "expected_dates"),
    [
        pytest.param(
            ReadingStatus.tbr,
            {},
            {"tbr_added_on": datetime.date.today().isoformat()},
            id="tbr-default",
        ),
        pytest.param(
            ReadingStatus.tbr,
            {"tbr_added_on": "2026-09-15"},
            {"tbr_added_on": "2026-09-15"},
            id="tbr-explicit",
        ),
        pytest.param(
            ReadingStatus.reading,
            {},
            {"started_on": datetime.date.today().isoformat()},
            id="reading-default",
        ),
        pytest.param(
            ReadingStatus.reading,
            {"started_on": "2026-09-15"},
            {"started_on": "2026-09-15"},
            id="reading-explicit",
        ),
        pytest.param(ReadingStatus.finished, {}, {}, id="finished-no-dates"),
        pytest.param(
            ReadingStatus.finished,
            {"finished_on": "2026-09-15"},
            {"finished_on": "2026-09-15"},
            id="finished-end-only",
        ),
        pytest.param(
            ReadingStatus.finished,
            {"started_on": "2026-09-01", "finished_on": "2026-09-15"},
            {"started_on": "2026-09-01", "finished_on": "2026-09-15"},
            id="finished-start-and-end",
        ),
        pytest.param(ReadingStatus.dnf, {}, {}, id="dnf-no-dates"),
        pytest.param(
            ReadingStatus.dnf,
            {"abandoned_on": "2026-09-15"},
            {"abandoned_on": "2026-09-15"},
            id="dnf-end-only",
        ),
        pytest.param(
            ReadingStatus.dnf,
            {"started_on": "2026-09-01", "abandoned_on": "2026-09-15"},
            {"started_on": "2026-09-01", "abandoned_on": "2026-09-15"},
            id="dnf-start-and-end",
        ),
    ],
)
def test_create_engagement_sets_status_appropriate_lifecycle_dates(
    client: TestClient,
    status: ReadingStatus,
    dates: dict[str, str],
    expected_dates: dict[str, str],
) -> None:
    book = _create_book(client)

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "status": status,
            "edition_format": "print",
            **dates,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == status
    assert {field: data[field] for field in _LIFECYCLE_DATE_FIELDS} == {
        field: expected_dates.get(field) for field in _LIFECYCLE_DATE_FIELDS
    }


@pytest.mark.parametrize(
    ("ruler", "expected_length"),
    [
        pytest.param(PAGES, 300, id="pages"),
        pytest.param(MINUTES, 600, id="audio"),
    ],
)
def test_create_reading_engagement_returns_selected_edition(
    client: TestClient, ruler: Ruler, expected_length: int
) -> None:
    book = _create_book(client)

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "status": "reading",
            "edition_format": ruler.edition_format,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["formats"] == [ruler.edition_format]
    assert data[ruler.length_field] == expected_length
    assert data[ruler.other_length_field] is None
    assert data[ruler.resume_field] == 0


def test_create_tbr_engagement_without_format_returns_201(client: TestClient) -> None:
    book = _create_book(client)
    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "status": "tbr",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "tbr"
    assert data["formats"] == []


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
            "status": "reading",
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
            "status": "reading",
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
        json={
            "book_id": book["id"],
            "status": "reading",
            "edition_format": ruler.edition_format,
        },
    )

    assert response.status_code == 422
    engagements_response = client.get(f"/api/books/{book['id']}/engagements")
    assert engagements_response.status_code == 200
    assert engagements_response.json() == []


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
            "status": "reading",
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
            "status": "reading",
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


@pytest.mark.parametrize("existing_status", sorted(OPEN_STATUSES))
@pytest.mark.parametrize("new_status", sorted(OPEN_STATUSES))
def test_create_active_engagement_when_book_has_active_engagement_returns_409(
    client: TestClient,
    existing_status: ReadingStatus,
    new_status: ReadingStatus,
) -> None:
    book = _create_book(client)
    _create_engagement(
        client,
        book["id"],
        status=existing_status,
        edition_format="print",
    )

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": "audio",
            "status": new_status,
        },
    )

    assert response.status_code == 409


@pytest.mark.parametrize("existing_status", sorted(ENDED_STATUSES))
@pytest.mark.parametrize("new_status", sorted(OPEN_STATUSES))
def test_create_active_engagement_after_ended_engagement_succeeds(
    client: TestClient, existing_status: ReadingStatus, new_status: ReadingStatus
) -> None:
    book = _create_book(client)
    _create_engagement(client, book["id"], status=existing_status)

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


@pytest.mark.parametrize("existing_status", sorted(OPEN_STATUSES))
@pytest.mark.parametrize("new_status", sorted(ENDED_STATUSES))
def test_create_ended_engagement_for_book_with_active_engagement_succeeds(
    client: TestClient,
    existing_status: ReadingStatus,
    new_status: ReadingStatus,
) -> None:
    book = _create_book(client)
    _create_engagement(
        client,
        book["id"],
        status=existing_status,
        edition_format="print",
    )

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "status": new_status,
            "edition_format": "print",
        },
    )

    assert response.status_code == 201


# --- Completed reads ---


@pytest.mark.parametrize("status", sorted(ENDED_STATUSES))
def test_create_completed_engagement_without_edition_length_succeeds(
    client: TestClient,
    status: ReadingStatus,
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print")

    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": "print",
            "status": status,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == status

    logs_response = client.get(f"/api/engagements/{data['id']}/progress-logs")
    assert logs_response.status_code == 200
    assert logs_response.json() == []


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
    response = client.post(
        "/api/engagements", json={"book_id": book["id"], "status": "reading"}
    )
    assert response.status_code == 422


def test_create_reading_engagement_without_matching_edition_returns_404(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)

    response = client.post(
        "/api/engagements",
        json={"book_id": book["id"], "status": "reading", "edition_format": "print"},
    )

    assert response.status_code == 404


def test_create_reading_engagement_with_multiple_matching_editions_returns_409(
    client: TestClient,
) -> None:
    book = _create_book(client)
    _create_edition(client, book["id"], format="print", isbn="9781526622426")

    response = client.post(
        "/api/engagements",
        json={"book_id": book["id"], "status": "reading", "edition_format": "print"},
    )

    assert response.status_code == 409


@pytest.mark.parametrize(
    "status, date_field",
    [
        pytest.param("tbr", "tbr_added_on", id="tbr-added-on"),
        pytest.param("reading", "started_on", id="started-on"),
        pytest.param("finished", "finished_on", id="finished-on"),
        pytest.param("dnf", "abandoned_on", id="abandoned-on"),
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
        json={
            "book_id": str(uuid.uuid4()),
            "status": "reading",
            "edition_format": "print",
        },
    )
    assert response.status_code == 404


@pytest.mark.parametrize("end_date_field", ["finished_on", "abandoned_on"])
def test_create_reading_engagement_with_end_date_returns_422(
    client: TestClient, end_date_field: str
) -> None:
    book = _create_book(client)
    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": "print",
            "status": "reading",
            end_date_field: "2026-03-20",
        },
    )
    assert response.status_code == 422


@pytest.mark.parametrize("completion", COMPLETIONS)
def test_create_completed_engagement_with_other_end_date_returns_409(
    client: TestClient, completion: Completion
) -> None:
    book = _create_book(client)
    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": "print",
            "status": completion.status,
            completion.other_end_date_field: "2026-03-20",
        },
    )
    assert response.status_code == 409


@pytest.mark.parametrize("completion", COMPLETIONS)
def test_create_completed_engagement_with_end_before_start_returns_409(
    client: TestClient, completion: Completion
) -> None:
    book = _create_book(client)
    response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": "print",
            "status": completion.status,
            "started_on": "2026-03-20",
            completion.end_date_field: "2026-03-01",
        },
    )
    assert response.status_code == 409


@pytest.mark.parametrize(
    "identifiers",
    [pytest.param(("book_id", "id"), id="both"), pytest.param((), id="neither")],
)
def test_write_engagement_needs_exactly_one_of_book_id_and_id(
    client: TestClient, identifiers: tuple[str, ...]
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    known = {"book_id": book["id"], "id": engagement["id"]}

    response = client.post(
        "/api/engagements",
        json={
            "status": "reading",
            "edition_format": "print",
            **{key: known[key] for key in identifiers},
        },
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("identifier", "field", "value"),
    [
        pytest.param("book_id", "effective_on", "2026-01-01", id="effective_on"),
        pytest.param("book_id", "unit", "pages", id="unit"),
        pytest.param("id", "tbr_added_on", "2026-01-01", id="tbr_added_on"),
        pytest.param("id", "started_on", "2026-01-01", id="started_on"),
        pytest.param("id", "finished_on", "2026-01-01", id="finished_on"),
        pytest.param("id", "abandoned_on", "2026-01-01", id="abandoned_on"),
    ],
)
def test_write_engagement_rejects_a_field_for_the_other_identifier(
    client: TestClient, identifier: str, field: str, value: str
) -> None:
    engagement = _create_engagement(client, _create_book(client)["id"])
    unread_book = _create_book(client, title="Jonathan Strange & Mr Norrell")
    known = {"book_id": unread_book["id"], "id": engagement["id"]}

    response = client.post(
        "/api/engagements",
        json={
            identifier: known[identifier],
            "status": "reading",
            "edition_format": "print",
            field: value,
        },
    )

    assert response.status_code == 422


def test_create_engagement_with_invalid_status_returns_422(client: TestClient) -> None:
    book = _create_book(client)
    response = client.post(
        "/api/engagements",
        json={"book_id": book["id"], "edition_format": "print", "status": "bogus"},
    )
    assert response.status_code == 422
