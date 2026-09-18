from __future__ import annotations

import uuid

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.author import Author
from app.models.book import Book
from app.models.edition import Edition
from app.models.enums import Format
from tests.conftest import owner_engine
from tests.helpers import (
    _create_book,
    _fake_volume,
    _patch_google,
)


def test_import_book_returns_201(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    volume = _fake_volume(authors=["Susanna Clarke"], categories=["Fantasy"])

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json=volume)

    _patch_google(monkeypatch, handler)

    response = client.post("/api/books/import", json={"google_books_id": "abc123"})
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Piranesi"
    assert data["google_books_id"] == "abc123"
    assert data["default_cover_url"] == "https://example.com/cover.jpg"
    assert data["default_page_count"] == 272
    # Google only reports the edition's language, so nothing is claimed about the work.
    assert data["original_language"] is None
    assert data["genres"] == ["Fantasy"]
    assert data["publication_date"] == "2020-09-15"
    assert len(data["authors"]) == 1
    assert data["authors"][0]["name"] == "Susanna Clarke"


def test_import_already_in_catalog_returns_200_no_duplicate(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    volume = _fake_volume(authors=["Susanna Clarke"], categories=["Fantasy"])

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json=volume)

    _patch_google(monkeypatch, handler)

    first = client.post("/api/books/import", json={"google_books_id": "abc123"})
    assert first.status_code == 201

    second = client.post("/api/books/import", json={"google_books_id": "abc123"})
    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]

    with Session(owner_engine) as db:
        books = db.execute(select(Book)).scalars().all()
    assert len(books) == 1


def test_import_date_precision_day(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json=_fake_volume(published_date="2020-09-15"))

    _patch_google(monkeypatch, handler)

    data = client.post("/api/books/import", json={"google_books_id": "abc123"}).json()
    assert data["publication_date"] == "2020-09-15"
    assert data["publication_date_precision"] == "day"


def test_import_date_precision_month(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json=_fake_volume(published_date="2020-09"))

    _patch_google(monkeypatch, handler)

    data = client.post("/api/books/import", json={"google_books_id": "abc123"}).json()
    assert data["publication_date"] == "2020-09-01"
    assert data["publication_date_precision"] == "month"


def test_import_date_precision_year(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json=_fake_volume(published_date="2020"))

    _patch_google(monkeypatch, handler)

    data = client.post("/api/books/import", json={"google_books_id": "abc123"}).json()
    assert data["publication_date"] == "2020-01-01"
    assert data["publication_date_precision"] == "year"


def test_import_unknown_id_returns_404(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(404)

    _patch_google(monkeypatch, handler)

    response = client.post(
        "/api/books/import", json={"google_books_id": "doesnotexist"}
    )
    assert response.status_code == 404


def test_import_reuses_existing_author(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        volume_id = request.url.path.split("/")[-1]
        return httpx2.Response(
            200,
            json=_fake_volume(
                id=volume_id,
                title="Book A" if volume_id == "id1" else "Book B",
                authors=["Susanna Clarke"],
            ),
        )

    _patch_google(monkeypatch, handler)

    client.post("/api/books/import", json={"google_books_id": "id1"})
    client.post("/api/books/import", json={"google_books_id": "id2"})

    with Session(owner_engine) as db:
        authors = db.execute(select(Author)).scalars().all()
    assert len(authors) == 1


def test_import_seeds_three_editions(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, db: Session
) -> None:
    volume = _fake_volume(
        authors=["Susanna Clarke"],
        page_count=272,
        cover_url="https://example.com/cover.jpg",
    )

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json=volume)

    _patch_google(monkeypatch, handler)

    response = client.post("/api/books/import", json={"google_books_id": "abc123"})
    assert response.status_code == 201
    book_id = uuid.UUID(response.json()["id"])

    editions = (
        db.execute(select(Edition).where(Edition.book_id == book_id)).scalars().all()
    )
    assert len(editions) == 3

    by_format = {e.format: e for e in editions}
    assert set(by_format.keys()) == {Format.print, Format.digital, Format.audio}

    print_ed = by_format[Format.print]
    assert print_ed.length == 272
    assert print_ed.cover_url == "https://example.com/cover.jpg"

    digital_ed = by_format[Format.digital]
    assert digital_ed.length == 272
    assert digital_ed.cover_url == "https://example.com/cover.jpg"
    assert digital_ed.isbn is None

    audio_ed = by_format[Format.audio]
    assert audio_ed.length is None
    assert audio_ed.cover_url == "https://example.com/cover.jpg"
    assert audio_ed.isbn is None


def test_import_stores_publisher_and_plain_text_description(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, db: Session
) -> None:
    volume = _fake_volume(
        publisher="Bloomsbury",
        description=(
            "<p>A <b>house</b> that is<br>the whole world. &amp; more</p>"
            "<p>A second paragraph.</p>"
        ),
    )

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json=volume)

    _patch_google(monkeypatch, handler)

    response = client.post("/api/books/import", json={"google_books_id": "abc123"})
    assert response.status_code == 201
    book_id = uuid.UUID(response.json()["id"])

    # The description is about the work, so it lands on the book, stripped to text.
    book = db.get(Book, book_id)
    assert book is not None
    assert book.description == (
        "A house that is\nthe whole world. & more\n\nA second paragraph."
    )

    editions = (
        db.execute(select(Edition).where(Edition.book_id == book_id)).scalars().all()
    )
    by_format = {e.format: e for e in editions}

    # Publisher is an edition-level fact, so it lands on the real print edition and
    # nowhere else -- the synthetic siblings make no claim about who published them.
    assert by_format[Format.print].publisher == "Bloomsbury"
    assert by_format[Format.digital].publisher is None
    assert by_format[Format.audio].publisher is None


def test_import_upstream_failure_returns_502(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(500)

    _patch_google(monkeypatch, handler)

    response = client.post("/api/books/import", json={"google_books_id": "abc123"})
    assert response.status_code == 502


def test_import_missing_optional_fields(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(
            200,
            json=_fake_volume(
                authors=None,
                page_count=None,
                cover_url=None,
                categories=None,
            ),
        )

    _patch_google(monkeypatch, handler)

    response = client.post("/api/books/import", json={"google_books_id": "abc123"})
    assert response.status_code == 201
    data = response.json()
    assert data["authors"] == []
    assert data["default_page_count"] is None
    assert data["default_cover_url"] is None
    assert data["genres"] == []


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
    client.post(
        "/api/books",
        json={"title": "A Memory Called Empire", "author": "Arkady Martine"},
    )
    client.post(
        "/api/books",
        json={"title": "A Desolation Called Peace", "author": "Arkady Martine"},
    )

    with Session(owner_engine) as db:
        authors = db.execute(select(Author)).scalars().all()
    assert len(authors) == 1


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
