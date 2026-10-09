from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.progress_log import ProgressLog
from app.schemas import StreakRead


def calculate_streak(db: Session, date: str) -> StreakRead:
    logs = (
        db.execute(
            select(ProgressLog)
            .distinct(ProgressLog.logged_on)
            .order_by(ProgressLog.logged_on.desc())
        )
        .scalars()
        .all()
    )

    logged_today = (
        True
        if logs and len(logs) > 0 and logs[0].logged_on.isoformat() == date
        else False
    )
    logged_yesterday = (
        True
        if logs and len(logs) > 1 and logs[1].logged_on.isoformat() == date
        else False
    )

    if not logs or (not logged_today and not logged_yesterday):
        return StreakRead(count=0, logged_today=False)

    return StreakRead(count=len(logs), logged_today=logged_today)
