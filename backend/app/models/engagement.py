from __future__ import annotations

import datetime
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import (
    DatePrecision,
    Format,
    LogUnit,
    ReadingStatus,
    date_precision_type,
)
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.book import Book
    from app.models.edition import EngagementEdition
    from app.models.progress_log import ProgressLog
    from app.models.review import Review
    from app.models.user import User


# Same key the stored journal is ordered on (see services/engagements/progress_logs.py):
# the two have to agree, since one orders the history and the other picks the latest.
# A session crossing the frontier is stored as a re-coverage row and a new-ground row
# sharing a transaction timestamp, so `new_ground` breaks that tie and the new-ground
# half always sorts last -- otherwise `max()` over the pair picks arbitrarily.
def _log_sort_key(log: ProgressLog) -> tuple[datetime.date, datetime.datetime, bool]:
    return (log.logged_on, log.created_at, log.new_ground)


class Engagement(TimestampMixin, Base):
    __tablename__ = "engagements"
    __table_args__ = (UniqueConstraint("id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    book_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("books.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    status: Mapped[ReadingStatus] = mapped_column(
        SAEnum(ReadingStatus, name="reading_status")
    )

    interested_on: Mapped[datetime.date | None]
    interested_on_precision: Mapped[DatePrecision] = mapped_column(
        date_precision_type, default=DatePrecision.day
    )
    tbr_added_on: Mapped[datetime.date | None]
    tbr_added_on_precision: Mapped[DatePrecision] = mapped_column(
        date_precision_type, default=DatePrecision.day
    )
    acquired_on: Mapped[datetime.date | None]
    acquired_on_precision: Mapped[DatePrecision] = mapped_column(
        date_precision_type, default=DatePrecision.day
    )
    started_on: Mapped[datetime.date | None]
    started_on_precision: Mapped[DatePrecision] = mapped_column(
        date_precision_type, default=DatePrecision.day
    )
    finished_on: Mapped[datetime.date | None]
    finished_on_precision: Mapped[DatePrecision] = mapped_column(
        date_precision_type, default=DatePrecision.day
    )
    abandoned_on: Mapped[datetime.date | None]
    abandoned_on_precision: Mapped[DatePrecision] = mapped_column(
        date_precision_type, default=DatePrecision.day
    )

    book: Mapped[Book] = relationship(back_populates="engagements")
    user: Mapped[User] = relationship(back_populates="engagements")
    progress_logs: Mapped[list[ProgressLog]] = relationship(
        back_populates="engagement", cascade="all, delete-orphan"
    )
    engagement_editions: Mapped[list[EngagementEdition]] = relationship(
        back_populates="engagement", cascade="all, delete-orphan"
    )
    review: Mapped[Review | None] = relationship(
        back_populates="engagement", uselist=False, cascade="all, delete-orphan"
    )

    @property
    def formats(self) -> list[Format]:
        return [ee.edition.edition_format for ee in self.engagement_editions]

    @property
    def cover_url(self) -> str | None:
        for ee in self.engagement_editions:
            if ee.edition.cover_url:
                return ee.edition.cover_url
        return self.book.default_cover_url

    @property
    def resume_unit(self) -> LogUnit | None:
        """Which ruler the read is on -- the unit of the entry that set the frontier.
        None until something is logged. Both resume points are always populated, so this
        is what says which of them the read is actually sitting on.

        New ground only: a catch-up pass over ground already covered doesn't move the
        read onto that pass's ruler."""
        new_ground = [log for log in self.progress_logs if log.new_ground]
        latest = max(new_ground, key=_log_sort_key, default=None)
        return latest.unit if latest is not None else None

    @property
    def resume_from_page(self) -> int:
        return self._resume_in(LogUnit.pages)

    @property
    def resume_from_minute(self) -> int:
        return self._resume_in(LogUnit.minutes)

    def binding_for(self, fmt: Format) -> EngagementEdition | None:
        return next(
            (ee for ee in self.engagement_editions if ee.edition.edition_format == fmt),
            None,
        )

    # ADR-0021 accepts that two page-measured bindings in one read can't be told apart
    # by unit alone, so anything measured in pages answers on the first non-audio one.
    @property
    def page_format(self) -> Format | None:
        return next((f for f in self.formats if f != Format.audio), None)

    # Not binding_for: this keeps scanning past a matching binding that carries no
    # length, so a second binding in the same format can still answer.
    def resolve_length(self, fmt: Format) -> int | None:
        for ee in self.engagement_editions:
            if ee.edition.edition_format == fmt:
                if ee.length_override is not None:
                    return ee.length_override
                candidate = (
                    ee.edition.audio_minutes
                    if fmt == Format.audio
                    else ee.edition.page_count
                )
                if candidate is not None:
                    return candidate
        if fmt == Format.audio:
            return self.book.default_audio_minutes
        return self.book.default_page_count

    # Both lengths answer only for a format this read is actually bound in — otherwise
    # resolve_length's book-default tail reports a length for a format never read.
    @property
    def length_minutes(self) -> int | None:
        if Format.audio not in self.formats:
            return None
        return self.resolve_length(Format.audio)

    @property
    def length_pages(self) -> int | None:
        fmt = self.page_format
        return None if fmt is None else self.resolve_length(fmt)

    def _resume_in(self, unit: LogUnit) -> int:
        """Where the read stands on one ruler. Converted from the shared frontier, so a
        session picks up where the *read* is rather than where this format last was --
        switch to audio at page 220 of 440 and it resumes at 3:35 of 7:10. Falls back to
        this ruler's own last position when there is no fraction to convert.

        Except when this ruler's own last entry was re-coverage: the frontier is shared
        but a catch-up position is not, so re-reading the print to catch up to the audio
        resumes on the print where that pass stopped, and leaves the audio at 2:00.
        """
        is_audio = unit == LogUnit.minutes
        logs = [log for log in self.progress_logs if log.unit == unit]
        latest = max(logs, key=_log_sort_key, default=None)
        latest_end = (
            None
            if latest is None
            else (latest.minute_end if is_audio else latest.page_end)
        )
        if latest is not None and not latest.new_ground:
            return latest_end or 0
        length = self.length_minutes if is_audio else self.length_pages
        fraction = self.covered_fraction
        if fraction is None or not length:
            return latest_end or 0
        return round(fraction * length)

    @property
    def covered_fraction(self) -> float | None:
        """How far into the book this read has got, 0-1, whichever ruler it was on.

        Pages and minutes measure one axis (ADR-0007), so a position on either converts
        to the other through this -- each entry's end is divided by its own ruler.

        A high-water mark, so it never decreases: a session behind the frontier is
        re-coverage and leaves completion where it was. New ground stays contiguous from
        zero, which makes the furthest end and the ADR's cumulative sum over new-ground
        spans the same number; the sum is what out-of-order new ground will need.

        None when no entry has a ruler with a length to divide by -- the same "can't
        say" completion has always returned for a book with no page count.
        """
        fractions = []
        for log in self.progress_logs:
            position, length = (
                (log.minute_end, self.length_minutes)
                if log.unit == LogUnit.minutes
                else (log.page_end, self.length_pages)
            )
            if position is not None and length:
                fractions.append(position / length)
        return max(fractions, default=None)

    @property
    def completion_pct(self) -> int | None:
        fraction = self.covered_fraction
        if fraction is None:
            return None
        return max(0, min(100, round(fraction * 100)))
