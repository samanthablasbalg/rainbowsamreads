# A foreign-key column is not an ORM relationship

A mapped foreign-key column stores the value that connects two database rows; an ORM
`relationship()` exposes the connected object in Python. They normally coexist. Adding the object
relationship does not replace the foreign-key column or change the database constraint, and a nested
Pydantic response can only read the related object if the ORM exposes it or the route builds the
nested response explicitly.

## Historical context

This insight emerged while implementing the first successful recommendation write for issue
[#218](https://github.com/samanthablasbalg/rainbowsamreads/issues/218), building on baseline commit
[`ea5ab0f`](https://github.com/samanthablasbalg/rainbowsamreads/commit/ea5ab0fb7a539d7e6a98ed4d8c9a622e3f1e2bfb).
The service successfully created a `BookRecommendation` ORM object with scalar fields including
`recommender_id` and `note`. The HTTP response deliberately projected a different shape:

```json
{
  "recommender": {
    "id": "...",
    "name": "Elmer Fudd"
  },
  "note": "I own a mansion and a yacht"
}
```

That exposed three distinct representations which had initially blurred together:

```text
Database / ORM columns
  recommender_id, note

ORM object navigation
  recommender, note

Pydantic response projection
  recommender: RecommenderRead, note
```

`ConfigDict(from_attributes=True)` tells Pydantic to obtain response fields from object attributes;
it does not infer that a field named `recommender` should be manufactured from an attribute named
`recommender_id`. The `BookRecommendation` mapping therefore kept its composite-key column and added
a scalar ORM relationship alongside it:

```python
recommender_id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
recommender: Mapped[Recommender] = relationship()
```

The existing composite `ForeignKeyConstraint` remained the database rule and gave SQLAlchemy an
unambiguous join path. No migration was required because `relationship()` changes the Python
mapping, not the table schema. A reverse collection and `back_populates` were unnecessary for this
slice because no behavior needed to navigate from a recommender to its recommendations.

At the HTTP seam, the service continued to return the internal `BookRecommendation` ORM model. The
route adapted it into `BookRecommendationRead` with `model_validate()`, keeping persistence and
response types distinct while making the route's declared return type truthful.

## Evidence

After comparing the new mapping with `Edition.book_id` plus `Edition.book`, the learner recognized
that the scalar foreign key and object relationship serve different purposes and should both exist.
They added the relationship and explicit response conversion, reran the focused endpoint test, and
observed the first recommendation happy path pass.

## Implications

- When a nested response fails, compare the Pydantic field names with the attributes actually
  exposed by the source ORM object. `from_attributes=True` reads attributes; it does not invent
  joins or translate an `_id` suffix into an object.
- Do not remove a foreign-key column when adding `relationship()`. The column stores relational
  identity; the relationship provides object navigation.
- Add `back_populates` only when behavior needs navigation in both directions. Existing examples
  with bidirectional relationships are not evidence that every relationship needs a reverse side.
- Keep service return models and HTTP response models separate. The route is the adapter that turns
  internal persistence state into the operation-specific projection described in learning
  record 0008.

## Sources

- [SQLAlchemy: Working with ORM related objects](https://docs.sqlalchemy.org/en/20/tutorial/orm_related_objects.html)
- [SQLAlchemy: Basic relationship patterns](https://docs.sqlalchemy.org/en/20/orm/basic_relationships.html)
- [Pydantic: Databases and SQLAlchemy](https://docs.pydantic.dev/latest/examples/orms/)
- [Learning record 0008: Response models are operation-specific projections](0008-response-models-are-operation-specific-projections.md)
- [Learning record 0011: Domain identity needs ORM and ownership keys](0011-domain-identity-needs-orm-and-ownership-keys.md)
