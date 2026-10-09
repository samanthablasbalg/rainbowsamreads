from __future__ import annotations

from fastapi.testclient import TestClient


def test_get_streak_succeeds(
    client: TestClient,
) -> None:

    response = client.get("/api/insights/streak")
    print(response.json())
    assert response.status_code == 200
