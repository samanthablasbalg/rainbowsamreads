from __future__ import annotations

import datetime

from fastapi.testclient import TestClient


def test_get_streak_today_marks_logged_on_true(
    client: TestClient,
) -> None:
    date = datetime.date.today().isoformat()
    response = client.get(f"/api/insights/streak?date={date}")

    assert response.status_code == 200
    assert response.json() == {"count": 1, "logged_today": True}
