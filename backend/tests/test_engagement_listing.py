from __future__ import annotations

import datetime
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.engagement import Engagement
from app.models.progress_log import ProgressLog
from tests.helpers import (
    _bind_edition,
    _create_bare_book,
    _create_book,
    _create_edition,
    _create_engagement,
    _log_progress,
)

COMPLETED_SHELVES = [
    pytest.param("finished", "finished_on", id="finished"),
    pytest.param("dnf", "abandoned_on", id="dnf"),
]

# --- Filtering and response ---


@pytest.mark.parametrize("requested_status", ["reading", "finished", "dnf"])
def test_list_includes_only_the_requested_status(
    client: TestClient, requested_status: str
) -> None:
    books = {
        status: _create_book(
            client, title=f"{status.title()} Book", author=f"{status.title()} Author"
        )
        for status in ("reading", "finished", "dnf")
    }
    _create_engagement(client, books["reading"]["id"])
    _create_engagement(client, books["finished"]["id"], status="finished")
    _create_engagement(client, books["dnf"]["id"], status="dnf")

    response = client.get(f"/api/engagements?status={requested_status}")

    assert response.status_code == 200
    assert [item["book"]["title"] for item in response.json()] == [
        f"{requested_status.title()} Book"
    ]


@pytest.mark.parametrize(
    "path",
    [
        pytest.param("/api/engagements?status=bogus", id="invalid"),
        pytest.param("/api/engagements", id="missing"),
    ],
)
def test_list_requires_a_valid_status(client: TestClient, path: str) -> None:
    response = client.get(path)
    assert response.status_code == 422


def test_list_empty_returns_empty_list(client: TestClient) -> None:
    response = client.get("/api/engagements?status=reading")
    assert response.status_code == 200
    assert response.json() == []


def test_list_includes_nested_book_details(client: TestClient) -> None:
    book = _create_book(client, title="A Memory Called Empire", author="Arkady Martine")
    _create_engagement(client, book["id"])

    response = client.get("/api/engagements?status=reading")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    item = data[0]
    assert item["book"]["title"] == "A Memory Called Empire"
    assert item["book"]["authors"][0]["name"] == "Arkady Martine"
    assert item["started_on"] is not None
    assert item["finished_on"] is None


def test_list_formats_derived_from_bound_editions(client: TestClient) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print", length=300)
    digital_edition = _create_edition(client, book["id"], format="digital", length=250)
    engagement = _create_engagement(client, book["id"])
    _bind_edition(client, engagement["id"], digital_edition["id"])

    response = client.get("/api/engagements?status=reading")

    assert response.status_code == 200
    assert set(response.json()[0]["formats"]) == {"print", "digital"}


# --- Ordering ---


def _set_updated_at(db: Session, engagement_id: str, when: datetime.datetime) -> None:
    engagement = db.get(Engagement, uuid.UUID(engagement_id))
    assert engagement is not None
    engagement.updated_at = when
    db.commit()


def _set_log_created_at(
    db: Session, engagement_id: str, when: datetime.datetime
) -> None:
    log = db.execute(
        select(ProgressLog).where(ProgressLog.engagement_id == uuid.UUID(engagement_id))
    ).scalar_one()
    log.created_at = when
    db.commit()


def _set_end_date(
    db: Session, engagement_id: str, field: str, when: datetime.date
) -> None:
    engagement = db.get(Engagement, uuid.UUID(engagement_id))
    assert engagement is not None
    setattr(engagement, field, when)
    db.commit()


def test_list_reading_orders_more_recently_marked_first(
    client: TestClient, db: Session
) -> None:
    book_a = _create_book(client, title="Book A", author="Author A")
    book_b = _create_book(client, title="Book B", author="Author B")
    engagement_a = _create_engagement(client, book_a["id"])
    engagement_b = _create_engagement(client, book_b["id"])

    _set_updated_at(
        db, engagement_a["id"], datetime.datetime(2024, 1, 1, tzinfo=datetime.UTC)
    )
    _set_updated_at(
        db, engagement_b["id"], datetime.datetime(2024, 6, 1, tzinfo=datetime.UTC)
    )

    response = client.get("/api/engagements?status=reading")

    assert response.status_code == 200
    assert [item["book"]["title"] for item in response.json()] == [
        "Book B",
        "Book A",
    ]


def test_list_reading_log_outranks_more_recently_marked(
    client: TestClient, db: Session
) -> None:
    book_a = _create_book(client, title="Book A", author="Author A")
    book_b = _create_book(client, title="Book B", author="Author B")
    engagement_a = _create_engagement(client, book_a["id"])
    engagement_b = _create_engagement(client, book_b["id"])
    _log_progress(client, engagement_a["id"], 50)

    _set_updated_at(
        db, engagement_a["id"], datetime.datetime(2024, 1, 1, tzinfo=datetime.UTC)
    )
    _set_updated_at(
        db, engagement_b["id"], datetime.datetime(2024, 6, 1, tzinfo=datetime.UTC)
    )
    _set_log_created_at(
        db, engagement_a["id"], datetime.datetime(2024, 12, 1, tzinfo=datetime.UTC)
    )

    response = client.get("/api/engagements?status=reading")

    assert response.status_code == 200
    assert [item["book"]["title"] for item in response.json()] == [
        "Book A",
        "Book B",
    ]


def test_list_reading_orders_multiple_logs_by_recency(
    client: TestClient, db: Session
) -> None:
    engagements = {}
    for title in ("Book A", "Book B", "Book C"):
        book = _create_book(client, title=title, author=f"Author {title[-1]}")
        engagement = _create_engagement(client, book["id"])
        _log_progress(client, engagement["id"], 50)
        engagements[title] = engagement["id"]

    marked = datetime.datetime(2023, 1, 1, tzinfo=datetime.UTC)
    log_created_times = {
        "Book A": datetime.datetime(2024, 1, 1, tzinfo=datetime.UTC),
        "Book B": datetime.datetime(2024, 2, 1, tzinfo=datetime.UTC),
        "Book C": datetime.datetime(2024, 3, 1, tzinfo=datetime.UTC),
    }
    for title, engagement_id in engagements.items():
        _set_updated_at(db, engagement_id, marked)
        _set_log_created_at(db, engagement_id, log_created_times[title])

    response = client.get("/api/engagements?status=reading")

    assert response.status_code == 200
    assert [item["book"]["title"] for item in response.json()] == [
        "Book C",
        "Book B",
        "Book A",
    ]


def test_list_reading_order_stable_for_identical_activity(
    client: TestClient, db: Session
) -> None:
    engagements = []
    for title in ("Book A", "Book B", "Book C"):
        book = _create_book(client, title=title, author=f"Author {title[-1]}")
        engagements.append(_create_engagement(client, book["id"]))

    same = datetime.datetime(2024, 6, 1, tzinfo=datetime.UTC)
    for engagement in engagements:
        _set_updated_at(db, engagement["id"], same)

    response = client.get("/api/engagements?status=reading")

    assert response.status_code == 200
    expected_ids = sorted(engagement["id"] for engagement in engagements)
    assert [item["id"] for item in response.json()] == expected_ids


@pytest.mark.parametrize(
    "status, end_date_field",
    COMPLETED_SHELVES,
)
def test_list_completed_orders_by_end_date_not_last_touch(
    client: TestClient, db: Session, status: str, end_date_field: str
) -> None:
    book_a = _create_book(client, title="Book A", author="Author A")
    book_b = _create_book(client, title="Book B", author="Author B")
    engagement_a = _create_engagement(client, book_a["id"], status=status)
    engagement_b = _create_engagement(client, book_b["id"], status=status)

    _set_end_date(db, engagement_a["id"], end_date_field, datetime.date(2026, 5, 1))
    _set_updated_at(
        db, engagement_a["id"], datetime.datetime(2026, 1, 1, tzinfo=datetime.UTC)
    )
    _set_end_date(db, engagement_b["id"], end_date_field, datetime.date(2026, 3, 1))
    _set_updated_at(
        db, engagement_b["id"], datetime.datetime(2026, 6, 1, tzinfo=datetime.UTC)
    )

    response = client.get(f"/api/engagements?status={status}")

    assert response.status_code == 200
    assert [item["book"]["title"] for item in response.json()] == [
        "Book A",
        "Book B",
    ]


@pytest.mark.parametrize(
    "status, end_date_field",
    COMPLETED_SHELVES,
)
def test_list_completed_puts_an_undated_read_last(
    client: TestClient, db: Session, status: str, end_date_field: str
) -> None:
    dated_book = _create_book(client, title="Dated", author="Author A")
    undated_book = _create_book(client, title="Undated", author="Author B")
    dated = _create_engagement(client, dated_book["id"], status=status)
    _set_end_date(db, dated["id"], end_date_field, datetime.date(2026, 5, 1))
    _create_engagement(client, undated_book["id"], status=status)

    response = client.get(f"/api/engagements?status={status}")

    assert response.status_code == 200
    assert [item["book"]["title"] for item in response.json()] == [
        "Dated",
        "Undated",
    ]
