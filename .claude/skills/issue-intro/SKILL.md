---
name: issue-intro
description: Write the intro.json of an issue, the five-frame story that plays at the top of its lesson. Use when asked to add, write or redo intros for a repo or for single issues.
---

# Issue intro

An intro tells an issue's story in about 11 seconds, before the learner reads anything. You write
one small file per issue, `packages/content/labs/<labId>/<chapterId>/intro.json`. You write content
only. The app owns the motion and plays every intro the same way.

Read "Intros" in `AGENTS.md` first, then `packages/content/labs/agents-ts/one-tool-call/intro.json`
as the worked example.

## What the learner sees

A row of stations with a road under them, and one ticket on the road.

1. **The ask.** The camera is on the first station. Someone asks for something. The ticket shows
   its label and a question mark.
2. **The problem.** The camera shows the station before the learner's, a hole where the learner's
   station will be, and what comes after. The ticket turns into its wrong ending.
3. **Your part.** The learner's station drops into the hole, in the brand colour, with its tasks.
4. **Done.** The ticket travels to the last station and turns into its right ending.
5. **The whole trip.** The camera pulls out and the ticket goes back to whoever asked.

## Steps for one issue

1. Read, in the issue's folder: `lesson.md` (the first two sections and "Your work in this
   issue"), `chapter.json` (the task titles and files), `flow.json` (the scene), and the story data
   in `starter/` (the orders, rows or records the story uses). Never read `solution/` or `grader/`:
   an intro must not know the answers.
2. Find the four beats and say each in one sentence before you write any JSON:
   - Who asks, and what exactly do they ask? Use the concrete example from the lesson or the
     starter data (a real order id, a real product), not a general description.
   - What goes wrong today, with that same example? A guess, a crash, a wait, a half answer.
   - What does the learner build, in the fewest words? This is the task list.
   - How does the same example end once it works?
3. Pick the stations, 3 or 4, left to right in the order the ticket travels:
   - First: whoever asks. Body `say`, their question in their words.
   - Next: what the story already has and what its limit is. Body `text`.
   - The learner's station: `"mine": true`, `title` "Your code" (or what the learner writes
     there: "Your query", "Your commands", "Your styles"), `file` (the main file of the
     issue, without the folder), `gap` (what is missing today, as seen from outside), and `tasks`
     (one short line per task, in order; shorten the task titles, do not copy them).
   - Last: where the answer is or where the ticket has to arrive. Usually `rows` from the starter
     data with `mark` on the row the example is about, or `say` when a person decides.
     The learner's station is never first. It may be last when the learner's code is where the
     answer comes from.
4. Write the ticket. `label` is the thing the story follows (an order id, "3 scans", a refund).
   `wrong` is how it ends today, `why` names that in two words ("A guess", "Half done"), `right` is
   how it ends when the issue is done. The label is the same in all three states.
5. Write the 5 captions, one per frame, in the order above. One plain sentence each. The first
   names the place and the ask. The third says what the learner writes. The last says what changed.
6. Check it and fix every problem it reports:
   `node scripts/build-packs.mjs "$(mktemp -d)"`
7. Look at it: `pnpm dev`, open the issue, and watch it once in each theme. Every text must fit its
   station without being cut.

## Rules

- **Lengths.** The stage is narrow, so the check caps every text (`INTRO_LIMITS` in
  `apps/desktop/src/shared/intro.ts`): title 18, say 36, text 44, note 40, file 18, gap 32, task
  22, a row 24, why 12, the ticket's label plus an ending 24, caption 90. When a text is too long,
  say less. Do not abbreviate.
- **One example all the way through.** The ask, the wrong ending and the right ending are about the
  same order, product or request, and it comes from the lesson or the starter data.
- **What an intro may show.** How the story's example ends (an order's status, a count on a
  shelf). Never code, a function's body, a hint, or a value a check compares against. If you are
  unsure whether a value is one, leave it out and describe the outcome in words. When a task asks
  the learner to find something (the input that breaks, the row that is wrong, the newest of a
  list), the intro does not point at it: no `mark` on that row, and no ticket that names it.
- **Names stay the same across a repo.** The same person, model or list has the same title in
  every issue of the repo.
- **Words.** Plain and short, sentence case, no em dashes. Use the app's words when you need them
  (repo, issue), never lab or chapter. Stories and names are the repo's own: do not name or allude
  to any other product, course or codebase.
- **Only `intro.json` changes.** Do not edit the lesson, the tasks, the flow or the starter to make
  an intro fit.

## Doing a whole repo

Read `lab.json` for the order of the issues, then do them in order: each issue's intro starts
where the last one ended ("Pip can now look things up. Next: ..."). When you are done, run the
check once more and list, per issue, the ask, the wrong ending and the right ending, so the person
can review the stories without opening the files.
