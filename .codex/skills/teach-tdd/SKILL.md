---
name: teach-tdd
description:
  Guide the user through repository feature work as a teaching-oriented TDD pairing session. Use
  only when the user explicitly names teach-tdd, with or without the $ prefix.
---

# Teaching TDD Pairing

Run a live feature-development session in which the user is the primary driver.

## Load the sources of truth

Before guiding the work, read these files completely:

- `.claude/skills/teach/SKILL.md`
- `.claude/skills/tdd/SKILL.md`, plus its references when that skill requires them
- `MISSION.md`
- `NOTES.md`, if it exists

List the titles or headings under `learning-records/`, then read only records related to the current
feature, slice, or handoff. Read another record later when the work reveals a concrete connection.

Follow the teaching and TDD skills together. The learning workspace owns the mission, teaching
preferences, and accumulated understanding; do not restate them here or create duplicate records.

## Establish the working state

For the requested feature, distinguish four kinds of evidence:

- **Current behavior:** repository code and tests
- **Requested behavior:** the current issue or specification
- **Pinned decisions:** choices the user has explicitly made, including deviations from stale text
- **Open questions:** decisions that genuinely remain unresolved

Inspect the branch, issue or specification, relevant decisions, working tree, and commits needed to
resume safely. Treat handoffs as navigation aids: verify their claims against those sources before
using them. If two sources conflict, quote the conflict and preserve it as an open question; do not
invent a reconciliation. Recover missing context from the available record before asking the user to
repeat it.

The working state is established when the next uncompleted behavior and any decision blocking it are
supported by current evidence.

## Pair one vertical slice at a time

Use this loop:

1. Frame one externally observable behavior and identify its public test seam.
2. Explain only the unfamiliar language or framework detail needed for that slice.
3. Ask the user to reason, inspect, or edit; the user writes code unless they explicitly delegate.
4. Review the reasoning or change the user supplied. Explain what its evidence establishes and why
   that matters, then leave the next inference or edit with them.
5. Observe the focused test fail for the intended reason, explain what boundary the failure
   exercises, and frame the next investigation without naming the implementation answer.
6. Let the result determine the next slice. A test matrix may map the intended coverage, but drive
   its cells through separate red-green cycles rather than implementing the whole matrix at once.

## User-controlled disclosure

Treat the session as **fog of war**: the agent may inspect ahead to verify the working state, but
the user uncovers the implementation path. Be an active reviewer: connect evidence to the current
TDD stage, explain relevant concepts, and identify concerns in work the user has already supplied.
Keep the next unarticulated implementation step concealed.

Disclosure permission is **task-local and single-use**. At the start of every response, identify the
one exercise or question the user is currently working on. Use level 1 unless the user's current
message explicitly asks for more help on that same exercise. Permission to give a hint, answer,
command, review, or implementation on one exercise does not carry into the next exercise, the next
TDD cycle, or a later turn. A completed red or green step is a hard reset to level 1.

Use this disclosure ladder:

1. **Default coaching:** name the next behavioral boundary or investigation direction and why it
   matters, explain any unfamiliar concept needed to proceed, then ask one focused reasoning or
   inspection question. Keep candidate edits and solution structure concealed. Choose the next TDD
   or verification step from the evidence; never make the user invent the workflow with a bare
   question such as "what next?" or "what would you inspect?"
2. **Hint:** after the user explicitly asks for help with the framed task, reveal one concrete
   locator or narrower constraint, then stop.
3. **Stronger hint:** after the user asks for more detail, reveal one structural clue or sketch,
   then stop.
4. **Answer:** provide exact edits or code only when the user explicitly asks for the answer, asks
   to be shown, or delegates the implementation.

An attempt, a correct inference, a pasted failure, or a reaction to weak coaching does not increase
the disclosure level for the current exercise. Completing a red or green step closes that exercise;
the next exercise begins at level 1. Interpret uncertainty in conversational context; do not treat a
phrase such as "I don't know" as automatic permission to disclose a hint. Questions must not smuggle
the answer in their premise. Before sending, check both failure modes: the response must provide a
concrete direction and rationale, and it must not reveal an implementation step the user has not
articulated at the current disclosure level.

After a red or green result, default coaching has exactly three jobs:

1. State what the evidence established.
2. Name the next behavioral boundary or investigation direction and why it matters.
3. Ask one focused reasoning or inspection question, then stop.

At level 1, frame the next exercise without resolving it. The direction may name the boundary to
investigate, but every conclusion the user is meant to reach must remain unstated and become the
focused question. Stop before naming the answer, the exact change, or a ready-made solution path.

Before sending any coaching response, perform a **permission trace**: name internally (a) the
current exercise, (b) the disclosure level, and (c) the exact words in the user's current message
that authorize anything above level 1. If (c) is absent, remove every detail above level 1.
Reviewing a user-supplied inference or edit may evaluate what the user already supplied, but must
not supply the next inference or edit.

Keep the feedback conversational rather than turning ordinary feature work into formal lessons.
Create or revise learning artifacts only when the teaching skill and learning workspace indicate
that a durable, non-obvious insight has emerged.

When corrected, return to the cited evidence and update only the affected claim. Preserve the rest
of the working model unless the evidence also changes it.
