from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.crud import edition_crud, engagement_edition_crud
from app.exceptions import ConflictError, NotFoundError
from app.models.edition import EngagementEdition
from app.models.engagement import Engagement
from app.models.enums import Format, LogUnit
from app.services.books import capture_edition_length


def create_binding(
    db: Session,
    engagement: Engagement,
    *,
    edition_id: uuid.UUID | None,
    edition_format: Format | None,
    origin_id: uuid.UUID | None,
    length_override: int | None,
    edition_length: int | None,
) -> EngagementEdition:
    if edition_id is not None:
        edition = edition_crud.get_or_raise(db, edition_id)
    else:
        candidates = edition_crud.list_by(
            db, book_id=engagement.book_id, format=edition_format
        )
        if len(candidates) == 0:
            raise NotFoundError(
                f"No {edition_format} edition exists for this book; create one first"
            )
        if len(candidates) > 1:
            raise ConflictError(
                "Multiple editions exist for this format; pass edition_id instead"
            )
        edition = candidates[0]

    if engagement_edition_crud.get(db, (engagement.id, edition.id)) is not None:
        raise ConflictError("This edition is already bound to this engagement.")

    binding = engagement_edition_crud.create(
        db,
        EngagementEdition(
            engagement_id=engagement.id,
            edition_id=edition.id,
            user_id=engagement.user_id,
            origin_id=origin_id,
            length_override=length_override,
        ),
    )

    if edition_length is not None:
        capture_edition_length(engagement.book, edition, edition_length)

    return binding


def apply_length_change(
    engagement: Engagement,
    *,
    length_pages: int | None,
    length_minutes: int | None,
) -> None:
    """Correct this read's length. The unit picks the binding, on the same rule
    Engagement.length_minutes and .length_pages read it back on."""
    if length_minutes is not None:
        _correct_length(engagement, Format.audio, length_minutes)
    elif length_pages is not None:
        # A read with no page binding resolves to print, which it has no binding in
        # either, so the lookup below is what turns that into the 404.
        page_format = engagement.page_format or Format.print
        _correct_length(engagement, page_format, length_pages)


def _correct_length(engagement: Engagement, fmt: Format, length: int) -> None:
    """Move the binding's length override, refusing a read that isn't bound in this
    format and a length that would strand a progress log past the end."""
    # The correction lands on the binding, never on the edition: the edition is shared
    # across users, so its length is not this reader's to move (ADR-0021).
    binding = engagement.binding_for(fmt)
    if binding is None:
        raise NotFoundError("This read has no binding in that format.")

    is_audio = fmt == Format.audio
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

    if is_audio:
        log.minute_end = length
    else:
        log.page_end = length
