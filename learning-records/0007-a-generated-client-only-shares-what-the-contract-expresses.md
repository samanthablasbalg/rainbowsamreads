# A generated client only shares what the contract expresses

Generating a frontend client from OpenAPI prevents drift only for facts represented in the OpenAPI
document. Making a backend constant public, using it throughout the backend, or mentioning its type
in an internal helper does not make it part of that contract. Cross-tier domain vocabulary has to be
deliberately projected into the generated schema before a client generator can carry it across the
language seam.

## Historical context

This insight surfaced while repairing the engagement-status work for issue #263, against the branch
state based on
[`ab93b6b`](https://github.com/samanthablasbalg/rainbowsamreads/commit/ab93b6bd8aef7abd4aa28af131a79121d134ef66).
The application had one `ReadingStatus` enum containing `tbr`, `reading`, `finished`, `paused`, and
`dnf`, but several meaningful subsets of that enum were being defined independently:

- `_CREATE_STATUSES` lived privately in the engagement request schema.
- The engagement lifecycle needed the open statuses: `tbr`, `reading`, and `paused`.
- The frontend declared `ShelvedStatus` by manually extracting `tbr`, `reading`, `finished`, and
  `dnf`.
- `StatusDropdown` declared its own `ENDED` array containing `finished` and `dnf`.
- Its selection helper treated only `reading` as open, so an older TBR or paused engagement could
  lose to a more recently updated ended engagement.

At first, `_CREATE_STATUSES` looked private because only a Pydantic validator happened to consume
it. That confused its current placement with its ownership. "Can be used to create an engagement" is
a lifecycle rule just as "keeps an engagement open" and "has ended" are lifecycle rules. The request
schema enforces one of those rules; it does not own the rule.

The first correction was therefore to place three public, immutable collections beside
`ReadingStatus`:

```python
CREATABLE_STATUSES = frozenset({...})
OPEN_STATUSES = frozenset({...})
ENDED_STATUSES = frozenset({...})
```

That gave backend schemas, lifecycle functions, queries, and tests one source for each
classification. It did not, by itself, solve frontend drift.

## Why Orval could not see the constants

Orval does not inspect Python. It reads `backend/openapi.json`, which FastAPI builds from registered
route parameters, request models, and response models.

`ReadingStatus` was already generated because it appeared in API-facing places such as:

```python
status: ReadingStatus = Query(...)
```

and `EngagementRead.status`. Consequently, OpenAPI contained a `ReadingStatus` schema listing all
five values.

The status groups were different. A Python collection is a runtime value, not a type in a request or
response. Pydantic's model validator could check `_CREATE_STATUSES`, but that validator did not
alter the JSON schema for `EngagementWrite.status`. The published contract still said only "`status`
is a `ReadingStatus`."

An annotation on an internal helper would not change that. For example:

```python
def _find_open_status(engagements: list[Engagement]) -> OpenStatus | None:
    ...
```

could help a Python type checker, but FastAPI does not traverse arbitrary implementation functions
when building OpenAPI. Only types reachable from the HTTP interface enter the generated document.

This is the distinction that made the pieces fit: **backend visibility is not contract visibility**.
`public` and `private` describe Python access conventions; OpenAPI visibility depends on whether the
schema generator is told to publish the concept.

## Exporting vocabulary without distorting runtime behavior

The application should not need a fake endpoint, an artificial route parameter, or a second set of
Python enum classes merely to make code generation notice domain vocabulary. Those approaches would
make runtime interfaces serve the generator instead of the application.

The corrected seam is the OpenAPI document itself. `app/openapi.py` adds three named component
schemas whose enum members are derived from the backend collections:

```text
CreatableReadingStatus  <- CREATABLE_STATUSES
OpenReadingStatus       <- OPEN_STATUSES
EndedReadingStatus      <- ENDED_STATUSES
```

The values are ordered by iterating `ReadingStatus` and selecting members present in each
collection. That keeps the backend collections semantically unordered while making the generated
JSON deterministic.

FastAPI supports replacing `app.openapi` to customize the generated document. The implementation
wraps the default method, adds the schemas, and returns the augmented result. Strict mypy reports
assignment to a declared method as `method-assign`, because arbitrary monkey-patching can break
method binding. The implementation uses a narrow suppression:

```python
app.openapi = openapi  # type: ignore[method-assign]
```

The suppression does not hide an uncertain type mismatch. It documents one intentional instance of
FastAPI's method-replacement extension pattern while leaving every other error on the line and in
the file checked normally.

Because the customization belongs to the application, both the served `/openapi.json` and
`scripts/export_openapi.py` receive the same schemas. Modifying only the export script would have
created two competing versions of the contract.

## Consuming the generated classifications

Once the OpenAPI components existed, Orval generated a TypeScript type and value object for each
classification. The frontend no longer needed to repeat their members.

The frontend adapts those generated objects once at its status-utility seam:

```typescript
export const CREATABLE_STATUSES = Object.values(CreatableReadingStatus);

const OPEN_STATUSES = new Set<ReadingStatus>(Object.values(OpenReadingStatus));
const ENDED_STATUSES = new Set<ReadingStatus>(Object.values(EndedReadingStatus));

export function isOpenStatus(status: ReadingStatus): status is OpenReadingStatus {
  return OPEN_STATUSES.has(status);
}

export function isEndedStatus(status: ReadingStatus): status is EndedReadingStatus {
  return ENDED_STATUSES.has(status);
}
```

The old `ShelvedStatus` alias was deleted rather than pointed at `CreatableReadingStatus`. An alias
would preserve a second name without adding a second concept. Callers that mean "a status accepted
when creating an engagement" now use the generated `CreatableReadingStatus` directly.

That does not make these collections a second source of truth: every member still comes from the
generated objects. The adapter gives callers the representation they actually need and keeps Orval's
object representation out of feature code. `CREATABLE_STATUSES` is the shared iterable used by
several callers, while `isOpenStatus()` and `isEndedStatus()` express the domain question a caller
is asking. The private sets are an implementation detail of those predicates; their value is
locality and a semantic interface, not a meaningful performance difference at this scale.

This is different from the deleted `ShelvedStatus` alias. That alias gave the same generated type a
second name without adapting its representation or expressing another operation.

The cleanup also removed the dropdown's handwritten `ENDED` array and changed current-engagement
selection to recognize every generated open status, not only `reading`. Presentation remains
frontend-owned: labels are not lifecycle classifications and therefore do not belong in the
backend-generated vocabulary. Navigation destinations remain with the callers that perform the
navigation instead of being combined with status membership in a second frontend registry.

## Evidence

The user's questions exposed each missing distinction in sequence:

1. If creation status is a durable lifecycle rule, why is its collection private to a schema?
2. If the same classifications matter on both tiers, why should tests and frontend code recreate
   them?
3. If Orval already generates `ReadingStatus`, why does it not generate these subsets?
4. Would annotating an internal selection helper make a subset visible?

Tracing the actual generation path answered them: the classifications were backend domain facts, but
no representation of them reached OpenAPI. Adding that representation allowed the existing
generation machinery from ADR-0026 to close the drift path without changing an HTTP operation.

The completed refactor was checked at each seam:

- backend lint and strict mypy passed;
- the live FastAPI schema contained the three enum components with the expected members;
- `backend/openapi.json` regenerated with those components;
- Orval emitted the corresponding TypeScript types and value objects;
- frontend typechecking passed after handwritten subsets were removed; and
- the full frontend unit suite passed, including coverage that TBR and paused engagements are
  preferred over a more recently updated ended engagement.

## Implications

- Place domain classifications with the domain enum, not with whichever validator first needs them.
- Do not mistake a public backend name for a cross-tier contract. Code generation can only carry
  information present in its input document.
- Internal function annotations improve local type safety but do not affect FastAPI's OpenAPI graph.
- When shared vocabulary does not naturally appear in an operation, adding a derived OpenAPI
  component is less distorting than inventing a runtime endpoint or changing service interfaces.
- Generate frontend membership values as well as types, then derive any caller-facing iterable or
  predicate from those values in one place. A handwritten member list still permits runtime drift; a
  derived adapter does not.
- Remove compatibility aliases when they preserve only an obsolete name. Keep a second name only
  when it represents a genuinely different concept.
- Keep presentation facts on the frontend. Sharing domain membership does not require moving labels,
  routes, or other display policy into the backend.

## Sources

- [ADR-0026](../docs/decisions/0026-generated-frontend-api-client-orval.md): establishes OpenAPI as
  the generated-client seam and the repository's drift checks.
- [Pre-refactor branch baseline](https://github.com/samanthablasbalg/rainbowsamreads/commit/ab93b6bd8aef7abd4aa28af131a79121d134ef66):
  contains the shared dropdown before status-group ownership and generation were corrected.
