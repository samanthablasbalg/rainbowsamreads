from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.crud import engagement_crud
from app.database import get_db
from app.dependencies import get_current_user
from app.models.enums import ReadingStatus
from app.models.user import User
from app.schemas import (
    EngagementCreate,
    EngagementDatesUpdate,
    EngagementRead,
    EngagementStatusUpdate,
)
from app.services.engagements import lifecycle as lifecycle_service

from ._shared import reload

router = APIRouter()


@router.post("", response_model=EngagementRead, status_code=status.HTTP_201_CREATED)
def create_engagement(
    payload: EngagementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EngagementRead:
    engagement = lifecycle_service.create_engagement(
        db,
        book_id=payload.book_id,
        edition_format=payload.edition_format,
        status=ReadingStatus(payload.status),
        user_id=current_user.id,
        audio_length_minutes=payload.audio_length_minutes,
        length_override=payload.length_override,
        started_on=payload.started_on,
    )
    db.commit()
    return EngagementRead.model_validate(reload(db, engagement.id))


@router.patch("/{engagement_id}", response_model=EngagementRead)
def update_engagement_status(
    engagement_id: uuid.UUID,
    payload: EngagementStatusUpdate,
    db: Session = Depends(get_db),
) -> EngagementRead:
    engagement = engagement_crud.get_or_raise(db, engagement_id)
    lifecycle_service.update_status(
        db,
        engagement,
        new_status=ReadingStatus(payload.status),
        effective_on=payload.effective_on,
    )
    db.commit()
    return EngagementRead.model_validate(reload(db, engagement_id))


@router.patch("/{engagement_id}/dates", response_model=EngagementRead)
def update_engagement_dates(
    engagement_id: uuid.UUID,
    payload: EngagementDatesUpdate,
    db: Session = Depends(get_db),
) -> EngagementRead:
    engagement = engagement_crud.get_or_raise(db, engagement_id)
    lifecycle_service.apply_date_change(
        engagement, payload.started_on, payload.finished_on
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
