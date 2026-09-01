from __future__ import annotations

import datetime
import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.engagement import Engagement
from app.models.progress_log import ProgressLog
from tests.helpers import (
    _create_bare_book,
    _create_book,
    _create_edition,
    _create_engagement,
    _log_audio_progress,
    _log_progress,
)


def test_patch_log_date_updates_logged_on(client: TestClient, db: Session) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    log = _log_progress(client, engagement["id"], 100)

    eng_obj = db.get(Engagement, uuid.UUID(engagement["id"]))
    assert eng_obj is not None
    eng_obj.started_on = datetime.date(2026, 1, 1)
    db.commit()

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{log['id']}",
        json={"logged_on": "2026-01-15"},
    )

    assert response.status_code == 200
    updated = db.get(ProgressLog, uuid.UUID(log["id"]))
    assert updated is not None
    assert updated.logged_on == datetime.date(2026, 1, 15)


def test_patch_log_date_before_started_on_returns_409(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    log = _log_progress(client, engagement["id"], 100)

    eng_obj = db.get(Engagement, uuid.UUID(engagement["id"]))
    log_obj = db.get(ProgressLog, uuid.UUID(log["id"]))
    assert eng_obj is not None and log_obj is not None
    eng_obj.started_on = datetime.date(2026, 1, 20)
    log_obj.logged_on = datetime.date(2026, 1, 22)
    db.commit()

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{log['id']}",
        json={"logged_on": "2026-01-19"},
    )

    assert response.status_code == 409


def test_patch_log_date_after_finished_on_returns_409(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    log = _log_progress(client, engagement["id"], 100)

    eng_obj = db.get(Engagement, uuid.UUID(engagement["id"]))
    log_obj = db.get(ProgressLog, uuid.UUID(log["id"]))
    assert eng_obj is not None and log_obj is not None
    eng_obj.started_on = datetime.date(2026, 1, 1)
    eng_obj.finished_on = datetime.date(2026, 1, 20)
    log_obj.logged_on = datetime.date(2026, 1, 18)
    db.commit()

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{log['id']}",
        json={"logged_on": "2026-01-21"},
    )

    assert response.status_code == 409


def test_patch_log_page_on_most_recent_updates_page_end(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)
    latest = _log_progress(client, engagement["id"], 200)

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{latest['id']}",
        json={"page_end": 250},
    )

    assert response.status_code == 200
    updated = db.get(ProgressLog, uuid.UUID(latest["id"]))
    assert updated is not None
    assert updated.end == 250


def test_patch_log_page_on_non_recent_returns_409(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    first = _log_progress(client, engagement["id"], 100)
    _log_progress(client, engagement["id"], 200)

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{first['id']}",
        json={"page_end": 150},
    )

    assert response.status_code == 409


def test_patch_log_page_at_or_below_start_returns_409(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 100)
    latest = _log_progress(client, engagement["id"], 200)

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{latest['id']}",
        json={"page_end": 100},
    )

    assert response.status_code == 409


def test_patch_log_page_exceeds_book_length_returns_409(client: TestClient) -> None:
    book_resp = client.post(
        "/api/books",
        json={"title": "Piranesi", "author": "Susanna Clarke", "page_count": 200},
    )
    assert book_resp.status_code == 201
    book = book_resp.json()
    client.post("/api/editions", json={"book_id": book["id"], "format": "print"})
    engagement = _create_engagement(client, book["id"])
    latest = _log_progress(client, engagement["id"], 150)

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{latest['id']}",
        json={"page_end": 250},
    )

    assert response.status_code == 409


def test_patch_log_minute_on_most_recent_updates_minute_end(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], edition_format="audio")
    _log_audio_progress(client, engagement["id"], 60)
    latest = _log_audio_progress(client, engagement["id"], 120)

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{latest['id']}",
        json={"minute_end": 150},
    )

    assert response.status_code == 200
    updated = db.get(ProgressLog, uuid.UUID(latest["id"]))
    assert updated is not None
    assert updated.end == 150


def test_patch_log_minute_at_or_below_start_returns_409(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], edition_format="audio")
    _log_audio_progress(client, engagement["id"], 60)
    latest = _log_audio_progress(client, engagement["id"], 120)

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{latest['id']}",
        json={"minute_end": 60},
    )

    assert response.status_code == 409


def test_patch_log_minute_exceeds_audio_length_returns_409(client: TestClient) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], format="audio", length=200)
    engagement = _create_engagement(client, book["id"], edition_format="audio")
    _log_audio_progress(client, engagement["id"], 60)
    latest = _log_audio_progress(client, engagement["id"], 120)

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{latest['id']}",
        json={"minute_end": 250},
    )

    assert response.status_code == 409


def test_patch_log_unknown_engagement_returns_404(client: TestClient) -> None:
    response = client.patch(
        f"/api/engagements/{uuid.uuid4()}/progress-logs/{uuid.uuid4()}",
        json={"page_end": 100},
    )
    assert response.status_code == 404


def test_patch_log_unknown_log_returns_404(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{uuid.uuid4()}",
        json={"page_end": 100},
    )
    assert response.status_code == 404


def test_patch_log_date_any_past_date_is_valid(client: TestClient, db: Session) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 100, logged_on="2026-01-10")
    second = _log_progress(client, engagement["id"], 200, logged_on="2026-01-20")

    eng_obj = db.get(Engagement, uuid.UUID(engagement["id"]))
    assert eng_obj is not None

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{second['id']}",
        json={"logged_on": "2026-01-05"},
    )

    assert response.status_code == 200


def test_patch_backdated_log_is_not_most_recent_for_progress_edit(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    first = _log_progress(client, engagement["id"], 100, logged_on="2026-01-10")
    _log_progress(client, engagement["id"], 200, logged_on="2026-01-20")

    eng_obj = db.get(Engagement, uuid.UUID(engagement["id"]))
    assert eng_obj is not None

    client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{first['id']}",
        json={"logged_on": "2026-01-05"},
    )

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{first['id']}",
        json={"page_end": 150},
    )

    assert response.status_code == 409


def test_patch_log_date_and_progress_together_when_date_makes_it_latest(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    first = _log_progress(client, engagement["id"], 100, logged_on="2026-01-10")
    _log_progress(client, engagement["id"], 200, logged_on="2026-01-20")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{first['id']}",
        json={"logged_on": "2026-01-25", "page_end": 90},
    )

    assert response.status_code == 200


def test_patch_log_note_sets_it(client: TestClient, db: Session) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    log = _log_progress(client, engagement["id"], 100)

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{log['id']}",
        json={"note": "A striking quote."},
    )

    assert response.status_code == 200
    updated = db.get(ProgressLog, uuid.UUID(log["id"]))
    assert updated is not None
    assert updated.note == "A striking quote."


def test_patch_log_note_changes_it(client: TestClient, db: Session) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    log = _log_progress(client, engagement["id"], 100, note="First draft.")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{log['id']}",
        json={"note": "Revised."},
    )

    assert response.status_code == 200
    updated = db.get(ProgressLog, uuid.UUID(log["id"]))
    assert updated is not None
    assert updated.note == "Revised."


def test_patch_log_note_empty_string_clears_it(client: TestClient, db: Session) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    log = _log_progress(client, engagement["id"], 100, note="A striking quote.")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{log['id']}",
        json={"note": ""},
    )

    assert response.status_code == 200
    updated = db.get(ProgressLog, uuid.UUID(log["id"]))
    assert updated is not None
    assert updated.note is None


def test_patch_log_omitting_note_leaves_it_unchanged(
    client: TestClient, db: Session
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    log = _log_progress(client, engagement["id"], 100, note="A striking quote.")

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{log['id']}",
        json={"page_end": 150},
    )

    assert response.status_code == 200
    updated = db.get(ProgressLog, uuid.UUID(log["id"]))
    assert updated is not None
    assert updated.note == "A striking quote."


def test_patch_log_date_in_future_returns_422(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    log = _log_progress(client, engagement["id"], 100)
    future = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{log['id']}",
        json={"logged_on": future},
    )

    assert response.status_code == 422


def test_patch_a_split_session_moves_the_new_ground_row(client: TestClient) -> None:
    """The end position belongs to the half of the session that broke new ground; the
    re-read half in front of it is unchanged."""
    book = _create_bare_book(client)
    _create_edition(client, book["id"], length=400)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 200)
    session = _log_progress(client, engagement["id"], 250, page_start=180)

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{session['id']}",
        json={"page_end": 300},
    )

    assert response.status_code == 200
    logs = client.get(f"/api/engagements/{engagement['id']}/progress-logs").json()
    assert [(log["page_start"], log["page_end"]) for log in logs[-2:]] == [
        (180, 200),
        (200, 300),
    ]


def test_patch_a_split_session_date_moves_both_rows(client: TestClient) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], length=400)
    engagement = _create_engagement(client, book["id"], started_on="2026-01-01")
    _log_progress(client, engagement["id"], 200, logged_on="2026-01-10")
    session = _log_progress(
        client, engagement["id"], 250, logged_on="2026-01-11", page_start=180
    )

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{session['id']}",
        json={"logged_on": "2026-01-12"},
    )

    assert response.status_code == 200
    logs = client.get(f"/api/engagements/{engagement['id']}/progress-logs").json()
    assert [log["logged_on"] for log in logs[-2:]] == ["2026-01-12", "2026-01-12"]


def test_patch_a_re_read_past_the_frontier_returns_409(client: TestClient) -> None:
    """A re-read has no new-ground row to extend, so this would have to split a stored
    row -- refused, the way starting past the frontier is."""
    book = _create_bare_book(client)
    _create_edition(client, book["id"], length=400)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 200)
    re_read = _log_progress(client, engagement["id"], 150, page_start=100)

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{re_read['id']}",
        json={"page_end": 250},
    )

    assert response.status_code == 409
    assert (
        response.json()["detail"]
        == "A re-read can't extend past where this read has got to."
    )


def test_patch_a_re_read_within_the_frontier_is_allowed(client: TestClient) -> None:
    book = _create_bare_book(client)
    _create_edition(client, book["id"], length=400)
    engagement = _create_engagement(client, book["id"])
    _log_progress(client, engagement["id"], 200)
    re_read = _log_progress(client, engagement["id"], 150, page_start=100)

    response = client.patch(
        f"/api/engagements/{engagement['id']}/progress-logs/{re_read['id']}",
        json={"page_end": 180},
    )

    assert response.status_code == 200
    assert response.json()["page_end"] == 180
