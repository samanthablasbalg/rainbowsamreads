import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.crud import book_crud, book_recommendation_crud
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.recommendation import BookRecommendationRead, BookRecommendationWrite
from app.services.recommendations import (
    add_recommender_to_book,
)

router = APIRouter()

# Both /recommenders and /books/{book_id}/recommendations routes


@router.post(
    "/books/{book_id}/recommendations",
    response_model=BookRecommendationRead,
    status_code=status.HTTP_201_CREATED,
)
def add_recommender(
    book_id: uuid.UUID,
    payload: BookRecommendationWrite,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookRecommendationRead:
    book = book_crud.get_or_raise(db, book_id)
    book_recommendation = add_recommender_to_book(
        db, book.id, current_user.id, payload.name, payload.note
    )
    db.commit()
    db.refresh(book_recommendation)

    return BookRecommendationRead.model_validate(book_recommendation)


@router.get(
    "/books/{book_id}/recommendations", response_model=list[BookRecommendationRead]
)
def list_book_recommendations(
    book_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> list[BookRecommendationRead]:
    book_crud.get_or_raise(db, book_id)
    recommendations = book_recommendation_crud.list_by(db, book_id=book_id)
    return [BookRecommendationRead.model_validate(rec) for rec in recommendations]


# @router.delete(
#     "/{engagement_id}/progress-logs/{log_id}",
#     status_code=status.HTTP_204_NO_CONTENT,
# )
# def delete_progress_log(
#     engagement_id: uuid.UUID,
#     log_id: uuid.UUID,
#     db: Session = Depends(get_db),
# ) -> None:
#     engagement = engagement_crud.get_or_raise(db, engagement_id)
#     log = _find_log(engagement, log_id)
#     progress_log_service.delete_progress_log(db, engagement, log)
#     db.commit()
