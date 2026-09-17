from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.book import Book
from app.models.progress_log import ProgressLog
from app.models.review import Review
from tests.helpers import (
    _create_bare_book,
    _create_book,
    _create_edition,
    _create_engagement,
    _log_progress,
)

# --- Get single engagement ---


def test_engagement_read_reports_the_overridden_length(
    client: TestClient, db: Session
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], length=1100)
    # A book default for the format this read isn't in must not leak into the response.
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_audio_minutes = 600
    db.commit()
    engagement_id = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": "print",
            "length_override": 1000,
        },
    ).json()["id"]

    response = client.get(f"/api/engagements/{engagement_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["length_pages"] == 1000
    assert data["length_minutes"] is None


def test_get_engagement_returns_200_with_correct_fields(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.get(f"/api/engagements/{engagement['id']}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == engagement["id"]
    assert data["status"] == "reading"
    assert data["book"]["title"] == "Piranesi"


def test_get_engagement_unknown_id_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/engagements/{uuid.uuid4()}")
    assert response.status_code == 404


# --- Delete engagement ---


def test_delete_engagement_returns_204(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.delete(f"/api/engagements/{engagement['id']}")
    assert response.status_code == 204


def test_delete_engagement_removes_it_from_list(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    client.delete(f"/api/engagements/{engagement['id']}")

    response = client.get(f"/api/engagements/{engagement['id']}")
    assert response.status_code == 404


def test_delete_engagement_cascades_progress_logs_and_editions(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)
    engagement_id = uuid.UUID(engagement["id"])

    client.delete(f"/api/engagements/{engagement['id']}")

    logs = (
        db.execute(
            select(ProgressLog).where(ProgressLog.engagement_id == engagement_id)
        )
        .scalars()
        .all()
    )
    assert logs == []


def test_delete_engagement_with_review_succeeds_and_removes_review(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "finished"})
    client.put(f"/api/engagements/{engagement['id']}/review", json={"rating": 4.0})
    engagement_id = uuid.UUID(engagement["id"])

    response = client.delete(f"/api/engagements/{engagement['id']}")
    assert response.status_code == 204

    reviews = (
        db.execute(select(Review).where(Review.engagement_id == engagement_id))
        .scalars()
        .all()
    )
    assert reviews == []


def test_delete_engagement_leaves_book_and_editions_intact(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    client.delete(f"/api/engagements/{engagement['id']}")

    response = client.get("/api/books")
    assert response.status_code == 200
    assert any(b["id"] == book["id"] for b in response.json())


def test_delete_unknown_engagement_returns_404(client: TestClient) -> None:
    response = client.delete(f"/api/engagements/{uuid.uuid4()}")
    assert response.status_code == 404
