import uuid

from fastapi.testclient import TestClient

from tests.helpers import _create_book


def test_add_recommender_to_book_creates_new_recommender(
    client: TestClient,
) -> None:
    book = _create_book(client)

    response = client.post(
        f"/api/books/{book['id']}/recommendations",
        json={
            "name": "Elmer Fudd",
            "note": "I own a mansion and a yacht",
        },
    )

    assert response.status_code == 201
    assert response.json()["recommender"]["name"] == "Elmer Fudd"
    assert response.json()["note"] == "I own a mansion and a yacht"


def test_add_recommender_without_note_creates_new_recommender(
    client: TestClient,
) -> None:
    book = _create_book(client)

    response = client.post(
        f"/api/books/{book['id']}/recommendations",
        json={
            "name": "Elmer Fudd",
        },
    )

    assert response.status_code == 201
    assert response.json()["recommender"]["name"] == "Elmer Fudd"
    assert response.json()["note"] is None


def test_same_recommender_on_second_book_reuses_existing_recommender(
    client: TestClient,
) -> None:
    book1 = _create_book(client)
    book2 = _create_book(client)

    response1 = client.post(
        f"/api/books/{book1['id']}/recommendations",
        json={
            "name": "Elmer Fudd",
            "note": "I own a mansion and a yacht",
        },
    )

    recommender_id = response1.json()["recommender"]["id"]

    response2 = client.post(
        f"/api/books/{book2['id']}/recommendations",
        json={
            "name": "Elmer Fudd",
            "note": "I am a miwwionaire",
        },
    )

    assert response2.json()["recommender"]["id"] == recommender_id
    assert response2.json()["note"] == "I am a miwwionaire"


def test_same_recommender_for_same_book_returns_409(client: TestClient) -> None:
    book = _create_book(client)

    client.post(
        f"/api/books/{book['id']}/recommendations",
        json={
            "name": "Elmer Fudd",
            "note": "I own a mansion and a yacht",
        },
    )

    response = client.post(
        f"/api/books/{book['id']}/recommendations",
        json={
            "name": "Elmer Fudd",
            "note": "I am a miwwionaire",
        },
    )

    assert response.status_code == 409
    assert (
        response.json()["detail"]
        == "Recommender with this name already exists for this book."
    )


def test_list_book_recommendations_returns_all_recommendations_for_book(
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

    response = client.get(f"/api/books/{book['id']}/recommendations")

    assert response.status_code == 200
    assert len(response.json()) == 2
    assert {
        (item["recommender"]["name"], item["note"]) for item in response.json()
    } == {
        ("Elmer Fudd", "I own a mansion and a yacht"),
        ("Bugs Bunny", "What's up, doc?"),
    }


def test_list_recommendations_for_book_with_none_returns_empty_list(
    client: TestClient,
) -> None:
    book = _create_book(client)

    response = client.get(f"/api/books/{book['id']}/recommendations")

    assert response.status_code == 200
    assert len(response.json()) == 0


def test_empty_recommendation_returns_422(client: TestClient) -> None:
    book = _create_book(client)

    response = client.post(
        f"/api/books/{book['id']}/recommendations",
        json={},
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Field required"


def test_add_recommendation_to_unknown_book_returns_404(client: TestClient) -> None:
    response = client.post(
        f"/api/books/{uuid.uuid4()}/recommendations",
        json={
            "name": "Elmer Fudd",
            "note": "I own a mansion and a yacht",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Book not found"
