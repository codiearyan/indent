# Indent

A local-first Electron desktop app where developers learn by doing. Each repo is a story: a small
company has a problem and the learner is its developer. A repo has issues; an issue is a short lesson
plus tasks; the learner writes code in the editor, runs it in a real terminal, and presses Check,
which runs hidden tests and turns each task green or says in plain words what to look at. No
accounts, no server: everything is on disk.

## Vocabulary

Everything a person sees or hears (UI copy, errors, the tutor's prompt, README) uses the app's words.
The code keeps its older names on purpose; do not rename them to match.

| The app says      | The code says                                                                         |
| ----------------- | ------------------------------------------------------------------------------------- |
| repo, repos       | lab: `labId`, `LabSummary`, `LabMeta`, `content/labs/`, `lab.json`, the `/labs` route |
| issue, issues     | chapter: `chapterId`, `Chapter`, `ChapterDef`, `chapter.json`                         |
| roadmap, roadmaps | path: `PathDef`, `paths.json`, the `/paths` route                                     |
| local model       | lab model: `lab-model.mjs`, `labModel.ts`, `LAB_MODEL_URL`                            |
| runtime           | `content/runtime/`, `RuntimeStatus`                                                   |
| Activity          | year board: `YearBoardPage`, the `/year` route                                        |
| Patterns          | DSA: `features/dsa/`, the `/dsa` route                                                |

Tasks, checks, hints, points, levels, streak, Home, Tutor and Lesson keep their names. Copy should fit
the picture: a repo has issues, an issue has tasks, tasks have checks ("Start repo", "Issue 2 of 5").

## Commands

Run from the repo root.

- `pnpm install` installs every workspace
- `pnpm dev` start the app with hot reload
- `pnpm typecheck` both tsconfigs (node and web)
- `pnpm test` vitest unit tests
- `pnpm prettier --write <files>` and `pnpm eslint <files>` before finishing a change

## Layout

A pnpm workspaces monorepo. Install, lint and format from the root. Each app is a workspace under
`apps/`; what the apps share is a package under `packages/`:

```
apps/desktop/            the Electron app (@indent/desktop); src/ paths below are relative to it
apps/site/               the landing page (@indent/site): a static Astro site that reads
                         packages/content at build time; `pnpm dev:site`, `pnpm build:site`
packages/content/        @indent/content: lab packs and the grader kit (plain files, shipped as an
                         extra resource); `content/` below means this folder
packages/design/         @indent/design: tokens.css (colours, type, theme), code-palette.ts, the logo;
                         every app imports its look from here, never redefines it
```

Inside `apps/desktop/`:

```
src/shared/              the contract: types.ts (domain + window.api), rules.ts (points, hints, levels)
src/main/                Electron main process
  ipc.ts                 handle() / listen() / emit() helpers; channels are `${namespace}:${method}`
  paths.ts               contentDir, workspacesRoot, workspaceDir, safeId (validate every id from the renderer)
  labEnv.ts              environment for every process that runs learner code (shell PATH, lab model URL)
  services/<name>.ts     one file per Api namespace, each exports register()
src/preload/             builds window.api from INVOKE_METHODS / SEND_METHODS / EVENTS in shared/types.ts
src/renderer/src/
  styles/globals.css     imports @indent/design/tokens.css; holds only what the app alone needs
  components/ui/         shadcn primitives (do not restyle per feature; extend with variants)
  components/app/        small shared app components (ThemeToggle, LevelBadge, LanguageIcon)
  lib/                   api.ts (typed window.api), utils.ts (cn)
  stores/                zustand: settings (persisted), progress, catalog, workspace
  features/<name>/       catalog, workspace, editor, terminal, browser, ai, tour, dsa, onboarding, settings, star
```

`src/shared/types.ts` is the contract between content, main and renderer. Read it first. If a
signature has to change, change it there and in every caller in the same change.

## Design system

The look in one line: a dark frame holds the navigation, the work sits on a sheet one step lighter,
the chrome is neutral, and the one hue is a calm orange.

- **Three levels, no more.** The frame is `bg-background`. The sheet is `bg-card rounded-2xl border`
  inset 8px from the window edges. Cards on the sheet are `rounded-lg border border-border` with no
  fill of their own and no shadow. Shadows are only for what floats (menus, popovers, dialogs).
- **Colour is meaning.** `brand` is the orange. It marks progress (a filled task cell in the build
  strip, the level meter, the activity heatmap) and it is the one main action of a view
  (`bg-primary text-primary-foreground`: an orange button with ink text). `success` is the small green
  mark of a passed check and `destructive` the red mark of a failed one; they are status marks, never
  fills for large areas. `warning` is only the "being compared" tone in the DSA animations.
  Nothing else has a hue: links, active navigation, selected tabs, hints and AI are neutral.
  The one exception is a language's logo (`components/app/LanguageIcon`, drawn from
  `@icons-pack/react-simple-icons`): it keeps its own colour, because that colour is how people
  recognise it. Logos that are near black take the muted text colour instead.
  - Selected or active: a neutral pill (`bg-accent text-foreground`) or ink text. Never the brand.
  - Links: `text-muted-foreground hover:text-foreground`, or ink with an underline in prose.
  - Never set text in the brand colour on a light surface; use it as a fill with ink text on top.
  - Soft status fills use opacity (`bg-success/10 text-success`, `bg-destructive/10`).
- **Tokens only.** Use the Tailwind utilities of the semantic tokens in `packages/design/tokens.css`
  (`bg-background`, `bg-card`, `bg-muted`, `bg-accent`, `text-foreground`, `text-muted-foreground`,
  `border-border`, `border-rule`, `border-input`, `bg-primary`, `text-success`, `text-warning`,
  `text-destructive`). Never hex, rgb or oklch in a component, never Tailwind palette colours.
- **Lines in three steps.** `border-border` for the edge of a card or the sheet, `border-rule` for
  rules between rows inside a card, `border-input` for controls.
- **Type.** IBM Plex Sans (`font-sans`) for the interface, IBM Plex Mono (`font-mono`) for code, file
  names, ids and commands. Page title `text-[22px] leading-7 font-semibold`, card title
  `text-sm font-semibold`, body `text-sm`, meta `text-[13px]` or `text-xs` in `text-muted-foreground`.
  Weights 400, 500 and 600. Figures that matter are 24px at regular weight with `tabular-nums`; the
  label sits above in 13px grey. Sentence case everywhere; no uppercase tracked labels.
- **Shape.** `rounded-lg` (8px) cards and popovers, `rounded-md` (6px) controls, `rounded-sm` (4px)
  chips, `rounded-2xl` for the sheet only. Spacing on the 4px grid; one gap (`gap-6`) between cards;
  rows 48 to 56px tall.
- **Figures are type, not tiles.** A set of numbers is one container split by `border-rule` hairlines.
  No icon in a tinted square, no sparkline, no coloured figure.
- **Lists are rules and alignment.** Rows separated by `border-rule`, no zebra, no header band,
  numbers right-aligned in tabular figures, one status mark per row.
- **Progress is the build strip.** A lab's progress is drawn with `components/app/BuildStrip`: one
  group per chapter, one cell per task, green when passed. Use it instead of a generic progress bar
  wherever a lab's progress is shown.
- **Empty states keep the frame**: the card and its header stay, with one plain sentence inside.
- **Never:** gradients, glows, glass or backdrop blur, emoji, a greeting as the title, a hue on the
  chrome, more than one filled button in a view.
- **Motion from tokens.** `packages/design/tokens.css` holds the curves and durations: `--ease-out`
  to enter and exit (also the `ease-out` utility), `--ease-in-out` to move on screen, and
  `--motion-press` (150ms), `--motion-state` (220ms), `--motion-enter` (280ms), `--motion-exit`
  (160ms, exits are faster), `--motion-stage` (100ms between staged parts), `--motion-stagger` (40ms
  between list rows). Name the properties (`opacity`, `transform`, `filter`), never `transition: all`;
  hover colour is instant; presses scale to 0.98; nothing starts from scale 0; under
  `prefers-reduced-motion` movement becomes a plain fade.
- Icons: `lucide-react`, `size-4`, `strokeWidth={1.5}` in navigation. Icon-only buttons get a Tooltip
  and an `aria-label`.
- Build from `components/ui/*` (Button, Badge, Dialog, DropdownMenu, Popover, Tooltip, Tabs, Slider,
  Progress, ScrollArea, Switch, ToggleGroup, Select, Input, Textarea, Skeleton, Collapsible,
  AlertDialog, sonner `toast`). Do not hand-roll a control that exists there.
- Long-form markdown (lessons, task text, AI replies) is rendered inside `.prose-lab`
  (`.prose-lab.prose-compact` for dense places).
- Text size zones: the lesson content gets `.zone-lesson`, the tasks list `.zone-tasks`; the editor
  and terminal multiply their font size by `useSettings().textScale.editor|terminal`.
- Both themes must work; dark is the default. Check every view in both.
- Code has its own themes (`CODE_THEMES` in `packages/design/code-palette.ts`). A code theme only
  sets the colours of the code, once for dark and once for light; the frame of the editor, the
  terminal and the Patterns code view always follows the app. Settings are edited in one window,
  `features/settings/SettingsDialog`, with a section per subject.
- The window is frameless on macOS: the frame is `.app-drag`; a top bar leaves
  `var(--titlebar-inset)` free on the left and the sidebar starts at `var(--sidebar-top)`.
- Copy is plain and short. No em dashes. Sentence case.
- Guided tour: elements the tour points at carry `data-tour={TOUR.x}` from `features/tour/anchors.ts`.
- To look at a change: `pnpm dev` starts the app; `node scripts/cdp.mjs navshot "#/labs|/tmp/x.png"`
  navigates the running window and saves a screenshot (start Electron with
  `--remote-debugging-port=9222`, or set `CDP_PORT`).

## First-run setup

`features/onboarding/` is the setup shown instead of the app while `useSettings().onboarded` is false.
It is not a route: finishing or skipping sets `onboarded` and the app takes over on Home; "Run setup
again" in the AI menu clears it. `steps.ts` is the pure step machine (which steps exist for the
choices, next, back, the progress cells, the help level mapping) with its tests. Every choice writes
the real setting at once (`ai.setConfig`, `ai.setKey`), so skipping keeps what was picked. Step
changes run through `lib/viewTransition.ts` with the type `onboarding-step`; `onboarding.css` holds
the transition, the staged entrances and the scenes, all on the motion tokens, with a
reduced-motion block that turns movement into fades and shows each scene's last frame. The scenes in
`scenes/` are built from app components and tokens, never images.

## Content packs

```
packages/content/
  paths.json                         PathDef[]
  runtime/package.json               dependencies of learner code (vitest, typescript, openai, react, jsdom,
                                     esbuild, @types/node);
                                     installed once into <userData>/workspaces so every workspace resolves them
  kit/run-check.mjs                  grader CLI, see below
  kit/lab-model.mjs                  the lab model: a deterministic, offline, OpenAI-compatible server
  kit/page.mjs                       t.page(): a workspace page in a headless DOM, see below
  labs/<labId>/lab.json              LabMeta
  labs/<labId>/cover.webp           the repo's picture on its card, 960 by 540; see "Covers" below
  labs/<labId>/<chapterId>/
    chapter.json                     ChapterDef; `preview` names a page for the Browser panel
    lesson.md                        `##` headings split it into the parts the audio player reads
    starter/**                       copied into the workspace on first open and on reset
    solution/**                      solved files, same relative paths
    grader/checks.mjs                hidden tests, never copied into the workspace
    audio/<key>.ogg                  recorded narration, one file per lesson part (see below)
```

Covers. Every repo has one picture, shown at the top of its card. It shows the topic the repo
teaches (a table and a query for SQL, a browser window for the DOM), never the story's place or
people. All covers are one set: flat screen-print shapes with rounded corners and a light grain, in
four inks only (charcoal #1B1B1E as the background, mid grey #55555C, cream #EFE3D0, orange #EA6030),
with no text, letters, logos or people. A repo without a cover shows the name of its language. The
main process serves the file at `indent-cover://<labId>/`.

The packaged app reads content from `<userData>/content`: on start it copies the kit, the runtime,
the roadmaps and the shipped repos there, and it downloads the other repos from the library the site
publishes (`scripts/build-packs.mjs`, `main/library.ts`). It ships only the repos listed in the
`extraResources` filter of `apps/desktop/electron-builder.yml`, plus an index of all of them that
`build/pack-index.mjs` writes before packing, so the catalog is complete offline. `pnpm dev` reads
`packages/content` directly; to try downloads, serve a `build-packs.mjs` output and start with
`INDENT_PACKS_URL=<its address>`.

Read aloud plays a recording when one exists for the exact text of a lesson part, and falls back
to the system voice when it does not. `node scripts/narrate.mjs [labId ...]` records the parts that
have no recording yet with a neural voice (it needs `uvx` and `ffmpeg`, and sends the lesson text to
the voice service) and removes recordings whose text is gone. Run it after writing or editing a
lesson. `apps/desktop/src/shared/narration.ts` holds the splitting and the key both sides use.

### Pages in the browser

An issue whose `chapter.json` has `"preview": "index.html"` gets a Browser panel beside the editor
(`features/browser/`). The page is served straight from the workspace on disk through the
`indent-preview:` scheme (`src/main/services/preview.ts`), one origin per workspace, and it reloads
after every save. `.html`, `.css` and `.js` files are served as they are. A `.jsx`, `.tsx` or `.ts`
file is bundled on request with the runtime's esbuild, so a React issue loads
`<script type="module" src="src/main.jsx">` and imports `react` like any project. Console output and
uncaught errors of the page show in the panel's console. The page is the learner's code: it runs in
a sandboxed frame on its own origin and never sees `window.api`.

Checks open the same page without a browser. `const page = await t.page()` (`kit/page.mjs`) loads
it into a headless DOM, runs its scripts and returns `document`, `$`, `$$`, `text`, `click`, `type`,
`press`, `submit`, `settle`, `errors`, `logs`, `reloads` and `style(target, { width })`. `style`
gives the CSS that applies to an element at a viewport width (cascade, inheritance, `var()` and
width media queries, shorthands expanded); it knows nothing about layout, so checks ask what was
declared, not where a box ended up. Options: `t.page(file, { dir, fetch, storage, width })`.

Node comes from the learner's PATH. When it is missing or older than 22.18, Settings (Tools) can
download a copy into `<userData>/tools/node`; `labEnv()` puts that copy first on the PATH, so the
checks, the terminal and the runtime install all use it. `services/tools.ts` owns this.

Grader CLI, run by the main process with system Node and `labEnv()`:

```
node packages/content/kit/run-check.mjs --chapter <abs chapter dir> --workspace <abs workspace dir> \
     --sandbox-root <abs dir for temp copies> --task <taskId> [--task <taskId> ...]
```

It prints exactly one JSON line last on stdout:
`{"results":[{"taskId":"...","passed":false,"details":[{"name":"...","passed":false,"message":"...","output":"..."}]}]}`
and exits 0 whether tasks pass or fail. A non-zero exit means the grader itself crashed.
Messages say what to look at in plain words and never give the answer.

Lab model: `node packages/content/kit/lab-model.mjs` prints `{"port":N}` as its first stdout line, then serves
`POST /v1/chat/completions` on 127.0.0.1. Learner code reaches it with `new OpenAI()` because the
environment sets `OPENAI_BASE_URL`, `OPENAI_API_KEY` and `LAB_MODEL_URL`.

A lab gives the model its behavior in `packages/content/labs/<labId>/model.mjs`: `models` maps a model name to
a function from the request to the reply (a string, or `{ content, tool_calls }` for tool calling),
and `embeddings` maps an embedding model name to a function from text to a vector (`kit/embed.mjs`
has a ready-made one). It also serves `POST /v1/embeddings`. Prefix model names with the lab's own
name so labs never collide.

## DSA patterns

`features/dsa/` holds the animated algorithm patterns. A pattern is data and logic with no React:
`patterns/<id>.ts` exports a `Pattern` whose `build(values)` turns input into `Step[]`, each step a
full snapshot of frames (array, bucket, map, intervals, grid, list, tree, graph), the code lines
being executed and a plain-words note. `types.ts` is the contract, `tones.ts` the only place a
highlight becomes a color, `views/` draws one frame kind each and animates between snapshots with
CSS transitions on stable keys. To add a pattern: write `patterns/<id>.ts` and its test (call
`expectValidPattern`, compare the answer with a brute force), then list it in `registry.ts`.

## Rules of the product

- Every task pays its points once, the first time it passes.
- Each task has three hints. The first unlocks after 3 checks that are not all green, then one per check.
- All of it is in `src/shared/rules.ts`; do not re-implement the numbers elsewhere.

## Code style

- TypeScript strict, explicit return types on exported functions, single quotes, no semicolons, 100 cols.
- Minimal comments: only the why that the code cannot show. No comment on self-explanatory code.
- Clarity over cleverness. No abstractions, options or config nobody asked for.

## Workflow

- The repository is public on GitHub. `main` is always releasable and is never committed to directly.
- Every feature and every fix gets its own branch (`feat/<name>`, `fix/<name>`, `chore/<name>`,
  `docs/<name>`) and its own pull request against `main`. One concern per pull request.
- Before opening a pull request: `pnpm typecheck`, `pnpm lint` and `pnpm test` pass.
- Pull requests are squash-merged. The squash title is the pull request title plus its number.
- CI minutes are limited. CI runs on pull requests only and skips docs and lab content. Verify
  locally, push once per pull request, and batch small related fixes into one pull request instead
  of opening several.
- Releases are built by `.github/workflows/release.yml`, never on pull requests. Run it by hand on
  `main`: it raises the version in `apps/desktop/package.json` (patch unless you pick minor or
  major), commits that to `main` as `chore: release <version>`, tags it, and builds. Do not edit
  the version in a pull request. It builds `Indent-mac-arm64.dmg`, `Indent-mac-x64.dmg`, `Indent-windows-x64-setup.exe` and
  `Indent-linux-x86_64.AppImage` and attaches them to a GitHub release. The names carry no version
  on purpose: the site links to `releases/latest/download/<name>` and the app's updater
  (`main/services/updates.ts`) finds its file by name, so do not rename them. The macOS
  apps are signed with the Developer ID and notarized when the repository has the secrets
  `MAC_CERT_P12_BASE64`, `MAC_CERT_PASSWORD`, `APPLE_API_KEY_P8`, `APPLE_API_KEY_ID` and
  `APPLE_API_ISSUER`; without them they are signed ad-hoc and macOS asks to confirm the first open.
- Pull request text is a plain description of the change. No generated-by or tool attribution lines.
- Commit and pull request titles are `type(scope): message` (`feat(editor): ...`, `fix(checks): ...`,
  `chore: ...`). Commits are authored by the repository owner, with no co-author or other trailers.
- Describe everything on its own terms. Never name or allude to another product, course, site or
  codebase that a feature resembles or was modelled on: not in code, comments, commit messages,
  pull request text, docs, or lab content. Lab stories, names and wording are original.

## Code Review Rules

The automated review of each pull request reads this section. Report these as high priority.

- Text that names or alludes to another product, course, site or codebase, anywhere in the change.
- An id or path from the renderer that reaches the file system without `safeId` or `resolveInside`.
- A changed signature in `src/shared/types.ts` with a caller left on the old one.
- A hex, rgb or oklch colour or a Tailwind palette colour in a component. Language logos are the
  one exception.
- A grader message that gives the answer away, an issue whose starter passes a task, or one whose
  solution fails a task.
- Copy a person sees that uses the code's words (lab, chapter, path) instead of the app's (repo,
  issue, roadmap).
- Points, hints or level numbers written anywhere but `src/shared/rules.ts`.
- A change to the files of an issue that leaves a learner's existing workspace without a way forward.
