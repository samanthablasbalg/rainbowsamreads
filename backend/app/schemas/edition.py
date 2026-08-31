from __future__ import annotations

import datetime
import uuid
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import Format


class EditionCreate(BaseModel):
    book_id: uuid.UUID
    format: Format
    isbn: str | None = None
    length: int | None = Field(default=None, gt=0)
    page_count: int | None = Field(default=None, gt=0)
    audio_minutes: int | None = Field(default=None, gt=0)
    cover_url: str | None = None

    @model_validator(mode="after")
    def resolve_compatible_length(self) -> Self:
        legacy = self.audio_minutes if self.format == Format.audio else self.page_count
        wrong = self.page_count if self.format == Format.audio else self.audio_minutes
        if wrong is not None:
            raise ValueError("Length field does not match the edition format")
        if self.length is not None and legacy is not None and self.length != legacy:
            raise ValueError("Provide one consistent edition length")
        self.length = self.length if self.length is not None else legacy
        return self


class EditionUpdate(BaseModel):
    isbn: str | None = None
    length: int | None = Field(default=None, gt=0)
    page_count: int | None = Field(default=None, gt=0)
    audio_minutes: int | None = Field(default=None, gt=0)
    cover_url: str | None = None

    @model_validator(mode="after")
    def check_compatible_lengths(self) -> Self:
        supplied = [
            value
            for field, value in (
                ("length", self.length),
                ("page_count", self.page_count),
                ("audio_minutes", self.audio_minutes),
            )
            if field in self.model_fields_set and value is not None
        ]
        if len(set(supplied)) > 1:
            raise ValueError("Provide one consistent edition length")
        return self


class EditionRead(BaseModel):
    id: uuid.UUID
    book_id: uuid.UUID
    format: Format
    isbn: str | None
    publisher: str | None
    length: int | None
    page_count: int | None
    audio_minutes: int | None
    cover_url: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class EngagementEditionCreate(BaseModel):
    edition_id: uuid.UUID | None = None
    edition_format: Format | None = None
    origin_id: uuid.UUID | None = None
    length_override: int | None = None
    edition_length: int | None = Field(default=None, gt=0)
    audio_length_minutes: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def check_exactly_one_resolver(self) -> Self:
        has_id = self.edition_id is not None
        has_format = self.edition_format is not None
        if has_id == has_format:
            raise ValueError("Provide exactly one of edition_id or edition_format")
        if (
            self.edition_length is not None
            and self.audio_length_minutes is not None
            and self.edition_length != self.audio_length_minutes
        ):
            raise ValueError("Provide one consistent edition length")
        return self


class EngagementEditionRead(BaseModel):
    edition: EditionRead
    origin_id: uuid.UUID | None
    length_override: int | None

    model_config = ConfigDict(from_attributes=True)
