from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from tests.helpers import (
    MINUTES,
    PAGES,
    Ruler,
    _create_bare_book,
    _create_book,
    _create_edition,
    _create_engagement,
)


@pytest.mark.parametrize(
    "ruler, other_ruler",
    [
        pytest.param(PAGES, MINUTES, id="pages"),
        pytest.param(MINUTES, PAGES, id="audio"),
    ],
)
def test_get_engagement_reports_override_without_unbound_book_default(
    client: TestClient,
    ruler: Ruler,
    other_ruler: Ruler,
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format=ruler.edition_format, length=1100)
    _create_edition(client, book["id"], format=other_ruler.edition_format)
    other_response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": other_ruler.edition_format,
            "edition_length": 600,
        },
    )
    assert other_response.status_code == 201
    book_response = client.get(f"/api/books/{book['id']}")
    assert book_response.status_code == 200
    assert book_response.json()[other_ruler.book_length_field] == 600

    engagement_response = client.post(
        "/api/engagements",
        json={
            "book_id": book["id"],
            "edition_format": ruler.edition_format,
            "length_override": 1000,
        },
    )
    assert engagement_response.status_code == 201
    engagement_id = engagement_response.json()["id"]

    response = client.get(f"/api/engagements/{engagement_id}")

    assert response.status_code == 200
    data = response.json()
    assert data[ruler.length_field] == 1000
    assert data[ruler.other_length_field] is None


def test_get_engagement_returns_engagement_with_book(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.get(f"/api/engagements/{engagement['id']}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == engagement["id"]
    assert data["status"] == "reading"
    assert data["book"]["title"] == "Piranesi"


def test_get_engagement_unknown_id_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/engagements/{uuid.uuid4()}")
    assert response.status_code == 404
