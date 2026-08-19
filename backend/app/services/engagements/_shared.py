from __future__ import annotations

from sqlalchemy.orm import selectinload

from app.models.book import Book, BookAuthor
from app.models.edition import EngagementEdition
from app.models.engagement import Engagement

ENGAGEMENT_READ_OPTIONS = (
    selectinload(Engagement.book)
    .selectinload(Book.book_authors)
    .selectinload(BookAuthor.author),
    selectinload(Engagement.progress_logs),
    selectinload(Engagement.engagement_editions).selectinload(
        EngagementEdition.edition
    ),
    selectinload(Engagement.review),
)
