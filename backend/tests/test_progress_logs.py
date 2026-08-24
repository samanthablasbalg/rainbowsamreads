from __future__ import annotations

import datetime
import uuid
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.book import Book
from app.models.edition import Edition, EngagementEdition
from app.models.engagement import Engagement
from app.models.enums import LogUnit
from app.models.progress_log import ProgressLog
from tests.helpers import (
    _bind_edition,
    _create_audio_engagement,
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


def test_log_progress_starting_past_the_frontier_returns_409(
    client: TestClient,
) -> None:
    """Skipping ahead leaves the ground between untouched, and whether that ground is
    unread or read-and-unlogged is what the rest of issue 96 answers."""
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"page_start": 150, "page_end": 200},
    )
    assert response.status_code == 409
    assert (
        response.json()["detail"]
        == "A session can't start past where this read has got to."
    )


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


def test_starting_past_the_frontier_still_rejected_with_a_note(
    client: TestClient,
) -> None:
    """A note buys a session that covers no ground; it does not buy one that skips."""
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"page_start": 150, "page_end": 200, "note": "A note"},
    )
    assert response.status_code == 409
    assert (
        response.json()["detail"]
        == "A session can't start past where this read has got to."
    )


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


def test_engagement_resume_from_page_is_zero_before_logging(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    assert engagement["resume_from_page"] == 0


def test_engagement_resume_from_page_reflects_latest_log(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 150)
    _log_progress(client, engagement["id"], 300)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["resume_from_page"] == 300


def test_engagement_completion_pct_is_null_without_page_count(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["completion_pct"] is None


def test_engagement_completion_pct_is_null_when_page_count_is_zero(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_page_count = 0
    db.commit()
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["completion_pct"] is None


def test_engagement_completion_pct_is_null_before_logging(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_page_count = 300
    db.commit()
    engagement = _create_engagement(client, book["id"])

    assert engagement["completion_pct"] is None


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


def test_engagement_completion_pct_capped_at_100(
    client: TestClient, db: Session
) -> None:
    """A session can't be logged past the book's length, so the only way past it is a
    length corrected downwards afterwards."""
    book = _create_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_page_count = 400
    db.commit()
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 350)

    book_obj.default_page_count = 300
    db.commit()

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["completion_pct"] == 100


# --- Landmine: status cycle must not touch progress_logs ---


def test_progress_logs_preserved_through_status_cycle(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)

    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "finished"})
    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "reading"})

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["resume_from_page"] == 100

    second = _log_progress(client, engagement["id"], 200)
    assert second["page_start"] == 100


# --- completion_pct via binding ---


def test_completion_pct_uses_binding_length_override(
    client: TestClient, db: Session
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], page_count=400)
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
    _create_edition(client, book["id"], page_count=400)
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

    _create_edition(client, book["id"])
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


# --- The shared frontier across two rulers ---


def test_page_frontier_converts_to_the_audio_ruler(client: TestClient) -> None:
    """Read half of a 440-page print copy, then bind the audiobook: the audio ruler
    resumes at the same point in the book, not at zero."""
    book = _create_bare_book(client)
    _create_edition(client, book["id"], page_count=440)
    audio = _create_edition(client, book["id"], "audio", audio_minutes=430)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 220)
    _bind_edition(client, engagement["id"], audio["id"])

    data = client.get(f"/api/engagements/{engagement['id']}").json()
    assert data["completion_pct"] == 50
    assert data["resume_from_minute"] == 215
    assert data["resume_from_page"] == 220


def test_minute_frontier_converts_to_the_page_ruler(client: TestClient) -> None:
    book = _create_bare_book(client)
    print_edition = _create_edition(client, book["id"], page_count=440)
    _create_edition(client, book["id"], "audio", audio_minutes=430)
    engagement = _create_audio_engagement(client, book["id"])
    _log_audio_progress(client, engagement["id"], 215)
    _bind_edition(client, engagement["id"], print_edition["id"])

    data = client.get(f"/api/engagements/{engagement['id']}").json()
    assert data["completion_pct"] == 50
    assert data["resume_from_page"] == 220
    assert data["resume_from_minute"] == 215


def test_completion_follows_the_latest_entry_not_the_audio_binding(
    client: TestClient,
) -> None:
    """A read bound in audio that has only been logged in pages reports its page
    progress. Completion used to answer on the audio ruler whenever audio was bound,
    which read as no progress at all until the first minute was logged."""
    book = _create_bare_book(client)
    _create_edition(client, book["id"], page_count=400)
    audio = _create_edition(client, book["id"], "audio", audio_minutes=600)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)
    _bind_edition(client, engagement["id"], audio["id"])

    data = client.get(f"/api/engagements/{engagement['id']}").json()
    assert data["completion_pct"] == 25


def test_resume_falls_back_to_its_own_ruler_without_a_length(
    client: TestClient,
) -> None:
    """No page count, so there is no fraction to convert -- the page ruler still
    answers with the last page logged."""
    book = _create_bare_book(client)
    _create_edition(client, book["id"])
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 120)

    data = client.get(f"/api/engagements/{engagement['id']}").json()
    assert data["completion_pct"] is None
    assert data["resume_from_page"] == 120


def _mixed_engagement(client: TestClient) -> dict[str, Any]:
    """A read of a 440-page book with its 430-minute audiobook bound alongside."""
    book = _create_bare_book(client)
    _create_edition(client, book["id"], page_count=440)
    audio = _create_edition(client, book["id"], "audio", audio_minutes=430)
    engagement = _create_engagement(client, book["id"])
    _bind_edition(client, engagement["id"], audio["id"])
    return engagement


def test_alternating_rulers_tile_without_a_gap(client: TestClient) -> None:
    """Print to p.220, then listen on to 5:00: the audio session starts at the page
    frontier converted (3:35), not at zero, and the next print session picks up from
    where the listening left off."""
    engagement = _mixed_engagement(client)

    _log_progress(client, engagement["id"], 220)
    audio_log = _log_audio_progress(client, engagement["id"], 300)
    assert audio_log["minute_start"] == 215

    data = client.get(f"/api/engagements/{engagement['id']}").json()
    assert data["completion_pct"] == 70
    assert data["resume_unit"] == "minutes"
    assert data["resume_from_page"] == 307

    page_log = _log_progress(client, engagement["id"], 400)
    assert page_log["page_start"] == 307


def test_a_ruler_can_start_behind_the_shared_frontier(client: TestClient) -> None:
    """Half the book read in print, then a listening session back at 1:00 -- behind the
    frontier, so it is re-coverage rather than progress, and moves neither."""
    engagement = _mixed_engagement(client)
    _log_progress(client, engagement["id"], 220)

    log = _log_audio_progress(client, engagement["id"], 60, minute_start=0)

    assert log["new_ground"] is False
    data = client.get(f"/api/engagements/{engagement['id']}").json()
    assert data["completion_pct"] == 50
    assert data["resume_unit"] == "pages"


# --- Re-coverage: sessions behind the frontier ---


def _catch_up_engagement(client: TestClient) -> tuple[dict[str, Any], str]:
    """An audiobook of 480 minutes with a 400-page digital copy alongside, so 2:00 sits
    exactly on p. 100. Returns the read and the digital edition's id, unbound."""
    book = _create_bare_book(client)
    digital = _create_edition(client, book["id"], "digital", page_count=400)
    _create_edition(client, book["id"], "audio", audio_minutes=480)
    return _create_audio_engagement(client, book["id"]), digital["id"]


def test_catching_up_a_second_format_leaves_the_read_where_it_was(
    client: TestClient,
) -> None:
    """The workflow issue 96 exists for. Listen to 2:00, add the ebook, read the pages
    already heard to catch up: none of that is progress, and the read stays on audio at
    2:00 throughout."""
    engagement, digital_id = _catch_up_engagement(client)
    _log_audio_progress(client, engagement["id"], 120)
    _bind_edition(client, engagement["id"], digital_id)

    data = client.get(f"/api/engagements/{engagement['id']}").json()
    assert data["completion_pct"] == 25
    assert data["resume_from_page"] == 100

    catch_up = _log_progress(client, engagement["id"], 75, page_start=50)
    assert catch_up["new_ground"] is False

    # The sheet opens on the ruler the read is on, at the frontier -- unmoved.
    data = client.get(f"/api/engagements/{engagement['id']}").json()
    assert data["completion_pct"] == 25
    assert data["resume_unit"] == "minutes"
    assert data["resume_from_minute"] == 120
    # Pages, though, pick up where the catch-up pass stopped, not at the frontier.
    assert data["resume_from_page"] == 75

    rest_of_the_catch_up = _log_progress(client, engagement["id"], 100, page_start=75)
    assert rest_of_the_catch_up["new_ground"] is False

    # Caught up: both rulers now sit on the frontier, and either can take new ground.
    data = client.get(f"/api/engagements/{engagement['id']}").json()
    assert data["completion_pct"] == 25
    assert data["resume_from_page"] == 100
    assert data["resume_from_minute"] == 120


def test_the_frontier_outruns_the_resume_point_while_a_catch_up_is_open(
    client: TestClient,
) -> None:
    """Both are on the wire because they are not the same number. The resume point is
    where the sheet prefills; the frontier is how far a session may start. They part
    company exactly while a catch-up is open, and abandoning the catch-up to pick the
    print back up at the frontier has to stay a legal move."""
    engagement, digital_id = _catch_up_engagement(client)
    _log_audio_progress(client, engagement["id"], 120)
    _bind_edition(client, engagement["id"], digital_id)
    _log_progress(client, engagement["id"], 75, page_start=50)

    data = client.get(f"/api/engagements/{engagement['id']}").json()
    assert data["resume_from_page"] == 75
    assert data["frontier_page"] == 100
    # The audio ruler never left the frontier, so there the two agree.
    assert data["resume_from_minute"] == 120
    assert data["frontier_minute"] == 120

    # Skipping the rest of the catch-up: new ground straight from the frontier.
    resumed = _log_progress(client, engagement["id"], 130, page_start=100)
    assert resumed["new_ground"] is True


def test_a_session_crossing_the_frontier_is_stored_as_two_rows(
    client: TestClient,
) -> None:
    """At p. 200, back up and read 180 to 250: 180-200 is re-read, 200-250 is new."""
    book = _create_bare_book(client)
    _create_edition(client, book["id"], page_count=400)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 200)

    new_ground = _log_progress(client, engagement["id"], 250, page_start=180)

    logs = client.get(f"/api/engagements/{engagement['id']}/progress-logs").json()
    assert [
        (log["page_start"], log["page_end"], log["new_ground"]) for log in logs
    ] == [
        (0, 200, True),
        (180, 200, False),
        (200, 250, True),
    ]
    # The new-ground row is what the response returns, so the client addresses the
    # session by an id that exists whether or not the save split.
    assert new_ground["id"] == logs[-1]["id"]
    # And the two rows of one save carry the same timestamp, which is what groups them.
    assert logs[-2]["created_at"] == logs[-1]["created_at"]

    data = client.get(f"/api/engagements/{engagement['id']}").json()
    assert data["completion_pct"] == 62


def test_a_split_session_puts_its_note_on_the_new_ground_row(
    client: TestClient,
) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], page_count=400)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 200)

    _log_progress(
        client, engagement["id"], 250, page_start=180, note="Worth rereading."
    )

    logs = client.get(f"/api/engagements/{engagement['id']}/progress-logs").json()
    assert logs[-2]["note"] is None
    assert logs[-1]["note"] == "Worth rereading."


def test_re_coverage_does_not_move_a_finished_read_past_the_frontier(
    client: TestClient,
) -> None:
    """Finishing closes out from the frontier, not from where a catch-up stopped."""
    engagement, digital_id = _catch_up_engagement(client)
    _log_audio_progress(client, engagement["id"], 120)
    _bind_edition(client, engagement["id"], digital_id)
    _log_progress(client, engagement["id"], 75, page_start=50)

    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "finished"})

    logs = client.get(f"/api/engagements/{engagement['id']}/progress-logs").json()
    assert (logs[-1]["minute_start"], logs[-1]["minute_end"]) == (120, 480)


# --- Finish log ---


def test_finish_closes_out_on_the_ruler_last_logged_on(
    client: TestClient, db: Session
) -> None:
    """Audio is bound, but the last session was print -- so the closing log is the rest
    of the pages, not the rest of the audiobook."""
    engagement = _mixed_engagement(client)
    _log_progress(client, engagement["id"], 220)

    response = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": "finished"}
    )
    assert response.status_code == 200
    assert response.json()["completion_pct"] == 100

    logs = (
        db.execute(
            select(ProgressLog).where(
                ProgressLog.engagement_id == uuid.UUID(engagement["id"])
            )
        )
        .scalars()
        .all()
    )
    final_log = max(logs, key=lambda log: (log.logged_on, log.created_at))
    assert final_log.unit == LogUnit.pages
    assert (final_log.page_start, final_log.page_end) == (220, 440)


def test_finish_creates_final_progress_log(client: TestClient, db: Session) -> None:
    book = _create_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_page_count = 300
    db.commit()
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 150)

    response = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": "finished"}
    )
    assert response.status_code == 200
    assert response.json()["completion_pct"] == 100

    logs = (
        db.execute(
            select(ProgressLog).where(
                ProgressLog.engagement_id == uuid.UUID(engagement["id"])
            )
        )
        .scalars()
        .all()
    )
    assert len(logs) == 2
    final_log = max(logs, key=lambda log: (log.logged_on, log.created_at))
    assert final_log.page_start == 150
    assert final_log.page_end == 300


def test_finish_does_not_duplicate_log_when_already_at_page_count(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_page_count = 300
    db.commit()
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 300)

    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "finished"})

    logs = (
        db.execute(
            select(ProgressLog).where(
                ProgressLog.engagement_id == uuid.UUID(engagement["id"])
            )
        )
        .scalars()
        .all()
    )
    assert len(logs) == 1


def test_finish_with_no_page_count_creates_no_log(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 150)

    response = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": "finished"}
    )
    assert response.status_code == 200

    logs = (
        db.execute(
            select(ProgressLog).where(
                ProgressLog.engagement_id == uuid.UUID(engagement["id"])
            )
        )
        .scalars()
        .all()
    )
    assert len(logs) == 1


# --- Audio finish log ---


def test_finish_audio_creates_final_minutes_log(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_audio_minutes = 480
    db.commit()
    engagement = _create_audio_engagement(client, book["id"])
    _log_audio_progress(client, engagement["id"], 240)

    response = client.patch(
        f"/api/engagements/{engagement['id']}", json={"status": "finished"}
    )
    assert response.status_code == 200
    assert response.json()["completion_pct"] == 100

    logs = (
        db.execute(
            select(ProgressLog).where(
                ProgressLog.engagement_id == uuid.UUID(engagement["id"])
            )
        )
        .scalars()
        .all()
    )
    assert len(logs) == 2
    final_log = max(logs, key=lambda log: (log.logged_on, log.created_at))
    assert final_log.unit.value == "minutes"
    assert final_log.minute_start == 240
    assert final_log.minute_end == 480


def test_finish_audio_does_not_duplicate_log_when_already_at_length(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_audio_minutes = 480
    db.commit()
    engagement = _create_audio_engagement(client, book["id"])
    _log_audio_progress(client, engagement["id"], 480)

    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "finished"})

    logs = (
        db.execute(
            select(ProgressLog).where(
                ProgressLog.engagement_id == uuid.UUID(engagement["id"])
            )
        )
        .scalars()
        .all()
    )
    assert len(logs) == 1


def test_finish_audio_with_no_length_creates_no_log(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_audio_engagement(client, book["id"])
    _log_audio_progress(client, engagement["id"], 240)

    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "finished"})

    logs = (
        db.execute(
            select(ProgressLog).where(
                ProgressLog.engagement_id == uuid.UUID(engagement["id"])
            )
        )
        .scalars()
        .all()
    )
    assert len(logs) == 1


def test_finish_audio_does_not_create_page_log(client: TestClient, db: Session) -> None:
    book = _create_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_page_count = 300
    book_obj.default_audio_minutes = 480
    db.commit()
    engagement = _create_audio_engagement(client, book["id"])
    _log_audio_progress(client, engagement["id"], 240)

    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "finished"})

    logs = (
        db.execute(
            select(ProgressLog).where(
                ProgressLog.engagement_id == uuid.UUID(engagement["id"])
            )
        )
        .scalars()
        .all()
    )
    assert all(log.unit.value == "minutes" for log in logs)


# --- Audio progress logging ---


def test_audio_log_returns_201_with_minutes_fields(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_audio_engagement(client, book["id"])

    log = _log_audio_progress(client, engagement["id"], 75)

    assert log["type"] == "minute"
    assert log["minute_start"] == 0
    assert log["minute_end"] == 75
    assert "page_start" not in log
    assert "page_end" not in log
    assert log["new_ground"] is True


def test_audio_log_stores_the_span_it_was_given(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_audio_engagement(client, book["id"])
    _log_audio_progress(client, engagement["id"], 75)

    second = _log_audio_progress(client, engagement["id"], 150, minute_start=75)

    assert second["minute_start"] == 75
    assert second["minute_end"] == 150


def test_audio_engagement_resume_from_minute_is_zero_before_logging(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_audio_engagement(client, book["id"])

    assert engagement["resume_from_minute"] == 0


def test_audio_engagement_resume_from_minute_reflects_latest_log(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_audio_engagement(client, book["id"])
    _log_audio_progress(client, engagement["id"], 75)
    _log_audio_progress(client, engagement["id"], 150)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["resume_from_minute"] == 150


def test_audio_zero_length_span_without_a_note_returns_409(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_audio_engagement(client, book["id"])
    _log_audio_progress(client, engagement["id"], 75)

    response = client.post(
        f"/api/engagements/{engagement['id']}/progress-logs",
        json={"minute_start": 75, "minute_end": 75},
    )
    assert response.status_code == 409


def test_audio_span_behind_the_frontier_is_re_coverage(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_audio_engagement(client, book["id"])
    _log_audio_progress(client, engagement["id"], 75)

    log = _log_audio_progress(client, engagement["id"], 50, minute_start=20)

    assert log["minute_start"] == 20
    assert log["minute_end"] == 50
    assert log["new_ground"] is False


def test_pages_rejected_on_a_read_with_no_page_format(client: TestClient) -> None:
    """The payload picks the ruler, so this is a well-formed request the read can't
    honour -- it is bound in audio only."""
    book = _create_book(client)
    engagement = _create_audio_engagement(client, book["id"])

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


def test_length_capture_writes_book_default_audio_minutes(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_audio_engagement(client, book["id"])

    _log_audio_progress(client, engagement["id"], 75, audio_length_minutes=480)

    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    assert book_obj.default_audio_minutes == 480


def test_length_capture_writes_edition_audio_minutes(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_audio_engagement(client, book["id"])

    _log_audio_progress(client, engagement["id"], 75, audio_length_minutes=480)

    edition = db.execute(
        select(Edition).where(
            Edition.book_id == uuid.UUID(book["id"]),
            Edition.edition_format == "audio",
        )
    ).scalar_one()
    assert edition.audio_minutes == 480


def test_length_capture_does_not_overwrite_existing_length(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_audio_minutes = 300
    db.commit()
    engagement = _create_audio_engagement(client, book["id"])

    _log_audio_progress(client, engagement["id"], 75, audio_length_minutes=480)

    db.refresh(book_obj)
    assert book_obj.default_audio_minutes == 300


def test_audio_completion_pct_uses_captured_length(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_audio_engagement(client, book["id"])
    _log_audio_progress(client, engagement["id"], 240, audio_length_minutes=480)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["completion_pct"] == 50


def test_audio_completion_pct_uses_edition_audio_minutes(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    edition = db.execute(
        select(Edition).where(
            Edition.book_id == uuid.UUID(book["id"]),
            Edition.edition_format == "audio",
        )
    ).scalar_one()
    edition.audio_minutes = 480
    db.commit()
    engagement = _create_audio_engagement(client, book["id"])
    _log_audio_progress(client, engagement["id"], 240)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["completion_pct"] == 50


def test_audio_completion_pct_falls_back_to_book_default_audio_minutes(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_audio_minutes = 480
    db.commit()
    engagement = _create_audio_engagement(client, book["id"])
    _log_audio_progress(client, engagement["id"], 240)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["completion_pct"] == 50


def test_audio_completion_pct_null_when_no_length_set(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_audio_engagement(client, book["id"])
    _log_audio_progress(client, engagement["id"], 75)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["completion_pct"] is None


def test_audio_completion_pct_null_before_logging(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_audio_engagement(client, book["id"])

    assert engagement["completion_pct"] is None


def test_resume_from_page_unaffected_by_minute_logs(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)

    response = client.get("/api/engagements?status=reading")
    assert response.json()[0]["resume_from_page"] == 100
    assert response.json()[0]["resume_from_minute"] == 0


# --- List progress logs ---


def test_list_progress_logs_returns_200_ordered_by_date(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)
    _log_progress(client, engagement["id"], 200)

    response = client.get(f"/api/engagements/{engagement['id']}/progress-logs")

    assert response.status_code == 200
    logs = response.json()
    assert len(logs) == 2
    assert logs[0]["page_end"] == 100
    assert logs[1]["page_end"] == 200


def test_list_progress_logs_returns_empty_list_when_no_logs(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.get(f"/api/engagements/{engagement['id']}/progress-logs")

    assert response.status_code == 200
    assert response.json() == []


def test_list_progress_logs_unknown_engagement_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/engagements/{uuid.uuid4()}/progress-logs")
    assert response.status_code == 404


# --- logged_on ordering ---


def test_same_day_logs_ordered_by_creation(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 100, logged_on="2026-01-10")
    _log_progress(client, engagement["id"], 200, logged_on="2026-01-10")

    logs = client.get(f"/api/engagements/{engagement['id']}/progress-logs").json()

    assert logs[0]["page_end"] == 100
    assert logs[1]["page_end"] == 200


def test_multiple_backdated_days_sorted_by_date(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    # Create three logs (creation order 1, 2, 3), then retarget their dates out
    # of creation order via PATCH — creating them pre-dated would now 409
    # (a log may not be backdated behind an existing later-day log).
    first = _log_progress(client, engagement["id"], 100)
    second = _log_progress(client, engagement["id"], 200)
    third = _log_progress(client, engagement["id"], 300)

    client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{first['id']}",
        json={"logged_on": "2026-01-30"},
    )
    client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{second['id']}",
        json={"logged_on": "2026-01-10"},
    )
    client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{third['id']}",
        json={"logged_on": "2026-01-20"},
    )

    logs = client.get(f"/api/engagements/{engagement['id']}/progress-logs").json()

    assert logs[0]["logged_on"] == "2026-01-10"
    assert logs[1]["logged_on"] == "2026-01-20"
    assert logs[2]["logged_on"] == "2026-01-30"


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


def test_finish_uses_effective_on_for_finished_on_and_completion_log(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    book_obj = db.get(Book, uuid.UUID(book["id"]))
    assert book_obj is not None
    book_obj.default_page_count = 300
    db.commit()
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 150, logged_on="2026-01-10")

    response = client.patch(
        f"/api/engagements/{engagement['id']}",
        json={"status": "finished", "effective_on": "2026-01-15"},
    )

    assert response.status_code == 200
    assert response.json()["finished_on"] == "2026-01-15"

    logs = (
        db.execute(
            select(ProgressLog).where(
                ProgressLog.engagement_id == uuid.UUID(engagement["id"])
            )
        )
        .scalars()
        .all()
    )
    completion_log = max(logs, key=lambda log: log.created_at)
    assert completion_log.logged_on == datetime.date(2026, 1, 15)


def test_finish_effective_on_before_latest_log_returns_409(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 150, logged_on="2026-01-20")

    response = client.patch(
        f"/api/engagements/{engagement['id']}",
        json={"status": "finished", "effective_on": "2026-01-15"},
    )

    assert response.status_code == 409


def test_resume_from_page_uses_canonical_order_latest(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    # Retarget dates via PATCH after creation, so the earlier-created log
    # (page 100) ends up dated later (Jan 30) than the later-created log
    # (page 200, dated Jan 20). Canonical latest is by (logged_on, created_at),
    # so resume_from_page should be 100, not 200.
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
    assert response.json()[0]["resume_from_page"] == 100


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


# --- Delete progress logs ---


def test_delete_progress_log_returns_204(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    log = _log_progress(client, engagement["id"], 200, logged_on="2026-01-10")

    response = client.delete(
        f"/api/engagements/{engagement['id']}/progress-logs/{log['id']}"
    )
    assert response.status_code == 204


def test_delete_progress_log_removes_it_from_list(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    log = _log_progress(client, engagement["id"], 200, logged_on="2026-01-10")

    client.delete(f"/api/engagements/{engagement['id']}/progress-logs/{log['id']}")

    response = client.get(f"/api/engagements/{engagement['id']}/progress-logs")
    assert response.json() == []


def test_delete_penultimate_progress_log_returns_409(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    first = _log_progress(client, engagement["id"], 100, logged_on="2026-01-10")
    _log_progress(client, engagement["id"], 200, logged_on="2026-01-20")

    response = client.delete(
        f"/api/engagements/{engagement['id']}/progress-logs/{first['id']}"
    )
    assert response.status_code == 409


def test_delete_a_split_session_removes_both_of_its_rows(client: TestClient) -> None:
    """One session, so one delete -- the split is storage, not something the reader
    put there."""
    book = _create_bare_book(client)
    _create_edition(client, book["id"], page_count=400)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 200, logged_on="2026-01-10")
    session = _log_progress(
        client, engagement["id"], 250, logged_on="2026-01-11", page_start=180
    )

    response = client.delete(
        f"/api/engagements/{engagement['id']}/progress-logs/{session['id']}"
    )

    assert response.status_code == 204
    logs = client.get(f"/api/engagements/{engagement['id']}/progress-logs").json()
    assert [log["page_end"] for log in logs] == [200]


def test_delete_the_re_coverage_half_of_a_later_session_returns_409(
    client: TestClient,
) -> None:
    """The most recent *group* is what can be deleted, so an earlier session's row is
    still refused even though its group is the latest one's neighbour."""
    book = _create_bare_book(client)
    _create_edition(client, book["id"], page_count=400)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    first = _log_progress(client, engagement["id"], 200, logged_on="2026-01-10")
    _log_progress(client, engagement["id"], 250, logged_on="2026-01-11", page_start=180)

    response = client.delete(
        f"/api/engagements/{engagement['id']}/progress-logs/{first['id']}"
    )
    assert response.status_code == 409


def test_delete_unknown_progress_log_returns_404(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 200, logged_on="2026-01-20")

    response = client.delete(
        f"/api/engagements/{engagement['id']}/progress-logs/{uuid.uuid4()}"
    )
    assert response.status_code == 404
