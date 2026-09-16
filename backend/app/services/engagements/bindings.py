from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.crud import edition_crud, engagement_edition_crud
from app.exceptions import ConflictError, InvalidOperationError, NotFoundError
from app.models.edition import Edition, EngagementEdition
from app.models.engagement import Engagement
from app.models.enums import Format, LogUnit, ReadingStatus
from app.services.books import capture_edition_length


def bind_edition(
    db: Session,
    engagement: Engagement,
    *,
    edition_id: uuid.UUID | None,
    edition_format: Format | None,
    edition_length: int | None,
    length_override: int | None,
) -> EngagementEdition:
    edition = (
        edition_crud.get_or_raise(db, edition_id)
        if edition_id is not None
        else edition_for_format(db, engagement, edition_format)
    )
    binding = engagement_edition_crud.get(db, (engagement.id, edition.id))
    if binding is None:
        if (
        engagement.status != ReadingStatus.reading
        and engagement.status != ReadingStatus.tbr
        ):
            raise InvalidOperationError(
                "An engagement must be in tbr or in progress to get an edition bound."
            )
        if (
            length_override is None
            and edition_length is None
            and edition.length is None
            and engagement.status == ReadingStatus.reading
        ):
            raise InvalidOperationError(
                "A reading engagement requires a length for its selected format."
            )
        return create_binding(
            db,
            engagement,
            edition,
            length_override=length_override,
            edition_length=edition_length,
        )
    if edition_length is not None:
        raise InvalidOperationError(
            "This edition is already bound to this engagement. "
            "Use the length override to change its length."
        )
    if length_override is not None:
        _override_length(engagement, binding, length_override)
    return binding


def create_binding(
    db: Session,
    engagement: Engagement,
    edition: Edition,
    *,
    length_override: int | None,
    edition_length: int | None,
) -> EngagementEdition:
    binding = engagement_edition_crud.create(
        db,
        EngagementEdition(
            engagement_id=engagement.id,
            edition_id=edition.id,
            user_id=engagement.user_id,
            length_override=length_override,
        ),
    )

    if edition_length is not None:
        capture_edition_length(engagement.book, edition, edition_length)

    return binding


def edition_for_format(
    db: Session, engagement: Engagement, edition_format: Format | None
) -> Edition:
    candidates = edition_crud.list_by(
        db, book_id=engagement.book_id, format=edition_format
    )
    if len(candidates) == 0:
        raise NotFoundError(f"No {edition_format} edition exists for this book")
    if len(candidates) > 1:
        raise ConflictError(
            f"This book has more than one {edition_format} edition, so the app"
            " can't tell which one to use."
        )
    return candidates[0]


def _override_length(
    engagement: Engagement, binding: EngagementEdition, length: int
) -> None:
    # The correction lands on the binding, never on the edition: the edition is shared
    # across users, so its length is not this reader's to move (ADR-0021).
    is_audio = binding.edition.format == Format.audio
    _pull_back_the_final_entry(engagement, is_audio, length)
    binding.length_override = length


def _pull_back_the_final_entry(
    engagement: Engagement, is_audio: bool, length: int
) -> None:
    """Make room for a shorter length by shortening the one entry that ran to the old
    end, or refuse the correction outright when more than one entry is in the way."""
    # On this format's ruler only: a page entry's number means nothing against an audio
    # length, and the two rulers are corrected independently.
    unit = LogUnit.minutes if is_audio else LogUnit.pages
    stranded = [
        (log, log.end)
        for log in engagement.progress_logs
        if log.unit == unit and log.end is not None and log.end > length
    ]
    if not stranded:
        return

    # A single entry that starts before the new end is the one that meant "to the end"
    # -- most often the catch-up log finishing a read writes -- so it moves with the
    # length. Anything else (several entries past the end, or one starting past it too)
    # can't be fixed by moving one number, and update_progress_log's refusal to log
    # past the end stands: leaving them would show a permanently clamped 100%.
    log, _ = stranded[0]
    if len(stranded) > 1 or log.start >= length:
        furthest = max(end for _, end in stranded)
        reached = f"{furthest} minutes" if is_audio else f"page {furthest}"
        raise ConflictError(
            f"That is shorter than the furthest point logged ({reached}). "
            "Edit those entries first."
        )

    log.end = length
