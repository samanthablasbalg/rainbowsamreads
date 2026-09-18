# Migration tests

Alembic migrations are executable code and can be tested. Test them against PostgreSQL and actual
revision transitions, not ORM metadata at `head`: the ORM cannot represent the legacy schema or
prove that old rows survive transformation.

## Choose the protection

Use the smallest test that protects an operationally supported path.

### Migration chain

Run `alembic upgrade head` from a clean database. This catches broken revision links, invalid DDL,
and migrations that cannot build a new environment. In this repository the session test fixture
already supplies this protection.

### Existing-data upgrade

Use this when a migration transforms or backfills data and databases at the preceding revision are
still supported:

1. Downgrade to the revision immediately before the migration.
2. Insert discriminating legacy rows with raw SQL.
3. Upgrade to the target revision.
4. Assert values, nullability, constraints, indexes, and preserved metadata that express the
   migration's contract.
5. Restore `head` in `finally`.

Choose rows that distinguish every source column and branch. An empty-schema upgrade cannot prove a
backfill works.

### Expand/contract compatibility

Use this during a rolling deployment where old and new application versions may write concurrently.
At the expanded revision, independently test:

- legacy-only inserts and updates synchronize canonical columns;
- canonical-only inserts and updates synchronize legacy columns;
- conflicting dual writes fail loudly;
- the contract revision removes temporary columns, triggers, functions, and indexes as intended.

These are time-bounded compatibility tests. Their lifetime is the deployment window they protect.

### Downgrade

Test downgrade data preservation only when downgrade is an operationally supported rollback path. A
syntactically valid `downgrade()` function does not by itself justify a permanent test.

## Build migration tests safely

- Use the real PostgreSQL adapter and the same privileged engine used to run migrations.
- Use raw SQL for legacy rows; current ORM models describe `head`, not the old revision.
- Pin revision constants next to the tests for that migration family.
- Restore the schema to `head` in `finally`, including after an expected migration failure.
- Delete deliberately invalid rows before restoring `head` when they would make cleanup fail.
- Keep schema-mutating migration tests serial. They share one database-wide schema.
- Assert both data and schema when both are part of the migration contract.
- Keep migration-family fixtures local; share only setup that genuinely spans families.

An expected failure should name the migration's rejection reason. After a rejected upgrade, assert
the legacy row and schema are still recoverable when atomicity is part of the contract.

A data-migration test has this executable shape:

```python
def test_example_migration_backfills_existing_rows() -> None:
    config = Config(str(ALEMBIC_INI))
    command.downgrade(config, BEFORE_REVISION)
    try:
        with owner_engine.begin() as connection:
            connection.execute(text("INSERT INTO legacy_table (...) VALUES (...)"))

        command.upgrade(config, TARGET_REVISION)

        with owner_engine.connect() as connection:
            migrated = connection.execute(
                text("SELECT canonical_value FROM migrated_table")
            ).scalar_one()
            assert migrated == expected_value
    finally:
        command.upgrade(config, "head")
```

Adapt the legacy row and assertions to the migration's actual contract. The essential mechanism is
real Alembic revision movement around raw legacy data, with unconditional restoration to `head`.

## Decide when to retire a test

Migration-test retention follows the **support window**, not the migration's age.

Retain an existing-data upgrade test while any supported environment, tenant database, development
snapshot, or restorable backup may begin before that migration. Retain expand/contract tests while
old and new writers may coexist. Retain downgrade tests only through the supported rollback window.

It is safe to delete migration-specific tests when all of these are true:

- every live environment has passed the contract revision;
- no supported restore or stale database can start before the migration;
- rollback to the tested revision is no longer supported;
- the ordinary clean-database path still runs the complete migration chain to `head`;
- the historical migration files remain immutable.

Delete the expired tests and their private helpers together. Keep the migration files themselves:
shared environments and fresh installs still depend on the revision chain. Squashing or deleting
applied revisions is a separate database-lifecycle decision, not test cleanup.

When only part of a migration's support window has closed, retire only the expired layer. For
example, remove old/new writer synchronization tests after contract deployment while retaining a
backfill test if pre-migration backups are still supported.
