from __future__ import annotations

import datetime
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import engagement_crud, progress_log_crud
from app.exceptions import ConflictError, InvalidOperationError
from app.models.engagement import Engagement
from app.models.enums import Format, LogUnit, ReadingStatus
from app.models.progress_log import ProgressLog, log_sort_key
from app.services.books import capture_edition_length


def reject_future_date(value: datetime.date | None) -> None:
    if value is not None and value > datetime.date.today():
        raise InvalidOperationError("Date cannot be in the future.")


def latest_log(logs: list[ProgressLog]) -> ProgressLog | None:
    return max(logs, key=log_sort_key) if logs else None


def list_for_engagement(db: Session, engagement_id: uuid.UUID) -> list[ProgressLog]:
    """Oldest first, on the same key as log_sort_key -- the two have to agree, since one
    orders the stored history and the other picks the latest entry in memory."""
    engagement_crud.get_or_raise(db, engagement_id)
    return list(
        db.execute(
            select(ProgressLog)
            .where(ProgressLog.engagement_id == engagement_id)
            .order_by(
                ProgressLog.logged_on.asc(),
                ProgressLog.created_at.asc(),
                ProgressLog.new_ground.asc(),
            )
        )
        .scalars()
        .all()
    )


def log_progress(
    db: Session,
    engagement: Engagement,
    *,
    page_start: int | None,
    page_end: int | None,
    minute_start: int | None,
    minute_end: int | None,
    logged_on: datetime.date | None,
    edition_length: int | None,
    note: str | None,
) -> ProgressLog:
    """Stores one session, and returns the row the client addresses it by.

    A session that crosses the frontier covers ground twice over: some of it re-read,
    the rest new. ADR-0007 stores that as two rows, so completion can count the new half
    without the re-read half inflating it."""
    if engagement.status != ReadingStatus.reading:
        raise ConflictError("Can only log progress on an engagement being read.")

    # The unit is the entry's own, not the read's: a read bound in both rulers logs
    # pages some days and minutes others. Exactly one span arrived (the schema enforces
    # it), so the assert narrows for mypy rather than checking anything new.
    is_audio = minute_end is not None
    start, end = (minute_start, minute_end) if is_audio else (page_start, page_end)
    assert start is not None and end is not None

    if is_audio and Format.audio not in engagement.formats:
        raise ConflictError("This read has no audio format. Add one to log time.")
    if not is_audio and engagement.page_format is None:
        raise ConflictError("This read is audio only. Add a format to log pages.")

    unit = LogUnit.minutes if is_audio else LogUnit.pages
    length = engagement.length_minutes if is_audio else engagement.length_pages
    # Read before anything is written: every row this call creates would move it.
    frontier = engagement.frontier_in(unit)

    if end < start:
        raise ConflictError("A session can't end before it started.")
    if end == start and note is None:
        raise ConflictError("Progress must advance beyond the current position.")
    # `not length` rather than `is None`: a zero length is a book whose length nobody
    # has recorded, which is what covered_fraction takes it for too.
    if length and end > length:
        raise ConflictError(
            "Minute cannot exceed the audio length."
            if is_audio
            else "Page cannot exceed the book's length."
        )
    # Re-reading behind the frontier is the point of all this; starting *past* it is
    # not. That span would leave the ground between untouched, and whether that ground
    # is unread or read-and-unlogged is a question this can't answer (issue 96).
    if start > frontier:
        raise ConflictError("A session can't start past where this read has got to.")

    resolved_on = logged_on or datetime.date.today()
    reject_future_date(resolved_on)
    if engagement.started_on is not None and resolved_on < engagement.started_on:
        raise ConflictError("Log date cannot be before the engagement's start date.")
    if any(log.logged_on > resolved_on for log in engagement.progress_logs):
        raise ConflictError(
            "A log already exists on a later day; you can only correct the most"
            " recent day."
        )

    # Re-coverage first, so the pair reads in the order it was covered and the
    # new-ground half sorts last (see log_sort_key).
    if start >= frontier:
        spans = [(start, end, True)]
    elif end <= frontier:
        spans = [(start, end, False)]
    else:
        spans = [(start, frontier, False), (frontier, end, True)]

    logs = [
        progress_log_crud.create(
            db,
            ProgressLog(
                engagement_id=engagement.id,
                user_id=engagement.user_id,
                logged_on=resolved_on,
                unit=unit,
                minute_start=span_start if is_audio else None,
                minute_end=span_end if is_audio else None,
                page_start=None if is_audio else span_start,
                page_end=None if is_audio else span_end,
                new_ground=new_ground,
                # The note is about the session, and goes on the row the client will
                # address it by: the last, which is the new-ground half of a split.
                note=note if index == len(spans) - 1 else None,
            ),
        )
        for index, (span_start, span_end, new_ground) in enumerate(spans)
    ]

    if edition_length is not None:
        fmt = Format.audio if is_audio else engagement.page_format
        binding = engagement.binding_for(fmt) if fmt is not None else None
        if binding is not None:
            capture_edition_length(engagement.book, binding.edition, edition_length)

    return logs[-1]


def session_rows(engagement: Engagement, log: ProgressLog) -> list[ProgressLog]:
    """The rows one save wrote, oldest span first.

    A session crossing the frontier is stored as two rows, and the pair is what the
    reader thinks of as the entry -- so editing or deleting one has to move both.
    They are grouped by `created_at`: Postgres `now()` is transaction start time, so two
    rows written by one save match to the microsecond and two saves never can."""
    group = [e for e in engagement.progress_logs if e.created_at == log.created_at]
    return sorted(group, key=log_sort_key)


def update_progress_log(
    engagement: Engagement,
    log: ProgressLog,
    *,
    logged_on: datetime.date | None,
    page_end: int | None,
    minute_end: int | None,
    note: str | None,
) -> None:
    rows = session_rows(engagement, log)
    # Where the session ended, so the new-ground half of a split -- the half an edit to
    # the end position or the note is about.
    target = rows[-1]

    if logged_on is not None:
        reject_future_date(logged_on)
        if engagement.started_on is not None and logged_on < engagement.started_on:
            raise ConflictError(
                "That date would be before the engagement's start date."
            )
        if engagement.finished_on is not None and logged_on > engagement.finished_on:
            raise ConflictError(
                "That date would be after the engagement's finish date."
            )
        for row in rows:
            row.logged_on = logged_on

    editing_progress = page_end is not None or minute_end is not None
    if editing_progress:
        latest = latest_log(engagement.progress_logs)
        if latest is not None and target.created_at != latest.created_at:
            raise ConflictError("Only the most recent entry's progress can be edited.")

    if page_end is not None:
        if page_end <= (target.page_start or 0):
            raise ConflictError(
                "Page must be higher than this session's starting page."
            )
        book_length = engagement.resolve_length(engagement.page_format or Format.print)
        if book_length is not None and page_end > book_length:
            raise ConflictError("Page cannot exceed the book's length.")
        _reject_extending_a_re_read(engagement, target, page_end, LogUnit.pages)
        target.page_end = page_end

    if minute_end is not None:
        if minute_end <= (target.minute_start or 0):
            raise ConflictError(
                "Minute must be higher than this session's starting minute."
            )
        audio_length = engagement.resolve_length(Format.audio)
        if audio_length is not None and minute_end > audio_length:
            raise ConflictError("Minute cannot exceed the audio length.")
        _reject_extending_a_re_read(engagement, target, minute_end, LogUnit.minutes)
        target.minute_end = minute_end

    if note is not None:
        target.note = note or None


def _reject_extending_a_re_read(
    engagement: Engagement, target: ProgressLog, end: int, unit: LogUnit
) -> None:
    """A re-read has no new-ground row, so an end pushed past the frontier would have to
    split a stored row in two. Refused, the same way starting past the frontier is."""
    if target.new_ground or end <= engagement.frontier_in(unit):
        return
    raise ConflictError("A re-read can't extend past where this read has got to.")


def delete_progress_log(db: Session, engagement: Engagement, log: ProgressLog) -> None:
    latest = latest_log(engagement.progress_logs)
    if latest is not None and log.created_at != latest.created_at:
        raise ConflictError("Only the most recent progress log can be deleted.")
    for row in session_rows(engagement, log):
        progress_log_crud.delete(db, row)
