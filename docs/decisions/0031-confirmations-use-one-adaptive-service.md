# 0031. Confirmations use one service that picks sheet-vs-dialog

- Status: Accepted
- Date: 2026-07-29

## Context

Moving the Currently Reading card's actions into an overflow menu put three consequential operations
one tap apart: **Mark finished**, **Mark as DNF**, and **Delete**. Finish and DNF change a book's
standing ([[0016-engagement-state-changes]]); delete destroys the read and its progress logs
([[0007-progress-logs-activities-not-positions]]). None should fire on a mis-tap in a menu.

[[0019-progress-logging-in-a-focused-sheet]] already settled the _host_ question for one surface:
`MatBottomSheet` on phone, `MatDialog` on web. It settled it only for the logging sheet, though. A
confirmation is a different surface with the same adaptive requirement, and there are three of them
arriving at once — with more to come as other destructive actions land. Left to each call site,
every one of them would re-pick its host and re-derive what counts as a "yes."

The two hosts also disagree about their own API: `MatDialog` closes with `afterClosed()` and
`MatBottomSheet` dismisses with `afterDismissed()`, and both emit `undefined` when the user bails
out via the backdrop or Escape rather than a button.

## Decision

One injectable, `ConfirmService.confirm(data): Observable<boolean>`, is the only way to ask for a
confirmation. It reads the breakpoint, opens the right host, and normalises the outcome. Callers
never learn which host opened.

- **The host is an implementation detail.** Under 599px it is a bottom sheet; above, a dialog. The
  two `open()` calls differ only in sizing, which the dialog needs and the sheet doesn't.
- **Anything that isn't the confirm button is `false`.** Both hosts' result streams are mapped
  through `confirmed === true`, so cancel, backdrop click, and Escape collapse to one falsy answer
  and callers get a plain boolean rather than `boolean | undefined`.
- **One component renders in both hosts.** `ConfirmSheetComponent` injects `MatDialogRef` and
  `MatBottomSheetRef` as `{ optional: true }` and closes whichever one it got. The same optional
  injection reads its data from either token. Its template uses the presence of a ref for the two
  cosmetic differences: a drag handle and tighter top padding on the sheet.
- **`autoFocus: 'dialog'`** on both hosts. The default puts focus on the first tabbable element,
  which is the confirm button — so a stray Enter carried over from the menu would confirm the very
  action we're guarding. Focusing the container instead keeps the dialog keyboard-accessible without
  arming it.
- **`tone: 'danger'` is reserved for actions that destroy data.** Delete gets it; finish and DNF do
  not. Both are consequential, but they're recoverable by setting the status back, and spending the
  warn colour on recoverable actions is what makes it stop reading as a warning.

## Consequences

**Makes easy:**

- Adding a confirmation is one call with a data object — no host choice, no result plumbing, no
  chance of a call site forgetting that `undefined` means "no."
- Confirmations inherit the phone posture [[0019-progress-logging-in-a-focused-sheet]] established,
  automatically, rather than by each author remembering it.
- Copy stays at the call site, where the book title and the specific consequence are in scope, while
  the mechanics stay in the service.

**What we accept:**

- The breakpoint is read once, at open time. Resizing or rotating a device mid-confirmation won't
  re-host the open surface. For a two-button prompt that lives for a few seconds, re-hosting isn't
  worth the machinery.
- The `open()` configuration is duplicated across the two branches. Factoring out the shared keys
  would cost more indirection than the three duplicated lines.
- The component depends on both Material packages and is never used without one of them being dead
  weight in that instance. This is the price of one template instead of two.

## Alternatives considered

- **`MatDialog` everywhere** — simplest, and would have removed the breakpoint read entirely.
  Rejected because it contradicts [[0019-progress-logging-in-a-focused-sheet]] for the same reasons:
  on a phone a centred dialog with small targets is worse than a sheet, and having logging slide up
  while confirmations drop in the middle would make one app feel like two.
- **A confirmation per call site, opened inline** — no new abstraction, but each of the three call
  sites would repeat the breakpoint check and the `undefined`-means-no normalisation, which is
  exactly the kind of detail that gets it right twice and wrong the third time.
- **Native `window.confirm()`** — free and synchronous, but unstyleable, unable to carry a tone or
  custom button labels, and visually foreign to everything else in the app.

## Revisit when

A confirmation needs to collect something rather than just ask — an input, a reason for DNF-ing, a
"don't ask again" checkbox — at which point `ConfirmSheetData` stops being title/message/labels/tone
and the surface is really a small form wearing a confirmation's clothes.
