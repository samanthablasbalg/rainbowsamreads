from __future__ import annotations

import datetime
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKeyConstraint, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import LogUnit
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.engagement import Engagement


# The key the stored journal is ordered on and the one `max()` picks the latest entry
# with: the two have to agree. A session crossing the frontier is stored as a
# re-coverage row and a new-ground row sharing a transaction timestamp, so `new_ground`
# breaks that tie and the new-ground half always sorts last.
def log_sort_key(log: ProgressLog) -> tuple[datetime.date, datetime.datetime, bool]:
    return (log.logged_on, log.created_at, log.new_ground)


class ProgressLog(TimestampMixin, Base):
    __tablename__ = "progress_logs"
    __table_args__ = (
        ForeignKeyConstraint(
            ["engagement_id", "user_id"], ["engagements.id", "engagements.user_id"]
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    engagement_id: Mapped[uuid.UUID]
    user_id: Mapped[uuid.UUID]
    logged_on: Mapped[datetime.date]
    unit: Mapped[LogUnit] = mapped_column(SAEnum(LogUnit, name="log_unit"))
    start: Mapped[int]
    end: Mapped[int]
    new_ground: Mapped[bool] = mapped_column(default=True)
    note: Mapped[str | None] = mapped_column(Text)

    engagement: Mapped[Engagement] = relationship(back_populates="progress_logs")
