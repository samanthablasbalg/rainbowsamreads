from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.helpers import RULERS, Ruler, _read_with_length


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_with_note_returns_it(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)

    log = ruler.log_span(client, engagement_id, 0, 100, note="A striking quote.")

    assert log["note"] == "A striking quote."


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_zero_length_span_with_note_returns_201(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)
    ruler.log_progress(client, engagement_id, 100)

    log = ruler.log_span(
        client,
        engagement_id,
        100,
        100,
        note="Still at this position.",
    )

    assert log[ruler.log_start_field] == 100
    assert log[ruler.log_end_field] == 100
    assert log["new_ground"] is True
    assert log["note"] == "Still at this position."


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_allows_multiple_zero_length_notes_at_same_position(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)
    ruler.log_progress(client, engagement_id, 100)

    first = ruler.log_span(client, engagement_id, 100, 100, note="First quote.")
    second = ruler.log_span(client, engagement_id, 100, 100, note="Second quote.")

    assert first["id"] != second["id"]
    assert first["note"] == "First quote."
    assert second["note"] == "Second quote."


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_without_note_returns_null_note(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)

    log = ruler.log_span(client, engagement_id, 0, 100)

    assert log["note"] is None


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_zero_length_span_without_note_returns_409(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)
    ruler.log_progress(client, engagement_id, 100)

    response = client.post(
        f"/api/engagements/{engagement_id}/progress-logs",
        json=ruler.span_payload(100, 100),
    )

    assert response.status_code == 409


@pytest.mark.parametrize("ruler", RULERS)
def test_log_progress_with_note_starting_past_frontier_returns_409(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)
    ruler.log_progress(client, engagement_id, 100)

    response = client.post(
        f"/api/engagements/{engagement_id}/progress-logs",
        json=ruler.span_payload(150, 200, note="A note"),
    )

    assert response.status_code == 409
    assert (
        response.json()["detail"]
        == "A session can't start past where this read has got to."
    )


@pytest.mark.parametrize("ruler", RULERS)
def test_session_crossing_frontier_puts_note_on_new_ground_row(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 400)
    ruler.log_progress(client, engagement_id, 200)

    ruler.log_span(client, engagement_id, 180, 250, note="Worth rereading.")

    response = client.get(f"/api/engagements/{engagement_id}/progress-logs")
    assert response.status_code == 200
    logs = response.json()
    assert logs[-2]["note"] is None
    assert logs[-1]["note"] == "Worth rereading."


@pytest.mark.parametrize("ruler", RULERS)
@pytest.mark.parametrize(
    "initial_note, updated_note",
    [
        pytest.param(None, "A striking quote.", id="set"),
        pytest.param("First draft.", "Revised.", id="change"),
    ],
)
def test_patch_log_sets_or_changes_note(
    client: TestClient,
    ruler: Ruler,
    initial_note: str | None,
    updated_note: str,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)
    log = ruler.log_span(client, engagement_id, 0, 100, note=initial_note)

    response = client.patch(
        f"/api/engagements/{engagement_id}/progress-logs/{log['id']}",
        json={"note": updated_note},
    )

    assert response.status_code == 200
    assert response.json()["note"] == updated_note


@pytest.mark.parametrize("ruler", RULERS)
def test_patch_log_empty_note_clears_it(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)
    log = ruler.log_span(
        client,
        engagement_id,
        0,
        100,
        note="A striking quote.",
    )

    response = client.patch(
        f"/api/engagements/{engagement_id}/progress-logs/{log['id']}",
        json={"note": ""},
    )

    assert response.status_code == 200
    assert response.json()["note"] is None


@pytest.mark.parametrize("ruler", RULERS)
def test_patch_log_omitting_note_leaves_it_unchanged(
    client: TestClient,
    ruler: Ruler,
) -> None:
    _, engagement_id = _read_with_length(client, ruler, 300)
    log = ruler.log_span(
        client,
        engagement_id,
        0,
        100,
        note="A striking quote.",
    )

    response = client.patch(
        f"/api/engagements/{engagement_id}/progress-logs/{log['id']}",
        json={ruler.log_end_field: 150},
    )

    assert response.status_code == 200
    assert response.json()["note"] == "A striking quote."
