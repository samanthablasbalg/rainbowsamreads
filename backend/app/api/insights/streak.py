from __future__ import annotations

from fastapi import APIRouter

from app.schemas import StreakRead

router = APIRouter()


@router.get("/streak", response_model=StreakRead)
def get_streak() -> StreakRead:
    test = StreakRead(count=0, logged_today=True)
    return StreakRead.model_validate(test)
