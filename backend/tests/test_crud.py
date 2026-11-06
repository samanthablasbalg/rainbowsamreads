from __future__ import annotations

import uuid
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier, local
from typing import Any

import pytest
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.crud import CRUDBase
from app.exceptions import NotFoundError
from app.models.author import Author
from app.models.recommender import Recommender
from app.models.user import User

crud_author = CRUDBase(Author)
crud_recommender = CRUDBase(Recommender)


class _AuthorPatch(BaseModel):
    name: str | None = None
    nationality: str | None = None


def test_get_returns_none_for_missing_id(db: Session) -> None:
    assert crud_author.get(db, uuid.uuid4()) is None


def test_get_returns_existing_object(db: Session) -> None:
    author = crud_author.create(db, Author(name="Ursula K. Le Guin"))
    found = crud_author.get(db, author.id)
    assert found is not None
    assert found.name == "Ursula K. Le Guin"


def test_create_flushes_and_assigns_id(db: Session) -> None:
    author = crud_author.create(db, Author(name="Octavia Butler"))
    assert author.id is not None


def test_list_returns_all(db: Session) -> None:
    crud_author.create(db, Author(name="Ted Chiang"))
    crud_author.create(db, Author(name="N.K. Jemisin"))
    names = {a.name for a in crud_author.list(db)}
    assert {"Ted Chiang", "N.K. Jemisin"} <= names


def test_update_only_applies_fields_explicitly_set(db: Session) -> None:
    author = crud_author.create(db, Author(name="Kazuo Ishiguro"))
    crud_author.update(db, author, _AuthorPatch(nationality="British"))
    assert author.name == "Kazuo Ishiguro"
    assert author.nationality == "British"


def test_delete_removes_object(db: Session) -> None:
    author = crud_author.create(db, Author(name="Shirley Jackson"))
    crud_author.delete(db, author)
    assert crud_author.get(db, author.id) is None


def test_get_or_create_creates_when_missing(db: Session) -> None:
    author = crud_author.get_or_create(db, lookup={"name": "Susanna Clarke"})
    assert author.name == "Susanna Clarke"


def test_get_or_create_returns_existing_without_duplicating(db: Session) -> None:
    first = crud_author.get_or_create(db, lookup={"name": "R.F. Kuang"})
    second = crud_author.get_or_create(db, lookup={"name": "R.F. Kuang"})
    assert first.id == second.id
    assert len(crud_author.list(db)) == 1


def test_get_or_create_recovers_when_a_concurrent_insert_wins(
    app_session: Callable[[uuid.UUID], Session],
    seed_user: User,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    first_lookups = Barrier(2)
    thread_state = local()
    original_get_by = crud_recommender.get_by

    def synchronize_initial_lookup(db: Session, **filters: Any) -> Recommender | None:
        recommender = original_get_by(db, **filters)
        if not getattr(thread_state, "completed_initial_lookup", False):
            thread_state.completed_initial_lookup = True
            assert recommender is None
            first_lookups.wait(timeout=10)
        return recommender

    monkeypatch.setattr(crud_recommender, "get_by", synchronize_initial_lookup)

    def get_or_create_recommender() -> uuid.UUID:
        db = app_session(seed_user.id)
        recommender = crud_recommender.get_or_create(
            db, lookup={"user_id": seed_user.id, "name": "Elmer Fudd"}
        )
        db.commit()
        return recommender.id

    with ThreadPoolExecutor(max_workers=2) as executor:
        first = executor.submit(get_or_create_recommender)
        second = executor.submit(get_or_create_recommender)

        assert first.result(timeout=10) == second.result(timeout=10)


def test_get_by_returns_matching_object(db: Session) -> None:
    crud_author.create(db, Author(name="Ling Ma"))
    found = crud_author.get_by(db, name="Ling Ma")
    assert found is not None
    assert found.name == "Ling Ma"


def test_get_by_returns_none_when_no_match(db: Session) -> None:
    assert crud_author.get_by(db, name="Nobody Here") is None


def test_get_or_raise_returns_existing_object(db: Session) -> None:
    author = crud_author.create(db, Author(name="Jeff VanderMeer"))
    found = crud_author.get_or_raise(db, author.id)
    assert found.id == author.id


def test_get_or_raise_raises_not_found_for_missing_id(db: Session) -> None:
    with pytest.raises(NotFoundError, match="Author not found"):
        crud_author.get_or_raise(db, uuid.uuid4())


def test_get_or_raise_uses_custom_message(db: Session) -> None:
    with pytest.raises(NotFoundError, match="no such author"):
        crud_author.get_or_raise(db, uuid.uuid4(), message="no such author")
