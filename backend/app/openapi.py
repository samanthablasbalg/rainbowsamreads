from typing import Any

from fastapi import FastAPI

from app.models.enums import (
    CREATABLE_STATUSES,
    ENDED_STATUSES,
    OPEN_STATUSES,
    ReadingStatus,
)

_STATUS_GROUP_SCHEMAS = {
    "CreatableReadingStatus": CREATABLE_STATUSES,
    "OpenReadingStatus": OPEN_STATUSES,
    "EndedReadingStatus": ENDED_STATUSES,
}


def install_openapi_extensions(app: FastAPI) -> None:
    default_openapi = app.openapi

    def openapi() -> dict[str, Any]:
        schema = default_openapi()
        schemas = schema.setdefault("components", {}).setdefault("schemas", {})

        for name, statuses in _STATUS_GROUP_SCHEMAS.items():
            schemas[name] = {
                "type": "string",
                "title": name,
                "enum": [
                    status.value for status in ReadingStatus if status in statuses
                ],
            }

        return schema

    app.openapi = openapi  # type: ignore[method-assign]
