---
name: issue-flow
description: Write or update an issue's flow.json - the scene of its parts and a short flow per task - or a repo's own scene. Use when asked to add a flow, when a new issue needs one, or when an issue's code or tasks changed.
---

# Issue flow

A flow shows where the learner's code sits and what moves through it. `flow.json` has a `scene`
(boxes and the lines between them) and, for an issue, `tasks`: a few steps per task that light up
parts of the scene. "See the flow" under a task plays those steps, and can run the task's example
on the learner's own code.

Read first: "Flows" in `AGENTS.md`, the `Flow` types in `apps/desktop/src/shared/types.ts`, and
`packages/content/labs/js-foundations/order-reports/flow.json` as the worked example.

## Steps to write one

1. Read the issue's `lesson.md`, `chapter.json` and `starter/`. Never read `solution/` or
   `grader/`: a flow must not know the answers.
2. **Draw the scene**, 4 to 7 nodes, left to right in the order things happen.
   - `kind`: `story` for a person, place or system of the story, `function` or `file` for code,
     `data` for a list, table or record.
   - `label`: the story's words for story and data nodes ("Delivery desk", "Order list"),
     `name()` for a function, the file name for a file.
   - `mine: true` on every part the learner writes in this issue. That is the only colour.
   - `fn` on a function node the learner writes, when it is a top-level `function` declaration in
     the starter: the function's plain name. One node per function.
   - `edges`: `from`, `to` and a `label` of one to three words for what goes across ("question",
     "order ref"). No two edges between the same pair.
   - `note`: one sentence about what this issue changes in the system.
3. **Write each task's steps**, 3 or 4 per task, keyed by the task's id.
   - `active`: the node ids and edges (`from->to`) that step is about. Follow one example from the
     story from where it starts to where it ends.
   - `note`: what happens at that step, in the story's words. It is also what a screen reader
     reads, so it must make sense alone.
   - `value`, when it helps: what goes in, or the shape of what comes out, as an `array`, a `map`
     or a `grid`. Name the fields; do not fill in the result.
4. **Add a trace** to a task whose function can be traced: `trace: { file, call, args }`.
   - `file` is a learner file in `starter/`, `call` is the `fn` of a scene node, `args` are JSON
     values from the story's example. Only `.js`, `.mjs`, `.ts` and `.mts` files, and only
     top-level `function` declarations.
   - List the task in `apps/desktop/src/shared/trace-examples.test.ts` under its repo
     (`<chapterId>/<taskId>`). That test runs every trace on the solution and fails when the path
     leaves the flow's.
5. **Check it**, and fix every problem reported:
   - `node scripts/build-packs.mjs "$(mktemp -d)"`
   - `pnpm --filter @indent/desktop exec vitest run src/shared/trace-examples.test.ts`
6. **Look at it**: `pnpm dev`, open the issue, and play "See the flow" under each task. No label is
   cut and the scene does not need to scroll at the default panel width.

## When an issue changes

- A function or file was renamed: update `fn`, `trace.call` and `trace.file`.
- A task was added, removed or renamed: `tasks` has exactly one entry per task id.
- The story changed: the notes and labels follow it.
- Then update the issue's intro with the `issue-intro` skill, in the same change.

The pack check names what is out of step: a task without a flow, a step that points at a node
that is gone, a trace that calls a function the starter no longer declares.

## A repo's own scene

`packages/content/labs/<labId>/flow.json` holds only a `scene`, no `tasks`. It is the picture on
the repo page: the company's people and systems, with one `mine` node for what the learner builds
across the whole repo, and a `note` that says it in one sentence.

## Rules

- **Never the answer.** A flow shows what goes in and the shape of what comes out. No result
  values, no code, nothing a check compares against, and no trace arguments copied from the checks.
- **The story's words.** Notes say what happens at the company, not what the code does line by
  line. Plain and short, sentence case, no em dashes.
- **Keep it small.** A scene that needs more than 7 nodes is two ideas; a task that needs more than
  4 steps is two tasks.
- **Only the flow changes.** Do not edit the starter to make a trace fit, except to turn an arrow
  into a `function` declaration, and then do it in the solution too.
