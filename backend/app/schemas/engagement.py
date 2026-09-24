from __future__ import annotations

import datetime
import uuid
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import Format, LogUnit, ReadingStatus
from app.schemas.book import BookRead
from app.schemas.review import ReviewRead

_CREATE_STATUSES = {ReadingStatus.reading, ReadingStatus.finished, ReadingStatus.dnf}


class EngagementWrite(BaseModel):
    """`book_id` creates a read, `id` writes an existing one."""

    model_config = ConfigDict(extra="forbid")

    book_id: uuid.UUID | None = None
    id: uuid.UUID | None = None
    status: ReadingStatus
    edition_id: uuid.UUID | None = None
    edition_format: Format | None = None
    edition_length: int | None = Field(default=None, gt=0)
    length_override: int | None = Field(default=None, gt=0)
    started_on: datetime.date | None = None
    finished_on: datetime.date | None = None
    effective_on: datetime.date | None = None
    """`unit` picks the ruler the closing log is written on when finishing a read that
    has been going in more than one. Defaults to the one the read is already on."""
    unit: LogUnit | None = None

    @model_validator(mode="after")
    def check_exactly_one_identifier(self) -> Self:
        if (self.book_id is None) == (self.id is None):
            raise ValueError("Provide exactly one of book_id or id")
        return self

    @model_validator(mode="after")
    def check_fields_match_identifier(self) -> Self:
        if self.id is not None:
            if self.started_on is not None or self.finished_on is not None:
                raise ValueError("started_on and finished_on need a book_id")
            return self
        if self.effective_on is not None or self.unit is not None:
            raise ValueError("effective_on and unit need an id")
        if self.edition_format is None:
            raise ValueError("Creating a read needs an edition_format")
        if self.status not in _CREATE_STATUSES:
            raise ValueError("A read can only be created reading, finished or dnf")
        if self.finished_on is not None and self.status == ReadingStatus.reading:
            raise ValueError("A read in progress cannot have an end date")
        return self

    @model_validator(mode="after")
    def check_at_most_one_resolver(self) -> Self:
        if self.edition_id is not None and self.edition_format is not None:
            raise ValueError("Provide at most one of edition_id or edition_format")
        return self

    @model_validator(mode="after")
    def check_length_has_resolver(self) -> Self:
        if self.edition_id is not None or self.edition_format is not None:
            return self
        if self.edition_length is not None or self.length_override is not None:
            raise ValueError("A length needs an edition_id or edition_format")
        return self


class EngagementDatesUpdate(BaseModel):
    """Corrects dates a read already has. Ending a read is the engagement write's job:
    `finished_on` here edits a finished read, `abandoned_on` a dnf one."""

    started_on: datetime.date | None = None
    finished_on: datetime.date | None = None
    abandoned_on: datetime.date | None = None


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
