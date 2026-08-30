from __future__ import annotations

import functools
from collections.abc import Callable
from typing import Any, cast

import httpx2
import pytest
from fastapi.testclient import TestClient

from app.models.enums import LogUnit


def _create_book(
    client: TestClient,
    title: str = "Piranesi",
    author: str = "Susanna Clarke",
) -> dict[str, Any]:
    response = client.post("/api/books", json={"title": title, "author": author})
    assert response.status_code == 201
    book = cast(dict[str, Any], response.json())
    client.post("/api/editions", json={"book_id": book["id"], "format": "print"})
    client.post("/api/editions", json={"book_id": book["id"], "format": "digital"})
    client.post("/api/editions", json={"book_id": book["id"], "format": "audio"})
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
    edition_format: str = "print",
) -> dict[str, Any]:
    body: dict[str, Any] = {"book_id": book_id, "edition_format": edition_format}
    if started_on is not None:
        body["started_on"] = started_on
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
