from __future__ import annotations

import datetime
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.crud import (
    book_crud,
    edition_crud,
    engagement_crud,
    engagement_edition_crud,
    progress_log_crud,
)
from app.exceptions import ConflictError, InvalidOperationError, NotFoundError
from app.models.edition import Edition, EngagementEdition
from app.models.engagement import Engagement
from app.models.enums import Format, LogUnit, ReadingStatus
from app.models.progress_log import ProgressLog
from app.services.books import capture_edition_length
from app.services.engagements._shared import ENGAGEMENT_READ_OPTIONS
from app.services.engagements.progress_logs import latest_log, reject_future_date


def list_for_book(db: Session, book_id: uuid.UUID) -> list[Engagement]:
    """A book's read history, newest first. Raises NotFoundError for an unknown book, so
    a bad id doesn't read as "no reads yet"."""
    book_crud.get_or_raise(db, book_id)
    return list(
        db.execute(
            select(Engagement)
            .where(Engagement.book_id == book_id)
            # Postgres sorts NULLs first under DESC, which would put an undated read at
            # the top and make it the "latest". Ordering by start rather than end keeps
            # a row in place when it finishes.
            .order_by(Engagement.started_on.desc().nulls_last(), Engagement.id.asc())
            .options(*ENGAGEMENT_READ_OPTIONS)
        )
        .scalars()
        .all()
    )


def list_by_status(db: Session, status: ReadingStatus) -> list[Engagement]:
    """A shelf, most recent first. Each status has its own notion of recency: a read in
    progress is ranked by its last sign of life, which includes logging progress without
    touching the engagement itself; a finished or abandoned one by the date it ended,
    with an undated read sinking to the bottom rather than to Postgres' NULLs-first
    top."""
    latest_log_sq = (
        select(
            ProgressLog.engagement_id,
            func.max(ProgressLog.created_at).label("max_created_at"),
        )
        .group_by(ProgressLog.engagement_id)
        .subquery()
    )
    order_key = {
        ReadingStatus.reading: func.greatest(
            Engagement.updated_at, latest_log_sq.c.max_created_at
        ),
        ReadingStatus.finished: Engagement.finished_on,
        ReadingStatus.dnf: Engagement.abandoned_on,
    }[status]
    return list(
        db.execute(
            select(Engagement)
            .where(Engagement.status == status)
            .outerjoin(latest_log_sq, Engagement.id == latest_log_sq.c.engagement_id)
            .order_by(order_key.desc().nulls_last(), Engagement.id.asc())
            .options(*ENGAGEMENT_READ_OPTIONS)
        )
        .scalars()
        .all()
    )


def create_engagement(
    db: Session,
    *,
    book_id: uuid.UUID,
    edition_format: Format,
    status: ReadingStatus,
    user_id: uuid.UUID,
    edition_length: int | None = None,
    length_override: int | None = None,
    started_on: datetime.date | None = None,
    finished_on: datetime.date | None = None,
) -> Engagement:
    book = book_crud.get_or_raise(db, book_id)

    reject_future_date(started_on)
    reject_future_date(finished_on)
    if finished_on is not None and started_on is not None and finished_on < started_on:
        raise ConflictError("finished_on cannot be before started_on.")

    duplicate = db.execute(
        select(Engagement)
        .join(EngagementEdition)
        .join(Edition)
        .where(
            Engagement.book_id == book_id,
            Engagement.status == ReadingStatus.reading,
            Edition.format == edition_format,
        )
    ).scalar_one_or_none()
    if duplicate is not None:
        raise ConflictError(
            f"Already have a {edition_format} engagement in progress for this book."
        )

    engagement = engagement_crud.create(
        db,
        Engagement(
            book_id=book_id,
            user_id=user_id,
            status=status,
            # Only a read in progress falls back to today. One logged after the fact
            # may genuinely not know when it began, and guessing would be a lie.
            started_on=started_on
            or (datetime.date.today() if status == ReadingStatus.reading else None),
            finished_on=finished_on if status == ReadingStatus.finished else None,
            abandoned_on=finished_on if status == ReadingStatus.dnf else None,
        ),
    )

    candidates = edition_crud.list_by(db, book_id=book_id, format=edition_format)
    if len(candidates) == 0:
        raise NotFoundError(f"No {edition_format} edition exists for this book")
    if len(candidates) > 1:
        raise ConflictError(
            f"This book has more than one {edition_format} edition, so the app"
            " can't tell which one to start reading. Choosing a specific edition"
            " when starting a read isn't supported yet."
        )
    edition = candidates[0]

    engagement_edition_crud.create(
        db,
        EngagementEdition(
            engagement_id=engagement.id,
            edition_id=edition.id,
            user_id=engagement.user_id,
            length_override=length_override,
        ),
    )

    if edition_length is not None:
        capture_edition_length(book, edition, edition_length)

    return engagement


def _reject_duplicate_reading(db: Session, engagement: Engagement) -> None:
    duplicate = db.execute(
        select(Engagement).where(
            Engagement.book_id == engagement.book_id,
            Engagement.status == ReadingStatus.reading,
            Engagement.id != engagement.id,
        )
    ).scalar_one_or_none()
    if duplicate is not None:
        raise ConflictError("Already reading another engagement for this book.")


def _closing_unit(engagement: Engagement, unit: LogUnit | None) -> LogUnit:
    """Which ruler the closing span is measured on. A read going in one format has only
    one answer; a read going in both has to be told which, which is what the finish
    sheet asks for."""
    if unit is not None:
        return unit
    if engagement.page_format is None:
        return LogUnit.minutes
    if Format.audio not in engagement.formats:
        return LogUnit.pages
    raise InvalidOperationError(
        "This read is going in more than one format, so finishing it needs a unit."
    )


def _transition_to_finished(
    db: Session,
    engagement: Engagement,
    effective_on: datetime.date,
    unit: LogUnit | None,
) -> None:
    latest = latest_log(engagement.progress_logs)
    if latest is not None and effective_on < latest.logged_on:
        raise ConflictError("finished_on cannot be before the latest progress log.")
    if (
        latest is None
        and engagement.started_on is not None
        and effective_on < engagement.started_on
    ):
        raise ConflictError("finished_on cannot be before started_on.")

    engagement.finished_on = effective_on

    unit = _closing_unit(engagement, unit)
    is_audio = unit == LogUnit.minutes
    length = engagement.resolve_length(
        Format.audio if is_audio else (engagement.page_format or Format.print)
    )
    # The frontier, not the resume point: those differ when the last session on this
    # ruler was a re-read, and the closing span covers what is left of the *book*.
    position = engagement.frontier_in(unit)
    if length is None or position >= length:
        return

    progress_log_crud.create(
        db,
        ProgressLog(
            engagement_id=engagement.id,
            user_id=engagement.user_id,
            logged_on=effective_on,
            unit=unit,
            minute_start=position if is_audio else None,
            minute_end=length if is_audio else None,
            page_start=None if is_audio else position,
            page_end=None if is_audio else length,
            new_ground=True,
        ),
    )


def _transition_to_dnf(
    engagement: Engagement,
    effective_on: datetime.date | None,
    resolved_on: datetime.date,
) -> None:
    latest = latest_log(engagement.progress_logs)
    if latest is None:
        engagement.abandoned_on = resolved_on
        return
    if effective_on is not None and effective_on < latest.logged_on:
        raise ConflictError("abandoned_on cannot be before the latest progress log.")
    engagement.abandoned_on = effective_on or latest.logged_on


def update_status(
    db: Session,
    engagement: Engagement,
    *,
    new_status: ReadingStatus,
    effective_on: datetime.date | None,
    unit: LogUnit | None = None,
) -> None:
    if new_status == engagement.status:
        return

    if new_status == ReadingStatus.reading:
        _reject_duplicate_reading(db, engagement)

    resolved_on = effective_on or datetime.date.today()
    reject_future_date(resolved_on)

    engagement.status = new_status
    match new_status:
        case ReadingStatus.reading:
            engagement.finished_on = None
            engagement.abandoned_on = None
        case ReadingStatus.finished:
            _transition_to_finished(db, engagement, resolved_on, unit)
        case ReadingStatus.dnf:
            _transition_to_dnf(engagement, effective_on, resolved_on)


def apply_date_change(
    engagement: Engagement,
    started_on: datetime.date | None,
    finished_on: datetime.date | None,
    abandoned_on: datetime.date | None = None,
) -> None:
    """Corrects the dates a read already has.

    A date moved onto the session at its boundary takes that session with it rather than
    being refused: correcting a start you got wrong shouldn't mean correcting the first
    log first, then the date. What is still refused is a move that would carry the
    boundary session past its neighbour, because the order of the logs is what the
    frontier and the re-read split are read from.
    """
    if started_on is not None:
        _make_room_for_start(
            engagement, started_on, _end_date(engagement, finished_on, abandoned_on)
        )
        engagement.started_on = started_on

    # A read has one end date, in whichever column matches how it ended, and both answer
    # to the same rules.
    if finished_on is not None:
        _make_room_for_end(engagement, finished_on, engagement.finished_on)
        engagement.finished_on = finished_on
    if abandoned_on is not None:
        _make_room_for_end(engagement, abandoned_on, engagement.abandoned_on)
        engagement.abandoned_on = abandoned_on


def _end_date(
    engagement: Engagement,
    finished_on: datetime.date | None,
    abandoned_on: datetime.date | None,
) -> datetime.date | None:
    """The end date a new start has to stay behind: whatever this request is setting it
    to, falling back to whichever column the read already has."""
    return (
        finished_on or abandoned_on or engagement.finished_on or engagement.abandoned_on
    )


def _log_dates(engagement: Engagement) -> list[datetime.date]:
    return sorted({log.logged_on for log in engagement.progress_logs})


def _shift_logs_on(
    engagement: Engagement, day: datetime.date, to: datetime.date
) -> None:
    """Every log on `day` moves, not just the one at the boundary: same-day sessions
    have to stay on the same side of it, and a session that crossed the frontier is two
    rows sharing a day."""
    for log in engagement.progress_logs:
        if log.logged_on == day:
            log.logged_on = to


def _make_room_for_start(
    engagement: Engagement,
    new_start: datetime.date,
    end_date: datetime.date | None,
) -> None:
    dates = _log_dates(engagement)
    # Only a start moving onto the first session drags it. One moving earlier just opens
    # a gap, because starting a read doesn't write a log the way finishing one does.
    dragging = bool(dates) and new_start > dates[0]
    if dragging and len(dates) > 1 and new_start > dates[1]:
        raise ConflictError(
            f"This read has a session on {dates[1]}, so it can't have started after"
            " that."
        )
    if end_date is not None and new_start > end_date:
        raise ConflictError("A read can't start after the date it ended.")
    if dragging:
        _shift_logs_on(engagement, dates[0], new_start)


def _make_room_for_end(
    engagement: Engagement,
    new_end: datetime.date,
    current_end: datetime.date | None,
) -> None:
    dates = _log_dates(engagement)
    # Moving earlier drags the last session back with it. Moving later drags it only
    # when it was sitting on the end date, which is where finishing a read puts the
    # closing log it writes -- a session logged before that date stays where it was.
    dragging = bool(dates) and (new_end < dates[-1] or dates[-1] == current_end)
    if dragging and len(dates) > 1 and new_end < dates[-2]:
        raise ConflictError(
            f"This read has a session on {dates[-2]}, so it can't have ended before"
            " that."
        )
    if engagement.started_on is not None and new_end < engagement.started_on:
        raise ConflictError("A read can't end before the date it started.")
    if dragging:
        _shift_logs_on(engagement, dates[-1], new_end)
