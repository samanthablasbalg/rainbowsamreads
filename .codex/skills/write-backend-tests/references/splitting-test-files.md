# Splitting test files

Use this reference while deciding where a new test belongs. It identifies when the current file has
stopped being a useful home; it does not turn an ordinary new-test task into permission to
reorganize unrelated coverage.

## Treat 1,000 lines as a tripwire

A test file approaching 1,000 lines is too large for a human to hold and navigate as one coherent
test surface. Stop adding to it and find a split seam.

The threshold is **soft**, not optional: the exact line number is not a mechanical limit, and the
file should not be cut at an arbitrary midpoint. “Approaching 1,000” triggers a structural split;
the behavior in the file determines where the cut belongs.

Consider the split earlier when any of these are true:

- the new test has no obvious section;
- the file covers multiple initiating operations;
- different groups of tests need unrelated setup or helpers;
- section headings have effectively become independent test modules;
- finding related cases requires scanning substantial unrelated behavior;
- a filename that once named one interface now acts as a feature-wide catch-all.

Length alone does not require an early split when the file still covers one navigable operation and
its size comes from explicit data tables, necessary SQL, or a compact set of parameterized rules.
Those explanations cease to justify a near-1,000-line file: at that size, find a stable subdivision
within the operation.

## Find the behavior seam

Inventory tests by the operation that initiates the behavior, then group cases that cross the same
interface. Prefer a seam a future author can identify before reading the file:

- operation or sub-operation;
- source and destination state;
- lifecycle transition;
- success, filtering or ordering, validation, and errors;
- ownership and isolation;
- cascade versus preservation behavior.

The downstream consequence does not own the test. Split by equal line counts, chronology, or the
issue that introduced each case only when those facts also correspond to a stable behavior seam.

A good split leaves every existing and future test with one obvious destination. Shared helpers stay
shared only when both resulting files genuinely use them; otherwise keep setup local to the file
whose scenarios require it.

## Keep the new-test task scoped

If the new behavior already forms a responsibility not represented in the suite, place it in a new,
focused file. If a coherent split requires moving existing tests, explain the proposed seam before
editing them.

When the user requested only new coverage, obtain approval before expanding the task into moving or
rewriting existing cases. Do not create two competing homes by placing the new test in a focused
file while leaving tests for the same operation in the catch-all. If the split is deferred, report
the size and proposed seam explicitly rather than silently treating the file as healthy.
