from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, ForeignKeyConstraint, Index, text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import Format
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.book import Book
    from app.models.book_source import BookSource
    from app.models.engagement import Engagement


class Edition(TimestampMixin, Base):
    __tablename__ = "editions"
    __table_args__ = (
        Index(
            "ix_editions_book_format_generic",
            "book_id",
            "format",
            unique=True,
            postgresql_where=text("isbn IS NULL"),
        ),
        CheckConstraint(
            "length IS NULL OR length > 0",
            name="ck_editions_length_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    book_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("books.id"))
    format: Mapped[Format] = mapped_column(SAEnum(Format, name="edition_format"))
    isbn: Mapped[str | None]
    publisher: Mapped[str | None]
    length: Mapped[int | None]
    cover_url: Mapped[str | None]

    @property
    def page_count(self) -> int | None:
        """Legacy API field retained through the length compatibility window."""
        return self.length if self.format != Format.audio else None

    @property
    def audio_minutes(self) -> int | None:
        """Legacy API field retained through the length compatibility window."""
        return self.length if self.format == Format.audio else None

    book: Mapped[Book] = relationship(back_populates="editions")
    engagement_editions: Mapped[list[EngagementEdition]] = relationship(
        back_populates="edition", cascade="all, delete-orphan"
    )


class EngagementEdition(Base):
    __tablename__ = "engagement_editions"
    __table_args__ = (
        ForeignKeyConstraint(
            ["engagement_id", "user_id"], ["engagements.id", "engagements.user_id"]
        ),
    )

    engagement_id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    edition_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("editions.id"), primary_key=True
    )
    user_id: Mapped[uuid.UUID]
    origin_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("book_sources.id"))
    length_override: Mapped[int | None]

    edition: Mapped[Edition] = relationship(back_populates="engagement_editions")
    engagement: Mapped[Engagement] = relationship(back_populates="engagement_editions")
    origin: Mapped[BookSource | None] = relationship()
