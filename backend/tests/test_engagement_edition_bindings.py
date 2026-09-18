from __future__ import annotations

import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.helpers import (
    MINUTES,
    PAGES,
    RULERS,
    Ruler,
    _create_bare_book,
    _create_book,
    _create_edition,
    _create_engagement,
)


def test_create_binding_by_edition_id_returns_201(client: TestClient) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print", length=300)
    edition = _create_edition(
        client,
        book["id"],
        format="digital",
        length=250,
        isbn="9781234567890",
    )
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": edition["id"]},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["edition"]["id"] == edition["id"]
    assert data["edition"]["format"] == "digital"
    assert data["origin_id"] is None
    assert data["length_override"] is None


def test_create_binding_carries_length_override(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_format": "audio", "length_override": 650},
    )

    assert response.status_code == 201
    assert response.json()["length_override"] == 650


@pytest.mark.parametrize(
    ("source_ruler", "added_ruler"),
    [
        pytest.param(PAGES, MINUTES, id="audio"),
        pytest.param(MINUTES, PAGES, id="pages"),
    ],
)
def test_create_binding_captures_missing_edition_length(
    client: TestClient,
    source_ruler: Ruler,
    added_ruler: Ruler,
) -> None:
    book = _create_bare_book(client)
    _create_edition(
        client,
        book["id"],
        format=source_ruler.edition_format,
        length=300,
    )
    added_edition = _create_edition(
        client,
        book["id"],
        format=added_ruler.edition_format,
    )
    engagement = _create_engagement(
        client,
        book["id"],
        edition_format=source_ruler.edition_format,
    )

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": added_edition["id"], "edition_length": 430},
    )

    assert response.status_code == 201
    assert response.json()["edition"]["length"] == 430
    book_response = client.get(f"/api/books/{book['id']}")
    assert book_response.status_code == 200
    assert book_response.json()[added_ruler.book_length_field] == 430


@pytest.mark.parametrize(
    ("source_ruler", "added_ruler"),
    [
        pytest.param(PAGES, MINUTES, id="audio"),
        pytest.param(MINUTES, PAGES, id="pages"),
    ],
)
def test_create_binding_by_format_finds_existing_edition(
    client: TestClient,
    source_ruler: Ruler,
    added_ruler: Ruler,
) -> None:
    book = _create_bare_book(client)
    _create_edition(
        client,
        book["id"],
        format=source_ruler.edition_format,
        length=300,
    )
    added_edition = _create_edition(
        client,
        book["id"],
        format=added_ruler.edition_format,
        length=600,
    )
    engagement = _create_engagement(
        client,
        book["id"],
        edition_format=source_ruler.edition_format,
    )

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_format": added_ruler.edition_format},
    )

    assert response.status_code == 201
    assert response.json()["edition"]["id"] == added_edition["id"]


def test_create_binding_by_format_with_no_edition_returns_404(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="print", length=300)
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_format": "audio"},
    )

    assert response.status_code == 404


def test_create_binding_by_format_with_multiple_editions_returns_409(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="audio", length=600)
    _create_edition(
        client,
        book["id"],
        format="print",
        length=300,
        isbn="9781111111111",
    )
    _create_edition(
        client,
        book["id"],
        format="print",
        length=350,
        isbn="9782222222222",
    )
    engagement = _create_engagement(client, book["id"], edition_format="audio")

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_format": "print"},
    )

    assert response.status_code == 409


def test_create_duplicate_binding_returns_409(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_format": "print"},
    )

    assert response.status_code == 409


def test_create_binding_unknown_engagement_returns_404(client: TestClient) -> None:
    book = _create_bare_book(client)
    edition = _create_edition(client, book["id"], format="print", length=300)

    response = client.post(
        f"/api/engagements/{uuid.uuid4()}/editions",
        json={"edition_id": edition["id"]},
    )

    assert response.status_code == 404


def test_create_binding_unknown_edition_returns_404(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": str(uuid.uuid4())},
    )

    assert response.status_code == 404


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({}, id="neither"),
        pytest.param(
            {"edition_id": "edition-id", "edition_format": "audio"},
            id="both",
        ),
    ],
)
def test_create_binding_requires_exactly_one_resolver(
    client: TestClient,
    payload: dict[str, Any],
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    if "edition_id" in payload:
        payload = {**payload, "edition_id": str(uuid.uuid4())}

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json=payload,
    )

    assert response.status_code == 422


@pytest.mark.parametrize("ruler", RULERS)
def test_create_lengthless_binding_for_tbr_succeeds(
    client: TestClient,
    ruler: Ruler,
) -> None:
    book = _create_bare_book(client)
    edition = _create_edition(client, book["id"], format=ruler.edition_format)
    engagement = _create_engagement(
        client,
        book["id"],
        edition_format=None,
        status="tbr",
    )

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": edition["id"]},
    )

    assert response.status_code == 201


@pytest.mark.parametrize("status", ["finished", "dnf"])
def test_create_binding_for_completed_engagement_returns_422(
    client: TestClient,
    status: str,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], status=status)

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_format": "audio"},
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("source_ruler", "added_ruler"),
    [
        pytest.param(PAGES, MINUTES, id="audio"),
        pytest.param(MINUTES, PAGES, id="pages"),
    ],
)
def test_create_lengthless_binding_for_reading_engagement_returns_422(
    client: TestClient,
    source_ruler: Ruler,
    added_ruler: Ruler,
) -> None:
    book = _create_bare_book(client)
    _create_edition(
        client,
        book["id"],
        format=source_ruler.edition_format,
        length=300,
    )
    added_edition = _create_edition(
        client,
        book["id"],
        format=added_ruler.edition_format,
    )
    engagement = _create_engagement(
        client,
        book["id"],
        edition_format=source_ruler.edition_format,
    )

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": added_edition["id"]},
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    (
        "source_ruler",
        "source_length",
        "source_position",
        "added_ruler",
        "added_length",
        "expected_added_position",
    ),
    [
        pytest.param(PAGES, 440, 220, MINUTES, 430, 215, id="print-to-audio"),
        pytest.param(MINUTES, 430, 215, PAGES, 440, 220, id="audio-to-print"),
    ],
)
def test_create_binding_projects_existing_progress_onto_added_format(
    client: TestClient,
    source_ruler: Ruler,
    source_length: int,
    source_position: int,
    added_ruler: Ruler,
    added_length: int,
    expected_added_position: int,
) -> None:
    book = _create_bare_book(client)
    _create_edition(
        client,
        book["id"],
        format=source_ruler.edition_format,
        length=source_length,
    )
    added_edition = _create_edition(
        client,
        book["id"],
        format=added_ruler.edition_format,
        length=added_length,
    )
    engagement = _create_engagement(
        client, book["id"], edition_format=source_ruler.edition_format
    )
    source_ruler.log_progress(client, engagement["id"], source_position)

    response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": added_edition["id"]},
    )

    assert response.status_code == 201
    engagement_response = client.get(f"/api/engagements/{engagement['id']}")
    assert engagement_response.status_code == 200
    data = engagement_response.json()
    assert data["completion_pct"] == 50
    assert data["resume_unit"] == source_ruler.unit
    assert data[source_ruler.resume_field] == source_position
    assert data[added_ruler.resume_field] == expected_added_position


def test_list_bindings_returns_all_bound_editions(client: TestClient) -> None:
    book = _create_bare_book(client)
    print_edition = _create_edition(client, book["id"], format="print", length=300)
    audio_edition = _create_edition(client, book["id"], format="audio", length=600)
    engagement = _create_engagement(client, book["id"])
    bind_response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_id": audio_edition["id"]},
    )
    assert bind_response.status_code == 201

    response = client.get(f"/api/engagements/{engagement['id']}/editions")

    assert response.status_code == 200
    assert {item["edition"]["id"] for item in response.json()} == {
        print_edition["id"],
        audio_edition["id"],
    }


def test_list_bindings_unknown_engagement_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/engagements/{uuid.uuid4()}/editions")

    assert response.status_code == 404


def test_delete_binding_returns_204_and_removes_it(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    create_response = client.post(
        f"/api/engagements/{engagement['id']}/editions",
        json={"edition_format": "audio"},
    )
    assert create_response.status_code == 201
    edition_id = create_response.json()["edition"]["id"]

    response = client.delete(
        f"/api/engagements/{engagement['id']}/editions/{edition_id}"
    )

    assert response.status_code == 204
    list_response = client.get(f"/api/engagements/{engagement['id']}/editions")
    assert list_response.status_code == 200
    assert all(item["edition"]["id"] != edition_id for item in list_response.json())


def test_delete_unknown_binding_returns_404(client: TestClient) -> None:
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

    response = client.delete(
        f"/api/engagements/{engagement['id']}/editions/{edition['id']}"
    )

    assert response.status_code == 404
