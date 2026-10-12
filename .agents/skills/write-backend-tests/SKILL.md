---
name: write-backend-tests
description: >-
  Write new backend pytest coverage. Use when a request adds a backend test or when implementation
  work requires new pytest coverage, including Alembic migration tests. Existing-suite audits and
  reorganizations remain outside this skill unless they accompany a new test.
---

# Write Backend Tests

Write the smallest test that gives a trustworthy failure for one behavior. The finished test must
answer three questions without reconstructing its history: what operation is exercised, what rule is
promised, and which concrete case broke.

If the new test covers an Alembic migration, read
[`references/migration-tests.md`](references/migration-tests.md) completely before writing it.

## Find the test surface

Read the behavior's production path, directly related tests, and shared test helpers. Confirm the
behavior is not already covered by a test that would fail for the same defect.

Choose the interface that owns the contract:

- Use HTTP for request validation, authorization, status codes, serialization, and domain behavior
  exposed through an endpoint.
- Use a narrower Python interface when the behavior is not exposed over HTTP and testing through
  HTTP would add unrelated contracts.
- Use direct database access only for states the public interface cannot express, such as another
  user's data, an intentionally invalid row, or a legacy schema.

Put the test beside others initiated by the same operation. Consequences do not determine placement:
a mutation test stays with the mutation even when its result changes another resource. Create a new
file only when no existing file has that responsibility and its name gives later cases an obvious
home.

If the destination approaches 1,000 lines, has no obvious section for the new case, or mixes
initiating operations, read
[`references/splitting-test-files.md`](references/splitting-test-files.md) completely before placing
the test.

This step is complete when the test surface and destination file are supported by the existing
interfaces and suite, rather than by filename resemblance.

## Design a discriminating scenario

State the test as five facts before coding it:

1. required starting state;
2. operation and input;
3. rule under test;
4. observable result;
5. plausible implementation bug that must fail the assertion.

Choose data that distinguishes the rule from the plausible bug. Use different values for source and
destination fields, competing records, ordering positions, and preserved versus changed data. Assert
a setup precondition when the final assertion could otherwise pass without the setup having
succeeded.

Keep every dimension valid except the one intentionally rejected. A validation test with two invalid
inputs cannot prove which rule rejected the request.

This step is complete when the named bug cannot survive the test.

## Write one clear path

Arrange valid state, perform one initiating operation, then assert the public result. Assert setup
responses before consuming their bodies. Send only fields defined by the request schema.

Name the test from the operation, rule, and behaviorally relevant precondition. Prefer a concrete
name such as `test_finish_engagement_rejects_log_before_started_on` over a category such as
`test_invalid_date`.

Reuse helpers that preserve important setup assertions. Add a helper when multiple tests need the
same meaningful operation; keep a one-off operation visible in its test. Test helpers should fail
loudly rather than recover from malformed state.

This step is complete when the test reads as one scenario and every assertion contributes to its
single claim.

## Add variants deliberately

Before adding a second test, decide whether it is another rule or another input to the same rule.
Parameterize only when the interface, setup shape, operation, and expected contract are shared.

- Give non-obvious cases stable IDs; plain values may use pytest's generated IDs.
- Generate independently collected cases instead of asserting through a loop.
- Use a small typed adapter when the same rule has different domain vocabulary, such as pages and
  minutes.
- Keep separate tests for different prerequisites, branches, error modes, or observable contracts.

A parameterized body should not select behavior with `if`, `match`, or variant-specific assertions.
If it must, the cases do not yet share one test shape.

This step is complete when each collected case identifies a concrete variant and the base test name
states their shared rule.

## Prove the signal

For new behavior, observe the focused test fail for the intended behavioral reason before making it
pass. For behavior that already exists, perform the five-fact discrimination check against the
actual implementation; when the signal is still uncertain and the work authorizes implementation
edits, use a reversible mutation check and restore the source immediately afterward.

Run the focused test, Ruff, formatting, and mypy for touched Python. Run tests that consume a
changed helper. Run the broader backend suite when the change affects shared fixtures, schema state,
or production behavior.

Compare collection before and after. Every added case must be explained by a new rule or an explicit
variant of one rule.

The test is complete when it has demonstrated the intended red where applicable, passes against the
intended behavior, and its failure would identify the broken rule and concrete case.
