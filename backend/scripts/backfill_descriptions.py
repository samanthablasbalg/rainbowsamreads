#!/usr/bin/env python3
"""Refill publisher and description on print editions imported before those columns
existed. The import path writes both (ADR-0022 puts the volume's own facts on the print
edition), so this only has to reach the rows that predate it.

Idempotent: it selects on `description IS NULL`, so a run that dies partway through --
Google Books 503s in bursts -- picks up where it stopped. Safe to re-run.
"""

from sqlalchemy import select

from app.database import SessionLocal
from app.models.book import Book
from app.models.edition import Edition
from app.models.enums import Format
from app.services.google_books import GoogleBooksError, get_volume


def main() -> None:
    with SessionLocal() as db:
        editions = db.scalars(
            select(Edition)
            .join(Book, Edition.book_id == Book.id)
            .where(
                Edition.edition_format == Format.print,
                Edition.description.is_(None),
                Book.google_books_id.is_not(None),
            )
        ).all()

        print(f"{len(editions)} print editions missing a description.")

        filled = 0
        for edition in editions:
            google_books_id = edition.book.google_books_id
            assert google_books_id is not None  # guaranteed by the WHERE above

            try:
                volume = get_volume(google_books_id)
            except GoogleBooksError as exc:
                print(f"  {edition.book.title}: {exc}")
                continue

            if volume is None or volume.description is None:
                print(f"  {edition.book.title}: no description at Google")
                continue

            edition.description = volume.description
            edition.publisher = edition.publisher or volume.publisher
            # Per book, so an interrupted run keeps everything it already fetched.
            db.commit()
            filled += 1
            print(f"  {edition.book.title}: filled")

        print(f"Done. {filled} filled, {len(editions) - filled} left without one.")


if __name__ == "__main__":
    main()
