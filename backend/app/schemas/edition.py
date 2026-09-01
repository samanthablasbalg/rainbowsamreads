from __future__ import annotations

import datetime
import uuid
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import Format


class EditionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    book_id: uuid.UUID
    format: Format
    isbn: str | None = None
    length: int | None = Field(default=None, gt=0)
    cover_url: str | None = None


class EditionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    isbn: str | None = None
    length: int | None = Field(default=None, gt=0)
    cover_url: str | None = None


class EditionRead(BaseModel):
    id: uuid.UUID
    book_id: uuid.UUID
    format: Format
    isbn: str | None
    publisher: str | None
    length: int | None
    cover_url: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class EngagementEditionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    edition_id: uuid.UUID | None = None
    edition_format: Format | None = None
    origin_id: uuid.UUID | None = None
    length_override: int | None = Field(default=None, gt=0)
    edition_length: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def check_exactly_one_resolver(self) -> Self:
        has_id = self.edition_id is not None
        has_format = self.edition_format is not None
        if has_id == has_format:
            raise ValueError("Provide exactly one of edition_id or edition_format")
        return self


class EngagementEditionRead(BaseModel):
    edition: EditionRead
    origin_id: uuid.UUID | None
    length_override: int | None

    model_config = ConfigDict(from_attributes=True)
