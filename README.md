# Labbench

A local-first desktop app for hands-on coding labs. Each lab is a story: a small company has a
problem and you are its developer. Read a short lesson, write the code, press Check.

No account and no server. Lessons, your files and your progress live on your computer.

## What is in it

- **Lab workspace**: lesson and tasks on the left, a code editor in the middle, a real terminal
  below, an AI tutor on the right.
- **Check**: hidden tests run against your code in about a second. Each task turns green, or shows
  what your code produced and says in plain words what to look at.
- **Hints and modes**: three hints per task that unlock as you try. Hard mode pays full points;
  easy mode shows the solution after a check for half points.
- **AI without a sign-in**: uses a coding CLI you are already logged in to (Claude Code, Codex,
  OpenCode, Gemini CLI) or your own Anthropic, OpenAI or Gemini key. Tutor chat that explains
  rather than answers, and optional grey inline suggestions accepted with Tab.
- **Lab model**: labs about language models talk to a small offline model that answers the same
  way every time, so nothing costs money and tests are repeatable.
- **Listen to the chapter**, a guided tour, text size per panel, layout options, light and dark.
- **Catalog**: dashboard, labs with search and filters, learning paths, challenges and a year board
  of your activity, points, levels and streaks.

## Run it

Requires Node.js 22.18 or newer on your machine (the app runs your code and the checks with it).

```sh
npm install
npm run dev
```

The first Check installs the learner dependencies (vitest, typescript, openai) once, into the app's
data folder.

Other commands:

```sh
npm run typecheck   # both TypeScript projects
npm run lint
npm test            # unit tests
npm run build:mac   # package the app (also build:win, build:linux)
```

## Add a lab

Labs are plain files under `content/labs/<labId>/`: a `lab.json`, and per chapter a `chapter.json`,
`lesson.md`, `starter/`, `solution/` and hidden tests in `grader/checks.mjs`. The format and the
grader contract are documented in [AGENTS.md](AGENTS.md); `content/labs/llm-bug-hunts-ts` is a
complete example. Restart the app to pick up a new lab.

## Where things are stored

Everything is under the app's data folder (`~/Library/Application Support/labbench` on macOS):
`workspaces/` holds your files per chapter, `progress.json` your points and history. API keys are
encrypted with the operating system's keychain.
