# Security

## Reporting a problem

Report a security problem in private: open the repository's Security tab and choose "Report a
vulnerability". Please do not open a public issue for it. Say what you did, what happened, and
which version and system you were on. You will get an answer within a week.

## What the app trusts

Indent runs on one computer, with no account and no server. The learner's own code runs in a real
shell with the learner's own rights; that is the product, not a hole. What must hold:

- The page of the app can only do what the `window.api` contract in
  `apps/desktop/src/shared/types.ts` lets it do, and the main process checks every argument.
- A learner's page in the Browser panel, a lesson, a task text and an AI reply are content. None of
  them can reach `window.api`, the file system outside the workspace, or a stored key.
- Nothing leaves the computer unless the person asked for it: a call to the AI provider they picked,
  the download of Node from `nodejs.org`, a star through their own `gh`.

## Security review guidelines

A review, by a person or automated, reports each of these as high priority.

### The window

- `sandbox` turned off, `contextIsolation` turned off, `nodeIntegration` turned on, or a `<webview>`.
- The window loading anything but the app's own page. `will-navigate` blocks it and
  `setWindowOpenHandler` hands http and https links to the browser and denies the rest; a change
  that weakens either is a finding.
- A looser Content-Security-Policy in `apps/desktop/src/renderer/index.html`: `unsafe-eval`, a
  remote origin, or a script source other than `'self'`.

### The main process

- Every argument of an IPC handler comes from the page and is untrusted. An id that reaches a path
  without `safeId`, or a relative path without `resolveInside`, is a finding.
- A new IPC method that is a general power: read or write any path, run any command, fetch any URL.
  A method does one named job.
- A process started from a string. Use `execFile` or `spawn` with an argument array, never
  `shell: true` and never a command line built from input.
- A handler of `indent-cover:` or `indent-preview:` that can serve a file outside the content
  folder or the workspace.

### Content shown in the app

- Lesson, task or AI text put into the page as HTML (`dangerouslySetInnerHTML`, `innerHTML`, raw
  HTML in markdown).
- The Browser panel's frame given more than it has now, or a bridge that lets the learner's page
  call into the app.

### Keys and privacy

- An API key anywhere but the file encrypted with `safeStorage`: not in settings, `localStorage`,
  a log, an error message or a reply to the page, and sent to no host but the provider it is for.
- A new network call, above all a silent one: telemetry, an update check, a status lookup. The app
  makes no call the person did not ask for.
- A server that listens on anything but `127.0.0.1`.
- A real name, email address, home path, token or key in code, tests, screenshots or lab content.

### Downloads, dependencies and workflows

- Anything downloaded and then run without a SHA-256 check against a pinned https origin, or
  unpacked outside the app's own data folder.
- A new dependency in the main process, or one that runs an install script, without a reason in the
  pull request.
- In `.github/workflows`: `pull_request_target`, a job that runs pull request code with a secret or
  with write permission, a new secret, or wider `permissions` than the job needs.

### Not a finding

- Learner code that reads files, uses the network or runs commands in the terminal. It runs as the
  learner, on purpose.
