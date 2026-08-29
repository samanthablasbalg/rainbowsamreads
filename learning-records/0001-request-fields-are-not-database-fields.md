# Request fields are not database fields

An API request schema describes the inputs needed to perform a command. Its fields do not
necessarily correspond to columns on the entity named by the endpoint—or to database columns at all.

## Historical context

This insight came from tracing the code as it existed at
[`ce2ed42`](https://github.com/samanthablasbalg/rainbowsamreads/commit/ce2ed4265c347c5ea97f1192a758f17ebc74b2e9),
the main-branch baseline when work on issue #103 began. The specific field under investigation,
`audio_length_minutes`, was introduced in
[`ce4b6da`](https://github.com/samanthablasbalg/rainbowsamreads/commit/ce4b6da7963bc217a184a19c1d29779e7d901d67)
for audio progress logging in PR #125. Issue #103 later exposed that its underlying purpose was not
inherently audio-specific and prompted the design of the generic `edition_length` command input.

The distinction became concrete while tracing `audio_length_minutes`. It appears on
`EngagementCreate`, which initially made it look like information stored on an engagement. It is
not. The engagement lifecycle service passes the value to `capture_audio_length()`, which writes it
to the bound edition and the book's audio default. By contrast, `length_override` is persisted on
the `EngagementEdition` binding because it really is a fact about this particular read of this
edition.

## Why the creation request still needs the field

When an engagement is created by choosing a format, the backend queries the edition for that format.
If the edition already has its relevant length, the client does not need to supply one.

If the edition has no length, the backend still needs to receive the value the user entered. There
are two possible API sequences:

1. Update the edition, then make a separate request to create the engagement.
2. Include the edition length in the create-engagement command and let its service perform both
   changes.

The first option requires two frontend requests and permits a partial outcome: the shared edition
could be updated successfully even if engagement creation subsequently fails. The second keeps
"supply the missing edition fact and begin reading" in one database transaction, so the changes
succeed or fail together.

The value is therefore a useful input to the creation command even though the engagement does not
own it. Naming the field for its destination makes that clearer:

```python
class EngagementCreate:
    edition_format: Format
    edition_length: int | None
    length_override: int | None
```

The two length inputs have different meanings:

- `edition_length` fills the selected edition's missing load-bearing fact and also populates the
  corresponding missing book default.
- `length_override` says that this particular read uses a different denominator from the edition.

The same reasoning applies when adding another edition binding to an engagement: the add-binding
command can carry `edition_length` so that capturing the shared edition fact and creating the
binding remain one operation.

## Evidence

The user questioned why an apparent engagement field existed after rereading ADR-0021, then
distinguished the command that coordinates the work from the domain entities that own the resulting
state. The atomicity comparison—two requests with a possible partial outcome versus one
transaction—was the explanation that made the distinction click.

## Implications

When investigating an unfamiliar field, trace it independently through the request schema, service
calls, ORM models, and migrations before deciding which entity owns it or whether it is persisted.
Future learning records should retain the concrete example and reasoning that produced the insight,
not only an abstract summary of the conclusion.
