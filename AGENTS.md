# Labbench

A local-first Electron desktop app for hands-on coding labs. Each lab is a story: a small company has a
problem and the learner is its developer. A chapter is a short lesson plus tasks; the learner writes
code in the editor, runs it in a real terminal, and presses Check, which runs hidden tests and turns
each task green or says in plain words what to look at. No accounts, no server: everything is on disk.

## Commands

- `npm run dev` start the app with hot reload
- `npm run typecheck` both tsconfigs (node and web)
- `npm test` vitest unit tests
- `npx prettier --write <files>` and `npx eslint <files>` before finishing a change

## Layout

```
content/                 lab packs and the grader kit (plain files, shipped as an extra resource)
src/shared/              the contract: types.ts (domain + window.api), rules.ts (points, hints, levels)
src/main/                Electron main process
  ipc.ts                 handle() / listen() / emit() helpers; channels are `${namespace}:${method}`
  paths.ts               contentDir, workspacesRoot, workspaceDir, safeId (validate every id from the renderer)
  labEnv.ts              environment for every process that runs learner code (shell PATH, lab model URL)
  services/<name>.ts     one file per Api namespace, each exports register()
src/preload/             builds window.api from INVOKE_METHODS / SEND_METHODS / EVENTS in shared/types.ts
src/renderer/src/
  styles/globals.css     the design system (tokens)
  components/ui/         shadcn primitives (do not restyle per feature; extend with variants)
  components/app/        small shared app components (ThemeToggle, LevelBadge, LanguageIcon)
  lib/                   api.ts (typed window.api), utils.ts (cn), code-palette.ts (hex mirror of tokens)
  stores/                zustand: settings (persisted), progress, catalog, workspace
  features/<name>/       catalog, workspace, editor, terminal, ai, tour
```

`src/shared/types.ts` is the contract between content, main and renderer. Read it first. If a
signature has to change, change it there and in every caller in the same change.

## Design system

- Tokens live in `styles/globals.css` in three layers: primitives, semantic, Tailwind mapping.
  Components only use the Tailwind utilities of semantic tokens: `bg-background`, `bg-card`,
  `bg-popover`, `bg-muted`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `border-border`,
  `bg-primary text-primary-foreground`, `text-brand`, `bg-brand`, `text-success`, `text-warning`,
  `text-destructive`, with opacity modifiers for soft fills (`bg-success/10`).
  Never write hex, rgb or oklch in a component, and never use Tailwind palette colors (`bg-zinc-900`).
- Meaning of color: primary (inverted neutral) is the one main action in a view. brand (cobalt) is
  active state, progress, links and AI. success is a passed check, destructive a failed one,
  warning is hints and hard mode. Do not use brand for pass or fail.
- Type: Geist (`font-sans`) for UI, Geist Mono (`font-mono`) for code, file names and log lines.
  Body 14px (`text-sm`), secondary 13px/12px muted, page titles `text-2xl font-medium tracking-tight`.
  Weights 400 and 500 only; 600 only inside prose.
- Shape: `rounded-md` controls, `rounded-lg` cards and popovers, `rounded-xl` large cards. 1px borders,
  no drop shadows on flat surfaces (popovers keep the shadcn shadow). Spacing on the 4px grid.
- Icons: `lucide-react`, `size-4` in controls, stroke default. Icon-only buttons get a Tooltip and
  an `aria-label`.
- Build from `components/ui/*` (Button, Badge, Card, Dialog, DropdownMenu, Popover, Tooltip, Tabs,
  Slider, Progress, ScrollArea, Switch, ToggleGroup, Select, Input, Textarea, Skeleton, Collapsible,
  AlertDialog, sonner `toast`). Do not hand-roll a control that exists there.
- Long-form markdown (lessons, task text, AI replies) is rendered inside `.prose-lab`
  (`.prose-lab.prose-compact` for dense places).
- Text size zones: the lesson scroll area gets `.zone-lesson`, the tasks list `.zone-tasks`; the
  editor and terminal multiply their font size by `useSettings().textScale.editor|terminal`.
- Both themes must work. Check every view in light and dark (`useSettings().theme`).
- The window is frameless on macOS: top bars are `.app-drag` and leave `var(--titlebar-inset)` free
  on the left for the traffic lights.
- Copy is plain and short. No em dashes. Sentence case.
- Guided tour: elements the tour points at carry `data-tour={TOUR.x}` from `features/tour/anchors.ts`.

## Content packs

```
content/
  paths.json                         PathDef[]
  runtime/package.json               dependencies of learner code (vitest, typescript, openai, @types/node);
                                     installed once into <userData>/workspaces so every workspace resolves them
  kit/run-check.mjs                  grader CLI, see below
  kit/lab-model.mjs                  the lab model: a deterministic, offline, OpenAI-compatible server
  labs/<labId>/lab.json              LabMeta
  labs/<labId>/<chapterId>/
    chapter.json                     ChapterDef
    lesson.md                        `##` headings split it into the parts the audio player reads
    starter/**                       copied into the workspace on first open and on reset
    solution/**                      solved files, same relative paths
    grader/checks.mjs                hidden tests, never copied into the workspace
```

Grader CLI, run by the main process with system Node and `labEnv()`:

```
node content/kit/run-check.mjs --chapter <abs chapter dir> --workspace <abs workspace dir> \
     --sandbox-root <abs dir for temp copies> --task <taskId> [--task <taskId> ...]
```

It prints exactly one JSON line last on stdout:
`{"results":[{"taskId":"...","passed":false,"details":[{"name":"...","passed":false,"message":"...","output":"..."}]}]}`
and exits 0 whether tasks pass or fail. A non-zero exit means the grader itself crashed.
Messages say what to look at in plain words and never give the answer.

Lab model: `node content/kit/lab-model.mjs` prints `{"port":N}` as its first stdout line, then serves
`POST /v1/chat/completions` on 127.0.0.1. Learner code reaches it with `new OpenAI()` because the
environment sets `OPENAI_BASE_URL`, `OPENAI_API_KEY` and `LAB_MODEL_URL`.

## Rules of the product

- Hard mode pays full task points, easy mode half. Easy mode shows the solution after a check. Once a
  solution is opened in a chapter, that chapter stays in easy mode.
- Each task has three hints. The first unlocks after 3 checks that are not all green, then one per check.
- All of it is in `src/shared/rules.ts`; do not re-implement the numbers elsewhere.

## Code style

- TypeScript strict, explicit return types on exported functions, single quotes, no semicolons, 100 cols.
- Minimal comments: only the why that the code cannot show. No comment on self-explanatory code.
- Clarity over cleverness. No abstractions, options or config nobody asked for.

## Workflow

- The repository is private on GitHub. `main` is always releasable and is never committed to directly.
- Every feature and every fix gets its own branch (`feat/<name>`, `fix/<name>`, `chore/<name>`,
  `docs/<name>`) and its own pull request against `main`. One concern per pull request.
- Before opening a pull request: `npm run typecheck`, `npm run lint` and `npm test` pass.
- Pull requests are squash-merged. The squash title is the pull request title plus its number.
- CI minutes are limited. CI runs on pull requests only and skips docs and lab content. Verify
  locally, push once per pull request, and batch small related fixes into one pull request instead
  of opening several.
- Pull request text is a plain description of the change. No generated-by or tool attribution lines.
- Commit and pull request titles are `type(scope): message` (`feat(editor): ...`, `fix(checks): ...`,
  `chore: ...`). Commits are authored by the repository owner, with no co-author or other trailers.
- Describe everything on its own terms. Never name or allude to another product, course, site or
  codebase that a feature resembles or was modelled on: not in code, comments, commit messages,
  pull request text, docs, or lab content. Lab stories, names and wording are original.
