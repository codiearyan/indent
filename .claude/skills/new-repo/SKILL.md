---
name: new-repo
description: Create a new repo - its story, lab.json, issues, scene, cover and place on a roadmap. Use when asked to add, write or plan a new repo.
---

# New repo

A repo is a story: a small company has a problem and the learner is its developer. It lives in
`packages/content/labs/<labId>/` and is a few issues that build on each other.

Read first: "Content packs" in `AGENTS.md`, `LabMeta` in `apps/desktop/src/shared/types.ts`, and
one whole repo close to what you are writing: `js-foundations` for plain functions, `web-pages` for
a page, `agents-ts` for a repo that talks to the local model, `git-rescues` for one worked through
commands.

## Steps

1. **Agree on the brief with the person before writing anything.** In a few lines: what it
   teaches, who it is for, the language, how many issues, and which roadmap it belongs on. Then the
   list of issues, one line each. Write no files until they say yes.
2. **Write the story.** A small, specific business with a problem a developer could really be
   hired for. Two or three people with a name and a job, who do the asking. Read the `description`
   of every existing `lab.json` first: no company, place or name is used twice.
3. **Write `lab.json`.**
   - `id`: the folder name, lowercase with hyphens, ending in the language when it helps
     (`agents-ts`).
   - `title`: what the learner gets good at, not the company's name.
   - `description`: three sentences. The company and its problem, what the learner does, what they
     learn.
   - `category`: one of the existing shelves, unless the person asks for a new one: AI engineering,
     JavaScript and TypeScript, Web and frontend, DevOps and tools, Interview bug cases, Databases.
   - `language`: the lowercase id that picks the icon and the editor language (`typescript`,
     `javascript`, `react`, `html`, `sql`, `shell`).
   - `tags`: one or two short labels for the card.
   - `level`: `easy` keeps each issue in one file, `medium` spreads a change over a few files,
     `hard` is a whole project laid out by its own conventions.
   - `tools`: only when it needs more than Node, e.g. `["node", "git"]`.
   - `parts`: one or two titled groups that list the issue ids in order.
4. **Plan the issues.** Five is usual, two is the least. Each is one request from someone at the
   company, and each starts where the last one ended, so the fifth issue's code has grown from the
   first's. Easy ideas first.
5. **Write each issue with the `new-issue` skill**, in order. That skill ends with the issue's flow
   and its intro; an issue without both is not done.
6. **Check the resources across the repo.** Each issue found its docs and videos with the
   `new-issue` skill ("Find the resources"). Look at them together: three to five videos in the
   repo, at least one per issue where a good one exists, and the same video on two tasks only when
   it truly covers both.
7. **Write the repo's scene**, `labs/<labId>/flow.json`, with the `issue-flow` skill ("A repo's own
   scene").
8. **A repo that talks to a model** gets `labs/<labId>/model.mjs`: `models` maps a model name to a
   function from the request to the reply, and every name starts with the repo's name so repos
   never collide. Learner code never reaches a real service.
9. **The cover**, `labs/<labId>/cover.webp`, 960 by 540. It shows the topic the repo teaches,
   never the story's place or people, in the set's four inks, with no text, letters, logos or
   people ("Covers" in `AGENTS.md`). It is a picture, so ask the person how they want it made. A
   repo without one shows the name of its language, which is fine to ship.
10. **The roadmap.** Add the repo's id to a stage in `packages/content/paths.json` when the person
    named one. Only the first repo of a roadmap ships inside the app (`extraResources` in
    `apps/desktop/electron-builder.yml`); every other repo downloads, so a new repo needs nothing
    there.
11. **Check the whole repo.**
    - `node scripts/build-packs.mjs "$(mktemp -d)"`
    - `node scripts/verify-content.mjs "$ROOT" <labId>` (the `new-issue` skill shows how to make
      `$ROOT`)
    - `pnpm test`
12. **Go through it as a learner.** `pnpm dev`, start the repo, and do every issue in order from
    its starter. Note where you had to guess: that is where a lesson or a task text is thin.

## Rules

- **Everything is original.** Never name or allude to another product, course, site or codebase,
  in the story, the code, the comments or the lesson.
- **One story, told in order.** The same people, the same data and the same file layout across the
  issues. Later issues may add files; they do not rename what earlier ones taught.
- **The learner writes real code.** Each issue leaves them with something they could explain in an
  interview, in a real file, run in a real terminal.
- **Words.** Plain and short, sentence case, no em dashes; repo, issue and roadmap, never lab,
  chapter or path.

## Done when

- Every issue is done by the `new-issue` skill's own list.
- The repo has its scene, and its cover or a note to the person that it has none.
- Every task has docs and the repo has three to five confirmed videos.
- The three checks above pass, and you went through the repo in the app.
- Tell the person what is left for them: narration (`scripts/narrate.mjs` sends lesson text to a
  voice service), the cover, and where it sits on a roadmap.
