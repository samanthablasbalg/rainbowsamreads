from __future__ import annotations

import uuid

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.book import Book
from app.models.edition import Edition
from app.models.enums import Format
from tests.helpers import (
    _create_bare_book,
    _create_edition,
    _create_engagement,
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


# --- Bindings: create ---


def test_create_binding_by_edition_id_returns_201(client: TestClient) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print", length=300)
    edition = _create_edition(
        client,
        book["id"],
        format="digital",
        isbn="9781526622426",
        length=250,
    )
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": edition["id"]},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["edition"]["id"] == edition["id"]
    assert data["origin_id"] is None
    assert data["length_override"] is None


def test_create_binding_carries_length_override(client: TestClient) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print", length=400)
    edition = _create_edition(
        client, book["id"], format="digital", isbn="9781526622426"
    )
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": edition["id"], "length_override": 300},
    )
    assert response.status_code == 201
    assert response.json()["length_override"] == 300


def test_create_binding_captures_a_first_audio_length(
    client: TestClient, db: Session
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print", length=300)
    _create_edition(client, book["id"], format="audio")
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_format": "audio", "edition_length": 430},
    )
    assert response.status_code == 201
    assert response.json()["edition"]["length"] == 430

    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    assert book_obj.default_audio_minutes == 430


def test_create_binding_captures_a_first_page_length(
    client: TestClient, db: Session
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="audio", length=600)
    _create_edition(client, book["id"], format="print")
    engagement = _create_engagement(client, book["id"], edition_format="audio")

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_format": "print", "edition_length": 430},
    )

    assert response.status_code == 201
    assert response.json()["edition"]["length"] == 430

    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    assert book_obj.default_page_count == 430


def test_create_binding_by_format_finds_existing_edition(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="audio", length=600)
    edition = _create_edition(
        client, book["id"], format="print", isbn="9781526622426", length=300
    )
    engagement = _create_engagement(client, book["id"], edition_format="audio")

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_format": "print"},
    )
    assert response.status_code == 201
    assert response.json()["edition"]["id"] == edition["id"]


def test_create_binding_by_format_no_edition_returns_404(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="audio", length=600)
    engagement = _create_engagement(client, book["id"], edition_format="audio")

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_format": "print"},
    )
    assert response.status_code == 404


def test_create_binding_by_format_multiple_editions_returns_409(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print", isbn="9781111111111")
    _create_edition(client, book["id"], format="print", isbn="9782222222222")
    _create_edition(client, book["id"], format="audio", length=600)
    engagement = _create_engagement(client, book["id"], edition_format="audio")

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_format": "print"},
    )
    assert response.status_code == 409


def test_create_binding_duplicate_returns_409(client: TestClient) -> None:
    book = _create_bare_book(client)
    edition = _create_edition(
        client, book["id"], format="print", isbn="9781526622426", length=300
    )
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": edition["id"]},
    )
    assert response.status_code == 409


def test_create_binding_unknown_engagement_returns_404(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)
    edition = _create_edition(client, book["id"], format="print", isbn="9781526622426")

    response = client.post(
        f"/api/engagements/{uuid.uuid4()}/editions",
        json={"edition_id": edition["id"]},
    )
    assert response.status_code == 404


def test_create_binding_unknown_edition_id_returns_404(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print", length=300)
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": str(uuid.uuid4())},
    )
    assert response.status_code == 404


def test_create_binding_both_resolvers_returns_422(client: TestClient) -> None:
    book = _create_bare_book(client)
    edition = _create_edition(
        client, book["id"], format="print", isbn="9781526622426", length=300
    )
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": edition["id"], "edition_format": "print"},
    )
    assert response.status_code == 422


def test_create_binding_no_resolver_returns_422(client: TestClient) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print", length=300)
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={},
    )
    assert response.status_code == 422


# --- Bindings: list ---


def test_list_bindings_returns_correct_editions(client: TestClient) -> None:
    book = _create_bare_book(client)
    print_ed = _create_edition(
        client, book["id"], format="print", isbn="9781111111111", length=300
    )
    digital_ed = _create_edition(
        client,
        book["id"],
        format="digital",
        isbn="9782222222222",
        length=250,
    )
    engagement = _create_engagement(client, book["id"])
    client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": digital_ed["id"]},
    )

    response = client.get(f"/api/engagements/{engagement['id']}/editions")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    ids = {item["edition"]["id"] for item in data}
    assert ids == {print_ed["id"], digital_ed["id"]}


def test_new_engagement_starts_with_chosen_format_bound(client: TestClient) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print")
    response = client.post(
        "/api/engagements",
        json={"book_id": book["id"], "edition_format": "print", "edition_length": 300},
    )
    assert response.status_code == 201
    engagement = response.json()

    bindings = client.get(f"/api/engagements/{engagement['id']}/editions").json()
    assert len(bindings) == 1
    assert bindings[0]["edition"]["format"] == "print"


def test_list_bindings_unknown_engagement_returns_404(
    client: TestClient,
) -> None:
    response = client.get(f"/api/engagements/{uuid.uuid4()}/editions")
    assert response.status_code == 404


# --- Bindings: delete ---


def test_delete_binding_returns_204(client: TestClient) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print", length=300)
    edition = _create_edition(
        client,
        book["id"],
        format="digital",
        isbn="9781526622426",
        length=250,
    )
    engagement = _create_engagement(client, book["id"])
    client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": edition["id"]},
    )

    response = client.delete(
        f"/api/engagements/{engagement['id']}/editions/{edition['id']}"
    )
    assert response.status_code == 204


def test_delete_binding_removes_it_from_list(client: TestClient) -> None:
    book = _create_bare_book(client)
    print_ed = _create_edition(client, book["id"], format="print", length=300)
    edition = _create_edition(
        client,
        book["id"],
        format="digital",
        isbn="9781526622426",
        length=250,
    )
    engagement = _create_engagement(client, book["id"])
    client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": edition["id"]},
    )
    client.delete(f"/api/engagements/{engagement['id']}/editions/{edition['id']}")

    response = client.get(f"/api/engagements/{engagement['id']}/editions")
    assert [item["edition"]["id"] for item in response.json()] == [print_ed["id"]]


def test_delete_binding_unknown_returns_404(client: TestClient) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print", length=300)
    edition = _create_edition(
        client, book["id"], format="digital", isbn="9781526622426", length=250
    )
    engagement = _create_engagement(client, book["id"])

    response = client.delete(
        f"/api/engagements/{engagement['id']}/editions/{edition['id']}"
    )
    assert response.status_code == 404


# --- Multiple bindings per engagement ---


def test_multiple_bindings_per_engagement(client: TestClient) -> None:
    book = _create_bare_book(client)
    print_ed = _create_edition(
        client, book["id"], format="print", isbn="9781111111111", length=300
    )
    digital_ed = _create_edition(
        client,
        book["id"],
        format="digital",
        isbn="9782222222222",
        length=250,
    )
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": digital_ed["id"]},
    )
    assert response.status_code == 201
    assert response.json()["length_override"] is None

    bindings = client.get(f"/api/engagements/{engagement['id']}/editions").json()
    assert len(bindings) == 2
    assert {item["edition"]["id"] for item in bindings} == {
        print_ed["id"],
        digital_ed["id"],
    }


def test_add_lengthless_format_to_reading_engagement_returns_422(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)
    _create_edition(
        client, book["id"], format="print", isbn="9781111111111", length=300
    )
    _create_edition(client, book["id"], format="audio")
    engagement = _create_engagement(client, book["id"], edition_format="print")

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_format": "audio"},
    )
    assert response.status_code == 422
