from __future__ import annotations

import uuid

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.author import Author
from tests.conftest import owner_engine
from tests.helpers import _create_book, _fake_volume, _patch_google


def test_create_book_returns_created(client: TestClient) -> None:
    response = client.post(
        "/api/books",
        json={"title": "A Desolation Called Peace", "author": "Arkady Martine"},
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
    assert data["default_page_count"] is None
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
    assert first.status_code == 201
    second = client.post(
        "/api/books",
        json={"title": "A Desolation Called Peace", "author": "Arkady Martine"},
    )
    assert second.status_code == 201

    with Session(owner_engine) as db:
        authors = db.execute(select(Author)).scalars().all()
    assert len(authors) == 1


def test_list_books_returns_all(client: TestClient) -> None:
    first = client.post(
        "/api/books",
        json={"title": "A Memory Called Empire", "author": "Arkady Martine"},
    )
    assert first.status_code == 201
    second = client.post(
        "/api/books", json={"title": "Piranesi", "author": "Susanna Clarke"}
    )
    assert second.status_code == 201

    response = client.get("/api/books")

    assert response.status_code == 200
    assert {book["title"] for book in response.json()} == {
        "A Memory Called Empire",
        "Piranesi",
    }


def test_list_books_empty(client: TestClient) -> None:
    response = client.get("/api/books")

    assert response.status_code == 200
    assert response.json() == []


def test_get_book_returns_detail(client: TestClient) -> None:
    book = _create_book(client, title="Piranesi", author="Susanna Clarke")

    response = client.get(f"/api/books/{book['id']}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == book["id"]
    assert data["title"] == "Piranesi"
    assert [author["name"] for author in data["authors"]] == ["Susanna Clarke"]


def test_get_book_returns_stored_date_precision(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json=_fake_volume(published_date="2020-09"))

    _patch_google(monkeypatch, handler)
    import_response = client.post(
        "/api/books/import", json={"google_books_id": "abc123"}
    )
    assert import_response.status_code == 201
    book = import_response.json()

    response = client.get(f"/api/books/{book['id']}")

    assert response.status_code == 200
    data = response.json()
    assert data["publication_date"] == "2020-09-01"
    assert data["publication_date_precision"] == "month"


def test_get_book_unknown_id_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/books/{uuid.uuid4()}")

    assert response.status_code == 404
