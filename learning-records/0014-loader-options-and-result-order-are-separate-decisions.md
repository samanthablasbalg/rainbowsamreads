# Loader options and result order are separate query decisions

An ORM query has separate decisions about **which rows belong in the result**, **how related objects
are loaded**, and **what order the result promises**. A query can return the right objects and
serialize successfully while still hiding an N+1 query and providing no stable ordering contract.
Recognizing those as independent concerns makes it possible to decide each one deliberately instead
of copying the shape of a superficially similar endpoint.

## Historical context

This insight emerged while implementing the recommendation-list endpoint for issue
[#218](https://github.com/samanthablasbalg/rainbowsamreads/issues/218), against baseline commit
[`0725d97`](https://github.com/samanthablasbalg/rainbowsamreads/commit/0725d97cff21c1602b0bcbc3db2a54e7fc7925a5)
plus the learner's uncommitted route and test changes. The learner modeled the new operation on the
existing engagement-edition listing:

```python
engagement_crud.get_or_raise(db, engagement_id)
bindings = engagement_edition_crud.list_by(
    db, options=_BINDING_OPTIONS, engagement_id=engagement_id
)
return [EngagementEditionRead.model_validate(binding) for binding in bindings]
```

The analogous recommendation query omitted the unfamiliar `options` argument:

```python
book_crud.get_or_raise(db, book_id)
recommendations = book_recommendation_crud.list_by(db, book_id=book_id)
return [BookRecommendationRead.model_validate(rec) for rec in recommendations]
```

The endpoint returned the expected recommendation objects, but a test expecting creation order
failed. Investigating why exposed three different parts of a collection query that had initially
looked like one operation.

## Three independent query decisions

The generic `list_by()` method constructs a statement equivalent to:

```python
select(Model).filter_by(**filters).options(*options)
```

Each part answers a different question:

| Concern    | Question                                                                   | Mechanism in this example                                                     |
| ---------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Membership | Which recommendations belong to this book?                                 | `filter_by(book_id=book_id)`                                                  |
| Loading    | How will each recommendation's nested recommender object become available? | SQLAlchemy relationship loading, optionally controlled by `selectinload(...)` |
| Ordering   | In what sequence must the recommendations be returned?                     | An explicit `order_by(...)`, or an explicit in-memory sort                    |

The `options` parameter in this CRUD interface is therefore not a general bag of query behavior. It
is passed to SQLAlchemy's `Select.options()` and is used here to control ORM relationship loading.
For engagement-edition bindings, `selectinload(EngagementEdition.edition)` loads all referenced
editions in a second batched query instead of waiting for serialization to load them individually.
It does not order the bindings.

The recommendation route still worked without the equivalent loader option because
`BookRecommendation.recommender` permits lazy loading. `BookRecommendationRead.model_validate()`
uses Pydantic's `from_attributes` behavior, reads the `recommender` attribute, and causes SQLAlchemy
to fetch that relationship while the session is open. That convenience can conceal an N+1 query: one
query obtains the recommendations, then additional queries obtain their recommenders. Successful
serialization is therefore evidence that the relationship was reachable, not evidence that it was
loaded efficiently.

## A database does not imply insertion order

The recommendation query contains no `ORDER BY`, so its result has no promised sequence. A database
may happen to return rows in heap order, index order, or another execution-plan-dependent order;
none of those observations establishes an interface callers may rely on. The composite primary key
does not provide a default business order, and its randomly generated recommender UUID cannot
represent creation order.

The failing test therefore uncovered an unresolved behavior rather than merely the wrong SQLAlchemy
syntax. If the endpoint promises only membership, the test should compare the collection without
assuming sequence. If the interface promises alphabetical order, creation order, or user-controlled
order, that choice must be explicit. Creation order is not currently recoverable reliably from
`BookRecommendation`, because the model stores neither a creation timestamp nor an ordinal.

## Why progress-log listing has a specialized query

Progress-log order is different because sequence is already domain behavior. The journal's
chronology and the definition of the "latest" entry must agree. The database listing orders by
`logged_on`, then `created_at`, then `new_ground`; the in-memory `log_sort_key()` uses the same
tuple. The final boolean breaks the tie between two stored rows produced by one frontier-crossing
session so that the new-ground half sorts last.

The existing generic `list_by()` interface cannot express that `ORDER BY`, and loader options do not
change that. It would be mechanically possible to call `list_by()` and then use Python's `sorted()`
with `log_sort_key`; it is also possible to sort in the database with a specialized statement. The
important design property is not whether the generic CRUD helper appears in the implementation. It
is that callers ask for an engagement's ordered history without needing to reproduce or understand
the three-part ordering rule.

This is not evidence that every collection should copy the progress-log implementation. The
recommendation list first needs its own ordering contract. Only then can the query shape be chosen
to express that contract. Existing repository code supplied concrete mechanics to investigate, not
intentional prior art to imitate.

## Evidence

The learner noticed that the recommendation endpoint worked despite omitting the edition endpoint's
loader options, then connected the unexpected row sequence to the explicitly ordered progress-log
query. Their questions correctly separated “why does nested serialization work?”, “what do loader
options control?”, and “where should an ordering rule live?” instead of treating the failing order
assertion as an isolated test problem.

## Implications

- Before asserting positions in a collection response, identify the operation's ordering contract.
- Treat a missing `ORDER BY` as an unordered result even when repeated local runs look stable.
- Inspect nested response fields for relationship loads; successful `model_validate()` calls can
  hide lazy database access.
- Use loader options to choose a relationship-fetching strategy, not to express top-level sorting.
- Keep domain-specific ordering behind an operation-focused interface rather than making every
  caller reconstruct it through generic CRUD parameters.
- If a desired order is not derivable from stored data, the decision may require a model change, not
  merely a different query.

## Sources

- [SQLAlchemy: Writing SELECT statements for ORM mapped classes](https://docs.sqlalchemy.org/en/20/orm/queryguide/select.html)
- [SQLAlchemy: Relationship loading techniques](https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html)
- [Pydantic: Models from arbitrary class instances](https://docs.pydantic.dev/latest/concepts/models/#arbitrary-class-instances)
- [ADR-0024: Progress logs are dated to a local day](../docs/decisions/0024-progress-logs-dated-to-a-local-day.md)
- [ADR-0025: Backend layering—routers, services, generic CRUD](../docs/decisions/0025-api-services-crud-layering.md)
- [Learning record 0013: A foreign-key column is not an ORM relationship](0013-a-foreign-key-column-is-not-an-orm-relationship.md)
