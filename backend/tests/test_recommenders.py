from fastapi.testclient import TestClient

from tests.helpers import _create_book


def test_get_recommender_returns_existing_recommender(
    client: TestClient,
) -> None:
    book = _create_book(client)

    rec = client.post(
        f"/api/books/{book['id']}/recommendations",
        json={
            "name": "Elmer Fudd",
            "note": "I own a mansion and a yacht",
        },
    )

    response = client.get(f"/api/recommenders/{rec.json()['recommender']['id']}")

    assert response.status_code == 200
    assert response.json()["name"] == "Elmer Fudd"


def test_get_recommender_list_returns_all_existing_recommender(
    client: TestClient,
) -> None:
    book = _create_book(client)

    client.post(
        f"/api/books/{book['id']}/recommendations",
        json={
            "name": "Elmer Fudd",
            "note": "I own a mansion and a yacht",
        },
    )

    client.post(
        f"/api/books/{book['id']}/recommendations",
        json={
            "name": "Bugs Bunny",
            "note": "What's up, doc?",
        },
    )

    response = client.get("/api/recommenders/")

    assert response.status_code == 200
    assert len(response.json()) == 2
    assert {(item["name"]) for item in response.json()} == {
        ("Elmer Fudd"),
        ("Bugs Bunny"),
    }
