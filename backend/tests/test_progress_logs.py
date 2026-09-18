from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.book import Book
from tests.helpers import (
    MINUTES,
    PAGES,
    RULERS,
    Ruler,
    _create_bare_book,
    _create_edition,
    _create_engagement,
    _read_with_length,
)


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_returns_201_with_correct_fields(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)

    log = ruler.log_span(client, engagement_id, 0, 100)

    assert log["engagement_id"] == engagement_id
    assert log[ruler.log_start_field] == 0
    assert log[ruler.log_end_field] == 100
    assert log["type"] == ruler.log_type
    assert log["new_ground"] is True
    assert ruler.other_log_start_field not in log
    assert ruler.other_log_end_field not in log


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_stores_the_span_it_was_given(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)
    ruler.log_progress(client, engagement_id, 100)

    second = ruler.log_span(client, engagement_id, 100, 250)

    assert second[ruler.log_start_field] == 100
    assert second[ruler.log_end_field] == 250


def test_log_progress_unknown_engagement_returns_404(client: TestClient) -> None:
    response = client.post(
        f"/api/engagements/{uuid.uuid4()}/progress-logs",
        json=PAGES.span_payload(0, 50),
    )

    assert response.status_code == 404


def test_log_progress_finished_engagement_returns_409(client: TestClient) -> None:
    _, engagement_id = _read_with_length(client, PAGES, 300)
    finish_response = client.patch(
        f"/api/engagements/{engagement_id}",
        json={"status": "finished"},
    )
    assert finish_response.status_code == 200

    response = client.post(
        f"/api/engagements/{engagement_id}/progress-logs",
        json=PAGES.span_payload(0, 50),
    )

    assert response.status_code == 409


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_ending_before_it_started_returns_409(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)
    ruler.log_progress(client, engagement_id, 100)

    response = client.post(
        f"/api/engagements/{engagement_id}/progress-logs",
        json=ruler.span_payload(80, 50),
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "A session can't end before it started."


@pytest.mark.parametrize("ruler", RULERS)
@pytest.mark.parametrize(
    "end",
    [
        pytest.param(0, id="zero"),
        pytest.param(-10, id="negative"),
    ],
)
def test_log_progress_non_positive_end_returns_422(
    client: TestClient,
    ruler: Ruler,
    end: int,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)

    response = client.post(
        f"/api/engagements/{engagement_id}/progress-logs",
        json=ruler.span_payload(0, end),
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({}, id="no-span"),
        pytest.param({"page_start": 0}, id="page-start-only"),
        pytest.param({"page_end": 100}, id="page-end-only"),
        pytest.param({"minute_start": 0}, id="minute-start-only"),
        pytest.param({"minute_end": 100}, id="minute-end-only"),
        pytest.param(
            {
                "page_start": 0,
                "page_end": 100,
                "minute_start": 0,
                "minute_end": 100,
            },
            id="both-spans",
        ),
    ],
)
def test_log_progress_requires_exactly_one_complete_span(
    client: TestClient,
    payload: dict[str, int],
) -> None:
    _, engagement_id = _read_with_length(client, PAGES, 300)

    response = client.post(
        f"/api/engagements/{engagement_id}/progress-logs",
        json=payload,
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "requested_ruler, bound_ruler, expected_detail",
    [
        pytest.param(
            PAGES,
            MINUTES,
            "This read is audio only. Add a format to log pages.",
            id="pages-on-audio-read",
        ),
        pytest.param(
            MINUTES,
            PAGES,
            "This read has no audio format. Add one to log time.",
            id="minutes-on-page-read",
        ),
    ],
)
def test_log_progress_in_unbound_ruler_returns_409(
    client: TestClient,
    requested_ruler: Ruler,
    bound_ruler: Ruler,
    expected_detail: str,
) -> None:
    _, engagement_id = _read_with_length(client, bound_ruler, 300)

    response = client.post(
        f"/api/engagements/{engagement_id}/progress-logs",
        json=requested_ruler.span_payload(0, 100),
    )

    assert response.status_code == 409
    assert response.json()["detail"] == expected_detail


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_updates_resume_position(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)
    ruler.log_progress(client, engagement_id, 150)
    ruler.log_progress(client, engagement_id, 300)

    response = client.get(f"/api/engagements/{engagement_id}")

    assert response.status_code == 200
    assert response.json()[ruler.resume_field] == 300


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_completion_uses_edition_length(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 400)

    ruler.log_progress(client, engagement_id, 200)

    response = client.get(f"/api/engagements/{engagement_id}")
    assert response.status_code == 200
    assert response.json()["completion_pct"] == 50


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_completion_falls_back_to_book_length(
    client: TestClient,
    db: Session,
    ruler: Ruler,
) -> None:
    book = _create_bare_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    setattr(book_obj, ruler.book_length_field, 400)
    db.commit()
    _create_edition(client, book["id"], format=ruler.edition_format)
    engagement = _create_engagement(
        client,
        book["id"],
        edition_format=ruler.edition_format,
    )

    ruler.log_progress(client, engagement["id"], 200)

    response = client.get(f"/api/engagements/{engagement['id']}")
    assert response.status_code == 200
    assert response.json()["completion_pct"] == 50


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_completion_prefers_binding_override_to_book_length(
    client: TestClient,
    db: Session,
    ruler: Ruler,
) -> None:
    book = _create_bare_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    setattr(book_obj, ruler.book_length_field, 400)
    db.commit()
    _create_edition(client, book["id"], format=ruler.edition_format)
    engagement = _create_engagement(
        client,
        book["id"],
        edition_format=ruler.edition_format,
        length_override=200,
    )

    ruler.log_progress(client, engagement["id"], 100)

    response = client.get(f"/api/engagements/{engagement['id']}")
    assert response.status_code == 200
    assert response.json()["completion_pct"] == 50


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_leaves_other_ruler_resume_at_zero(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)

    ruler.log_progress(client, engagement_id, 100)

    response = client.get(f"/api/engagements/{engagement_id}")
    assert response.status_code == 200
    data = response.json()
    assert data[ruler.resume_field] == 100
    assert data[ruler.other_resume_field] == 0


@pytest.mark.parametrize("ruler", RULERS)
def test_completion_pct_is_a_high_water_mark(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(
        client,
        ruler,
        300,
        started_on="2026-01-01",
    )
    first = ruler.log_progress(client, engagement_id, 100)
    second = ruler.log_progress(client, engagement_id, 200)
    first_patch = client.patch(
        f"/api/engagements/{engagement_id}/progress-logs/{first['id']}",
        json={"logged_on": "2026-01-30"},
    )
    assert first_patch.status_code == 200
    second_patch = client.patch(
        f"/api/engagements/{engagement_id}/progress-logs/{second['id']}",
        json={"logged_on": "2026-01-20"},
    )
    assert second_patch.status_code == 200

    response = client.get(f"/api/engagements/{engagement_id}")

    assert response.status_code == 200
    assert response.json()["completion_pct"] == 67
