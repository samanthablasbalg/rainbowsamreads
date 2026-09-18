from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from tests.helpers import _create_book, _create_engagement


@pytest.mark.parametrize("status", ["finished", "dnf"])
def test_upsert_review_creates_review_for_completed_engagement(
    client: TestClient,
    status: str,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], status=status)

    response = client.put(
        f"/api/engagements/{engagement['id']}/review",
        json={"rating": 4.0},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["review"]["rating"] == "4.00"
    assert data["review"]["body"] is None


def test_upsert_review_with_body(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], status="finished")

    response = client.put(
        f"/api/engagements/{engagement['id']}/review",
        json={"rating": 3.75, "body": "Loved it."},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["review"]["rating"] == "3.75"
    assert data["review"]["body"] == "Loved it."


def test_upsert_review_updates_existing_review(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], status="finished")
    create_response = client.put(
        f"/api/engagements/{engagement['id']}/review",
        json={"rating": 3.0, "body": "OK."},
    )
    assert create_response.status_code == 200

    response = client.put(
        f"/api/engagements/{engagement['id']}/review",
        json={"rating": 4.25, "body": "Actually great."},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["review"]["rating"] == "4.25"
    assert data["review"]["body"] == "Actually great."


@pytest.mark.parametrize(
    "rating",
    [
        pytest.param(0.75, id="below-minimum"),
        pytest.param(5.25, id="above-maximum"),
        pytest.param(3.3, id="not-quarter-step"),
    ],
)
def test_upsert_review_rejects_invalid_rating(
    client: TestClient,
    rating: float,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], status="finished")

    response = client.put(
        f"/api/engagements/{engagement['id']}/review",
        json={"rating": rating},
    )

    assert response.status_code == 422


@pytest.mark.parametrize("status", ["reading"])
def test_upsert_review_for_incomplete_engagement_returns_409(
    client: TestClient,
    status: str,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], status=status)

    response = client.put(
        f"/api/engagements/{engagement['id']}/review",
        json={"rating": 4.0},
    )

    assert response.status_code == 409


@pytest.mark.parametrize("rating", [1.0, 5.0])
def test_upsert_review_accepts_boundary_rating(
    client: TestClient,
    rating: float,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], status="finished")

    response = client.put(
        f"/api/engagements/{engagement['id']}/review",
        json={"rating": rating},
    )

    assert response.status_code == 200
    assert response.json()["review"]["rating"] == f"{rating:.2f}"


def test_engagement_review_is_null_before_upsert(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], status="finished")

    response = client.get("/api/engagements?status=finished")

    assert response.status_code == 200
    data = response.json()
    assert data[0]["id"] == engagement["id"]
    assert data[0]["review"] is None


def test_upsert_review_with_body_and_omitted_rating_stores_null_rating(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], status="finished")

    response = client.put(
        f"/api/engagements/{engagement['id']}/review",
        json={"body": "Really enjoyed this one."},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["review"]["rating"] is None
    assert data["review"]["body"] == "Really enjoyed this one."


def test_upsert_review_with_omitted_rating_clears_existing_rating(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"], status="finished")
    create_response = client.put(
        f"/api/engagements/{engagement['id']}/review",
        json={"rating": 4.0},
    )
    assert create_response.status_code == 200

    response = client.put(
        f"/api/engagements/{engagement['id']}/review",
        json={"body": "Changed my mind, no star rating."},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["review"]["rating"] is None
    assert data["review"]["body"] == "Changed my mind, no star rating."


def test_upsert_review_unknown_engagement_returns_404(client: TestClient) -> None:
    response = client.put(
        f"/api/engagements/{uuid.uuid4()}/review",
        json={"rating": 4.0},
    )

    assert response.status_code == 404
