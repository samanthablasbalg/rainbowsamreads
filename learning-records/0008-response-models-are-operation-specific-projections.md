# Response models are operation-specific projections

An entity does not need one canonical response shape everywhere it appears. Each HTTP operation can
return the projection its caller needs: a complete representation where the complete entity is the
subject, and a smaller representation where the entity only supports another screen or action. A
shared frontend module can accept both because its prop type describes the fields it consumes, not
the name or size of the response type that supplied them.

## Historical context

This insight surfaced while refining the catalog response for issue
[#263](https://github.com/samanthablasbalg/rainbowsamreads/issues/263). The catalog needed the same
status dropdown as the book page. The book page already loaded the complete engagement history for
the rest of its UI, while the catalog was required to keep making one `GET /books` request and
receive at most one selected engagement per book.

The issue originally described the nested value as a full `EngagementRead`:

```text
CatalogBookRead
  <existing BookRead fields>
  engagement: EngagementRead | null
```

That initially seemed natural because `EngagementRead` already existed and the first version of the
shared `StatusDropdown` accepted an array of that type. But `EngagementRead` is the response for
screens concerned with an engagement itself. It contains the nested book, dates, formats, progress
positions, lengths, completion, review, and timestamps. Most of those facts have no job in a catalog
row.

The useful question was not "Which existing response model represents an engagement?" It was: "Which
engagement facts does this operation's caller actually consume?"

## Deriving the response from the behavior

There are three separate pieces of work that are easy to collapse into one:

1. The backend examines a user's engagements and selects the open one, or otherwise the most
   recently updated ended one.
2. `GET /books` represents that selection to the catalog.
3. `StatusDropdown` uses the selected value to render and perform mutations.

The backend needs `updated_at` to make the selection. That does not mean `updated_at` belongs in the
response. A value used to implement an operation is not automatically part of the operation's
interface.

Tracing the dropdown and its sheets identifies the response fields:

| Field       | Why the shared status UI needs it                                                |
| ----------- | -------------------------------------------------------------------------------- |
| `id`        | Update the existing engagement instead of creating another one.                  |
| `status`    | Render the label and decide whether a choice updates or starts a new engagement. |
| `formats`   | When finishing a mixed page/audio engagement, ask which unit should close it.    |
| `cover_url` | Preserve the engagement-specific cover shown by the finish sheet.                |

The dropdown already receives `book` separately, so the nested engagement does not need another
`BookRead`. Dates, progress positions, lengths, completion, review, and timestamps are not consumed
by this interaction and should not be sent.

The backend narrowing originates in the catalog contract:

```python
class CatalogEngagementRead(BaseModel):
    id: uuid.UUID
    status: ReadingStatus
    formats: list[Format]
    cover_url: str | None


class CatalogBookRead(BookRead):
    engagement: CatalogEngagementRead | None
```

`id` and `status` would be enough for the dropdown's direct status mutations. They are not enough
for all of the behavior the shared module owns, because choosing Finished can open
`FinishReadSheet`. That sheet uses the engagement's formats to distinguish a closing page entry from
a closing minute entry when both measurement systems are present. `cover_url` is presentational and
could be omitted only if the design deliberately changed the sheet to use the book's default cover.

This is still a small projection. The correct target is not the fewest possible bytes; it is the
smallest contract that supports the promised behavior.

## Why the backend needs two new response models

The catalog JSON contains two objects with different responsibilities:

```json
{
  "id": "book-id",
  "title": "Piranesi",
  "engagement": {
    "id": "engagement-id",
    "status": "reading",
    "formats": ["print"],
    "cover_url": null
  }
}
```

`CatalogBookRead` describes the complete list item returned by `GET /books`—the existing book fields
plus the selected engagement. `CatalogEngagementRead` describes the smaller object nested inside
that item. Both are needed to describe the actual response structure.

Adding `engagement` directly to `BookRead` would change every operation that currently returns a
book, including create, import, and book detail, as well as the nested `book` inside
`EngagementRead`. Those operations do not all make the catalog's user-specific selection and should
not acquire its response field. `CatalogBookRead` keeps that change local to the operation that owns
the selection rule.

The smaller nested model does not mean that every engagement response becomes smaller.
`EngagementRead` remains the full response for operations whose subject is an engagement or its
history. `CatalogEngagementRead` exists because an engagement is only supporting the catalog's
status interaction in this operation.

## One entity, several legitimate representations

The smaller catalog shape does not replace `EngagementRead`. The two response models answer
different questions:

```text
GET /books/{book_id}/engagements
  -> complete engagement history
  -> EngagementRead[]
  -> dates, progress, lengths, review, timestamps, and book data are useful

GET /books
  -> catalog books with one selected engagement each
  -> CatalogBookRead[]
  -> only the facts needed by the shared status interaction are useful
```

This is not inconsistency or a violation of DRY. The repeated fields retain the same meanings and
types, while the operations expose different amounts of information for different purposes. Reusing
the full response merely to avoid defining a smaller model would couple the catalog to every current
and future field on `EngagementRead`.

The distinction is especially important for ORM-backed responses. Serializing the complete
`EngagementRead` can require loading its book, authors, editions, progress logs, and review, and can
evaluate computed progress and length properties. A response contract therefore influences both
payload size and the data the backend must load. Returning fields that no caller uses is not only a
cosmetic type choice.

## Why the shared component accepts both responses

The book page and catalog do not need to manufacture the same named TypeScript object before they
can share `StatusDropdown`. TypeScript is structurally typed: compatibility depends on the fields a
value has, not on whether its declared type has the same name.

OpenAPI and Orval generate the smaller backend model for the frontend. The shared module can use
that generated shape as its one prop interface:

```typescript
type StatusDropdownProps = {
  book: BookRead;
  engagement: CatalogEngagementRead | null;
};
```

Both generated response values satisfy that one interface:

```text
CatalogEngagementRead
  id, status, formats, cover_url
  -> satisfies the prop exactly

EngagementRead
  id, status, formats, cover_url, plus many other fields
  -> also satisfies the prop
```

The book page selects the same engagement from the complete history it already holds and passes the
full object. The catalog passes the smaller object nested in `CatalogBookRead`. Neither caller makes
an additional request, converts the object, or strips off surplus fields:

```tsx
// `selectedEngagement` is EngagementRead | null.
<StatusDropdown book={book} engagement={selectedEngagement} />

// `book.engagement` is CatalogEngagementRead | null.
<StatusDropdown book={book} engagement={book.engagement} />
```

At runtime both simply pass an object reference. The first object still contains its additional
fields; `StatusDropdown` just has no permission, through its prop type, to depend on them. The
frontend compiler verifies that either supplied object contains every field the dropdown requires.

No union such as `EngagementRead | CatalogEngagementRead` is necessary. A union would tell the
dropdown that it must understand two alternatives and could force narrowing inside the module. The
dropdown has one interface—`CatalogEngagementRead`—and the full response is assignable to it.

This compatibility is frontend behavior, not something the backend dynamically negotiates. The
backend publishes two explicit response contracts through OpenAPI; Orval generates both TypeScript
types; and TypeScript recognizes that values of either type can cross the dropdown's narrower
interface.

The variable name `engagement` is not ambiguous merely because different modules attach different
types to it. It still denotes the same domain concept: one user's engagement with a book. The prop
annotation determines which facts a particular module may assume. A `ProgressLogForm` can continue
requiring `EngagementRead`; attempting to pass `CatalogEngagementRead` there fails because the
smaller response lacks progress fields. A `StatusDropdown` requiring `CatalogEngagementRead` accepts
either response because both contain its entire interface.

## Why FinishReadSheet changes and StartReadingSheet does not

Narrowing the catalog response creates one concrete downstream constraint: anything opened by
`StatusDropdown` must work with the data the dropdown receives.

`FinishReadSheet` currently receives an `EngagementRead` from the dropdown. It uses only a small
part of it, but the catalog will no longer supply the rest. It therefore needs the already-available
`book` separately and the smaller selected engagement:

```tsx
<FinishReadSheet
  book={book}
  engagement={engagement}
  open={finishOpen}
  onOpenChange={setFinishOpen}
/>
```

This is not a general campaign to narrow every React module. It is the direct consequence of the
backend response change: `FinishReadSheet` is inside the shared status workflow and its old prop
requirement cannot be satisfied by the catalog.

`StartReadingSheet` is not analogous. It does not receive an `EngagementRead`; it already receives a
`BookRead` and an optional engagement id. The catalog still returns all existing `BookRead` fields,
and the smaller selected engagement still supplies the id used to promote TBR. Nothing about the
catalog response requires `StartReadingSheet` to change.

Other modules should only receive smaller interfaces when a real need appears—for example, when a
full response would force a caller to fetch or return otherwise unnecessary data. Merely noticing
that a module reads five fields from a larger object is not, by itself, enough reason to introduce a
new named type during this issue.

## What this adds to the earlier learnings

[Learning record 0006](0006-a-prop-type-describes-every-caller.md) established that a prop type
describes what every caller can supply and that passing props does not fetch data. This case adds a
further distinction: callers can supply values with different named types when both types contain
the structure the prop requires.

[Learning record 0007](0007-a-generated-client-only-shares-what-the-contract-expresses.md)
established that Orval only receives concepts represented in OpenAPI. This case adds that OpenAPI
does not need one universal representation per domain entity. It can express multiple projections,
and the generated client preserves each operation's actual contract.

Together, the data flow is:

```text
backend domain entity
  -> operation-specific Pydantic response model
  -> operation-specific OpenAPI schema
  -> operation-specific generated TypeScript type
  -> shared module declares the smaller generated type it can rely on
```

Each seam narrows knowledge to what the next caller needs.

## Evidence

The design became clear through a sequence of concrete questions preserved in the preceding Codex
session:

1. Does the catalog actually need the entire `EngagementRead` merely because the book page has one?
2. If the dropdown mostly changes a status, are `id` and `status` the real contract?
3. Which additional fields are required by behavior the dropdown opens indirectly, such as the
   finish sheet?
4. Will using `engagement` for both `EngagementRead` and `CatalogEngagementRead` cause frontend
   confusion, or do the prop types protect each module?
5. How do we know when a smaller response or module interface earns its keep instead of merely
   creating another type?
6. Is this supposed to be a backend response narrowing or only a frontend `Pick`?
7. Why does `FinishReadSheet` need adjustment while `StartReadingSheet` does not?
8. Why are both `CatalogBookRead` and `CatalogEngagementRead` required?
9. Does reuse of `StatusDropdown` make the catalog-specific projection invalid?
10. Why can the book page keep `EngagementRead` while passing its selected value into the same
    dropdown as the catalog?

Following the data consumption rather than reusing the largest available type answered each one. The
full type was unnecessary; `id` and `status` were the core; `formats` and `cover_url` supported the
existing finish-sheet behavior; the narrowing originated in the backend response; and TypeScript
allowed both response values to satisfy one narrow frontend interface without conversion or runtime
adaptation.

## Implications

- Design a response model for an operation, not for the database table or ORM entity it happens to
  represent.
- Start from the caller's observable behavior and include every field that behavior consumes,
  including fields used by sheets or modules opened indirectly.
- Keep implementation inputs separate from response outputs. A field needed for sorting, selection,
  authorization, or joining does not need to be returned unless the caller also uses it.
- Do not return a nested copy of data the caller already receives separately, such as `book` inside
  the selected catalog engagement.
- Let detailed endpoints keep detailed models. Introducing a smaller projection for another endpoint
  does not require weakening the full representation.
- Give shared frontend modules the narrowest structural interface that supports their behavior.
  Fuller objects can cross that interface without conversion.
- Treat a full existing response model as a convenience only when its full contract is genuinely
  appropriate. Reusing it solely to avoid a new response class creates coupling and can force
  unnecessary relationship loading.
- Test selection and representation separately: backend tests prove which engagement is selected and
  which fields are returned; frontend composition tests prove that both callers pass a value
  satisfying the shared dropdown interface.

## Sources

- [Issue #263](https://github.com/samanthablasbalg/rainbowsamreads/issues/263): defines the catalog
  selection rules and the shared status-dropdown behavior.
- [`EngagementRead`](../backend/app/schemas/engagement.py): the complete engagement response whose
  breadth exposed the need for a smaller catalog projection.
- [`StatusDropdown`](../frontend/src/components/common/status-dropdown.tsx): the shared
  caller-facing module whose actual data consumption determines the narrow interface.
- [`FinishReadSheet`](../frontend/src/components/common/finish-read-sheet.tsx): establishes why the
  shared interaction needs engagement formats in addition to id and status.
