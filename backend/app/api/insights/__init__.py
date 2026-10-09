from __future__ import annotations

from fastapi import APIRouter

from . import streak

router = APIRouter(tags=["insights"])
router.include_router(streak.router, prefix="/insights")
