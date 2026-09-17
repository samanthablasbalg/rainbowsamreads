from __future__ import annotations

import functools
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Protocol, cast

import httpx2
import pytest
from fastapi.testclient import TestClient

from app.models.enums import LogUnit


@dataclass(frozen=True)
class Completion:
    status: str
    end_date_field: str
    other_end_date_field: str


FINISHED = Completion(
    status="finished",
    end_date_field="finished_on",
    other_end_date_field="abandoned_on",
)
DNF = Completion(
    status="dnf",
    end_date_field="abandoned_on",
    other_end_date_field="finished_on",
)
COMPLETIONS = [
    pytest.param(FINISHED, id="finished"),
    pytest.param(DNF, id="dnf"),
]


class LogProgress(Protocol):
    def __call__(
        self,
        client: TestClient,
        engagement_id: str,
        current_position: int,
        /,
        logged_on: str | None = None,
    ) -> dict[str, Any]: ...


@dataclass(frozen=True)
class Ruler:
    edition_format: str
    unit: LogUnit
    length_field: str
    other_length_field: str
    book_length_field: str
    resume_field: str
    log_type: str
    log_start_field: str
    log_end_field: str
    log_progress: LogProgress

    def log_span(
        self,
        client: TestClient,
        engagement_id: str,
        start: int,
        end: int,
        *,
        logged_on: str | None = None,
        note: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            self.log_start_field: start,
            self.log_end_field: end,
        }
        if logged_on is not None:
            body["logged_on"] = logged_on
        if note is not None:
            body["note"] = note
        response = client.post(
            f"/api/engagements/{engagement_id}/progress-logs", json=body
        )
        assert response.status_code == 201
        return cast(dict[str, Any], response.json())


def _create_book(
    client: TestClient,
    title: str = "Piranesi",
    author: str = "Susanna Clarke",
) -> dict[str, Any]:
    response = client.post("/api/books", json={"title": title, "author": author})
    assert response.status_code == 201
    book = cast(dict[str, Any], response.json())
    print_response = client.post(
        "/api/editions",
        json={"book_id": book["id"], "format": "print", "length": 300},
    )
    assert print_response.status_code == 201
    digital_response = client.post(
        "/api/editions",
        json={"book_id": book["id"], "format": "digital", "length": 250},
    )
    assert digital_response.status_code == 201
    audio_response = client.post(
        "/api/editions",
        json={"book_id": book["id"], "format": "audio", "length": 600},
    )
    assert audio_response.status_code == 201
    return book


def _create_bare_book(
    client: TestClient,
    title: str = "Piranesi",
    author: str = "Susanna Clarke",
) -> dict[str, Any]:
    response = client.post("/api/books", json={"title": title, "author": author})
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def _create_engagement(
    client: TestClient,
    book_id: str,
    started_on: str | None = None,
    *,
    edition_format: str | None = "print",
    status: str = "reading",
    length_override: int | None = None,
    tbr_added_on: str | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "book_id": book_id,
        "status": status,
        "edition_format": edition_format,
        "tbr_added_on": tbr_added_on,
        "started_on": started_on,
    }
    if length_override is not None:
        body["length_override"] = length_override
    response = client.post("/api/engagements", json=body)
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def _resume_from(client: TestClient, engagement_id: str, unit: LogUnit) -> int:
    """Where the sheet would prefill "From". A session names both its ends now, so a
    helper that takes only the position reached has to ask for the other one."""
    response = client.get(f"/api/engagements/{engagement_id}")
    assert response.status_code == 200
    field = "resume_from_minute" if unit == LogUnit.minutes else "resume_from_page"
    return cast(int, response.json()[field])


def _log_progress(
    client: TestClient,
    engagement_id: str,
    current_page: int,
    logged_on: str | None = None,
    note: str | None = None,
    page_start: int | None = None,
) -> dict[str, Any]:
    if page_start is None:
        page_start = _resume_from(client, engagement_id, LogUnit.pages)
    body: dict[str, Any] = {"page_start": page_start, "page_end": current_page}
    if logged_on is not None:
        body["logged_on"] = logged_on
    if note is not None:
        body["note"] = note
    response = client.post(f"/api/engagements/{engagement_id}/progress-logs", json=body)
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def _create_edition(
    client: TestClient,
    book_id: str,
    format: str = "print",
    **kwargs: Any,
) -> dict[str, Any]:
    response = client.post(
        "/api/editions",
        json={"book_id": book_id, "format": format, **kwargs},
    )
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def _bind_edition(
    client: TestClient,
    engagement_id: str,
    edition_id: str,
    **kwargs: Any,
) -> dict[str, Any]:
    response = client.post(
        f"/api/engagements/{engagement_id}/editions",
        json={"edition_id": edition_id, **kwargs},
    )
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


def _log_audio_progress(
    client: TestClient,
    engagement_id: str,
    current_minute: int,
    logged_on: str | None = None,
    minute_start: int | None = None,
    **kwargs: Any,
) -> dict[str, Any]:
    if minute_start is None:
        minute_start = _resume_from(client, engagement_id, LogUnit.minutes)
    body: dict[str, Any] = {
        "minute_start": minute_start,
        "minute_end": current_minute,
        **kwargs,
    }
    if logged_on is not None:
        body["logged_on"] = logged_on
    response = client.post(f"/api/engagements/{engagement_id}/progress-logs", json=body)
    assert response.status_code == 201
    return cast(dict[str, Any], response.json())


PAGES = Ruler(
    edition_format="print",
    unit=LogUnit.pages,
    length_field="length_pages",
    other_length_field="length_minutes",
    book_length_field="default_page_count",
    resume_field="resume_from_page",
    log_type="page",
    log_start_field="page_start",
    log_end_field="page_end",
    log_progress=_log_progress,
)
MINUTES = Ruler(
    edition_format="audio",
    unit=LogUnit.minutes,
    length_field="length_minutes",
    other_length_field="length_pages",
    book_length_field="default_audio_minutes",
    resume_field="resume_from_minute",
    log_type="minute",
    log_start_field="minute_start",
    log_end_field="minute_end",
    log_progress=_log_audio_progress,
)
RULERS = [pytest.param(PAGES, id="pages"), pytest.param(MINUTES, id="audio")]


def _read_with_length(
    client: TestClient,
    ruler: Ruler,
    length: int,
    *,
    length_override: int | None = None,
    started_on: str | None = None,
) -> tuple[dict[str, Any], str]:
    book = _create_bare_book(client)
    edition = _create_edition(
        client, book["id"], format=ruler.edition_format, length=length
    )
    engagement = _create_engagement(
        client,
        book["id"],
        started_on=started_on,
        edition_format=ruler.edition_format,
        length_override=length_override,
    )
    return edition, cast(str, engagement["id"])


def _mixed_engagement(client: TestClient) -> dict[str, Any]:
    """Create a 440-page read with its 430-minute audiobook also bound."""
    book = _create_bare_book(client)
    _create_edition(client, book["id"], length=440)
    audio = _create_edition(client, book["id"], "audio", length=430)
    engagement = _create_engagement(client, book["id"])
    _bind_edition(client, engagement["id"], audio["id"])
    return engagement


def _catch_up_engagement(client: TestClient) -> tuple[dict[str, Any], str]:
    """Create a 480-minute read with an unbound 400-page digital edition."""
    book = _create_bare_book(client)
    digital = _create_edition(client, book["id"], format="digital", length=400)
    _create_edition(client, book["id"], format="audio", length=480)
    engagement = _create_engagement(client, book["id"], edition_format="audio")
    return engagement, cast(str, digital["id"])


def _fake_volume(
    *,
    id: str = "abc123",
    title: str = "Piranesi",
    isbn_13: str | None = "9781526622426",
    page_count: int | None = 272,
    cover_url: str | None = "https://example.com/cover.jpg",
) -> dict[str, Any]:
    info: dict[str, Any] = {
        "title": title,
        "authors": ["Susanna Clarke"],
    }
    if isbn_13:
        info["industryIdentifiers"] = [{"type": "ISBN_13", "identifier": isbn_13}]
    if page_count is not None:
        info["pageCount"] = page_count
    if cover_url:
        info["imageLinks"] = {"thumbnail": cover_url}
    return {"id": id, "volumeInfo": info}


def _patch_google(
    monkeypatch: pytest.MonkeyPatch,
    handler: Callable[[httpx2.Request], httpx2.Response],
) -> None:
    monkeypatch.setattr(
        "app.services.google_books.httpx2.Client",
        functools.partial(httpx2.Client, transport=httpx2.MockTransport(handler)),
    )
