# Database visibility across test sessions

An API test can interact with the same database through two independent SQLAlchemy sessions: the
test's `db` fixture and the session opened for a `TestClient` request. A commit, refresh, or expiry
means something different depending on which session performed the write and where the test is in
its arrange–act–assert sequence.

## Historical context

This insight came from tracing the test fixtures and engagement tests at
[`89b7d05`](https://github.com/samanthablasbalg/rainbowsamreads/commit/89b7d05), while building the
first backend tests for issue #103. The comparison was between an existing test that correctly
called `db.commit()` before an API request and a new test that called it after the request while
trying to observe the API's changes.

## Why the existing setup commits

The `db` fixture and the API dependency override each open their own connection and SQLAlchemy
`Session`. If a test directly changes an ORM object during setup, that uncommitted change exists
only in the test session:

```python
book_obj.default_audio_minutes = 600
db.commit()

response = client.post(...)
```

Here, `db.commit()` belongs to the **arrange** phase. It makes the test-authored setup visible to
the separate session that will handle the HTTP request.

## Why the API's result should not be committed by the test

When the API request is the operation under test, the endpoint owns its transaction:

```python
response = client.post(...)
```

The production route commits the changes it makes. Calling `db.commit()` afterward does not commit
on the API's behalf; it commits the independent test session. It may appear to help because
SQLAlchemy expires ORM objects after a commit by default, causing a later attribute access to reload
them. That is an incidental side effect, not the intent the test should express.

The assertion phase should instead invalidate the test session's cached view before reading what the
API persisted:

```python
db.expire_all()
book_obj = db.get(Book, book_id)
edition_obj = db.get(Edition, edition_id)
```

For one already-loaded object, `db.refresh(book_obj)` expresses the same intent more narrowly and
reloads it immediately.

## JSON responses are snapshots

Helpers such as `_create_bare_book(client)` return `response.json()`: a plain dictionary containing
the state serialized when that HTTP response was produced. It is not an ORM object and has no live
connection to later database changes.

Therefore, this cannot observe a later update:

```python
book = _create_bare_book(client)
client.post(...)  # changes the database
assert book["default_page_count"] == 250  # book is still the earlier snapshot
```

The test must either query a public read endpoint again or reload the persisted model through the
`db` fixture.

## The rule

- When the test directly mutates ORM state as setup, commit before the API call so the API session
  can see it.
- When the API is supposed to mutate state, let the API own its commit.
- Before asserting through a test session that was already open, expire or refresh its cached ORM
  state.
- Treat JSON responses as immutable snapshots of a past request, not live domain objects.

## Evidence

The user noticed that they had copied `db.commit()` from
`test_engagement_read_reports_the_overridden_length` without knowing why the existing test needed
it. Comparing the two tests revealed that the existing commit published test setup before the act,
whereas the copied commit was being used after the act to provoke a reload during assertion.

## Implications

Future API-test reviews should identify which session authored each database change and label the
arrange, act, and assert boundaries before deciding whether a test needs `commit()`, `expire_all()`,
or `refresh()`.
