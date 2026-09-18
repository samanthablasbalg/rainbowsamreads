from __future__ import annotations

import uuid

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.edition import Edition
from app.models.enums import Format
from tests.helpers import (
    _create_bare_book,
    _create_edition,
    _fake_volume,
    _patch_google,
)

# --- Edition CRUD ---


def test_create_edition_returns_201(client: TestClient) -> None:
    book = _create_bare_book(client)
    response = client.post(
        "/api/editions",
        json={
            "book_id": book["id"],
            "format": "print",
            "isbn": "9781526622426",
            "length": 272,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["book_id"] == book["id"]
    assert data["format"] == "print"
    assert data["isbn"] == "9781526622426"
    assert data["length"] == 272
    assert data["cover_url"] is None
    assert "id" in data
    assert "created_at" in data


def test_create_audio_edition_persists_length(client: TestClient) -> None:
    book = _create_bare_book(client)
    response = client.post(
        "/api/editions",
        json={"book_id": book["id"], "format": "audio", "length": 480},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["length"] == 480


def test_create_edition_unknown_book_returns_404(client: TestClient) -> None:
    response = client.post(
        "/api/editions",
        json={"book_id": str(uuid.uuid4()), "format": "print"},
    )
    assert response.status_code == 404


def test_get_edition_returns_200(client: TestClient) -> None:
    book = _create_bare_book(client)
    edition = _create_edition(client, book["id"], format="print", isbn="9781526622426")

    response = client.get(f"/api/editions/{edition['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == edition["id"]


def test_get_edition_unknown_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/editions/{uuid.uuid4()}")
    assert response.status_code == 404


def test_update_edition_patches_only_sent_fields(client: TestClient) -> None:
    book = _create_bare_book(client)
    edition = _create_edition(
        client, book["id"], isbn="9781526622426", format="print", length=272
    )

    response = client.patch(
        f"/api/editions/{edition['id']}",
        json={"length": 300},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["length"] == 300
    assert data["isbn"] == "9781526622426"


def test_update_edition_empty_body_changes_nothing(client: TestClient) -> None:
    book = _create_bare_book(client)
    edition = _create_edition(
        client, book["id"], isbn="9781526622426", format="print", length=272
    )

    response = client.patch(f"/api/editions/{edition['id']}", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["isbn"] == "9781526622426"
    assert data["length"] == 272


def test_update_edition_can_clear_isbn(client: TestClient) -> None:
    book = _create_bare_book(client)
    edition = _create_edition(client, book["id"], format="print", isbn="9781526622426")

    response = client.patch(f"/api/editions/{edition['id']}", json={"isbn": None})
    assert response.status_code == 200
    assert response.json()["isbn"] is None


def test_update_edition_unknown_returns_404(client: TestClient) -> None:
    response = client.patch(f"/api/editions/{uuid.uuid4()}", json={"length": 100})
    assert response.status_code == 404


# --- Import seeds edition ---


def test_import_creates_print_edition_with_real_data(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    db: Session,
) -> None:
    volume = _fake_volume(
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
    ed = next(e for e in editions if e.format == Format.print)
    assert ed.isbn == "9781526622426"
    assert ed.length == 272
    assert ed.cover_url == "https://example.com/cover.jpg"


def test_import_creates_edition_with_null_isbn_when_no_identifiers(
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
    assert len(editions) == 3
    print_ed = next(e for e in editions if e.format == Format.print)
    assert print_ed.isbn is None
