# Reading Tracker Feature Development Resources

## Knowledge

### React and TanStack Query

- [React: Your First Component](https://react.dev/learn/your-first-component) Official introduction
  to components as JavaScript functions that return markup. Use when deciding what belongs inside a
  component and how one component renders another.
- [React: Conditional Rendering](https://react.dev/learn/conditional-rendering) Official guide to
  choosing JSX with ordinary JavaScript, including returning `null` to render nothing. Use for
  pending, failed, and successful query states.
- [React: Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) Official rule explaining
  why hooks must be called at the top level rather than after an early return or inside a branch.
  Use whenever a component conditionally displays queried data.
- [TanStack Query: Queries](https://tanstack.com/query/latest/docs/framework/react/guides/queries)
  Official query-state guide covering `isPending`, `isError`, `data`, and `error`. Use when mapping
  a server request's lifecycle to rendered UI.
- [TanStack Query: Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
  Official guide to cache identities and including query-function variables in the key. Use when a
  request parameter, such as the client's local date, changes which cached value is correct.
- [TanStack Query: Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)
  Official guide to marking matching cached queries stale and refetching active ones. Use when a
  successful progress-log mutation makes the displayed streak obsolete.

### Tailwind CSS

- [Tailwind CSS: display](https://tailwindcss.com/docs/display) Official utility reference for
  `flex` and `inline-flex`. Use when an element must create a flex formatting context while either
  behaving as a block or flowing inline with surrounding content.
- [Tailwind CSS: flex-shrink](https://tailwindcss.com/docs/flex-shrink) Official reference for
  controlling whether a flex item is allowed to become narrower. Use when a compact cluster must
  stay together while a neighboring item absorbs the available-space constraint.
- [Tailwind CSS: justify-content](https://tailwindcss.com/docs/justify-content) and
  [align-items](https://tailwindcss.com/docs/align-items) Official references for main-axis and
  cross-axis alignment. Use when placing groups across a row or aligning text and icons within a
  group.
- [Tailwind CSS: gap](https://tailwindcss.com/docs/gap) Official reference for gutters between flex
  and grid items. Use when spacing belongs to the relationship between siblings rather than to one
  child's margin.
- [Tailwind CSS: color](https://tailwindcss.com/docs/color) Official reference for `text-*`
  utilities. Use when a parent's inherited text color should wash over both text and an icon that
  uses `currentColor`.
- [Tailwind CSS: Detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files)
  Official explanation of why conditional styling must choose complete class-name strings instead of
  constructing fragments such as `text-${color}`.

### Python, SQLAlchemy, and Pydantic

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
