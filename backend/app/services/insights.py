from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.progress_log import ProgressLog
from app.schemas import StreakRead


def calculate_streak(db: Session, date: str) -> StreakRead:
    logged_today = False

    logs = (
        db.execute(
            select(ProgressLog)
            .distinct(ProgressLog.logged_on)
            .order_by(ProgressLog.logged_on.desc())
        )
        .scalars()
        .all()
    )

    if not logs:
        return StreakRead(count=0, logged_today=False)

    if logs[0].logged_on.isoformat() == date:
        logged_today = True

    return StreakRead(count=len(logs), logged_today=logged_today)
