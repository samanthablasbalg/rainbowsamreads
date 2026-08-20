from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.crud import edition_crud, engagement_edition_crud
from app.exceptions import ConflictError, NotFoundError
from app.models.edition import EngagementEdition
from app.models.engagement import Engagement
from app.models.enums import Format


def create_binding(
    db: Session,
    engagement: Engagement,
    *,
    edition_id: uuid.UUID | None,
    edition_format: Format | None,
    origin_id: uuid.UUID | None,
    length_override: int | None,
) -> EngagementEdition:
    if edition_id is not None:
        edition = edition_crud.get_or_raise(db, edition_id)
    else:
        candidates = edition_crud.list_by(
            db, book_id=engagement.book_id, edition_format=edition_format
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

    return engagement_edition_crud.create(
        db,
        EngagementEdition(
            engagement_id=engagement.id,
            edition_id=edition.id,
            user_id=engagement.user_id,
            origin_id=origin_id,
            length_override=length_override,
        ),
    )


def apply_length_change(
    engagement: Engagement,
    *,
    length_pages: int | None,
    length_minutes: int | None,
) -> None:
    """Correct this read's length. The unit picks the binding, on the same rule
    Engagement.length_minutes and .length_pages read it back on."""
    if length_minutes is not None:
        _set_length_override(engagement, Format.audio, length_minutes)
    elif length_pages is not None:
        page_format = next((f for f in engagement.formats if f != Format.audio), None)
        _set_length_override(engagement, page_format, length_pages)


def _set_length_override(
    engagement: Engagement, fmt: Format | None, length: int
) -> None:
    # The correction lands on the binding, never on the edition: the edition is shared
    # across users, so its length is not this reader's to move (ADR-0021).
    binding = next(
        (
            ee
            for ee in engagement.engagement_editions
            if ee.edition.edition_format == fmt
        ),
        None,
    )
    if binding is None:
        raise NotFoundError("This read has no binding in that format.")

    is_audio = fmt == Format.audio
    ends = (
        log.minute_end if is_audio else log.page_end for log in engagement.progress_logs
    )
    furthest = max((end for end in ends if end is not None), default=None)
    # The mirror of update_progress_log's refusal to log past the end. Without it the
    # read keeps a log beyond its own length and only ever shows a clamped 100%.
    if furthest is not None and length < furthest:
        reached = f"{furthest} minutes" if is_audio else f"page {furthest}"
        raise ConflictError(
            f"That is shorter than the furthest point logged ({reached})."
        )

    binding.length_override = length
