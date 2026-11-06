# RLS enforces ownership but does not supply it

PostgreSQL row-level security checks whether a personal row belongs to the request's current user;
it does not populate the row's `user_id`. Application code must still stamp the owner when it
constructs the row, and an owned get-or-create operation must use the owner as part of the lookup
when ownership is part of the entity's domain identity.

## Historical context

This became concrete while extending issue
[#218](https://github.com/samanthablasbalg/rainbowsamreads/issues/218) from the recommender tables
in baseline commit
[`ea5ab0f`](https://github.com/samanthablasbalg/rainbowsamreads/commit/ea5ab0fb7a539d7e6a98ed4d8c9a622e3f1e2bfb).
The first recommendation write copied the existing author pattern:

```python
recommender_crud.get_or_create(db, lookup={"name": name})
```

That pattern works for `Author` because authors are shared, user-agnostic reference data. For
`Recommender`, the same call constructed a row whose `user_id` was `None`. The request-scoped
database setting was present and the RLS policy was working correctly: PostgreSQL rejected the
insert because the new row did not claim the authenticated user's ownership.

The important correction was not merely adding a missing argument. A recommender's exact identity is
`(user_id, name)`: two users may each have a recommender named "Elmer Fudd," while one user reuses
their existing row. Supplying both values to get-or-create therefore aligns three things:

- the query that searches for an existing entity;
- the constructor used when no entity exists; and
- the `(user_id, name)` uniqueness rule enforced by PostgreSQL.

RLS remains the fail-closed guard. It verifies that the supplied owner agrees with
`app.current_user_id`; it is not an owner-injection mechanism.

## Evidence

The learner identified why the copied author pattern failed: "authors is user agnostic." They then
carried the authenticated user's id through the route and service, included it in the recommender
lookup, supplied it to the recommendation relationship, and observed the failure advance beyond the
RLS-protected inserts.

## Implications

- When adapting a CRUD pattern from another model, first compare the models' ownership and identity
  rules rather than copying the call mechanically.
- Treat request-scoped RLS context and model construction as complementary responsibilities: the
  application states ownership; PostgreSQL verifies it.
- For `CRUDBase.get_or_create`, remember that `lookup` is also used to construct a missing object.
  Omitting an owned identity field affects both lookup correctness and insert correctness.
- A row rejected by RLS can be evidence that the isolation invariant is working, while the
  application has failed to construct the owned row completely.

## Sources

- [ADR-0023: Per-user data isolation via PostgreSQL row-level security](../docs/decisions/0023-per-user-data-isolation-via-rls.md)
- [`CRUDBase.get_or_create`](../backend/app/crud/crud_base.py)
- [Learning record 0011: Domain identity needs ORM and ownership keys](0011-domain-identity-needs-orm-and-ownership-keys.md)
