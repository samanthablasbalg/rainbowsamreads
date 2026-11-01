from fastapi.testclient import TestClient

from tests.helpers import _create_book


def test_add_recommender_to_book_creates_new_recommender(
    client: TestClient,
) -> None:
    book = _create_book(client)

    response = client.post(
        f"/api/books/{book['id']}/recommenders",
        json={
            "name": "Elmer Fudd",
            "note": "I own a mansion and a yacht",
        },
    )

    assert response.status_code == 201
    assert response.json()["recommender"]["name"] == "Elmer Fudd"
    assert response.json()["note"] == "I own a mansion and a yacht"


def test_duplicate_recommender_on_second_book_reuses_existing_recommender(
    client: TestClient,
) -> None:
    book1 = _create_book(client)
    book2 = _create_book(client)

    response1 = client.post(
        f"/api/books/{book1['id']}/recommenders",
        json={
            "name": "Elmer Fudd",
            "note": "I own a mansion and a yacht",
        },
    )

    recommender_id = response1.json()["recommender"]["id"]

    response2 = client.post(
        f"/api/books/{book2['id']}/recommenders",
        json={
            "name": "Elmer Fudd",
            "note": "I am a miwwionaire",
        },
    )

    assert response2.json()["recommender"]["id"] == recommender_id
    assert response2.json()["note"] == "I am a miwwionaire"
