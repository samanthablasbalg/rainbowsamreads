import uuid

from sqlalchemy import ForeignKey, ForeignKeyConstraint, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin

# Keep Recommender and BookRecommendation together


class Recommender(Base):
    __tablename__ = "recommenders"
    __table_args__ = (
        UniqueConstraint("id", "user_id"),
        UniqueConstraint("user_id", "name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str]


class BookRecommendation(TimestampMixin, Base):
    __tablename__ = "book_recommendations"
    __table_args__ = (
        ForeignKeyConstraint(
            ["recommender_id", "user_id"],
            ["recommenders.id", "recommenders.user_id"],
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), primary_key=True)
    book_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("books.id"), primary_key=True)
    recommender_id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    note: Mapped[str | None]

    recommender: Mapped[Recommender] = relationship()
