from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field

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


class EngagementEditionRead(BaseModel):
    edition: EditionRead
    origin_id: uuid.UUID | None
    length_override: int | None

    model_config = ConfigDict(from_attributes=True)
