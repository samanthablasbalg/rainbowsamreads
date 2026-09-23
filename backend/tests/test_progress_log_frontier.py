from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.helpers import (
    MINUTES,
    PAGES,
    RULERS,
    Ruler,
    _bind_edition,
    _create_bare_book,
    _create_edition,
    _create_engagement,
    _mixed_engagement,
    _read_with_length,
)

CATCH_UP_DIRECTIONS = [
    pytest.param(PAGES, 400, MINUTES, 480, id="pages-to-audio"),
    pytest.param(MINUTES, 480, PAGES, 400, id="audio-to-pages"),
]


def _read_with_unbound_catch_up_ruler(
    client: TestClient,
    source_ruler: Ruler,
    source_length: int,
    catch_up_ruler: Ruler,
    catch_up_length: int,
) -> tuple[str, str]:
    book = _create_bare_book(client)
    _create_edition(
        client,
        book["id"],
        format=source_ruler.edition_format,
        length=source_length,
    )
    catch_up_edition = _create_edition(
        client,
        book["id"],
        format=catch_up_ruler.edition_format,
        length=catch_up_length,
    )
    engagement = _create_engagement(
        client,
        book["id"],
        edition_format=source_ruler.edition_format,
    )
    return engagement["id"], catch_up_edition["id"]


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_starting_past_frontier_returns_409(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)
    ruler.log_progress(client, engagement_id, 100)

    response = client.post(
        f"/api/engagements/{engagement_id}/progress-logs",
        json=ruler.span_payload(150, 200),
    )

    assert response.status_code == 409
    assert (
        response.json()["detail"]
        == "A session can't start past where this read has got to."
    )


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_behind_frontier_is_recoverage(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)
    ruler.log_progress(client, engagement_id, 75)

    log = ruler.log_span(client, engagement_id, 20, 50)

    assert log[ruler.log_start_field] == 20
    assert log[ruler.log_end_field] == 50
    assert log["new_ground"] is False


@pytest.mark.parametrize(
    (
        "source_ruler",
        "source_position",
        "next_ruler",
        "next_position",
        "expected_next_start",
        "expected_source_resume",
        "expected_completion",
    ),
    [
        pytest.param(
            PAGES,
            220,
            MINUTES,
            300,
            215,
            307,
            70,
            id="pages-to-audio",
        ),
        pytest.param(
            MINUTES,
            215,
            PAGES,
            300,
            220,
            293,
            68,
            id="audio-to-pages",
        ),
    ],
)
def test_alternating_rulers_tile_without_a_gap(
    client: TestClient,
    source_ruler: Ruler,
    source_position: int,
    next_ruler: Ruler,
    next_position: int,
    expected_next_start: int,
    expected_source_resume: int,
    expected_completion: int,
) -> None:
    engagement = _mixed_engagement(client)
    engagement_id = engagement["id"]
    source_ruler.log_span(client, engagement_id, 0, source_position)

    next_log = next_ruler.log_progress(client, engagement_id, next_position)

    assert next_log[next_ruler.log_start_field] == expected_next_start
    response = client.get(f"/api/engagements/{engagement_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["completion_pct"] == expected_completion
    assert data["resume_unit"] == next_ruler.unit
    assert data[source_ruler.resume_field] == expected_source_resume

    source_log = source_ruler.log_progress(client, engagement_id, 400)
    assert source_log[source_ruler.log_start_field] == expected_source_resume


@pytest.mark.parametrize(
    "source_ruler, source_position, catch_up_ruler, catch_up_end",
    [
        pytest.param(PAGES, 220, MINUTES, 60, id="pages-to-audio"),
        pytest.param(MINUTES, 215, PAGES, 60, id="audio-to-pages"),
    ],
)
def test_recoverage_on_other_ruler_does_not_move_shared_frontier(
    client: TestClient,
    source_ruler: Ruler,
    source_position: int,
    catch_up_ruler: Ruler,
    catch_up_end: int,
) -> None:
    engagement = _mixed_engagement(client)
    engagement_id = engagement["id"]
    source_ruler.log_span(client, engagement_id, 0, source_position)

    log = catch_up_ruler.log_span(client, engagement_id, 0, catch_up_end)

    assert log["new_ground"] is False
    response = client.get(f"/api/engagements/{engagement_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["completion_pct"] == 50
    assert data["resume_unit"] == source_ruler.unit
    assert data[source_ruler.resume_field] == source_position
    assert data[catch_up_ruler.resume_field] == catch_up_end


@pytest.mark.parametrize(
    "source_ruler, source_length, catch_up_ruler, catch_up_length",
    CATCH_UP_DIRECTIONS,
)
def test_catching_up_second_ruler_leaves_shared_frontier_where_it_was(
    client: TestClient,
    source_ruler: Ruler,
    source_length: int,
    catch_up_ruler: Ruler,
    catch_up_length: int,
) -> None:
    source_position = source_length // 4
    catch_up_frontier = catch_up_length // 4
    catch_up_start = catch_up_frontier // 2
    catch_up_position = catch_up_frontier * 3 // 4
    engagement_id, catch_up_edition_id = _read_with_unbound_catch_up_ruler(
        client,
        source_ruler,
        source_length,
        catch_up_ruler,
        catch_up_length,
    )
    source_ruler.log_progress(client, engagement_id, source_position)
    _bind_edition(client, engagement_id, catch_up_edition_id)

    response = client.get(f"/api/engagements/{engagement_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["completion_pct"] == 25
    assert data[catch_up_ruler.resume_field] == catch_up_frontier

    catch_up = catch_up_ruler.log_span(
        client,
        engagement_id,
        catch_up_start,
        catch_up_position,
    )

    assert catch_up["new_ground"] is False
    response = client.get(f"/api/engagements/{engagement_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["completion_pct"] == 25
    assert data["resume_unit"] == source_ruler.unit
    assert data[source_ruler.resume_field] == source_position
    assert data[catch_up_ruler.resume_field] == catch_up_position

    rest_of_the_catch_up = catch_up_ruler.log_span(
        client,
        engagement_id,
        catch_up_position,
        catch_up_frontier,
    )

    assert rest_of_the_catch_up["new_ground"] is False
    response = client.get(f"/api/engagements/{engagement_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["completion_pct"] == 25
    assert data[source_ruler.resume_field] == source_position
    assert data[catch_up_ruler.resume_field] == catch_up_frontier


@pytest.mark.parametrize(
    "source_ruler, source_length, catch_up_ruler, catch_up_length",
    CATCH_UP_DIRECTIONS,
)
def test_frontier_outruns_resume_point_while_catch_up_is_open(
    client: TestClient,
    source_ruler: Ruler,
    source_length: int,
    catch_up_ruler: Ruler,
    catch_up_length: int,
) -> None:
    source_position = source_length // 4
    catch_up_frontier = catch_up_length // 4
    catch_up_start = catch_up_frontier // 2
    catch_up_position = catch_up_frontier * 3 // 4
    engagement_id, catch_up_edition_id = _read_with_unbound_catch_up_ruler(
        client,
        source_ruler,
        source_length,
        catch_up_ruler,
        catch_up_length,
    )
    source_ruler.log_progress(client, engagement_id, source_position)
    _bind_edition(client, engagement_id, catch_up_edition_id)
    catch_up_ruler.log_span(
        client,
        engagement_id,
        catch_up_start,
        catch_up_position,
    )

    response = client.get(f"/api/engagements/{engagement_id}")
    assert response.status_code == 200
    data = response.json()
    assert data[catch_up_ruler.resume_field] == catch_up_position
    assert data[catch_up_ruler.frontier_field] == catch_up_frontier
    assert data[source_ruler.resume_field] == source_position
    assert data[source_ruler.frontier_field] == source_position

    resumed = catch_up_ruler.log_span(
        client,
        engagement_id,
        catch_up_frontier,
        catch_up_frontier + catch_up_length // 10,
    )
    assert resumed["new_ground"] is True


@pytest.mark.parametrize("ruler", RULERS)
def test_session_crossing_frontier_is_stored_as_recoverage_then_new_ground(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 400)
    ruler.log_progress(client, engagement_id, 200)

    new_ground = ruler.log_span(client, engagement_id, 180, 250)

    response = client.get(f"/api/engagements/{engagement_id}/progress-logs")
    assert response.status_code == 200
    logs = response.json()
    assert [
        (
            log[ruler.log_start_field],
            log[ruler.log_end_field],
            log["new_ground"],
        )
        for log in logs
    ] == [
        (0, 200, True),
        (180, 200, False),
        (200, 250, True),
    ]
    assert new_ground["id"] == logs[-1]["id"]
    assert logs[-2]["created_at"] == logs[-1]["created_at"]

    engagement_response = client.get(f"/api/engagements/{engagement_id}")
    assert engagement_response.status_code == 200
    assert engagement_response.json()["completion_pct"] == 62
