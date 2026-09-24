from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.crud import engagement_crud
from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import InvalidOperationError
from app.models.enums import ReadingStatus
from app.models.user import User
from app.schemas import (
    EngagementDatesUpdate,
    EngagementRead,
    EngagementWrite,
)
from app.services.engagements import lifecycle as lifecycle_service

from ._shared import reload

router = APIRouter()


@router.post(
    "",
    response_model=EngagementRead,
    responses={
        200: {
            "model": EngagementRead,
            "description": "Engagement status updated successfully.",
        },
    },
    status_code=status.HTTP_201_CREATED,
)
def write_engagement(
    response: Response,
    payload: EngagementWrite,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EngagementRead:
    if payload.id is None:
        if payload.book_id is None or payload.edition_format is None:
            raise InvalidOperationError(
                "Creating a read needs a book_id and edition_format."
            )
        engagement = lifecycle_service.create_engagement(
            db,
            book_id=payload.book_id,
            edition_format=payload.edition_format,
            status=payload.status,
            user_id=current_user.id,
            edition_length=payload.edition_length,
            length_override=payload.length_override,
            started_on=payload.started_on,
            finished_on=payload.finished_on,
        )
        db.commit()
        return EngagementRead.model_validate(reload(db, engagement.id))
    else:
        engagement = lifecycle_service.update_engagement(
            db,
            engagement_id=payload.id,
            new_status=payload.status,
            edition_id=payload.edition_id,
            edition_format=payload.edition_format,
            edition_length=payload.edition_length,
            length_override=payload.length_override,
            effective_on=payload.effective_on,
            unit=payload.unit,
        )
        db.commit()
        response.status_code = status.HTTP_200_OK
        return EngagementRead.model_validate(reload(db, engagement.id))


@router.patch("/{engagement_id}/dates", response_model=EngagementRead)
def update_engagement_dates(
    engagement_id: uuid.UUID,
    payload: EngagementDatesUpdate,
    db: Session = Depends(get_db),
) -> EngagementRead:
    engagement = engagement_crud.get_or_raise(db, engagement_id)
    lifecycle_service.apply_date_change(
        engagement, payload.started_on, payload.finished_on, payload.abandoned_on
    )
    db.commit()
    return EngagementRead.model_validate(reload(db, engagement_id))


@router.get("/{engagement_id}", response_model=EngagementRead)
def get_engagement(
    engagement_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> EngagementRead:
    return EngagementRead.model_validate(reload(db, engagement_id))


@router.delete("/{engagement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_engagement(
    engagement_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> None:
    engagement = engagement_crud.get_or_raise(db, engagement_id)
    engagement_crud.delete(db, engagement)
    db.commit()


@router.get("", response_model=list[EngagementRead])
def list_engagements(
    status: ReadingStatus = Query(..., alias="status"),
    db: Session = Depends(get_db),
) -> list[EngagementRead]:
    engagements = lifecycle_service.list_by_status(db, status)
    return [EngagementRead.model_validate(e) for e in engagements]
