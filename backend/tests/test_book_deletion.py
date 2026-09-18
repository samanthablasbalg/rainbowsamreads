from __future__ import annotations

import datetime
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.author import Author
from app.models.book import Book, BookAuthor
from app.models.edition import Edition
from app.models.engagement import Engagement
from app.models.enums import ReadingStatus
from app.models.standalone_entry import StandaloneEntry
from app.models.user import User
from tests.helpers import _create_bare_book, _create_book, _create_engagement


def test_delete_book_returns_204_and_removes_book(
    client: TestClient,
) -> None:
    book = _create_book(client)

    response = client.delete(f"/api/books/{book['id']}")

    assert response.status_code == 204
    get_response = client.get(f"/api/books/{book['id']}")
    assert get_response.status_code == 404


def test_delete_book_cascades_editions_and_author_links_but_preserves_author(
    client: TestClient,
    db: Session,
) -> None:
    book = _create_book(client)
    book_id = uuid.UUID(book["id"])
    author_id = uuid.UUID(book["authors"][0]["id"])

    response = client.delete(f"/api/books/{book['id']}")

    assert response.status_code == 204
    editions = (
        db.execute(select(Edition).where(Edition.book_id == book_id)).scalars().all()
    )
    assert editions == []
    author_links = (
        db.execute(select(BookAuthor).where(BookAuthor.book_id == book_id))
        .scalars()
        .all()
    )
    assert author_links == []
    assert db.get(Author, author_id) is not None


def test_delete_book_with_engagement_returns_409_and_preserves_both(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.delete(f"/api/books/{book['id']}")

    assert response.status_code == 409
    book_response = client.get(f"/api/books/{book['id']}")
    assert book_response.status_code == 200
    engagement_response = client.get(f"/api/engagements/{engagement['id']}")
    assert engagement_response.status_code == 200


def test_delete_book_with_standalone_entry_returns_409_and_preserves_both(
    client: TestClient,
    db: Session,
    seed_user: User,
) -> None:
    book = _create_bare_book(client)
    entry = StandaloneEntry(
        book_id=uuid.UUID(book["id"]),
        user_id=seed_user.id,
        read_on=datetime.date(2026, 1, 1),
    )
    db.add(entry)
    db.commit()

    response = client.delete(f"/api/books/{book['id']}")

    assert response.status_code == 409
    book_response = client.get(f"/api/books/{book['id']}")
    assert book_response.status_code == 200
    assert db.get(StandaloneEntry, entry.id) is not None


def test_delete_book_with_another_users_engagement_returns_409_and_preserves_both(
    client: TestClient,
    owner_db: Session,
) -> None:
    book = _create_bare_book(client)
    book_id = uuid.UUID(book["id"])
    # The request-scoped client cannot create the other user's RLS-hidden row.
    other_user = User(email="user-y@example.com")
    owner_db.add(other_user)
    owner_db.flush()
    owner_db.add(
        Engagement(
            book_id=book_id,
            user_id=other_user.id,
            status=ReadingStatus.tbr,
            tbr_added_on=datetime.date(2026, 1, 1),
        )
    )
    owner_db.commit()

    response = client.delete(f"/api/books/{book['id']}")

    assert response.status_code == 409
    assert owner_db.get(Book, book_id) is not None
    surviving_engagements = (
        owner_db.execute(select(Engagement).where(Engagement.book_id == book_id))
        .scalars()
        .all()
    )
    assert len(surviving_engagements) == 1


def test_delete_unknown_book_returns_404(client: TestClient) -> None:
    response = client.delete(f"/api/books/{uuid.uuid4()}")

    assert response.status_code == 404
