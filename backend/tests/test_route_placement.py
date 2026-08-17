from __future__ import annotations

import pytest
from fastapi.routing import APIRoute

from app.main import app

# A route's URL decides which module owns it, not which module happens to hold the
# loading helpers it wants. Serving /api/books/... from the engagements package splits
# the /books interface across two files and mistags the route, which files the generated
# frontend hook under the wrong folder.


def _api_routes() -> list[APIRoute]:
    return [
        route
        for route in app.routes
        if isinstance(route, APIRoute) and route.path.startswith("/api/")
    ]


def _owner(route: APIRoute) -> str:
    """The package under app.api that defines the endpoint (`app.api.books` -> books,
    `app.api.engagements.lifecycle` -> engagements)."""
    module = route.endpoint.__module__
    assert module.startswith("app.api."), f"{route.path} is not defined under app.api"
    return module.removeprefix("app.api.").split(".")[0]


def _url_space(route: APIRoute) -> str:
    return route.path.removeprefix("/api/").split("/")[0]


@pytest.mark.parametrize("route", _api_routes(), ids=lambda r: f"{r.path}")
def test_route_is_served_from_the_package_that_owns_its_url(route: APIRoute) -> None:
    segment = _url_space(route)
    assert segment == _owner(route), (
        f"{route.path} is defined in {route.endpoint.__module__}, but /api/{segment} "
        f"is owned by app.api.{segment}. Move the route to that module."
    )


@pytest.mark.parametrize("route", _api_routes(), ids=lambda r: f"{r.path}")
def test_route_is_tagged_for_its_url_space(route: APIRoute) -> None:
    segment = _url_space(route)
    assert route.tags == [segment], (
        f"{route.path} is tagged {route.tags}, expected ['{segment}']. The tag picks "
        f"the folder orval generates the client hook into."
    )
