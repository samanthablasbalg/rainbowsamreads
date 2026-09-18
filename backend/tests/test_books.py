from __future__ import annotations

import uuid

import httpx2
import pytest
from fastapi.testclient import TestClient

from tests.helpers import _create_book, _fake_volume, _patch_google


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


def test_list_books_empty(client: TestClient) -> None:
    response = client.get("/api/books")
    assert response.status_code == 200
    assert response.json() == []


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
