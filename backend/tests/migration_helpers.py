from __future__ import annotations

import uuid

from sqlalchemy import Connection, text


def _insert_book(connection: Connection) -> uuid.UUID:
    book_id = uuid.uuid4()
    connection.execute(
        text(
            """
            INSERT INTO books (
                id,
                title,
                genres,
                publication_date_precision,
                created_at,
                updated_at
            )
            VALUES (:book_id, 'Piranesi', '{}', 'day', now(), now())
            """
        ),
        {"book_id": book_id},
    )
    return book_id


def _insert_engagement(connection: Connection, user_id: uuid.UUID) -> uuid.UUID:
    engagement_id = uuid.uuid4()
    connection.execute(
        text(
            """
            INSERT INTO engagements (
                id,
                book_id,
                user_id,
                status,
                interested_on_precision,
                tbr_added_on_precision,
                acquired_on_precision,
                started_on_precision,
                finished_on_precision,
                abandoned_on_precision,
                created_at,
                updated_at
            )
            VALUES (
                :engagement_id,
                :book_id,
                :user_id,
                'reading',
                'day',
                'day',
                'day',
                'day',
                'day',
                'day',
                now(),
                now()
            )
            """
        ),
        {
            "book_id": _insert_book(connection),
            "engagement_id": engagement_id,
            "user_id": user_id,
        },
    )
    return engagement_id
