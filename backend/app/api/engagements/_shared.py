from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.crud import engagement_crud
from app.models.engagement import Engagement
from app.services.engagements._shared import ENGAGEMENT_READ_OPTIONS


def reload(db: Session, engagement_id: uuid.UUID) -> Engagement:
    return engagement_crud.get_or_raise(
        db, engagement_id, options=ENGAGEMENT_READ_OPTIONS
    )
