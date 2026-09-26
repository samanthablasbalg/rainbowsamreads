# A prop type describes every caller

A component's prop type describes what _all_ of its callers can supply, not what one caller always
supplies. A value can be required at one call site and still be optional in the type, because
another call site does not have it. Passing a prop is also not a fetch: it hands the component a
reference to data a parent already holds.

## Historical context

This came up while planning the "start reading from TBR" step of issue #77, against the code at
[`3633541`](https://github.com/samanthablasbalg/rainbowsamreads/commit/3633541c69a9d590a93494fc7bfd54d704b3bd68).
`ToReadRow`'s "Mark as reading" button opened `StartReadingSheet`. On submit, the sheet always sent
`POST /api/engagements` with a `book_id`, and a `book_id` creates a new engagement. The TBR row
would stay where it was and a second engagement would appear at `reading`. The backend already
supported promotion through the same endpoint: send `id` instead of `book_id`, and
`update_engagement` binds the format and moves the read from `tbr` to `reading` in one request.

The plan was to add an optional `engagementId` prop to `StartReadingSheet`. That produced two
objections:

1. Why would `engagementId` be optional when promoting a TBR read cannot work without it?
2. Why should the sheet still require `book` when the promote request never sends `book_id`?
   Wouldn't that mean unnecessary API calls?

## How the pieces fit

`StartReadingSheet` has four callers, and only one of them has an engagement:

| Caller         | Has `book` | Has an engagement id | Request it needs   |
| -------------- | ---------- | -------------------- | ------------------ |
| `ToReadRow`    | yes        | yes                  | promote (`id`)     |
| `CatalogRow`   | yes        | no                   | create (`book_id`) |
| `BookMetadata` | yes        | no                   | create (`book_id`) |
| `SearchBar`    | yes        | no                   | create (`book_id`) |

For a new read, the id does not exist until the POST returns. If `engagementId` were required, three
callers could not render the sheet at all. Whether the id is present or absent is the information
the sheet uses to decide between create and promote. The requirement for TBR is still met:
`ToReadRow` always has `engagement.id` and always passes it.

`book` is required for a different reason. Every caller has it, and the sheet uses it in both modes
for things other than the request body: the title in the header, and `default_page_count` /
`default_audio_minutes` for the length placeholder, the missing-length message and whether Start is
enabled.

None of this makes extra requests. The data flows down from a single query:

```text
ToReadList   useEngagementsListEngagementsSuspense({ status: tbr })   <- the only GET
  -> engagements.map(...)  one <ToReadRow engagement={…} /> each
       -> const { book, formats } = engagement                          <- no fetch
            -> <StartReadingSheet book={book} engagementId={engagement.id} />
                 -> one POST on submit, body uses whichever identifier fits
```

Destructuring (`const { book } = engagement`) and passing a prop both copy a reference, not the
object. `book` in the sheet is the same object that arrived in the list response.

## Evidence

The user said the design "feels very wrong" while also saying it was probably not wrong. After the
explanation, they correctly restated all four steps above: the list makes the query, each row
receives its engagement, the row destructures `book` without a new query, and the sheet receives
data that has already been fetched.

## Implications

- When you ask whether a prop should be required, the question is about every caller, not the one
  you are building right now. "Required for my case" is enforced by the caller that has the value
  and passes it.
- A prop that is present for some callers and absent for others can carry a decision, as
  `engagementId` does for create versus promote.
- Props are arguments. Only hooks such as `useQuery` make requests. To find the network cost of a
  screen, look for the queries, not the props.
- Destructuring and prop passing are free in practice. Object spread (`...props`) makes a new
  shallow object, which is still negligible.
