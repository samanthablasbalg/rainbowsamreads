from __future__ import annotations

import datetime

import pytest
from fastapi.testclient import TestClient

from tests.helpers import (
    MINUTES,
    PAGES,
    RULERS,
    Ruler,
    _mixed_engagement,
    _read_with_length,
)


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_before_engagement_start_returns_409(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(
        client,
        ruler,
        300,
        started_on="2026-01-15",
    )

    response = client.post(
        f"/api/engagements/{engagement_id}/progress-logs",
        json=ruler.span_payload(0, 50, logged_on="2026-01-10"),
    )

    assert response.status_code == 409


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_on_future_date_returns_422(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)
    future = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()

    response = client.post(
        f"/api/engagements/{engagement_id}/progress-logs",
        json=ruler.span_payload(0, 50, logged_on=future),
    )

    assert response.status_code == 422


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_backdated_behind_later_day_returns_409(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(
        client,
        ruler,
        300,
        started_on="2026-01-01",
    )
    ruler.log_span(client, engagement_id, 0, 100, logged_on="2026-01-20")

    response = client.post(
        f"/api/engagements/{engagement_id}/progress-logs",
        json=ruler.span_payload(100, 200, logged_on="2026-01-10"),
    )

    assert response.status_code == 409


@pytest.mark.parametrize(
    "source_ruler, source_length, catch_up_ruler, catch_up_length",
    [
        pytest.param(PAGES, 440, MINUTES, 430, id="pages-to-audio"),
        pytest.param(MINUTES, 430, PAGES, 440, id="audio-to-pages"),
    ],
)
def test_cross_ruler_recoverage_can_be_backdated_behind_later_day(
    client: TestClient,
    source_ruler: Ruler,
    source_length: int,
    catch_up_ruler: Ruler,
    catch_up_length: int,
) -> None:
    engagement = _mixed_engagement(client, started_on="2026-01-01")
    engagement_id = engagement["id"]
    source_ruler.log_span(
        client,
        engagement_id,
        0,
        source_length // 4,
        logged_on="2026-01-10",
    )
    source_ruler.log_span(
        client,
        engagement_id,
        source_length // 4,
        source_length // 2,
        logged_on="2026-01-20",
    )

    response = client.post(
        f"/api/engagements/{engagement_id}/progress-logs",
        json=catch_up_ruler.span_payload(
            0,
            catch_up_length // 8,
            logged_on="2026-01-15",
        ),
    )

    assert response.status_code == 201
    assert response.json()["new_ground"] is False
    assert response.json()["logged_on"] == "2026-01-15"


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_on_same_day_as_existing_log_is_allowed(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(
        client,
        ruler,
        300,
        started_on="2026-01-01",
    )
    ruler.log_span(client, engagement_id, 0, 100, logged_on="2026-01-10")

    response = client.post(
        f"/api/engagements/{engagement_id}/progress-logs",
        json=ruler.span_payload(100, 200, logged_on="2026-01-10"),
    )

    assert response.status_code == 201
    assert response.json()["logged_on"] == "2026-01-10"
    list_response = client.get(f"/api/engagements/{engagement_id}/progress-logs")
    assert list_response.status_code == 200
    logs = list_response.json()
    assert len(logs) == 2
    assert logs[-1][ruler.log_end_field] == 200
