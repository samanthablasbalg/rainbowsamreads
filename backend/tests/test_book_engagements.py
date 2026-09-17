from __future__ import annotations

import datetime
import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.engagement import Engagement
from app.models.enums import ReadingStatus
from app.models.user import User
from tests.helpers import _create_book, _create_engagement

# --- Ordering ---


def test_list_book_engagements_orders_by_started_on_not_finished_on(
    client: TestClient,
) -> None:
    book = _create_book(client)
    earlier_start = _create_engagement(client, book["id"], started_on="2019-03-01")
    client.patch(
        f"/api/engagements/{earlier_start['id']}",
        json={"status": "finished", "effective_on": "2026-06-01"},
    )
    later_start = _create_engagement(client, book["id"], started_on="2023-08-01")
    client.patch(
        f"/api/engagements/{later_start['id']}",
        json={"status": "finished", "effective_on": "2024-01-01"},
    )

    response = client.get(f"/api/books/{book['id']}/engagements")

    assert response.status_code == 200
    assert [engagement["id"] for engagement in response.json()] == [
        later_start["id"],
        earlier_start["id"],
    ]


def test_list_book_engagements_puts_an_undated_read_last(
    client: TestClient,
) -> None:
    book = _create_book(client)
    dated = _create_engagement(client, book["id"], started_on="2019-03-01")
    client.patch(
        f"/api/engagements/{dated['id']}",
        json={"status": "finished", "effective_on": "2019-03-20"},
    )
    undated = _create_engagement(client, book["id"], status="finished")

    response = client.get(f"/api/books/{book['id']}/engagements")

    assert response.status_code == 200
    assert [engagement["id"] for engagement in response.json()] == [
        dated["id"],
        undated["id"],
    ]


def test_list_book_engagements_breaks_started_on_ties_by_id(
    client: TestClient,
) -> None:
    book = _create_book(client)
    engagements = [
        _create_engagement(client, book["id"], status="finished") for _ in range(3)
    ]

    response = client.get(f"/api/books/{book['id']}/engagements")

    assert response.status_code == 200
    assert [engagement["id"] for engagement in response.json()] == sorted(
        engagement["id"] for engagement in engagements
    )


# --- Filtering ---


def test_list_book_engagements_excludes_other_books(client: TestClient) -> None:
    book = _create_book(client, title="Piranesi", author="Susanna Clarke")
    other = _create_book(client, title="Jonathan Strange", author="Susanna Clarke")
    mine = _create_engagement(client, book["id"])
    _create_engagement(client, other["id"])

    response = client.get(f"/api/books/{book['id']}/engagements")

    assert response.status_code == 200
    assert [engagement["id"] for engagement in response.json()] == [mine["id"]]


def test_list_book_engagements_excludes_another_users_reads(
    client: TestClient, owner_db: Session
) -> None:
    book = _create_book(client)
    mine = _create_engagement(client, book["id"], started_on="2026-01-01")

    user_y = User(email="user-y@example.com")
    owner_db.add(user_y)
    owner_db.flush()
    owner_db.add(
        Engagement(
            book_id=uuid.UUID(book["id"]),
            user_id=user_y.id,
            status=ReadingStatus.reading,
            started_on=datetime.date(2026, 6, 1),
        )
    )
    owner_db.commit()

    response = client.get(f"/api/books/{book['id']}/engagements")

    assert response.status_code == 200
    assert [engagement["id"] for engagement in response.json()] == [mine["id"]]


# --- Responses and errors ---


def test_list_book_engagements_is_empty_for_an_untracked_book(
    client: TestClient,
) -> None:
    book = _create_book(client)

    response = client.get(f"/api/books/{book['id']}/engagements")

    assert response.status_code == 200
    assert response.json() == []


def test_list_book_engagements_unknown_book_returns_404(client: TestClient) -> None:
    response = client.get(f"/api/books/{uuid.uuid4()}/engagements")
    assert response.status_code == 404


def test_list_book_engagements_includes_rating_and_review(client: TestClient) -> None:
    book = _create_book(client)
    engagement = _create_engagement(client, book["id"])
    client.patch(f"/api/engagements/{engagement['id']}", json={"status": "finished"})
    upsert = client.put(
        f"/api/engagements/{engagement['id']}/review",
        json={"rating": 4.5, "body": "Better the second time."},
    )
    assert upsert.status_code == 200, upsert.text

    response = client.get(f"/api/books/{book['id']}/engagements")

    assert response.status_code == 200
    assert len(response.json()) == 1
    review = response.json()[0]["review"]
    assert review["rating"] == "4.50"
    assert review["body"] == "Better the second time."
