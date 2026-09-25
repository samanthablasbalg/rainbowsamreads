from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session, selectinload

from app.crud import engagement_crud, engagement_edition_crud
from app.database import get_db
from app.models.edition import EngagementEdition
from app.schemas import EngagementEditionRead

router = APIRouter()

_BINDING_OPTIONS = (selectinload(EngagementEdition.edition),)


@router.get("/{engagement_id}/editions", response_model=list[EngagementEditionRead])
def list_bindings(
    engagement_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> list[EngagementEditionRead]:
    engagement_crud.get_or_raise(db, engagement_id)
    bindings = engagement_edition_crud.list_by(
        db, options=_BINDING_OPTIONS, engagement_id=engagement_id
    )
    return [EngagementEditionRead.model_validate(b) for b in bindings]


@router.delete(
    "/{engagement_id}/editions/{edition_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_binding(
    engagement_id: uuid.UUID,
    edition_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> None:
    binding = engagement_edition_crud.get_or_raise(db, (engagement_id, edition_id))
    engagement_edition_crud.delete(db, binding)
    db.commit()
