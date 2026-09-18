from __future__ import annotations

import httpx2
import pytest
from fastapi.testclient import TestClient

from tests.helpers import (
    _create_bare_book,
    _create_book,
    _create_edition,
    _create_engagement,
    _fake_volume,
    _patch_google,
)


def test_search_returns_google_candidates(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    volume = _fake_volume(authors=["Susanna Clarke"], categories=["Fantasy"])

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json={"items": [volume]})

    _patch_google(monkeypatch, handler)

    response = client.get("/api/books/search?q=piranesi")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    candidate = data[0]
    assert candidate["state"] == "not_in_app"
    assert candidate["book_id"] is None
    assert candidate["status"] is None
    assert candidate["google_books_id"] == "abc123"
    assert candidate["title"] == "Piranesi"
    assert candidate["authors"] == ["Susanna Clarke"]
    assert candidate["published_date"] == "2020-09-15"
    assert candidate["page_count"] == 272
    assert candidate["categories"] == ["Fantasy"]
    assert candidate["cover_url"] == "https://example.com/cover.jpg"
    assert candidate["language"] == "en"


def test_search_returns_catalog_book_without_engagement(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    book = _create_bare_book(client, title="Piranesi", author="Susanna Clarke")

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json={})

    _patch_google(monkeypatch, handler)

    response = client.get("/api/books/search?q=piranesi")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["state"] == "in_catalog"
    assert data[0]["book_id"] == book["id"]
    assert data[0]["status"] is None


@pytest.mark.parametrize("status", ["tbr", "reading", "finished", "dnf"])
def test_search_returns_library_book_with_engagement_status(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    status: str,
) -> None:
    book = _create_book(client, title="Piranesi", author="Susanna Clarke")
    _create_engagement(client, book["id"], status=status)

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json={})

    _patch_google(monkeypatch, handler)

    response = client.get("/api/books/search?q=piranesi")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["state"] == "in_library"
    assert data[0]["status"] == status


def test_search_matches_local_book_by_author_name(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _create_bare_book(client, title="Piranesi", author="Susanna Clarke")

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json={})

    _patch_google(monkeypatch, handler)

    response = client.get("/api/books/search?q=clarke")

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_search_prefers_reading_status_when_book_has_multiple_engagements(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    book = _create_book(client, title="Piranesi", author="Susanna Clarke")
    finished = _create_engagement(client, book["id"])
    finish_response = client.patch(
        f"/api/engagements/{finished['id']}", json={"status": "finished"}
    )
    assert finish_response.status_code == 200
    _create_engagement(client, book["id"], edition_format="audio")

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json={})

    _patch_google(monkeypatch, handler)

    response = client.get("/api/books/search?q=piranesi")

    assert response.status_code == 200
    assert response.json()[0]["status"] == "reading"


def test_search_uses_most_recent_status_when_book_has_no_reading_engagement(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    book = _create_book(client, title="Piranesi", author="Susanna Clarke")
    first = _create_engagement(client, book["id"])
    dnf_response = client.patch(
        f"/api/engagements/{first['id']}", json={"status": "dnf"}
    )
    assert dnf_response.status_code == 200
    second = _create_engagement(client, book["id"], edition_format="audio")
    finish_response = client.patch(
        f"/api/engagements/{second['id']}", json={"status": "finished"}
    )
    assert finish_response.status_code == 200

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json={})

    _patch_google(monkeypatch, handler)

    response = client.get("/api/books/search?q=piranesi")

    assert response.status_code == 200
    assert response.json()[0]["status"] == "finished"


def test_search_deduplicates_google_candidate_by_google_books_id(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    volume = _fake_volume(id="abc123", authors=["Susanna Clarke"])

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json=volume)

    _patch_google(monkeypatch, handler)
    import_response = client.post(
        "/api/books/import", json={"google_books_id": "abc123"}
    )
    assert import_response.status_code == 201

    def search_handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json={"items": [volume]})

    _patch_google(monkeypatch, search_handler)

    response = client.get("/api/books/search?q=piranesi")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["state"] == "in_catalog"
    assert data[0]["google_books_id"] == "abc123"


def test_search_deduplicates_google_candidate_by_isbn(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    book = _create_bare_book(client, title="Piranesi", author="Susanna Clarke")
    _create_edition(client, book["id"], format="print", isbn="9781526622426")
    volume = _fake_volume(
        id="differentid",
        authors=["Susanna Clarke"],
        isbn_13="9781526622426",
    )

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json={"items": [volume]})

    _patch_google(monkeypatch, handler)

    response = client.get("/api/books/search?q=piranesi")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["state"] == "in_catalog"


def test_search_google_failure_degrades_to_local_results(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    book = _create_bare_book(client, title="Piranesi", author="Susanna Clarke")

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(500)

    _patch_google(monkeypatch, handler)

    response = client.get("/api/books/search?q=piranesi")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["book_id"] == book["id"]
    assert data[0]["state"] == "in_catalog"


def test_search_google_failure_without_local_results_returns_502(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(500)

    _patch_google(monkeypatch, handler)

    response = client.get("/api/books/search?q=zzznomatch")

    assert response.status_code == 502


def test_search_retries_transient_google_failure_and_succeeds(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    volume = _fake_volume(authors=["Susanna Clarke"])
    attempts = {"count": 0}
    monkeypatch.setattr("app.services.google_books.time.sleep", lambda _: None)

    def handler(request: httpx2.Request) -> httpx2.Response:
        attempts["count"] += 1
        if attempts["count"] < 3:
            return httpx2.Response(503, json={"error": {"message": "backendFailed"}})
        return httpx2.Response(200, json={"items": [volume]})

    _patch_google(monkeypatch, handler)

    response = client.get("/api/books/search?q=piranesi")

    assert response.status_code == 200
    assert attempts["count"] == 3
    assert response.json()[0]["google_books_id"] == "abc123"


def test_search_upgrades_google_cover_url_to_https(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    volume = _fake_volume(cover_url="http://books.google.com/books/content?id=x&img=1")

    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json={"items": [volume]})

    _patch_google(monkeypatch, handler)

    response = client.get("/api/books/search?q=piranesi")

    assert response.status_code == 200
    assert response.json()[0]["cover_url"] == (
        "https://books.google.com/books/content?id=x&img=1"
    )


def test_search_with_no_matches_returns_empty_list(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        return httpx2.Response(200, json={})

    _patch_google(monkeypatch, handler)

    response = client.get("/api/books/search?q=zzznomatch")

    assert response.status_code == 200
    assert response.json() == []


def test_search_with_empty_query_returns_422(client: TestClient) -> None:
    response = client.get("/api/books/search?q=")

    assert response.status_code == 422
