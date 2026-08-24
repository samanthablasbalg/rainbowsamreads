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
    page_start: Mapped[int | None]
    page_end: Mapped[int | None]
    minute_start: Mapped[int | None]
    minute_end: Mapped[int | None]
    new_ground: Mapped[bool] = mapped_column(default=True)
    note: Mapped[str | None] = mapped_column(Text)

    engagement: Mapped[Engagement] = relationship(back_populates="progress_logs")

    # The span's ends on whichever ruler this entry was measured in, so a caller that
    # already knows the unit doesn't pick the column itself. Callers that mean "on the
    # *page* ruler" must still filter on `unit` -- these answer for the log, not for a
    # format.
    @property
    def start(self) -> int:
        return (
            self.minute_start if self.unit == LogUnit.minutes else self.page_start
        ) or 0

    @property
    def end(self) -> int | None:
        return self.minute_end if self.unit == LogUnit.minutes else self.page_end
