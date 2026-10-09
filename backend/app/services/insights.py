from __future__ import annotations

import datetime

from sqlalchemy.orm import Session

from app.schemas import StreakRead


def calculate_streak(db: Session, date: str) -> StreakRead:
    if date == datetime.date.today().isoformat():
        count = 1
        logged_today = True
    else:
        count = 0
        logged_today = False
    return StreakRead(count=count, logged_today=logged_today)
