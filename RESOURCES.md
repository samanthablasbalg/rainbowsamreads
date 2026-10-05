# Python and SQLAlchemy Query Design Resources

## Knowledge

- [Python 3.14 tutorial: Classes](https://docs.python.org/3.14/tutorial/classes.html) Primary
  language reference for inheritance, method lookup, and the distinction between class and instance
  attributes. Use when deciding between a subclass and runtime instance modification.
- [Python 3.14 descriptor guide: Functions and methods](https://docs.python.org/3.14/howto/descriptor.html#functions-and-methods)
  Explains why functions defined on classes bind automatically while a function attached to one
  instance does not. Use when evaluating `MethodType` or monkey-patching.
- [SQLAlchemy 2.0: Writing SELECT statements for ORM mapped classes](https://docs.sqlalchemy.org/en/20/orm/queryguide/select.html)
  Primary guide to joins, aliases, subqueries, and the difference between entity and `Row` result
  shapes. Use when a query returns both a parent and an optional selected child.
- [SQLAlchemy 2.0: Relationship loading techniques](https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html)
  Distinguishes joins that choose result rows from eager loaders that populate relationships. Use
  when preventing lazy-load or N+1 behavior during response construction.
- [SQLAlchemy 2.0: Row-limited relationships with window functions](https://docs.sqlalchemy.org/en/20/orm/join_conditions.html#row-limited-relationships-with-window-functions)
  Shows the official ranked-subquery pattern for selecting a limited number of children per parent.
  Use when a book may have several engagements but the catalog needs at most one.
- [Pydantic: Models from arbitrary class instances](https://docs.pydantic.dev/latest/concepts/models/#arbitrary-class-instances)
  Defines what `from_attributes` and `model_validate()` actually do. Use when deciding whether an
  ORM entity, a query row, or an explicit mapping can satisfy an operation-specific response model.

## Wisdom (Communities)

- [SQLAlchemy GitHub Discussions](https://github.com/sqlalchemy/sqlalchemy/discussions)
  Maintainer-led discussion forum for query-shape and ORM-mapping questions whose tradeoffs are not
  fully answered by the reference documentation.
