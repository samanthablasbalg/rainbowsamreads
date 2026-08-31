from __future__ import annotations

import datetime
import uuid
from typing import TYPE_CHECKING, Annotated, Literal, Self

from pydantic import BaseModel, Field, model_validator

if TYPE_CHECKING:
    from app.models.progress_log import ProgressLog


class ProgressLogCreate(BaseModel):
    page_start: int | None = Field(default=None, ge=0)
    page_end: int | None = Field(default=None, gt=0)
    minute_start: int | None = Field(default=None, ge=0)
    minute_end: int | None = Field(default=None, gt=0)
    edition_length: int | None = Field(default=None, gt=0)
    audio_length_minutes: int | None = Field(default=None, gt=0)
    logged_on: datetime.date | None = None
    note: str | None = None

    @model_validator(mode="after")
    def check_exactly_one_unit(self) -> Self:
        """The unit belongs to the entry, not to the read: one bound in both rulers
        logs pages on the days it was read and minutes on the days it was heard.

        A session names both its ends. It used to send only the position it reached and
        the backend derived the start from the frontier, which cannot express a session
        that starts behind it -- the re-read this exists to allow."""
        pages = self.page_start is not None and self.page_end is not None
        minutes = self.minute_start is not None and self.minute_end is not None
        if pages == minutes:
            raise ValueError("Provide exactly one of a page span or a minute span")
        if self.audio_length_minutes is not None and not minutes:
            raise ValueError("audio_length_minutes requires a minute span")
        if (
            self.edition_length is not None
            and self.audio_length_minutes is not None
            and self.edition_length != self.audio_length_minutes
        ):
            raise ValueError("Provide one consistent edition length")
        return self


class ProgressLogUpdate(BaseModel):
    logged_on: datetime.date | None = None
    page_end: int | None = Field(default=None, gt=0)
    minute_end: int | None = Field(default=None, gt=0)
    note: str | None = None


class _ProgressLogReadBase(BaseModel):
    id: uuid.UUID
    engagement_id: uuid.UUID
    logged_on: datetime.date
    # A session that crossed the frontier is stored as two rows written in one
    # transaction, so they share this to the microsecond and the client groups on it
    # to show the session as one entry.
    created_at: datetime.datetime
    new_ground: bool
    note: str | None


class PageProgressLogRead(_ProgressLogReadBase):
    type: Literal["page"] = "page"
    page_start: int
    page_end: int


class MinuteProgressLogRead(_ProgressLogReadBase):
    type: Literal["minute"] = "minute"
    minute_start: int
    minute_end: int


ProgressLogRead = Annotated[
    PageProgressLogRead | MinuteProgressLogRead, Field(discriminator="type")
]


def progress_log_read(
    log: ProgressLog,
) -> PageProgressLogRead | MinuteProgressLogRead:
    """Builds the discriminated read schema from an ORM `ProgressLog` row.

    The row itself stores `unit` (page/minute) plus both start/end column pairs,
    one of which is always null — that's the storage shape, not the API shape.
    This picks the matching variant so the OpenAPI schema (and the orval client
    generated from it) exposes a real `type`-discriminated union instead of one
    flat, all-nullable object.
    """
    if log.unit == "pages":
        # `unit == "pages"` is set only when page_start/page_end were populated
        # (see log_progress in services/engagements/progress_logs.py) — the
        # asserts narrow for mypy, not a runtime check of new information.
        assert log.page_start is not None
        assert log.page_end is not None
        return PageProgressLogRead(
            id=log.id,
            engagement_id=log.engagement_id,
            logged_on=log.logged_on,
            created_at=log.created_at,
            new_ground=log.new_ground,
            note=log.note,
            page_start=log.page_start,
            page_end=log.page_end,
        )
    assert log.minute_start is not None
    assert log.minute_end is not None
    return MinuteProgressLogRead(
        id=log.id,
        engagement_id=log.engagement_id,
        logged_on=log.logged_on,
        created_at=log.created_at,
        new_ground=log.new_ground,
        note=log.note,
        minute_start=log.minute_start,
        minute_end=log.minute_end,
    )
