#!/usr/bin/env python3
"""Refill description on books, and publisher on print editions, for records imported
before those columns existed. The import path writes both, so this only has to reach
the rows that predate it.

Idempotent: it selects on `description IS NULL`, so a run that dies partway through --
Google Books 503s in bursts -- picks up where it stopped. Safe to re-run.
"""

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import SessionLocal
from app.models.book import Book
from app.models.enums import Format
from app.services.google_books import GoogleBooksError, get_volume


def main() -> None:
    with SessionLocal() as db:
        books = db.scalars(
            select(Book)
            .where(Book.description.is_(None), Book.google_books_id.is_not(None))
            # Book.editions is lazy="raise_on_sql", so the publisher write below needs
            # the collection asked for up front.
            .options(selectinload(Book.editions))
        ).all()

        print(f"{len(books)} books missing a description.")

        filled = 0
        for book in books:
            google_books_id = book.google_books_id
            assert google_books_id is not None  # guaranteed by the WHERE above

            try:
                volume = get_volume(google_books_id)
            except GoogleBooksError as exc:
                print(f"  {book.title}: {exc}")
                continue

            if volume is None or volume.description is None:
                print(f"  {book.title}: no description at Google")
                continue

            book.description = volume.description

            print_edition = next(
                (e for e in book.editions if e.edition_format == Format.print), None
            )
            if print_edition is not None:
                print_edition.publisher = print_edition.publisher or volume.publisher

            # Per book, so an interrupted run keeps everything it already fetched.
            db.commit()
            filled += 1
            print(f"  {book.title}: filled")

        print(f"Done. {filled} filled, {len(books) - filled} left without one.")


if __name__ == "__main__":
    main()
