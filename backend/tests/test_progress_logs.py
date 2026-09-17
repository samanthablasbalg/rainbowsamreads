from __future__ import annotations

import datetime
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.book import Book
from app.models.edition import Edition, EngagementEdition
from app.models.engagement import Engagement
from tests.helpers import (
    _bind_edition,
    _create_bare_book,
    _create_book,
    _create_edition,
    _create_engagement,
    _log_audio_progress,
    _log_progress,
)

# --- Progress logging ---


def test_log_progress_returns_201_with_correct_fields(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    log = _log_progress(client, engagement["id"], 100)

    assert log["engagement_id"] == engagement["id"]
    assert log["page_start"] == 0
    assert log["page_end"] == 100
    assert log["type"] == "page"
    assert log["new_ground"] is True


def test_log_progress_stores_the_span_it_was_given(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)

    second = _log_progress(client, engagement["id"], 250, page_start=100)

    assert second["page_start"] == 100
    assert second["page_end"] == 250


def test_log_progress_unknown_engagement_returns_404(client: TestClient) -> None:
    response = client.post(
        f"/api/engagements/{uuid.uuid4()}/progress-logs",
        json={"page_start": 0, "page_end": 50},
    )
    assert response.status_code == 404


def test_log_progress_finished_engagement_returns_409(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "finished"})

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"page_start": 0, "page_end": 50},
    )
    assert response.status_code == 409


def test_log_progress_zero_length_span_without_a_note_returns_409(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"page_start": 100, "page_end": 100},
    )
    assert response.status_code == 409


def test_log_progress_ending_before_it_started_returns_409(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"page_start": 80, "page_end": 50},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "A session can't end before it started."


def test_log_progress_zero_page_returns_422(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"page_start": 0, "page_end": 0},
    )
    assert response.status_code == 422


def test_log_progress_negative_page_returns_422(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"page_start": 0, "page_end": -10},
    )
    assert response.status_code == 422


def test_log_progress_half_a_span_returns_422(client: TestClient) -> None:
    """A start with no end names no session."""
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"page_start": 0},
    )
    assert response.status_code == 422


# --- Notes ---


def test_log_progress_with_note_returns_it(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    log = _log_progress(client, engagement["id"], 100, note="A striking quote.")

    assert log["note"] == "A striking quote."


def test_log_progress_page_equal_to_last_with_note_returns_201(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)

    log = _log_progress(client, engagement["id"], 100, note="Still on this page.")

    assert log["page_start"] == 100
    assert log["page_end"] == 100
    assert log["new_ground"] is True
    assert log["note"] == "Still on this page."


def test_log_progress_two_zero_length_notes_on_same_page(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)

    first = _log_progress(client, engagement["id"], 100, note="First quote.")
    second = _log_progress(client, engagement["id"], 100, note="Second quote.")

    assert first["note"] == "First quote."
    assert second["note"] == "Second quote."


def test_log_progress_without_note_has_null_note(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    log = _log_progress(client, engagement["id"], 100)

    assert log["note"] is None


# --- Derived engagement fields ---


def test_engagement_resume_from_page_reflects_latest_log(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 150)
    _log_progress(client, engagement["id"], 300)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["resume_from_page"] == 300


def test_engagement_completion_pct_after_logging(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_page_count = 300
    db.commit()
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 150)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["completion_pct"] == 50


# --- completion_pct via binding ---


def test_completion_pct_uses_binding_length_override(
    client: TestClient, db: Session
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], length=400)
    engagement = _create_engagement(client, book["id"])

    binding = db.execute(
        select(EngagementEdition).where(
            EngagementEdition.engagement_id == uuid.UUID(engagement["id"])
        )
    ).scalar_one()
    binding.length_override = 200
    db.commit()

    _log_progress(client, engagement["id"], 100)

    data = client.get("/api/engagements?status=reading").json()
    assert data[0]["completion_pct"] == 50


def test_completion_pct_uses_edition_page_count_when_no_override(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], length=400)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 200)

    data = client.get("/api/engagements?status=reading").json()
    assert data[0]["completion_pct"] == 50


def test_completion_pct_binding_takes_precedence_over_book_page_count(
    client: TestClient, db: Session
) -> None:
    book = _create_bare_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_page_count = 400
    db.commit()

    _create_edition(client, book["id"], format="print")
    engagement = _create_engagement(client, book["id"])

    binding = db.execute(
        select(EngagementEdition).where(
            EngagementEdition.engagement_id == uuid.UUID(engagement["id"])
        )
    ).scalar_one()
    binding.length_override = 200
    db.commit()

    _log_progress(client, engagement["id"], 100)

    data = client.get("/api/engagements?status=reading").json()
    assert data[0]["completion_pct"] == 50


# --- Audio progress logging ---


def test_audio_log_returns_201_with_minutes_fields(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], edition_format="audio")

    log = _log_audio_progress(client, engagement["id"], 75)

    assert log["type"] == "minute"
    assert log["minute_start"] == 0
    assert log["minute_end"] == 75
    assert "page_start" not in log
    assert "page_end" not in log
    assert log["new_ground"] is True


def test_audio_log_stores_the_span_it_was_given(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], edition_format="audio")
    _log_audio_progress(client, engagement["id"], 75)

    second = _log_audio_progress(client, engagement["id"], 150, minute_start=75)

    assert second["minute_start"] == 75
    assert second["minute_end"] == 150


def test_audio_engagement_resume_from_minute_reflects_latest_log(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], edition_format="audio")
    _log_audio_progress(client, engagement["id"], 75)
    _log_audio_progress(client, engagement["id"], 150)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["resume_from_minute"] == 150


def test_audio_zero_length_span_without_a_note_returns_409(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], edition_format="audio")
    _log_audio_progress(client, engagement["id"], 75)

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"minute_start": 75, "minute_end": 75},
    )
    assert response.status_code == 409


def test_pages_rejected_on_a_read_with_no_page_format(client: TestClient) -> None:
    """The payload picks the ruler, so this is a well-formed request the read can't
    honour -- it is bound in audio only."""
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], edition_format="audio")

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"page_start": 0, "page_end": 100},
    )
    assert response.status_code == 409
    assert (
        response.json()["detail"]
        == "This read is audio only. Add a format to log pages."
    )


def test_minutes_rejected_on_a_read_with_no_audio_format(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"minute_start": 0, "minute_end": 75},
    )
    assert response.status_code == 409
    assert (
        response.json()["detail"]
        == "This read has no audio format. Add one to log time."
    )


def test_a_log_must_name_exactly_one_ruler(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    both = {"page_start": 0, "page_end": 100, "minute_start": 0, "minute_end": 75}
    for payload in ({}, both):
        response = client.post(
            f"/api/engagements/{engagement['id']}/progress-logs", json=payload
        )
        assert response.status_code == 422


def test_audio_completion_pct_uses_edition_length(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    edition = db.execute(
        select(Edition).where(
            Edition.book_id == uuid.UUID(book["id"]),
            Edition.format == "audio",
        )
    ).scalar_one()
    edition.length = 480
    db.commit()
    engagement = _create_engagement(client, book["id"], edition_format="audio")
    _log_audio_progress(client, engagement["id"], 240)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["completion_pct"] == 50


def test_audio_completion_pct_falls_back_to_book_default_audio_minutes(
    client: TestClient, db: Session
) -> None:
    book = _create_bare_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_audio_minutes = 400
    db.commit()
    _create_edition(client, book["id"], format="audio")
    engagement = _create_engagement(client, book["id"], edition_format="audio")
    _log_audio_progress(client, engagement["id"], 200)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["completion_pct"] == 50


def test_resume_from_page_unaffected_by_minute_logs(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["resume_from_page"] == 100
    assert response.json()[0]["resume_from_minute"] == 0


def test_log_before_started_on_returns_409(client: TestClient, db: Session) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    eng_obj = db.get(Engagement, uuid.UUID(engagement["id"]))
    assert eng_obj is not None
    eng_obj.started_on = datetime.date(2026, 1, 15)
    db.commit()

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"page_start": 0, "page_end": 50, "logged_on": "2026-01-10"},
    )

    assert response.status_code == 409


def test_log_future_date_returns_422(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    future = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"page_start": 0, "page_end": 50, "logged_on": future},
    )

    assert response.status_code == 422


def test_log_backdated_behind_later_day_returns_409(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 100, logged_on="2026-01-20")

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"page_start": 100, "page_end": 200, "logged_on": "2026-01-10"},
    )

    assert response.status_code == 409


def test_cross_format_re_coverage_can_be_backdated_behind_a_later_day(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)
    digital = _create_edition(client, book["id"], format="digital", length=400)
    _create_edition(client, book["id"], format="audio", length=480)
    engagement = _create_engagement(
        client, book["id"], started_on="2026-01-01", edition_format="audio"
    )
    _log_audio_progress(client, engagement["id"], 60, logged_on="2026-01-10")
    _log_audio_progress(client, engagement["id"], 120, logged_on="2026-01-20")
    _bind_edition(client, engagement["id"], digital["id"])

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={
            "page_start": 0,
            "page_end": 20,
            "logged_on": "2026-01-15",
        },
    )

    assert response.status_code == 201
    assert response.json()["new_ground"] is False
    assert response.json()["logged_on"] == "2026-01-15"


def test_log_backdated_to_day_with_existing_log_and_higher_page_is_allowed(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 100, logged_on="2026-01-10")

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"page_start": 100, "page_end": 200, "logged_on": "2026-01-10"},
    )

    assert response.status_code == 201
    assert response.json()["logged_on"] == "2026-01-10"

    logs = client.get(f"/api/engagements/{engagement['id']}/progress-logs").json()
    assert len(logs) == 2
    assert logs[-1]["page_end"] == 200


def test_completion_pct_is_a_high_water_mark(client: TestClient, db: Session) -> None:
    book = _create_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_page_count = 300
    db.commit()
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    # Retarget dates via PATCH so the page-100 log ends up canonical latest (Jan 30)
    # ahead of the page-200 log (Jan 20). Page 200 was still reached, so completion
    # holds at 67 rather than falling back to the latest entry's 33.
    first = _log_progress(client, engagement["id"], 100)
    second = _log_progress(client, engagement["id"], 200)
    client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{first['id']}",
        json={"logged_on": "2026-01-30"},
    )
    client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{second['id']}",
        json={"logged_on": "2026-01-20"},
    )

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["completion_pct"] == 67
