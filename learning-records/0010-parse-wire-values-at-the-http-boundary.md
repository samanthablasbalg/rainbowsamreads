# Parse wire values at the HTTP boundary

HTTP and JSON carry an ISO date such as `"2026-10-09"` as a string, while application code can work
with `datetime.date`. FastAPI and Pydantic can use a route or request-schema annotation to parse and
validate that string before ordinary Python service code runs. A service annotation by itself does
not convert runtime values; it describes the value callers are required to supply.

This became concrete while repairing issue #271 against baseline commit `96451a54`. The streak
service initially accepted a string and reassigned it to a parsed date, which mypy correctly
rejected because one name changed types. Moving the parsing responsibility to the FastAPI route
allowed the service to accept a `datetime.date` directly and removed the conversion and competing
variable names.

## Evidence

The learner recognized the existing progress-log path as local precedent: the generated frontend
contract sends `logged_on` as a string, `ProgressLogCreate.logged_on` declares
`datetime.date | None`, and the progress-log service receives the parsed date. They then applied the
same boundary to the streak route, resolved a follow-up import mistake, reran the tests, and
observed the streak component successfully render in the application.

The import error added a related distinction. With `import datetime`, `datetime.date` is the date
class. With `from datetime import datetime`, `datetime` is the datetime class and its `.date`
attribute is an instance method, not a valid Pydantic field type. FastAPI's startup error printed
the unexpected method object and thereby exposed the incorrect import/type pairing.

## Implications

- Before manually parsing request text in a service, check whether the framework can validate it at
  the HTTP boundary.
- Read `type: string, format: date` in OpenAPI as two views of one value: string on the wire, date
  in the backend domain.
- Treat parsing as runtime conversion that may fail; do not confuse it with `typing.cast`, which is
  a type-checker assertion and performs no conversion.
- When a dotted annotation resolves unexpectedly, identify what the name to the left of the dot
  actually imports: a module, class, function, or other object.
