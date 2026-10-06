from __future__ import annotations

import datetime
import uuid

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.orm import Session

from app.models.engagement import Engagement
from app.models.enums import ReadingStatus
from app.models.user import User
from tests.conftest import app_engine
from tests.helpers import _create_book, _create_engagement, _fake_volume, _patch_google


@pytest.mark.parametrize(
    ("extra_fields", "expected_page_count"),
    [
        pytest.param({}, None, id="without-page-count"),
        pytest.param({"page_count": 440}, 440, id="with-page-count"),
    ],
)
def test_create_book_returns_created_with_optional_page_count(
    client: TestClient,
    extra_fields: dict[str, int],
    expected_page_count: int | None,
) -> None:
    response = client.post(
        "/api/books",
        json={
            "title": "A Desolation Called Peace",
            "author": "Arkady Martine",
            **extra_fields,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "A Desolation Called Peace"
    assert len(data["authors"]) == 1
    assert data["authors"][0]["name"] == "Arkady Martine"
    assert "id" in data
    assert "created_at" in data
    assert data["google_books_id"] is None
    assert data["default_cover_url"] is None
    assert data["default_page_count"] == expected_page_count
    assert data["original_language"] is None
    assert data["genres"] == []
    assert data["publication_date"] is None


@pytest.mark.parametrize(
    "title,author",
    [
        ("", "Arkady Martine"),
        ("   ", "Arkady Martine"),
        ("A Memory Called Empire", ""),
        ("A Memory Called Empire", "   "),
    ],
)
def test_create_book_rejects_blank_fields(
    client: TestClient, title: str, author: str
) -> None:
    response = client.post("/api/books", json={"title": title, "author": author})
    assert response.status_code == 422


def test_create_book_reuses_existing_author(client: TestClient) -> None:
    first = client.post(
        "/api/books",
        json={"title": "A Memory Called Empire", "author": "Arkady Martine"},
    )
    second = client.post(
        "/api/books",
        json={"title": "A Desolation Called Peace", "author": "Arkady Martine"},
    )

    first_author = first.json()["authors"][0]
    second_author = second.json()["authors"][0]
    assert first_author["id"] == second_author["id"]


def test_list_books_returns_all(client: TestClient) -> None:
    client.post(
        "/api/books",
        json={"title": "A Memory Called Empire", "author": "Arkady Martine"},
    )
    client.post("/api/books", json={"title": "Piranesi", "author": "Susanna Clarke"})

    response = client.get("/api/books")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    titles = {book["title"] for book in data}
    assert titles == {"A Memory Called Empire", "Piranesi"}
    assert all(book["engagement"] is None for book in data)


def test_list_books_empty(client: TestClient) -> None:
    response = client.get("/api/books")
    assert response.status_code == 200
    assert response.json() == []


def test_list_books_returns_open_engagement_over_more_recent_ended_engagement(
    client: TestClient, owner_db: Session
) -> None:
    book = _create_book(client)
    ended = _create_engagement(client, book["id"], status="finished")
    open_engagement = _create_engagement(client, book["id"], status="tbr")
    ended_row = owner_db.get(Engagement, uuid.UUID(ended["id"]))
    assert ended_row is not None
    ended_row.updated_at = datetime.datetime.now(datetime.UTC)
    owner_db.commit()

    response = client.get("/api/books")

    assert response.status_code == 200
    [catalog_book] = response.json()
    assert catalog_book["engagement"] == {
        "id": open_engagement["id"],
        "status": "tbr",
        "formats": ["print"],
        "cover_url": None,
    }


def test_list_books_returns_most_recently_updated_ended_engagement(
    client: TestClient, owner_db: Session
) -> None:
    book = _create_book(client)
    older = _create_engagement(client, book["id"], status="finished")
    newer = _create_engagement(client, book["id"], status="dnf")
    older_row = owner_db.get(Engagement, uuid.UUID(older["id"]))
    newer_row = owner_db.get(Engagement, uuid.UUID(newer["id"]))
    assert older_row is not None
    assert newer_row is not None
    older_row.updated_at = datetime.datetime(2026, 1, 1, tzinfo=datetime.UTC)
    newer_row.updated_at = datetime.datetime(2026, 2, 1, tzinfo=datetime.UTC)
    owner_db.commit()

    response = client.get("/api/books")

    assert response.status_code == 200
    [catalog_book] = response.json()
    assert catalog_book["engagement"]["id"] == newer["id"]


def test_list_books_excludes_another_users_engagement(
    client: TestClient, owner_db: Session
) -> None:
    book = _create_book(client)
    other_user = User(email="another-reader@example.com")
    owner_db.add(other_user)
    owner_db.flush()
    owner_db.add(
        Engagement(
            book_id=uuid.UUID(book["id"]),
            user_id=other_user.id,
            status=ReadingStatus.reading,
        )
    )
    owner_db.commit()

    response = client.get("/api/books")

    assert response.status_code == 200
    [catalog_book] = response.json()
    assert catalog_book["engagement"] is None


def test_list_books_query_count_is_constant_as_catalog_grows(
    client: TestClient,
) -> None:
    def get_books_with_statement_count() -> tuple[int, int]:
        statement_count = 0

        def count_statement(*_: object) -> None:
            nonlocal statement_count
            statement_count += 1

        event.listen(app_engine, "before_cursor_execute", count_statement)
        try:
            response = client.get("/api/books")
        finally:
            event.remove(app_engine, "before_cursor_execute", count_statement)
        return response.status_code, statement_count

    first = _create_book(client, title="Piranesi")
    _create_engagement(client, first["id"], status="finished")
    first_status, first_count = get_books_with_statement_count()

    for title in ("Babel", "Yellowface", "Katabasis"):
        book = _create_book(client, title=title)
        _create_engagement(client, book["id"], status="finished")
    larger_status, larger_count = get_books_with_statement_count()

    assert first_status == 200
    assert larger_status == 200
    assert larger_count == first_count


# --- Get book ---


def test_get_book_returns_detail(client: TestClient) -> None:
    book = _create_book(client, title="Piranesi", author="Susanna Clarke")

    response = client.get(f"/api/books/{book['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == book["id"]
    assert data["title"] == "Piranesi"
    assert [author["name"] for author in data["authors"]] == ["Susanna Clarke"]


def test_get_book_returns_stored_date_precision(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json=_fake_volume(published_date="2020-09"))

    _patch_google(monkeypatch, handler)
    book = client.post("/api/books/import", json={"google_books_id": "abc123"}).json()

    data = client.get(f"/api/books/{book['id']}").json()
    assert data["publication_date"] == "2020-09-01"
    assert data["publication_date_precision"] == "month"


def test_get_book_unknown_id_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/books/{uuid.uuid4()}")
    assert response.status_code == 404
