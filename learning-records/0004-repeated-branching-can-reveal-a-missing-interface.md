# Repeated branching can reveal a missing domain interface

Repeated conditionals are not always a local control-flow problem. When several callers branch on
the same domain discriminator to interpret the same underlying concept, the branching can be
evidence that the object owning the discriminator is missing an interface.

## Historical context

This insight surfaced while implementing issue #103 against the code based on
[`89b7d05`](https://github.com/samanthablasbalg/rainbowsamreads/commit/89b7d05). The user had long
been bothered by repeated page-versus-audio branching and had repeatedly questioned why so much of
it was necessary. The missing piece was not recognition of the smell—the user already had that
design intuition—but language and a method for locating the underlying responsibility.

The immediate example was `capture_edition_length()`. Its first implementation branched on
`edition.edition_format` and then separately read or wrote `edition.page_count` or
`edition.audio_minutes`. `Engagement.resolve_length()` contained the same translation. Each caller
needed to know both:

- which format an edition has, and
- which storage field that format uses for its length.

That knowledge was scattered because `Edition` did not expose the unified concept already described
by ADR-0021: an edition has one format and one real length, with the format determining whether the
integer measures pages or minutes.

## The diagnostic move

When branching feels repetitive, do not immediately replace it with a `match`, early return,
mapping, or dynamic `getattr()`/`setattr()`. First ask:

1. Which discriminator is every caller interpreting?
2. Is there one domain concept behind the branch-specific fields or behaviors?
3. Which object owns both the discriminator and the underlying state?
4. Would an interface on that object remove knowledge from more than one caller?
5. If that interface were deleted later, would the same branching scatter back across the codebase?

The last question is the codebase-design skill's deletion test. If removing the proposed module
interface would force several callers to reproduce the same decisions, the interface is earning its
keep through leverage and locality rather than merely hiding syntax.

## The Edition example

An edition has exactly one format, so the pair `(edition_format, length)` contains the complete
meaning:

```text
Edition(format=print, length=320)    → 320 pages
Edition(format=digital, length=480)  → 480 pages
Edition(format=audio, length=630)    → 630 minutes
```

The corrected model therefore persists one `Edition.length`, not two nullable format-specific
columns. The implementation of `capture_edition_length()` now writes that shared Edition concept
directly:

```python
def capture_edition_length(book: Book, edition: Edition, length: int) -> None:
    if edition.edition_format == Format.audio:
        if book.default_audio_minutes is None:
            book.default_audio_minutes = length
    else:
        if book.default_page_count is None:
            book.default_page_count = length
    if edition.length is None:
        edition.length = length
```

The remaining format branch selects between two simultaneous defaults owned by `Book`; it no longer
selects between alternative storage fields on `Edition`. This is different from disguising the
original branch with clever syntax. The Edition-specific format knowledge leaves callers because the
domain model now directly represents the concept they need.

## Why Book remains different

The same reasoning does not imply a single `Book.length`. One book can simultaneously carry a page
default and an audio default, so it has two independent values. An edition has one format and one
length; a book has defaults for multiple measurement units. Their cardinalities differ.

This comparison prevents overgeneralizing the abstraction merely because both models mention length.

## Implementation evidence

The user consistently recognized that the repeated branching was wrong before being shown a
solution, then immediately connected the `Edition.length` interface to a longstanding design
problem. That establishes prior architectural intuition and acquisition of the missing vocabulary.

The user then implemented the model correction in
[`435769e`](https://github.com/samanthablasbalg/rainbowsamreads/commit/435769e). The resulting code
provides concrete evidence for the design diagnosis:

- `Edition` maps one nullable `length`; it no longer exposes `page_count` and `audio_minutes` as
  competing storage fields.
- Edition create, update, and read schemas expose the same unified concept.
- `Engagement.effective_length_for()` reads `edition.length` directly after checking the
  engagement-specific override. It no longer translates an Edition format into a storage field.
- Missing shared metadata is carried through engagement commands as `edition_length` and captured
  symmetrically for page-measured and audio Editions.
- Mirrored binding tests demonstrate that first-use capture updates the Edition and the appropriate
  Book default for both measurement systems.
- An expand migration backfills `length` and temporarily synchronizes it with both legacy columns,
  allowing the domain correction to be deployed without requiring old and new application versions
  to use the same storage representation simultaneously.

The deletion test holds in the implemented code. Removing `Edition.length` would force the ORM,
schemas, engagement length resolution, metadata capture, seed data, and tests to recover the old
format-to-storage-field decision. The interface therefore earns its place by localizing domain
knowledge across several consumers, not merely by shortening one conditional.

## Implications

- Treat persistent discomfort with repeated branching as a design signal worth investigating, not
  merely a style preference to suppress.
- Look for an object that owns both the discriminator and the state being repeatedly interpreted.
- Prefer a domain interface that reduces caller knowledge over mappings or dynamic attribute access
  that only compress syntax.
- Check cardinality before generalizing: superficially similar fields may represent one value on one
  entity and several simultaneous values on another.

## Sources

- [ADR-0021](../docs/decisions/0021-editions-and-engagement-edition.md): defines Edition as owning
  one format and one real length.
- [Edition length implementation](https://github.com/samanthablasbalg/rainbowsamreads/commit/435769e):
  applies the unified model and its deploy-safe transition.
- [Codebase-design skill](../.claude/skills/codebase-design/SKILL.md): provides the deep-module,
  interface, leverage, locality, and deletion-test vocabulary used in the diagnosis.
