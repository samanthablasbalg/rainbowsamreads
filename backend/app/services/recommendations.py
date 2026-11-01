import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.crud import book_recommendation_crud, recommender_crud
from app.exceptions import ConflictError
from app.models.recommendation import BookRecommendation

# List/resolve recommenders; add, edit, and remove recommendations; ensure TBR


def add_recommender_to_book(
    db: Session, book_id: uuid.UUID, user_id: uuid.UUID, name: str, note: str | None
) -> BookRecommendation:
    recommender = recommender_crud.get_or_create(
        db, lookup={"user_id": user_id, "name": name}
    )
    try:
        book_recommendation = book_recommendation_crud.create(
            db,
            BookRecommendation(
                book_id=book_id,
                user_id=user_id,
                recommender_id=recommender.id,
                note=note,
            ),
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(
            "Recommender with this name already exists for this book."
        ) from None

    return book_recommendation
