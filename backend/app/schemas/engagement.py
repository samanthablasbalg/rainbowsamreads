from __future__ import annotations

import datetime
import uuid
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import Format, LogUnit, ReadingStatus
from app.schemas.book import BookRead
from app.schemas.review import ReviewRead


class EngagementCreate(BaseModel):
    """`finished_on` is the date the read ended, whichever way it ended: it lands in
    `abandoned_on` when the status is dnf."""

    book_id: uuid.UUID
    edition_format: Format
    status: Literal["reading", "finished", "dnf"] = "reading"
    edition_length: int | None = Field(default=None, gt=0)
    audio_length_minutes: int | None = Field(default=None, gt=0)
    length_override: int | None = Field(default=None, gt=0)
    started_on: datetime.date | None = None
    finished_on: datetime.date | None = None

    @model_validator(mode="after")
    def check_finished_on_matches_status(self) -> Self:
        if self.finished_on is not None and self.status == "reading":
            raise ValueError("A read in progress cannot have an end date")
        if (
            self.audio_length_minutes is not None
            and self.edition_format != Format.audio
        ):
            raise ValueError("audio_length_minutes requires an audio edition")
        if (
            self.edition_length is not None
            and self.audio_length_minutes is not None
            and self.edition_length != self.audio_length_minutes
        ):
            raise ValueError("Provide one consistent edition length")
        return self


class EngagementStatusUpdate(BaseModel):
    """`unit` picks the ruler the closing log is written on when finishing a read that
    has been going in more than one. Defaults to the one the read is already on."""

    status: Literal["reading", "finished", "dnf"]
    effective_on: datetime.date | None = None
    unit: LogUnit | None = None


class EngagementDatesUpdate(BaseModel):
    """Corrects dates a read already has. Ending a read is the status endpoint's job:
    `finished_on` here edits a finished read, `abandoned_on` a dnf one."""

    started_on: datetime.date | None = None
    finished_on: datetime.date | None = None
    abandoned_on: datetime.date | None = None


class EngagementLengthUpdate(BaseModel):
    """Mirrors the read side's length_pages / length_minutes pair. Exactly one, because
    the unit is what tells the service which binding to correct."""

    length_pages: int | None = Field(default=None, gt=0)
    length_minutes: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def check_exactly_one_unit(self) -> Self:
        if (self.length_pages is None) == (self.length_minutes is None):
            raise ValueError("Provide exactly one of length_pages or length_minutes")
        return self


class EngagementRead(BaseModel):
    id: uuid.UUID
    book: BookRead
    formats: list[Format]
    cover_url: str | None
    status: ReadingStatus
    started_on: datetime.date | None
    finished_on: datetime.date | None
    abandoned_on: datetime.date | None
    resume_from_page: int
    resume_from_minute: int
    frontier_page: int
    frontier_minute: int
    resume_unit: LogUnit | None
    length_pages: int | None
    length_minutes: int | None
    completion_pct: int | None
    review: ReviewRead | None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
