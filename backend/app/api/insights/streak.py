from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import StreakRead
from app.services.insights import calculate_streak

router = APIRouter()


@router.get("/streak", response_model=StreakRead)
def get_streak(
    date: datetime.date,
    db: Session = Depends(get_db),
) -> StreakRead:
    return StreakRead.model_validate(calculate_streak(db, date=date))
