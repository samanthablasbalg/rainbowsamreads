from __future__ import annotations

import datetime
import uuid
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import Format, ReadingStatus
from app.schemas.book import BookRead
from app.schemas.review import ReviewRead


class EngagementCreate(BaseModel):
    book_id: uuid.UUID
    edition_format: Format
    status: Literal["reading", "finished", "dnf"] = "reading"
    audio_length_minutes: int | None = Field(default=None, gt=0)
    length_override: int | None = Field(default=None, gt=0)
    started_on: datetime.date | None = None


class EngagementStatusUpdate(BaseModel):
    status: Literal["reading", "finished", "dnf"]
    effective_on: datetime.date | None = None


class EngagementDatesUpdate(BaseModel):
    started_on: datetime.date | None = None
    finished_on: datetime.date | None = None


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
    length_pages: int | None
    length_minutes: int | None
    completion_pct: int | None
    review: ReviewRead | None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
