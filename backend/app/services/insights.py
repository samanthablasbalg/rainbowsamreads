from __future__ import annotations

import datetime

from sqlalchemy import Integer, cast, func, select
from sqlalchemy.orm import Session

from app.models.progress_log import ProgressLog
from app.schemas import StreakRead


def calculate_streak(db: Session, date: datetime.date) -> StreakRead:
    deduplicated_logs = (
        select(ProgressLog.logged_on).distinct().cte("deduplicated_logs")
    )
    row_number = func.row_number().over(order_by=deduplicated_logs.c.logged_on)
    sequenced_logs = select(
        deduplicated_logs.c.logged_on,
        row_number.label("rn"),
        (deduplicated_logs.c.logged_on - cast(row_number, Integer)).label(
            "island_anchor"
        ),
    ).cte("sequenced_logs")

    streak_start = func.min(sequenced_logs.c.logged_on)

    statement = (
        select(
            streak_start.label("streak_start"),
            func.max(sequenced_logs.c.logged_on).label("streak_end"),
            func.count().label("consecutive_days"),
        )
        .group_by(sequenced_logs.c.island_anchor)
        .order_by(streak_start.desc())
    )

    streaks = db.execute(statement).all()
    logged_today = (
        True
        if streaks and len(streaks) > 0 and streaks[0].streak_end == date
        else False
    )
    logged_yesterday = (
        True
        if streaks
        and len(streaks) > 0
        and streaks[0].streak_end == date - datetime.timedelta(days=1)
        else False
    )
    if not streaks or (not logged_today and not logged_yesterday):
        return StreakRead(count=0, logged_today=False)

    return StreakRead(count=streaks[0].consecutive_days, logged_today=logged_today)
