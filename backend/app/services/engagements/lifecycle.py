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
from app.exceptions import ConflictError, NotFoundError
from app.models.edition import Edition, EngagementEdition
from app.models.engagement import Engagement
from app.models.enums import Format, LogUnit, ReadingStatus
from app.models.progress_log import ProgressLog
from app.services.books import capture_audio_length
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
    audio_length_minutes: int | None = None,
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
            Edition.edition_format == edition_format,
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

    candidates = edition_crud.list_by(
        db, book_id=book_id, edition_format=edition_format
    )
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

    if audio_length_minutes is not None:
        capture_audio_length(book, edition, audio_length_minutes)

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


def _transition_to_finished(
    db: Session, engagement: Engagement, effective_on: datetime.date
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

    # The closing log lands on the ruler the read was last logged on. With nothing
    # logged there is no ruler to read off, so audio wins as it did before.
    unit = engagement.resume_unit or (
        LogUnit.minutes if Format.audio in engagement.formats else LogUnit.pages
    )
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
            _transition_to_finished(db, engagement, resolved_on)
        case ReadingStatus.dnf:
            _transition_to_dnf(engagement, effective_on, resolved_on)


def apply_date_change(
    engagement: Engagement,
    started_on: datetime.date | None,
    finished_on: datetime.date | None,
    abandoned_on: datetime.date | None = None,
) -> None:
    logs = sorted(
        engagement.progress_logs, key=lambda log: (log.logged_on, log.created_at)
    )
    earliest_log_date = logs[0].logged_on if logs else None
    latest_log_date = logs[-1].logged_on if logs else None

    effective_started = started_on if started_on is not None else engagement.started_on

    if (
        started_on is not None
        and earliest_log_date is not None
        and started_on > earliest_log_date
    ):
        raise ConflictError("started_on cannot be after the earliest progress log.")

    # A read has one end date, in whichever column matches how it ended, and both
    # answer to the same two rules.
    for name, incoming, current in (
        ("finished_on", finished_on, engagement.finished_on),
        ("abandoned_on", abandoned_on, engagement.abandoned_on),
    ):
        effective_end = incoming if incoming is not None else current
        if (
            effective_end is not None
            and effective_started is not None
            and effective_end < effective_started
        ):
            raise ConflictError(f"{name} cannot be before started_on.")
        if (
            incoming is not None
            and latest_log_date is not None
            and incoming < latest_log_date
        ):
            raise ConflictError(f"{name} cannot be before the latest progress log.")

    if started_on is not None:
        engagement.started_on = started_on
    if finished_on is not None:
        engagement.finished_on = finished_on
    if abandoned_on is not None:
        engagement.abandoned_on = abandoned_on
