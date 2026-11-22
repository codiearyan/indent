// The contract between content packs, the main process and the renderer.

// ---------- Content ----------

/** A development tool a repo can need on the learner's computer. */
export type ToolId = 'node' | 'git'
export const TOOL_IDS: ToolId[] = ['node', 'git']

/** content/labs/<labId>/lab.json */
/**
 * What a repo is for. Foundations teach a language from the start, one topic and one file per
 * issue. A project builds or fixes one thing over a few issues. A bug hunt is a set of tickets,
 * each a bug to reproduce, fix and cover with a test.
 */
export type Kind = 'foundations' | 'project' | 'bug-hunt'

export interface LabMeta {
  id: string
  title: string
  description: string
  /** Shelf shown as a filter chip, e.g. "AI engineering". */
  category: string
  /** Lowercase language id, e.g. "typescript". Drives the card icon and editor language. */
  language: string
  /** Short labels on the card, e.g. ["TypeScript", "Interview"]. */
  tags: string[]
  /** Missing in a pack written before kinds; it then counts as a project. */
  kind?: Kind
  /** What this repo needs from the app, compared with PACK_FORMAT; 1 when missing. */
  format?: number
  /** Tools it needs on the computer; Node alone when missing. */
  tools?: ToolId[]
  parts: { title: string; chapters: string[] }[]
}

export interface ChapterSummary {
  id: string
  number: number
  title: string
  part: string
  taskCount: number
  points: number
}

export interface LabSummary extends LabMeta {
  chapters: ChapterSummary[]
  /** The repo's own flow.json, on the repo page; missing when it has none or is not on disk. */
  scene?: FlowScene
  /** Missing when the repo is on disk: `download` when it is in the library, `app-update` when it needs a newer app. */
  availability?: 'download' | 'app-update'
}

/** One repo in the library's index.json. */
export interface PackEntry {
  id: string
  /** A hash of the repo's files. */
  version: string
  format: number
  /** The archive, relative to the index. */
  file: string
  size: number
  sha256: string
  /** The cover picture, relative to the index. */
  cover?: string
  summary: LabSummary
}

export interface PackIndex {
  paths: PathDef[]
  labs: PackEntry[]
}

export type InstallFailure = 'offline' | 'missing' | 'damaged' | 'no-space' | 'broken' | 'too-new'

export type InstallResult = { ok: true } | { ok: false; reason: InstallFailure; message: string }

export interface TaskDef {
  id: string
  title: string
  /** The file this task is mostly about. */
  file: string
  /** Markdown. */
  description: string
  /** "Next step": short ordered steps, no answers. */
  nextSteps: string[]
  /** Exactly three, from a light nudge to "almost there". */
  hints: string[]
  /** Official reference pages that explain what the task tests; shown after repeated fails. */
  docs?: DocLink[]
  /** Videos or playlists picked by the author; listed in Resources and after repeated fails. */
  videos?: VideoLink[]
  points: number
}

export interface DocLink {
  title: string
  url: string
}

export interface VideoLink {
  title: string
  /** A youtube.com or youtu.be link to one video or a playlist. */
  url: string
  /** Seconds into a video where it starts and stops; not for playlists. */
  start?: number
  end?: number
}

/** content/labs/<labId>/<chapterId>/chapter.json */
export interface ChapterDef {
  id: string
  title: string
  /** Editor tab order; paths relative to the workspace. */
  files: string[]
  terminal: { description: string; suggestedCommand?: string }
  /** A page of the workspace to show in the Browser panel, e.g. "index.html". */
  preview?: string
  tasks: TaskDef[]
}

export interface Chapter extends ChapterDef {
  labId: string
  labTitle: string
  number: number
  /** lesson.md. `##` headings split it into the parts the audio player reads. */
  lesson: string
  prevChapterId?: string
  nextChapterId?: string
  /** flow.json; missing when the issue has none or it does not pass the checks in flow.ts. */
  flow?: Flow
  /** intro.json; missing when the issue has none or it does not pass the checks in intro.ts. */
  intro?: Intro
}

/** What a box in a flow stands for: a part of the story, a file, a function or a piece of data. */
export type FlowNodeKind = 'story' | 'file' | 'function' | 'data'

export interface FlowNode {
  id: string
  label: string
  kind: FlowNodeKind
  /** The learner's part, the one place a flow uses the brand colour. */
  mine?: boolean
  /** For a function node: the name of the learner's function it stands for, used by tracing. */
  fn?: string
}

export interface FlowEdge {
  from: string
  to: string
  label?: string
}

/** The parts of a system and what goes between them. */
export interface FlowScene {
  nodes: FlowNode[]
  edges: FlowEdge[]
  /** One plain sentence about what this issue or repo changes in the system. */
  note: string
}

/** Example data shown at a step, in the shapes the Patterns views draw. */
export type FlowValue =
  | { kind: 'array'; label?: string; values: (number | string)[] }
  | { kind: 'map'; label?: string; entries: { key: string; value: number | string }[] }
  | {
      kind: 'grid'
      label?: string
      cells: (number | string)[][]
      rowLabels?: string[]
      colLabels?: string[]
    }

export interface FlowStep {
  /** Node ids, and edges written as `from->to`. */
  active: string[]
  value?: FlowValue
  /** What happens at this step, in the story's words; also what a screen reader reads. */
  note: string
}

/** The story's example, run on the learner's code to record the path it takes. */
export interface FlowTrace {
  /** A learner file, relative to the workspace. */
  file: string
  /** An exported function of that file; the `fn` of a node in the scene. */
  call: string
  /** JSON values passed to the call. */
  args: unknown[]
}

export interface TaskFlow {
  steps: FlowStep[]
  trace?: FlowTrace
}

/**
 * <issue>/flow.json, or labs/<labId>/flow.json with only a scene. Data only: it shows what goes
 * in and the shape of what comes out, never a task's answer.
 */
export interface Flow {
  scene: FlowScene
  /** Keyed by task id. */
  tasks?: Record<string, TaskFlow>
}

/** A stop on an intro's road: who asks, what the story has, the learner's part, where the answer is. */
export interface IntroStation {
  title: string
  /** One body per station: what someone says, a sentence, or the rows of a list. */
  say?: string
  text?: string
  rows?: string[][]
  /** The row of `rows` that lights up, counted from 0. */
  mark?: number
  note?: string
  /** The learner's part, the one place an intro uses the brand colour. It has tasks and no body. */
  mine?: boolean
  file?: string
  /** The words in the hole where the learner's station lands. */
  gap?: string
  /** What the learner builds, in a few words each. */
  tasks?: string[]
}

/** What travels the road: a label that ends wrong today and right once the issue is done. */
export interface IntroTicket {
  label: string
  wrong: string
  /** Two words that name the wrong ending, such as "A guess". */
  why: string
  right: string
}

/**
 * <issue>/intro.json: the issue's story in five frames, played at the top of the lesson. Data
 * only; the motion is the app's. It may show how the story's example ends, never code.
 */
export interface Intro {
  stations: IntroStation[]
  ticket: IntroTicket
  /** One per frame: the ask, the problem, your part, done, the whole trip. */
  captions: string[]
}

/** One call of a learner's function, from kit/run-trace.mjs. Values are previews, cut to 160 characters. */
export interface TraceCall {
  fn: string
  /** Relative to the workspace. */
  file: string
  /** 0 for the example's own call, 1 for what it calls, and so on. */
  depth: number
  args: string[]
  /** Set when the call returned; an async call once its promise settled. */
  returned?: string
  /** The message, when the call threw. */
  threw?: string
}

/** A task's example run on the learner's code, with the calls of their functions in order. */
export interface TraceResult {
  /** The example's call returned without throwing. */
  ok: boolean
  calls: TraceCall[]
  error?: string
  timedOut: boolean
  /** More calls happened than were recorded. */
  truncated: boolean
  /** What the learner's code printed, cut like a check's output. */
  stdout: string
}

/** content/paths.json */
export interface PathDef {
  id: string
  title: string
  tagline: string
  description: string
  stages: { title: string; labs: string[] }[]
}

// ---------- Workspace ----------

export interface WorkspaceFile {
  path: string
  content: string
}

/** Where the work would move after a folder was picked. */
export interface FolderMove {
  from: string
  to: string
  /** The picked folder had files, so `to` is a new folder inside it. */
  inside: boolean
  /** Repos with work in the current folder, the ones that can move. */
  repos: RepoInFolder[]
}

export interface RepoInFolder {
  labId: string
  /** Issues of the repo with a workspace in the folder. */
  issues: number
}

export interface FolderMoveProgress {
  /** The repo moving now; null while measuring and while the repo tools move first. */
  labId: string | null
  /** Repos already moved, of `total`. */
  done: number
  total: number
  /** Adding up the size of the work before copying it to another drive. */
  measuring: boolean
  /** Bytes copied so far and in all; both 0 on the same drive, where a move is a quick rename. */
  bytes: number
  totalBytes: number
}

export interface FolderMoveResult {
  root: string
  moved: string[]
  /** The repo that could not move, and why; it and the repos after it stay in the old folder. */
  failed: { labId: string; error: string } | null
}

export interface WorkspaceSnapshot {
  /** Absolute folder on disk; the terminal opens here. */
  dir: string
  files: WorkspaceFile[]
  /** Every folder, `/` between names, so an empty one still shows in the files panel. */
  folders: string[]
  /**
   * The starter files this workspace was given, by path, to tell which files the learner has
   * changed. A workspace from before these were kept gets the issue's current starter.
   */
  starter: Record<string, string>
  /** Starter files the learner changed that a repo update changed too, waiting for a choice. */
  conflicts: string[]
  /** Files this open brought up to the repo's new version. */
  updated: string[]
  /**
   * The workspace knows which starter it was given, so Reset keeps the files the learner added.
   * False for a workspace from before that was kept: Reset empties it.
   */
  remembered: boolean
  /** Starter files that are gone from the workspace. Checks wait until they are back. */
  missing: string[]
}

/** For a conflicted file: keep the learner's version, or replace it with the new one. */
export type ConflictChoice = 'mine' | 'new'

// ---------- Checks ----------

export interface CheckDetail {
  name: string
  passed: boolean
  /** Plain words: what to look at. Never the answer. */
  message?: string
  /** What the learner's code actually produced. */
  output?: string
}

export interface CheckResult {
  taskId: string
  passed: boolean
  details: CheckDetail[]
  durationMs: number
  at: string
  /** Set when the check could not run at all (Node missing, runtime install failed, timeout). */
  error?: string
}

/** Why the repo tools could not be installed, also sent with usage stats. */
export type RuntimeFailure = 'offline' | 'no-space' | 'no-npm' | 'npm-failed' | 'slow' | 'failed'

export interface RuntimeStatus {
  /** Node version found on the machine, or null. */
  node: string | null
  /** Lab dependencies (vitest, typescript, openai) are installed. */
  ready: boolean
  /** They are being installed now. */
  installing?: boolean
  /** How much of the download is done, 0 to 1, while installing. */
  progress?: number
  error?: string
  /** What went wrong in full, such as the end of the npm output, when the install failed. */
  details?: string
  /** False when trying again cannot help. */
  retry?: boolean
  /** Set by the install that just ended: how it failed, or how the tools came when ready. */
  failure?: RuntimeFailure
  via?: 'download' | 'npm'
}

/** Something the repos need on this computer, such as Node. */
export interface LabModelStatus {
  state: 'starting' | 'running' | 'failed'
  /** Why it is not running, in plain words. */
  reason?: string
  /** It cannot start until Node.js is there. */
  nodeMissing?: boolean
}

/** A Node.js found on the computer that the repos could run with. */
export interface NodeOption {
  bin: string
  version: string
  /** Where it comes from: "nvm", "Homebrew", "the app's copy", "on this computer". */
  source: string
  /** 22.18 or newer. */
  supported: boolean
}

/** Where the app's own update is. */
export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'current'; version: string }
  | { state: 'available'; version: string; notes: string[]; size: number }
  | { state: 'downloading'; version: string; done: number; size: number }
  | { state: 'ready'; version: string }
  | { state: 'failed'; message: string; version?: string }

export interface ToolInstallResult {
  tools: ToolStatus[]
  /** An installer opened in its own window; the person finishes it there, then checks again. */
  waiting?: boolean
  /** Nothing here can install it; the page to get it by hand. */
  url?: string
}

export interface ToolStatus {
  id: ToolId
  label: string
  /** The version found, or null when the tool is missing. */
  version: string | null
  /** Found, and new enough for the repos. */
  ok: boolean
  /** What it is for and what is wrong, in plain words. */
  note: string
  /** The app can install it here: its own download for Node, the system's installer for others. */
  installable: boolean
  /** Where to get it by hand when the app can't install it. */
  url?: string
}

// ---------- Progress ----------

export interface TaskProgress {
  passed: boolean
  pointsEarned: number
  passedAt?: string
  lastResult?: CheckResult
  /** Checks of this task that ran and failed. */
  failedChecks?: number
  /** How often each named check of the task failed. */
  failedNames?: Record<string, number>
  /** A short note from the AI after repeated fails; written once. */
  tip?: string
  /** The highest hint the learner opened; missing when none. */
  hintsShown?: number
}

export interface ChapterProgress {
  /** Checks that were not all green. Drives hint unlocking. */
  nonGreenChecks: number
  tasks: Record<string, TaskProgress>
  startedAt: string
  lastOpenedAt: string
  completedAt?: string
  /** Checks run on this issue; missing in progress saved before it was counted. */
  checks?: number
}

export interface DayActivity {
  points: number
  checks: number
  tasksPassed: number
  /** The daily goal in tasks while this day was played; missing means 1. */
  goal?: number
  /** A streak freeze covered this day. */
  frozen?: boolean
}

export type MilestoneId =
  'first-task' | 'first-issue' | 'first-repo' | 'streak-7' | 'streak-30' | 'streak-100' | 'roadmap'

export interface ProgressState {
  /** Keyed by `${labId}/${chapterId}`. */
  chapters: Record<string, ChapterProgress>
  /** Keyed by local date, YYYY-MM-DD. */
  activity: Record<string, DayActivity>
  totalPoints: number
  lastOpened?: { labId: string; chapterId: string }
  /** Tasks a day that keep the streak; missing means 1. */
  dailyGoal?: number
  /** The local date (YYYY-MM-DD) each milestone was reached. */
  milestones?: Partial<Record<MilestoneId, string>>
}

export interface ProgressSummary {
  totalPoints: number
  tasksPassed: number
}

/** A picked backup next to the progress on this computer, shown before it is replaced. */
export interface ProgressImport {
  /** Name of the picked file, without its folder. */
  file: string
  current: ProgressSummary
  incoming: ProgressSummary
  /** Issues whose code the file holds; 0 for a progress-only file. */
  issues: number
  hasSettings: boolean
}

export interface BackupRestored {
  progress: ProgressState
  /** The renderer's settings from the backup, still to be checked; null when it had none. */
  app: Record<string, unknown> | null
}

// ---------- AI ----------

/** CLI providers reuse a login the learner already has; API providers use a stored key. */
export type AiProviderId =
  'claude-code' | 'codex' | 'opencode' | 'gemini-cli' | 'anthropic' | 'openai' | 'gemini'

export interface AiProviderInfo {
  id: AiProviderId
  label: string
  kind: 'cli' | 'api'
  /** CLI found on this machine, or an API key is stored. */
  available: boolean
  /** Version or path for a CLI, masked key for an API provider, or why it is unavailable. */
  detail?: string
  models: string[]
}

export type SuggestionMode = 'off' | 'manual' | 'auto'

export interface AiConfig {
  /** Off means no AI anywhere: no tutor, no suggestions, and main refuses AI calls. */
  enabled: boolean
  provider: AiProviderId | null
  model: string | null
  /** Grey inline suggestions in the editor: never, when asked with a shortcut, or after a pause. */
  suggestions: SuggestionMode
  /** Offer the tutor right under a task whose check just failed. */
  nudge: boolean
  providers: AiProviderInfo[]
}

/** The parts of AiConfig the renderer may change. */
export type AiSettingsPatch = Partial<
  Pick<AiConfig, 'enabled' | 'provider' | 'model' | 'suggestions' | 'nudge'>
>

/** Code, a check, a hint or terminal output the learner sends with a question; shown in the chat too. */
export interface AiAttachment {
  kind: 'code' | 'check' | 'hint' | 'terminal'
  /** What it is, e.g. `orders.js, lines 3 to 7` or `Check: sorts by units`. */
  label: string
  text: string
  /** Fence language for code, e.g. `js`. */
  language?: string
}

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
  attachment?: AiAttachment
}

export interface AiChatRequest {
  labId: string
  chapterId: string
  messages: AiMessage[]
  /** The main process adds the lesson and tasks itself. */
  activeFile?: WorkspaceFile
  lastCheck?: CheckResult[]
  /** What the learner said in setup; the main process adds their progress itself. */
  learner?: LearnerPrefs
}

export interface LearnerPrefs {
  experience?: 'new' | 'some' | 'experienced'
  learnFirst?: 'reading' | 'videos'
}

export type AiChatEvent =
  | { requestId: string; type: 'delta'; text: string }
  | { requestId: string; type: 'done' }
  | { requestId: string; type: 'error'; message: string }

/** The task a suggestion helps with: what the learner reads, never its hints or solution. */
export interface AiCompletionTask {
  title: string
  description: string
  /** Names of the task's checks that failed on its latest run. */
  failing: string[]
}

export interface AiCompleteRequest {
  labId: string
  chapterId: string
  path: string
  prefix: string
  suffix: string
  task?: AiCompletionTask
}

// ---------- Reminders ----------

/** 0 is Sunday, as `Date.getDay()` counts. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface PracticeSchedule {
  /** No days means no schedule. */
  days: Weekday[]
  /** Local time, `HH:MM`. */
  time: string
  /** How long a session is meant to be; only used in the reminder text and the calendar event. */
  minutes: number | null
  /** Send a notification at the session time. Off keeps the schedule, for the calendar and Home. */
  notify: boolean
}

export interface ReminderSettings {
  schedule: PracticeSchedule
  /** Keep running in the tray or menu bar when the window closes. */
  tray: boolean
  /** Start in the background at login. */
  openAtLogin: boolean
}

export interface ReminderConfig extends ReminderSettings {
  /** macOS waits for the person to allow the login item in System Settings. */
  loginNeedsApproval: boolean
}

/** `blocked`: the system did not show it, most likely because notifications are off for the app. */
export type ReminderTestResult = { ok: true } | { ok: false; reason: 'unsupported' | 'blocked' }

// ---------- IPC ----------

type Unsubscribe = () => void

// ---------- Usage stats ----------

/** Anonymous usage events. Not sent when usage stats are turned off in Settings. */
export type TelemetryEvent =
  | 'app_opened'
  | 'onboarding_step'
  | 'onboarding_finished'
  | 'repo_started'
  | 'repo_downloaded'
  | 'repo_download_failed'
  | 'check_run'
  | 'hints_unlocked'
  | 'issue_completed'
  | 'tutor_asked'
  | 'suggestion_requested'
  | 'tool_missing'
  | 'tool_install'
  | 'repo_tools_install'

/** Ids, counts and choices only: never code, file names, messages or keys. */
export type TelemetryProps = Record<string, string | number>

/** window.api. Channels are `${namespace}:${method}`. */
/** An IDE found on this computer that an issue's folder can be opened in. */
export interface IdeInfo {
  id: string
  label: string
}

export interface Api {
  content: {
    listLabs(): Promise<LabSummary[]>
    getChapter(labId: string, chapterId: string): Promise<Chapter>
    listPaths(): Promise<PathDef[]>
    /** The recording of one lesson part, named by `narrationKey` of its text; null when there is none. */
    narration(labId: string, chapterId: string, key: string): Promise<Uint8Array | null>
    /** Downloads a repo from the library, or a newer version of it. */
    install(labId: string): Promise<InstallResult>
    /** Download progress of a repo, from 0 to 1. */
    onInstallProgress(listener: (labId: string, done: number) => void): Unsubscribe
    /** The list of repos or roadmaps changed: a newer index, an install or an update. */
    onChanged(listener: () => void): Unsubscribe
    /** The learner left the issues; a repo skipped while it was open may update now. */
    leave(): void
  }
  ide: {
    /** The IDEs found on this computer, in the order they are offered. */
    list(): Promise<IdeInfo[]>
    /** Opens an issue's folder in one of them. Rejects with a plain reason when it does not open. */
    open(ideId: string, labId: string, chapterId: string): Promise<void>
    /** Makes the window narrow enough to sit beside an IDE, or gives it its size back. */
    setCompact(compact: boolean): Promise<void>
  }
  workspace: {
    /** Creates the folder from the starter files on first open; otherwise reads it from disk. */
    open(labId: string, chapterId: string): Promise<WorkspaceSnapshot>
    writeFile(labId: string, chapterId: string, path: string, content: string): Promise<void>
    /** Restores the starter files. Files the learner added and progress are kept. */
    reset(labId: string, chapterId: string): Promise<WorkspaceSnapshot>
    /** Copies back the starter files listed in `missing` and touches nothing else. */
    restoreMissing(labId: string, chapterId: string): Promise<WorkspaceSnapshot>
    /** Settles one file listed in `conflicts`. */
    resolveConflict(
      labId: string,
      chapterId: string,
      path: string,
      choice: ConflictChoice
    ): Promise<WorkspaceSnapshot>
    /** Makes an empty file. Paths are relative to the workspace, `/` between folders. */
    createFile(labId: string, chapterId: string, path: string): Promise<WorkspaceSnapshot>
    /** Makes an empty folder. */
    createFolder(labId: string, chapterId: string, path: string): Promise<WorkspaceSnapshot>
    /** Renames or moves a file, or a folder with what is in it. */
    rename(labId: string, chapterId: string, from: string, to: string): Promise<WorkspaceSnapshot>
    /** Deletes a file, or a folder with everything in it. */
    remove(labId: string, chapterId: string, path: string): Promise<WorkspaceSnapshot>
    /** The folder that holds every workspace. */
    getRoot(): Promise<string>
    /** Asks for a folder and says where the work would go; null when cancelled. */
    pickRoot(): Promise<FolderMove | null>
    /**
     * Makes the folder the last pickRoot approved the work folder and moves the repos `labIds`
     * there, one at a time. The others stay in the old folder, which is remembered.
     */
    moveRoot(labIds: string[]): Promise<FolderMoveResult>
    onMoveProgress(listener: (progress: FolderMoveProgress) => void): Unsubscribe
    /** The earlier work folder that holds this issue's work, when the current one does not. */
    findElsewhere(labId: string, chapterId: string): Promise<string | null>
    /** Moves the repo's work from the earlier folder that holds this issue into the current one. */
    bringBack(labId: string, chapterId: string): Promise<void>
  }
  checks: {
    /** Runs the hidden tests for the given tasks (all when omitted) and records progress. */
    run(
      labId: string,
      chapterId: string,
      taskIds?: string[]
    ): Promise<{ results: CheckResult[]; progress: ProgressState }>
    /** Runs the example in the task's flow on the learner's code and records their calls. */
    trace(labId: string, chapterId: string, taskId: string): Promise<TraceResult>
    runtimeStatus(): Promise<RuntimeStatus>
    /** Installs the lab dependencies if needed. */
    ensureRuntime(): Promise<RuntimeStatus>
    /** The runtime started or finished installing, or failed to. */
    onRuntime(listener: (status: RuntimeStatus) => void): Unsubscribe
  }
  progress: {
    get(): Promise<ProgressState>
    /** Records the chapter as opened, creating its progress entry. */
    touch(labId: string, chapterId: string): Promise<ProgressState>
    /** Records that hint `hint` (from 1) of a task was shown. */
    showHint(labId: string, chapterId: string, taskId: string, hint: number): Promise<ProgressState>
    /** Sets how many tasks a day keep the streak: one of DAILY_GOALS. */
    setDailyGoal(goal: number): Promise<ProgressState>
  }
  backup: {
    /**
     * Asks where to save and writes one file with the progress, the code of every issue and the
     * settings (`app` are the renderer's own). The file's path, or null when cancelled.
     */
    exportFile(app: Record<string, unknown>): Promise<string | null>
    /** Asks for a backup or an older progress file and reads it. Null when cancelled. */
    pickImport(): Promise<ProgressImport | null>
    /** Restores the last picked file. What it replaces is kept aside on disk, never deleted. */
    applyImport(): Promise<BackupRestored>
  }
  terminal: {
    create(opts: { labId: string; chapterId: string; cols: number; rows: number }): Promise<string>
    write(id: string, data: string): void
    resize(id: string, cols: number, rows: number): void
    kill(id: string): void
    onData(listener: (id: string, data: string) => void): Unsubscribe
    onExit(listener: (id: string, exitCode: number) => void): Unsubscribe
  }
  updates: {
    status(): Promise<UpdateStatus>
    /** Looks for a newer release. */
    check(): Promise<UpdateStatus>
    /** Downloads the release file for this computer; progress comes through onStatus. */
    download(): Promise<UpdateStatus>
    cancel(): Promise<void>
    /** Quits, installs the update and opens the app again. A downloaded update also goes in on quit. */
    install(): Promise<UpdateStatus>
    onStatus(listener: (status: UpdateStatus) => void): Unsubscribe
  }
  tools: {
    status(): Promise<ToolStatus[]>
    /** Downloads Node into the app's own folder. Other programs do not see it. */
    /** Installs a missing tool for the learner. Node reports its download through onInstallProgress. */
    install(id: ToolId): Promise<ToolInstallResult>
    /** Stops the Node download. */
    cancelInstall(): Promise<void>
    onInstallProgress(listener: (id: ToolId, done: number) => void): Unsubscribe
    /** Every Node found, and the one picked; null picked means automatic. */
    nodeOptions(): Promise<{ options: NodeOption[]; picked: string | null }>
    /** Picks a Node from nodeOptions, or null for automatic. */
    pickNode(bin: string | null): Promise<ToolStatus[]>
    /** Whether the local model runs, and why not. */
    labModel(): Promise<LabModelStatus>
    /** Starts the local model again; resolves with its status a few seconds later at most. */
    restartLabModel(): Promise<LabModelStatus>
  }
  github: {
    /** Stars the app's repository with the person's own GitHub CLI. False when that is not possible. */
    star(): Promise<boolean>
    /** Whether the person's GitHub account already starred it; null when that can't be told. */
    starred(): Promise<boolean | null>
  }
  ai: {
    getConfig(): Promise<AiConfig>
    setConfig(patch: AiSettingsPatch): Promise<AiConfig>
    /** Stores or (with null) removes an API key. */
    setKey(provider: AiProviderId, key: string | null): Promise<AiConfig>
    /** Starts a streamed reply; events arrive on onChatEvent with the returned request id. */
    chat(request: AiChatRequest): Promise<string>
    cancel(requestId: string): void
    onChatEvent(listener: (event: AiChatEvent) => void): Unsubscribe
    /** One inline suggestion for the cursor position; empty string when there is none. */
    complete(request: AiCompleteRequest): Promise<string>
    /** Stops the suggestion being written; its complete() resolves with an empty string. */
    cancelComplete(): void
    /** Sends one tiny fixed prompt through the chosen provider and model; resolves with the reply. */
    test(): Promise<string>
    /** Writes a tip for a task that keeps failing and saves it; resolves with the progress. */
    tip(labId: string, chapterId: string, taskId: string): Promise<ProgressState>
  }
  telemetry: {
    track(event: TelemetryEvent, props?: TelemetryProps): void
  }
  reminders: {
    get(): Promise<ReminderConfig>
    set(patch: Partial<ReminderSettings>): Promise<ReminderConfig>
    /** Shows a reminder now, with the text the schedule would send. */
    test(): Promise<ReminderTestResult>
    /** Asks where to save the schedule as a repeating calendar event. The path, or null when cancelled. */
    saveCalendar(): Promise<string | null>
  }
}

/** Methods the preload bridges with ipcRenderer.invoke, per namespace. */
export const INVOKE_METHODS = {
  content: ['listLabs', 'getChapter', 'listPaths', 'narration', 'install'],
  workspace: [
    'open',
    'writeFile',
    'reset',
    'restoreMissing',
    'resolveConflict',
    'createFile',
    'createFolder',
    'rename',
    'remove',
    'getRoot',
    'pickRoot',
    'moveRoot',
    'findElsewhere',
    'bringBack'
  ],
  ide: ['list', 'open', 'setCompact'],
  checks: ['run', 'trace', 'runtimeStatus', 'ensureRuntime'],
  progress: ['get', 'touch', 'showHint', 'setDailyGoal'],
  backup: ['exportFile', 'pickImport', 'applyImport'],
  terminal: ['create'],
  updates: ['status', 'check', 'download', 'cancel', 'install'],
  tools: [
    'status',
    'install',
    'cancelInstall',
    'nodeOptions',
    'pickNode',
    'labModel',
    'restartLabModel'
  ],
  github: ['star', 'starred'],
  ai: ['getConfig', 'setConfig', 'setKey', 'chat', 'complete', 'test', 'tip'],
  reminders: ['get', 'set', 'test', 'saveCalendar']
} as const

/** Fire-and-forget renderer to main messages. */
export const SEND_METHODS = {
  content: ['leave'],
  terminal: ['write', 'resize', 'kill'],
  ai: ['cancel', 'cancelComplete'],
  telemetry: ['track']
} as const

/** Main to renderer events. */
export const EVENTS = {
  terminalData: 'terminal:data',
  terminalExit: 'terminal:exit',
  aiChat: 'ai:chatEvent',
  contentInstall: 'content:installProgress',
  contentChanged: 'content:changed',
  runtime: 'checks:runtime',
  folderMove: 'workspace:moveProgress',
  toolInstall: 'tools:installProgress',
  update: 'updates:status'
} as const
