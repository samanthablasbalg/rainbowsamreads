from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.edition import EngagementEdition
from app.models.progress_log import ProgressLog
from app.models.review import Review
from tests.helpers import (
    _create_bare_book,
    _create_book,
    _create_edition,
    _create_engagement,
    _log_progress,
)


def test_delete_engagement_returns_204_and_removes_engagement(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.delete(f"/api/engagements/{engagement['id']}")

    assert response.status_code == 204
    get_response = client.get(f"/api/engagements/{engagement['id']}")
    assert get_response.status_code == 404


def test_delete_engagement_cascades_progress_logs_bindings_and_review(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)
    finish_response = client.post(
        "/api/engagements", json={"id": engagement["id"], "status": "finished"}
    )
    assert finish_response.status_code == 200
    review_response = client.put(
        f"/api/engagements/{engagement['id']}/review", json={"rating": 4.0}
    )
    assert review_response.status_code == 200
    engagement_id = uuid.UUID(engagement["id"])

    response = client.delete(f"/api/engagements/{engagement['id']}")

    assert response.status_code == 204
    logs = (
        db.execute(
            select(ProgressLog).where(ProgressLog.engagement_id == engagement_id)
        )
        .scalars()
        .all()
    )
    bindings = (
        db.execute(
            select(EngagementEdition).where(
                EngagementEdition.engagement_id == engagement_id
            )
        )
        .scalars()
        .all()
    )
    reviews = (
        db.execute(select(Review).where(Review.engagement_id == engagement_id))
        .scalars()
        .all()
    )
    assert logs == []
    assert bindings == []
    assert reviews == []


def test_delete_engagement_leaves_book_and_edition_intact(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)
    edition = _create_edition(client, book["id"], length=300)
    engagement = _create_engagement(client, book["id"])

    response = client.delete(f"/api/engagements/{engagement['id']}")

    assert response.status_code == 204
    book_response = client.get(f"/api/books/{book['id']}")
    assert book_response.status_code == 200
    edition_response = client.get(f"/api/editions/{edition['id']}")
    assert edition_response.status_code == 200


def test_delete_engagement_unknown_id_returns_404(client: TestClient) -> None:
    response = client.delete(f"/api/engagements/{uuid.uuid4()}")
    assert response.status_code == 404
