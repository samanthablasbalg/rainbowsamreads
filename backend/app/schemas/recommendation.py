import uuid
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

# RecommenderRead plus recommendation create/update/read shapes


class RecommenderRead(BaseModel):
    id: uuid.UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class BookRecommendationRead(BaseModel):
    recommender: RecommenderRead
    note: str | None = None

    model_config = ConfigDict(from_attributes=True)


class BookRecommendationWrite(BaseModel):
    name: NonEmptyStr
    note: str | None = None
