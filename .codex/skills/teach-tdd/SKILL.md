---
name: teach-tdd
description:
  Guide the user through repository feature work as a teaching-oriented TDD pairing session. Use
  only when the user explicitly invokes $teach-tdd.
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
4. Review their reasoning or change and give one progressive nudge.
5. Observe the focused test fail for the intended reason, then guide the minimum change that makes
   it pass.
6. Let the result determine the next slice. A test matrix may map the intended coverage, but drive
   its cells through separate red-green cycles rather than implementing the whole matrix at once.

A **progressive nudge** meets the user at their current attempt. At the first level, name the
behavioral boundary or investigation direction, then ask the user to locate the relevant code and
articulate the rule, placement, or ordering. Reserve file and function names, enumerated conditions,
and structural sketches for a later hint after the user responds or asks for more. Provide exact
edit instructions or code when the user asks for them or delegates the change. Pause for the user's
response between levels so they retain the reasoning and editing work.

Keep the feedback conversational rather than turning ordinary feature work into formal lessons.
Create or revise learning artifacts only when the teaching skill and learning workspace indicate
that a durable, non-obvious insight has emerged.

When corrected, return to the cited evidence and update only the affected claim. Preserve the rest
of the working model unless the evidence also changes it.
