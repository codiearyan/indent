---
name: new-issue
description: Write a new issue for a repo, or rework an existing one - its lesson, tasks, starter, solution and hidden checks, then its flow and its intro. Use when asked to add, write or change an issue of a repo.
---

# New issue

An issue is a short lesson plus tasks. Someone at the repo's company asks for something, the learner
writes the code, and hidden checks say whether it works. An issue is one folder,
`packages/content/labs/<labId>/<chapterId>/`, and it is not done until every file below is there.

Read first: "Content packs" in `AGENTS.md`, `ChapterDef` and `TaskDef` in
`apps/desktop/src/shared/types.ts`, and one whole issue of the same repo. For a repo that has none
yet, read `packages/content/labs/js-foundations/order-reports/`.

## What an issue is made of

| File                | What it holds                                                                  |
| ------------------- | ------------------------------------------------------------------------------ |
| `chapter.json`      | The title, the files in tab order, the terminal's suggested command, the tasks |
| `lesson.md`         | The story and the idea, in parts                                               |
| `starter/**`        | The workspace the learner starts in; it fails every task                       |
| `solution/**`       | The same files, solved; it passes every task                                   |
| `grader/checks.mjs` | The hidden checks, one per task; never copied into the workspace               |
| `flow.json`         | The issue's scene and a short flow per task; see the `issue-flow` skill        |
| `intro.json`        | The five-frame story at the top of the lesson; see the `issue-intro` skill     |
| `audio/*.ogg`       | Recorded narration, one file per lesson part; made by `scripts/narrate.mjs`    |

## Steps

1. **Find the request.** One person at the company asks for one thing, with a concrete example
   from the story (an order id, a product, a route). Write it as they would say it, in one or two
   sentences. Then say what the learner will be able to do afterwards. An issue teaches one idea.
2. **Split it into three tasks.** Each one builds on the one before, and each can be checked by
   itself. Three is the rule in every repo; two is fine for a small issue.
3. **Write `chapter.json`.**
   - `id` is the folder name: lowercase letters, digits and hyphens.
   - `files`: the files the learner opens, in tab order, the one they write first. A file whose
     name starts with a dot (`.gitignore`) shows in the app only when it is listed here; its repo
     sets `"format": 4` in `lab.json`.
   - `terminal`: a one-sentence `description` and a `suggestedCommand` that runs the demo.
   - `preview`: only for an issue with a page, e.g. `"index.html"`.
   - `movesFiles`: `true` only for an issue whose tasks have the learner move, rename or remove
     starter files. Without it the app asks for a missing starter file back and holds its checks.
     Its repo sets `"format": 3` in `lab.json`.
   - Each task: `id`, `title` (what to do, as an action), `file`, `description`, `nextSteps`,
     `hints`, `docs`, `videos`, `points`.
     - `description` is Markdown. It names the function or file, says exactly what it takes and
       returns, and ends by saying what the check does, in words.
     - `nextSteps`: three or four short ordered steps. They say where to look, never the answer.
     - `hints`: one for each hint a task can unlock (`MAX_HINTS` in
       `apps/desktop/src/shared/rules.ts`), from a light nudge to almost there. The first names
       where to look, the next the idea, and only the last may show the shape of the line.
     - `docs`: two or three links to official reference pages for what the task tests: the
       language's or the library's own documentation, opened once to confirm the page exists and
       covers the idea. Title each by the page's subject (`Promise.all()`, `CSS flex-wrap`).
     - `videos`: optional; see "Find the resources" below.
     - `points`: the same as the tasks beside it; copy it from another task of the repo.
4. **Write the starter and the solution** with the same relative paths.
   - The starter runs. Every function the learner writes throws `Not implemented`, and the file
     opens with a comment that lists the tasks in order.
   - Put the story's data in its own file (`data.ts`, `orders.js`, `seed.sql`) and a demo the
     terminal command runs, so the learner can see their work before pressing Check.
   - A function a flow should trace is a top-level `function` declaration, not an arrow.
   - A repo that works through commands (Git) has a `setup.mjs` that builds the starting state, and
     its `solution/` has a `solve.mjs` that runs the fix.
5. **Write `grader/checks.mjs`.** It exports `checks`, an object keyed by task id. Each check is
   `async (t) =>` and returns a list of `{ name, passed, message, output }`.
   - `t` gives you: `sandbox()` (a fresh copy of the workspace), `call(dir, file, exportName,
args)`, `node`, `vitest`, `typecheck`, `page()` for an issue with a page, and `judgeTest` for a
     task where the learner writes a test.
   - Check with your own inputs, not the demo's, so the lesson's example cannot be typed in as the
     answer.
   - A `message` says in plain words what to look at. It never gives the answer or the expected
     value. When the file does not load or still throws `Not implemented`, say that once instead of
     failing every case.
6. **Write `lesson.md`.** `# Title`, then `##` parts; each part is one piece Read aloud plays.
   - Follow the parts the repo's other issues use. For a new repo: "What you will be able to do"
     (one paragraph that places the learner, then three or four outcomes), "The request from
     <name>" (their words as a quote, then why it is a problem), three or four parts that teach the
     idea with an example about a _different_ thing than the tasks ask for, and "Your work in this
     issue" (which files, in which order, and the command to run).
   - 550 to 900 words. It teaches the idea; it does not walk through the tasks' answers.
7. **Find the resources.** Every issue gets at least one video on the task its idea is hardest
   in, when a good one exists. The learner sees docs and videos in the issue's Resources tab from
   the start, and under "Watch" and "Read up" once a task keeps failing.
   - Search for short explainers of the task's idea (a few minutes, from a channel known for
     teaching) rather than long courses. A playlist is fine when the idea is a series.
   - A link is `https://www.youtube.com/watch?v=<id>` or `https://www.youtube.com/playlist?list=<id>`.
     For a long video, `start` and `end` in whole seconds point at the part that matters; a
     playlist takes neither.
   - Confirm every link before using it. This prints its title and channel, and fails when the
     video is gone or does not allow embedding, so pick another:

     ```sh
     curl -sf "https://www.youtube.com/oembed?format=json&url=<link>" || echo "not usable"
     ```

   - `title` says what the video teaches, in sentence case ("Closures in 100 seconds", "Joins
     explained"). Never the channel's name or the video's own clickbait title.
   - A video shows the idea, never the task's answer: no walkthrough of this issue's exercise.
   - The pack check fails on a link that is not a video or playlist, and on bad times.
8. **Add the issue to `lab.json`**, in the part it belongs to.
9. **Prove it grades.** The starter must fail every task and the solution must pass every task:

   ```sh
   ROOT=$(mktemp -d)
   cp packages/content/runtime/package.json packages/content/runtime/package-lock.json "$ROOT"
   (cd "$ROOT" && npm ci)
   node scripts/verify-content.mjs "$ROOT" <labId>
   ```

10. **Write the flow**: follow the `issue-flow` skill.
11. **Write the intro**: follow the `issue-intro` skill.
12. **Check everything**: `node scripts/build-packs.mjs "$(mktemp -d)"` and `pnpm test`. The pack
    check fails on an issue without a flow or an intro, and on a task without a flow.
13. **Look at it.** `pnpm dev`, open the issue, read the lesson, do the tasks from the starter with
    only the lesson and the hints, and press Check after each.
14. **Narration.** `node scripts/narrate.mjs <labId>` records the lesson parts. It sends the lesson
    text to a voice service, so ask the person before you run it.

## Rules

- **Original story.** The company, the people and the wording are the repo's own. Never name or
  allude to another product, course, site or codebase. The same person has the same name and job in
  every issue of the repo.
- **Nothing gives the answer away.** Not a check's message, not a hint before the third, not the
  lesson's example, not the flow, not the intro.
- **Words.** Plain and short, sentence case, no em dashes. What a person reads uses the app's
  words: repo, issue, roadmap. Never lab, chapter or path.
- **Numbers.** How many hints a task has, how they unlock and what points do is in
  `apps/desktop/src/shared/rules.ts`. Read it there; do not write those numbers into a lesson, a
  task or a skill.
- **An AI repo** talks to the local model, never a real service: give the model its replies in
  `labs/<labId>/model.mjs`, with model names that start with the repo's name.
- **Changing an existing issue.** Learners already have a copy of the old starter, and the checks
  run on that copy. Keep the file names and exported names the checks call. When one has to change,
  say so to the person: those learners need Reset to go on. Then update the flow and the intro in
  the same change.

## What keeps going wrong

Every repo written so far failed some of these in its first version. A learner playing the issue
without the solution found them, or the review of the pull request did. Go through the list before
you call an issue done.

- **A message names the real cause.** It says what to look at. It never states the answer, the
  code, command or method to write, or a value a hidden case expects, and its `output` agrees
  with it. A typo in the given words gets a message about the words, not about the structure
  around them.
- **Try wrong answers against your own check.** At least three natural ones per task: a typed-in
  result, the shortcut the lesson warns against, the near miss. Each must fail on its real cause.
  Then write one right answer in a different honest way from your solution; it must pass.
- **Use the check's own values, and more than one case.** One case lets a wrong answer through
  that happens to fit it.
- **A right task never fails because of another task.** Judge each task on what the learner built
  it from, or say plainly which earlier task is not right yet. Give every case fresh state, so an
  earlier mistake in the same check cannot use up an id or leave something open.
- **Every "must" in a task is checked.** When it cannot be checked reliably, soften the text.
- **The solution meets the task text too**, its edge cases included. Reviews have found solutions
  that accepted what their own task says to refuse.
- **Nothing is asked before it is taught**, the errors a learner will hit on the way included,
  and how to read them. In a foundations repo the learner writes each new thing whole at least
  once, not only the inside of a shell the starter gives.
- **An intro shows no value a check compares:** no limit, length, name or text a task asks for.
  A flow neither.
- **Check claims by running them** on the versions in the repo tools: what a tool prints, what a
  library does with a wrong call. Do not write them from memory.
- **A check gives the same result on every run**, never hangs, and leaves nothing behind in the
  workspace. Do not compare how long two things take.
- **The app is more than the grader.** `verify-content.mjs` runs the grader directly, so it does
  not see what the app adds around it. An issue whose tasks move, rename or remove starter files
  needs `movesFiles` (step 3). An issue with a page is worth opening in a dev build.
- **Windows.** The app's terminal there is PowerShell. Teach with `node` scripts unless the shell
  itself is the topic, and then say in the first lesson which systems the repo is for.

## Done when

- `verify-content.mjs` says ok for the issue: the starter fails every task, the solution passes.
- `build-packs.mjs` and `pnpm test` pass.
- The issue has its `flow.json` with a flow for every task, and its `intro.json`.
- Every task has docs, the issue has at least one video when a good one exists, and every link was
  confirmed.
- You did the tasks yourself from the starter in the app.
- Tell the person what is left for them: narration, and screenshots if a pull request follows.
