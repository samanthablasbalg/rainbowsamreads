from __future__ import annotations

import datetime
import uuid

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.crud import author_crud, book_author_crud, book_crud, edition_crud
from app.exceptions import ConflictError, NotFoundError
from app.models.author import Author
from app.models.book import Book, BookAuthor
from app.models.edition import Edition
from app.models.engagement import Engagement
from app.models.enums import BookAuthorRole, DatePrecision, Format
from app.services.google_books import get_volume


def search_local(db: Session, q: str) -> list[Book]:
    """Books already in the catalogue whose title or any author matches. Substring, not
    prefix, because a search for "clarke" should find Susanna Clarke."""
    pattern = f"%{q}%"
    return list(
        db.execute(
            select(Book)
            .distinct()
            .outerjoin(BookAuthor, BookAuthor.book_id == Book.id)
            .outerjoin(Author, Author.id == BookAuthor.author_id)
            .where(or_(Book.title.ilike(pattern), Author.name.ilike(pattern)))
            .options(
                selectinload(Book.book_authors).selectinload(BookAuthor.author),
                selectinload(Book.editions),
            )
        )
        .scalars()
        .all()
    )


def engagements_by_book(
    db: Session, book_ids: list[uuid.UUID], user_id: uuid.UUID
) -> dict[uuid.UUID, list[Engagement]]:
    """Which of these books the user has read, so a search result can say so. Filters on
    user_id explicitly rather than leaning on RLS, since books themselves are shared."""
    if not book_ids:
        return {}
    engagements = (
        db.execute(
            select(Engagement).where(
                Engagement.book_id.in_(book_ids), Engagement.user_id == user_id
            )
        )
        .scalars()
        .all()
    )
    grouped: dict[uuid.UUID, list[Engagement]] = {}
    for engagement in engagements:
        grouped.setdefault(engagement.book_id, []).append(engagement)
    return grouped


def create_book(
    db: Session,
    *,
    title: str,
    authors: list[str],
    page_count: int | None = None,
    google_books_id: str | None = None,
    cover_url: str | None = None,
    language: str | None = None,
    genres: list[str] | None = None,
    publication_date: datetime.date | None = None,
    publication_date_precision: DatePrecision | None = None,
) -> Book:
    book = book_crud.create(
        db,
        Book(
            title=title,
            default_page_count=page_count,
            google_books_id=google_books_id,
            default_cover_url=cover_url,
            original_language=language,
            genres=genres or [],
            publication_date=publication_date,
            publication_date_precision=publication_date_precision or DatePrecision.day,
        ),
    )
    for name in authors:
        author = author_crud.get_or_create(db, lookup={"name": name})
        book_author_crud.create(
            db,
            BookAuthor(
                book_id=book.id, author_id=author.id, role=BookAuthorRole.author
            ),
        )
    return book


def _parse_published_date(
    raw: str | None,
) -> tuple[datetime.date | None, DatePrecision | None]:
    if not raw:
        return None, None
    if len(raw) == 4:
        return datetime.date(int(raw), 1, 1), DatePrecision.year
    if len(raw) == 7:
        year, month = raw.split("-")
        return datetime.date(int(year), int(month), 1), DatePrecision.month
    return datetime.datetime.strptime(raw, "%Y-%m-%d").date(), DatePrecision.day


def import_book_from_google(db: Session, *, google_books_id: str) -> tuple[Book, bool]:
    existing = book_crud.get_by(db, google_books_id=google_books_id)
    if existing is not None:
        return existing, False

    volume = get_volume(google_books_id)
    if volume is None:
        raise NotFoundError(f"No Google Books volume found for id {google_books_id}")

    pub_date, pub_precision = _parse_published_date(volume.published_date)

    # `volume.language` is deliberately not passed: it is the *edition's* language, and
    # `original_language` answers "is this a translation?", which Google Books cannot.
    book = create_book(
        db,
        title=volume.title,
        authors=volume.authors,
        page_count=volume.page_count,
        google_books_id=volume.google_books_id,
        cover_url=volume.cover_url,
        genres=volume.categories,
        publication_date=pub_date,
        publication_date_precision=pub_precision,
    )

    # Print is the real edition (ADR-0022), so the volume's own facts land here rather
    # than on the two synthetic siblings below.
    edition_crud.create(
        db,
        Edition(
            book_id=book.id,
            edition_format=Format.print,
            isbn=volume.isbn,
            publisher=volume.publisher,
            description=volume.description,
            page_count=volume.page_count,
            cover_url=volume.cover_url,
        ),
    )
    edition_crud.create(
        db,
        Edition(
            book_id=book.id,
            edition_format=Format.digital,
            page_count=volume.page_count,
            cover_url=volume.cover_url,
        ),
    )
    edition_crud.create(
        db,
        Edition(
            book_id=book.id, edition_format=Format.audio, cover_url=volume.cover_url
        ),
    )

    return book, True


def remove_book(db: Session, book: Book) -> None:
    # `books` is shared but `engagements` and `standalone_entries` are RLS-scoped
    # (ADR-0023), so these two relationships only ever contain the caller's rows.
    # Another user's read of the same book is invisible here, and this check passes.
    if book.engagements or book.standalone_entries:
        raise ConflictError("Remove its engagements first.")
    # Which leaves the foreign keys as the only thing that sees every referencing row.
    # They hold -- nothing is destroyed -- but the violation would otherwise surface as
    # an unhandled 500. The caller cannot act on rows RLS hides from them, so the
    # message stays generic rather than reporting whose reads are in the way.
    try:
        book_crud.delete(db, book)
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("This book still has reads attached to it.") from exc


def capture_audio_length(book: Book, edition: Edition, length: int) -> None:
    if book.default_audio_minutes is None:
        book.default_audio_minutes = length
    if edition.audio_minutes is None:
        edition.audio_minutes = length
