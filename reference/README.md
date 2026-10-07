# Reference guides

These guides explain current implementation concepts in a form meant to be consulted while working.
Unlike historical learning records, their examples should change when the implementation changes.

- **[Request fields are not database fields](request-fields-and-persistence.html)** — distinguish
  command inputs, coordinated domain changes, and persisted ownership.
- **[Testing database state across sessions](testing-database-state-across-sessions.html)** — choose
  between commit, refresh, expiry, and a new HTTP read in API tests.
- **[Response shapes and component interfaces](response-shapes-and-component-interfaces.html)** —
  derive operation-specific API responses and narrow frontend interfaces from caller behavior.
