from __future__ import annotations

import uuid

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.author import Author
from app.models.edition import Edition
from app.models.enums import Format
from tests.helpers import _fake_volume, _patch_google


def test_import_returns_201_with_google_book_fields(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
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
    # Google reports the edition's language, not the work's original language.
    assert data["original_language"] is None
    assert data["genres"] == ["Fantasy"]
    assert data["publication_date"] == "2020-09-15"
    assert [author["name"] for author in data["authors"]] == ["Susanna Clarke"]


def test_import_existing_google_books_id_returns_200_without_duplicate(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    volume = _fake_volume(authors=["Susanna Clarke"], categories=["Fantasy"])
    google_requests = {"count": 0}

    def handler(request: httpx2.Request) -> httpx2.Response:
        google_requests["count"] += 1
        return httpx2.Response(200, json=volume)

    _patch_google(monkeypatch, handler)

    first = client.post("/api/books/import", json={"google_books_id": "abc123"})
    assert first.status_code == 201
    second = client.post("/api/books/import", json={"google_books_id": "abc123"})

    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]
    assert google_requests["count"] == 1
    list_response = client.get("/api/books")
    assert list_response.status_code == 200
    assert [book["id"] for book in list_response.json()] == [first.json()["id"]]


@pytest.mark.parametrize(
    ("published_date", "expected_date", "expected_precision"),
    [
        pytest.param("2020-09-15", "2020-09-15", "day", id="day"),
        pytest.param("2020-09", "2020-09-01", "month", id="month"),
        pytest.param("2020", "2020-01-01", "year", id="year"),
    ],
)
def test_import_preserves_publication_date_precision(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    published_date: str,
    expected_date: str,
    expected_precision: str,
) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(
            200,
            json=_fake_volume(published_date=published_date),
        )

    _patch_google(monkeypatch, handler)

    response = client.post("/api/books/import", json={"google_books_id": "abc123"})

    assert response.status_code == 201
    data = response.json()
    assert data["publication_date"] == expected_date
    assert data["publication_date_precision"] == expected_precision


def test_import_unknown_google_books_id_returns_404(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(404)

    _patch_google(monkeypatch, handler)

    response = client.post(
        "/api/books/import", json={"google_books_id": "doesnotexist"}
    )

    assert response.status_code == 404


def test_import_reuses_existing_author(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    db: Session,
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

    first = client.post("/api/books/import", json={"google_books_id": "id1"})
    assert first.status_code == 201
    second = client.post("/api/books/import", json={"google_books_id": "id2"})
    assert second.status_code == 201

    authors = db.execute(select(Author)).scalars().all()
    assert len(authors) == 1


def test_import_seeds_print_digital_and_audio_editions(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    db: Session,
) -> None:
    volume = _fake_volume(
        authors=["Susanna Clarke"],
        isbn_13="9781526622426",
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
    by_format = {edition.format: edition for edition in editions}
    assert set(by_format) == {Format.print, Format.digital, Format.audio}

    print_edition = by_format[Format.print]
    assert print_edition.isbn == "9781526622426"
    assert print_edition.length == 272
    assert print_edition.cover_url == "https://example.com/cover.jpg"

    digital_edition = by_format[Format.digital]
    assert digital_edition.isbn is None
    assert digital_edition.length == 272
    assert digital_edition.cover_url == "https://example.com/cover.jpg"

    audio_edition = by_format[Format.audio]
    assert audio_edition.isbn is None
    assert audio_edition.length is None
    assert audio_edition.cover_url == "https://example.com/cover.jpg"


def test_import_without_identifiers_creates_print_edition_with_null_isbn(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    db: Session,
) -> None:
    volume = _fake_volume(isbn_13=None)

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json=volume)

    _patch_google(monkeypatch, handler)

    response = client.post("/api/books/import", json={"google_books_id": "abc123"})

    assert response.status_code == 201
    book_id = uuid.UUID(response.json()["id"])
    editions = (
        db.execute(select(Edition).where(Edition.book_id == book_id)).scalars().all()
    )
    print_edition = next(
        edition for edition in editions if edition.format == Format.print
    )
    assert print_edition.isbn is None


def test_import_stores_plain_text_description_and_print_publisher(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    db: Session,
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
    data = response.json()
    assert data["description"] == (
        "A house that is\nthe whole world. & more\n\nA second paragraph."
    )

    book_id = uuid.UUID(data["id"])
    editions = (
        db.execute(select(Edition).where(Edition.book_id == book_id)).scalars().all()
    )
    by_format = {edition.format: edition for edition in editions}
    assert by_format[Format.print].publisher == "Bloomsbury"
    assert by_format[Format.digital].publisher is None
    assert by_format[Format.audio].publisher is None


def test_import_google_failure_returns_502(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.services.google_books.time.sleep", lambda _: None)

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(500)

    _patch_google(monkeypatch, handler)

    response = client.post("/api/books/import", json={"google_books_id": "abc123"})

    assert response.status_code == 502


def test_import_tolerates_missing_optional_google_fields(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(
            200,
            json=_fake_volume(
                authors=None,
                published_date=None,
                page_count=None,
                cover_url=None,
                categories=None,
                language=None,
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
    assert data["publication_date"] is None
    assert data["original_language"] is None
