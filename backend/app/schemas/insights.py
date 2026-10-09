from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class StreakRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    count: int
    logged_today: bool
