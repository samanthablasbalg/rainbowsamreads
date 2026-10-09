from __future__ import annotations

import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.progress_log import ProgressLog
from app.schemas import StreakRead


def calculate_streak(db: Session, date: str) -> StreakRead:
    # setting this if statement here for now, but I need to account for the case where
    # the user is backlogging. The final idea is that the date that gets passed in
    # is *assumed* to be today, so I need to compare it to the first log
    if date == datetime.date.today().isoformat():
        logged_today = True
    else:
        logged_today = False

    logs = (
        db.execute(select(ProgressLog).distinct(ProgressLog.logged_on)).scalars().all()
    )
    print(logs)
    return StreakRead(count=len(logs), logged_today=logged_today)
