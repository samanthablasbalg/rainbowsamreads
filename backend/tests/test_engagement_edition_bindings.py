from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.helpers import (
    MINUTES,
    PAGES,
    Ruler,
    _create_bare_book,
    _create_edition,
    _create_engagement,
)


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
