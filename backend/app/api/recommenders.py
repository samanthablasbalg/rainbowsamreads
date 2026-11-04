from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud import recommender_crud
from app.database import get_db
from app.schemas.recommender import RecommenderRead

router = APIRouter(prefix="/recommenders", tags=["recommenders"])


@router.get("/", response_model=list[RecommenderRead])
def list_recommenders(
    db: Session = Depends(get_db),
) -> list[RecommenderRead]:
    recommendations = recommender_crud.list_by(db)
    return [RecommenderRead.model_validate(r) for r in recommendations]


@router.get("/{recommender_id}", response_model=RecommenderRead)
def get_recommender(
    recommender_id: str,
    db: Session = Depends(get_db),
) -> RecommenderRead:
    recommender = recommender_crud.get_or_raise(db, recommender_id)
    return RecommenderRead.model_validate(recommender)
