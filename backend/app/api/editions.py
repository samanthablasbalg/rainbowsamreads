from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.crud import book_crud, edition_crud
from app.database import get_db
from app.exceptions import ConflictError
from app.models.edition import Edition
from app.schemas import EditionCreate, EditionRead, EditionUpdate

router = APIRouter(prefix="/editions", tags=["editions"])


@router.post("", response_model=EditionRead, status_code=status.HTTP_201_CREATED)
def create_edition(
    payload: EditionCreate, db: Session = Depends(get_db)
) -> EditionRead:
    book_crud.get_or_raise(db, payload.book_id)
    try:
        edition = edition_crud.create(
            db,
            Edition(
                book_id=payload.book_id,
                format=payload.format,
                isbn=payload.isbn,
                length=payload.length,
                cover_url=payload.cover_url,
            ),
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("An edition with these fields already exists.") from None
    db.refresh(edition)
    return EditionRead.model_validate(edition)


@router.get("/{edition_id}", response_model=EditionRead)
def get_edition(edition_id: uuid.UUID, db: Session = Depends(get_db)) -> EditionRead:
    edition = edition_crud.get_or_raise(db, edition_id)
    return EditionRead.model_validate(edition)


@router.patch("/{edition_id}", response_model=EditionRead)
def update_edition(
    edition_id: uuid.UUID,
    payload: EditionUpdate,
    db: Session = Depends(get_db),
) -> EditionRead:
    edition = edition_crud.get_or_raise(db, edition_id)
    if "isbn" in payload.model_fields_set:
        edition.isbn = payload.isbn
    if "cover_url" in payload.model_fields_set:
        edition.cover_url = payload.cover_url

    length_fields = payload.model_fields_set & {
        "length",
        "page_count",
        "audio_minutes",
    }
    if length_fields:
        wrong_field = (
            "page_count" if edition.format.value == "audio" else "audio_minutes"
        )
        if wrong_field in payload.model_fields_set and getattr(payload, wrong_field):
            raise ConflictError("Length field does not match the edition format.")
        values = [getattr(payload, field) for field in length_fields]
        edition.length = next((value for value in values if value is not None), None)
    db.flush()
    db.commit()
    db.refresh(edition)
    return EditionRead.model_validate(edition)
