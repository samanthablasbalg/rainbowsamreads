from __future__ import annotations

import datetime

from sqlalchemy.orm import selectinload

from app.exceptions import InvalidOperationError
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


def reject_future_date(value: datetime.date | None) -> None:
    if value is not None and value > datetime.date.today():
        raise InvalidOperationError("Date cannot be in the future.")
