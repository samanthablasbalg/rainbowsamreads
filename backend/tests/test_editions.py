from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from tests.helpers import (
    _create_bare_book,
    _create_edition,
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
