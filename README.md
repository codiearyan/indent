# Indent

A local-first desktop app where developers learn by doing. Each repo is a story: a small company
has a problem and you are its developer. Work through its issues: read a short lesson, write the
code, press Check.

No account and no server. Lessons, your files and your progress live on your computer. The app
sends anonymous usage stats, which you can turn off in Settings.

## What is in it

- **Workspace**: lesson and tasks on the left, a code editor in the middle, a real terminal
  below, an AI tutor on the right.
- **Check**: hidden tests run against your code in about a second. Each task turns green, or shows
  what your code produced and says in plain words what to look at.
- **Hints**: three hints per task, from a light nudge to almost there, that open as you try.
- **AI without a sign-in**: uses a coding CLI you are already logged in to (Claude Code, Codex,
  OpenCode, Gemini CLI) or your own Anthropic, OpenAI or Gemini key. Tutor chat that explains
  rather than answers, and optional grey inline suggestions accepted with Tab.
- **Local model**: repos about language models talk to a small offline model that answers the same
  way every time, so nothing costs money and tests are repeatable.
- **Read aloud** in a recorded, natural voice, a guided tour, text size per panel, layout options,
  dark and light themes.
- **Patterns**: 18 algorithm patterns as step-through animations (two pointers, sliding window,
  binary search, linked lists, heaps, BFS and DFS, topological sort, union-find, backtracking,
  dynamic programming and more). Each step highlights the line of code that runs and says what
  happened and why. Play, pause, scrub, change speed, and try your own input.
- **Repos**: 12 story repos (55 issues, 162 tasks): LLM apps, retrieval, agents and
  evals against the offline local model; TypeScript, async JavaScript and a JSON API with plain Node;
  SQL on built-in SQLite; Git rescues done in the real terminal; and bug hunts in JavaScript and
  LLM code. Three roadmaps put them in order.
- **Catalog**: home, repos with search and filters, roadmaps, and an activity board of your
  passed tasks, points, levels and streaks.

## Run it

Requires Node.js 22.18 or newer (the app runs your code and the checks with it) and pnpm 11.

```sh
pnpm install
pnpm dev
```

The first Check installs the learner dependencies (vitest, typescript, openai) once, into the app's
data folder.

Other commands:

```sh
pnpm typecheck      # both TypeScript projects
pnpm lint
pnpm test           # unit tests
pnpm --filter @indent/desktop build:mac   # package the app (also build:win, build:linux)
```

The repository is a pnpm workspaces monorepo: the desktop app is in `apps/desktop`, the landing page in `apps/site`
(`pnpm dev:site`), and the repos and the grader kit, which both apps read, in `packages/content`.

## Add a repo

Repos are plain files under `packages/content/labs/<labId>/`: a `lab.json`, and per issue a `chapter.json`,
`lesson.md`, `starter/`, `solution/` and hidden tests in `grader/checks.mjs`. The format and the
grader contract are documented in [AGENTS.md](AGENTS.md); `packages/content/labs/llm-bug-hunts-ts` is a
complete example. Restart the app to pick up a new repo.

## Where things are stored

Your files are in the folder you picked for your work, `~/Indent` by default (Settings, Editor).
The app's data folder (`~/Library/Application Support/Indent` on macOS) holds `progress.json`, your
points and history, and `content/`, the repos: the ones the app ships with and the ones downloaded
from the repo library. API keys are encrypted with the operating system's keychain.

## Usage stats

On by default; turn them off in Settings (Privacy). While they are on, the app sends anonymous
events to Aptabase (EU): app opened, setup step reached, setup finished (with the kind of AI
picked), repo started, repo downloaded or its download failed (with the kind of failure), check run
(passed and failed counts), hints unlocked, issue completed, tutor asked and suggestion requested,
with repo and issue ids, the app version and the system. It never sends your code, file names,
chats, keys or anything that identifies you. The events are listed in `TelemetryEvent` in
`apps/desktop/src/shared/types.ts`.

## License

Copyright (C) 2026 Aryan Bhati

Indent is free software under the [GNU General Public License, version 3](LICENSE). You may use,
change and share the code, the repos and the pictures. If you share a version of your own, it has
to come with its source under the same license. There is no warranty.

The names and logos of other products that appear in the app (AI providers, programming languages)
belong to their owners.
