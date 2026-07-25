-- Creates the two databases that POSTGRES_DB cannot: the dev database is made
-- by the image at init, these are the test (ADR-0014) and e2e (ADR-0018) ones.
--
-- Scripts in /docker-entrypoint-initdb.d run in sorted filename order, and ONLY
-- when the data directory is empty — never again on subsequent starts. That is
-- why database *creation* belongs here (a genuinely one-time, local-only job:
-- Railway hands you a single ready-made database) while the `app_user` role
-- does not. The role has to be reconcilable on every boot and has to be
-- provisioned on Railway too, so it lives in the application's start-up path.

CREATE DATABASE reading_tracker_test;
CREATE DATABASE reading_tracker_e2e;
