# A data-safe migration can still break a deployment

A migration can preserve every stored value through upgrade and downgrade while still causing a
production outage. Migration correctness must be evaluated against the deployment lifecycle: which
application versions may run before, during, and after the schema change, and which schemas each
version can tolerate.

## Historical context

This insight surfaced while designing issue #103 on 2026-08-29. The working migration revision,
`d776a9b8f62e`, successfully copied `Edition.page_count` and `Edition.audio_minutes` into a generic
`Edition.length`, rejected invalid data, enforced a positive-length constraint, and restored the
original values on downgrade. Those round-trip checks proved data preservation but not deployment
safety.

The repository's production container runs:

```text
provision → alembic upgrade head → uvicorn
```

Railway can keep the old deployment serving while the new container migrates and starts. A combined
migration that drops the old columns therefore creates an incompatible overlap:

```text
old app serves and expects page_count/audio_minutes
        ↓
new container drops those columns before starting
        ↓
old app continues receiving traffic against an incompatible schema
```

Restoring the previous application image would not be a safe rollback either: the old image still
expects columns the database no longer has.

## The distinction

The migration round trip answered:

> Can the database transform valid values without losing them and reverse that transformation?

Deployment safety asks additional questions:

> Can every application version that may be running use the schema throughout the rollout? Can the
> previous image still run if the new deployment is rolled back?

Both must be true. Passing the first does not imply the second.

## Expand, transition, contract

The safe zero-downtime change requires two migrations in separate deployments, not merely two
migration files in one release. Alembic would apply every pending revision before starting the new
application, so deploying both together would still collapse them into one incompatible schema
change.

1. **Expand and transition deployment:** add and backfill `Edition.length`, retain both old columns,
   and establish temporary synchronization. The new application can switch to `length` in this same
   deployment because synchronization keeps the overlapping old process—and an application
   rollback—compatible with the expanded schema.
2. **Contract deployment:** after the overlap and rollback window has passed, remove synchronization
   and drop `page_count` and `audio_minutes`.

Expand, transition, and contract remain three conceptual phases; synchronization allows the first
two to ship safely in one deployment.

A planned maintenance window could instead stop the old application, apply the combined migration,
and start the new application. That is operationally smaller but deliberately accepts downtime and
requires downgrading the database before restoring the old image.

## Evidence

The user's partner surfaced the key question while the user described the work: "You mean two
migrations, right?" The user brought that question back to the implementation and correctly
challenged whether combining the schema replacement with the application release would bring down
the running app. Inspection of the repository startup command and Railway's deployment lifecycle
confirmed the incompatibility.

## Implications

- Review destructive migrations against the real deployment sequence, not only a local round trip.
- Identify old/new application overlap and rollback compatibility before dropping or renaming a
  column.
- Separate deployments are required when intermediate compatibility must exist; separate migration
  files in one release are not sufficient.
- Database triggers or another synchronization mechanism may be needed while old and new writers
  coexist.

## Sources

- [Reading Tracker Dockerfile](../Dockerfile): production startup applies migrations before starting
  the new server.
- [Railway: Roll back a bad deploy](https://docs.railway.com/guides/roll-back-bad-deploy): describes
  healthcheck-gated traffic switching and retaining the previous deployment during startup.
- [Railway configuration reference](https://docs.railway.com/config-as-code/reference): documents
  deployment overlap and draining controls.
