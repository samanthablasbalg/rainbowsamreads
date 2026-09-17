from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from tests.helpers import (
    RULERS,
    Ruler,
    _create_book,
    _create_engagement,
    _log_progress,
    _read_with_length,
)


@pytest.mark.parametrize("ruler", RULERS)
def test_delete_latest_progress_log_returns_204_and_removes_it(
    client: TestClient, ruler: Ruler
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300, started_on="2026-01-01")
    log = ruler.log_progress(client, engagement_id, 100, logged_on="2026-01-10")

    response = client.delete(
        f"/api/engagements/{engagement_id}/progress-logs/{log['id']}"
    )

    assert response.status_code == 204
    list_response = client.get(f"/api/engagements/{engagement_id}/progress-logs")
    assert list_response.status_code == 200
    assert list_response.json() == []


@pytest.mark.parametrize("ruler", RULERS)
def test_delete_earlier_progress_log_returns_409_and_preserves_history(
    client: TestClient, ruler: Ruler
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300, started_on="2026-01-01")
    first = ruler.log_progress(client, engagement_id, 100, logged_on="2026-01-10")
    second = ruler.log_progress(client, engagement_id, 200, logged_on="2026-01-20")

    response = client.delete(
        f"/api/engagements/{engagement_id}/progress-logs/{first['id']}"
    )

    assert response.status_code == 409
    list_response = client.get(f"/api/engagements/{engagement_id}/progress-logs")
    assert list_response.status_code == 200
    assert [log["id"] for log in list_response.json()] == [first["id"], second["id"]]


@pytest.mark.parametrize("ruler", RULERS)
@pytest.mark.parametrize(
    "crossing_log_index",
    [
        pytest.param(0, id="previously-covered-log"),
        pytest.param(1, id="new-ground-log"),
    ],
)
def test_delete_either_log_created_when_session_crosses_frontier_removes_both_logs(
    client: TestClient,
    ruler: Ruler,
    crossing_log_index: int,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 400, started_on="2026-01-01")
    original = ruler.log_progress(client, engagement_id, 200, logged_on="2026-01-10")
    ruler.log_span(
        client,
        engagement_id,
        180,
        250,
        logged_on="2026-01-11",
    )

    list_response = client.get(f"/api/engagements/{engagement_id}/progress-logs")
    assert list_response.status_code == 200
    crossing_logs = list_response.json()[-2:]
    assert [
        (
            log[ruler.log_start_field],
            log[ruler.log_end_field],
            log["new_ground"],
        )
        for log in crossing_logs
    ] == [(180, 200, False), (200, 250, True)]
    assert crossing_logs[0]["created_at"] == crossing_logs[1]["created_at"]

    response = client.delete(
        f"/api/engagements/{engagement_id}/progress-logs/"
        f"{crossing_logs[crossing_log_index]['id']}"
    )

    assert response.status_code == 204
    remaining_response = client.get(f"/api/engagements/{engagement_id}/progress-logs")
    assert remaining_response.status_code == 200
    assert [log["id"] for log in remaining_response.json()] == [original["id"]]


def test_delete_progress_log_unknown_engagement_returns_404(
    client: TestClient,
) -> None:
    response = client.delete(
        f"/api/engagements/{uuid.uuid4()}/progress-logs/{uuid.uuid4()}"
    )

    assert response.status_code == 404


def test_delete_unknown_progress_log_from_known_engagement_returns_404(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])

    response = client.delete(
        f"/api/engagements/{engagement['id']}/progress-logs/{uuid.uuid4()}"
    )

    assert response.status_code == 404


def test_delete_progress_log_from_different_engagement_returns_404(
    client: TestClient,
) -> None:
    first_book = _create_book(client, title="Piranesi")
    first_engagement = _create_engagement(client, first_book["id"])
    log = _log_progress(client, first_engagement["id"], 100)
    second_book = _create_book(client, title="Jonathan Strange & Mr Norrell")
    second_engagement = _create_engagement(client, second_book["id"])

    response = client.delete(
        f"/api/engagements/{second_engagement['id']}/progress-logs/{log['id']}"
    )

    assert response.status_code == 404
