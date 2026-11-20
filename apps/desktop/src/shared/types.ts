// The contract between content packs, the main process and the renderer.

// ---------- Content ----------

/** content/labs/<labId>/lab.json */
/**
 * How much a repo asks. Easy keeps each issue in one file, medium spreads a change over a few
 * files, hard is a whole project laid out by its own conventions.
 */
export type Level = 'easy' | 'medium' | 'hard'

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
  /** Optional so a pack without one still loads; it then matches no level filter. */
  level?: Level
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
}

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
  points: number
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

export interface WorkspaceSnapshot {
  /** Absolute folder on disk; the terminal opens here. */
  dir: string
  files: WorkspaceFile[]
  /** The issue's starter files by path, to tell which files the learner has changed. */
  starter: Record<string, string>
}

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

export interface RuntimeStatus {
  /** Node version found on the machine, or null. */
  node: string | null
  /** Lab dependencies (vitest, typescript, openai) are installed. */
  ready: boolean
  error?: string
}

/** Something the repos need on this computer, such as Node. */
export interface ToolStatus {
  id: 'node' | 'git'
  label: string
  /** The version found, or null when the tool is missing. */
  version: string | null
  /** Found, and new enough for the repos. */
  ok: boolean
  /** What it is for and what is wrong, in plain words. */
  note: string
  /** The app can download its own copy. */
  installable: boolean
}

// ---------- Progress ----------

export interface TaskProgress {
  passed: boolean
  pointsEarned: number
  passedAt?: string
  lastResult?: CheckResult
}

export interface ChapterProgress {
  /** Checks that were not all green. Drives hint unlocking. */
  nonGreenChecks: number
  tasks: Record<string, TaskProgress>
  startedAt: string
  lastOpenedAt: string
  completedAt?: string
}

export interface DayActivity {
  points: number
  checks: number
  tasksPassed: number
}

export interface ProgressState {
  /** Keyed by `${labId}/${chapterId}`. */
  chapters: Record<string, ChapterProgress>
  /** Keyed by local date, YYYY-MM-DD. */
  activity: Record<string, DayActivity>
  totalPoints: number
  lastOpened?: { labId: string; chapterId: string }
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

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiChatRequest {
  labId: string
  chapterId: string
  messages: AiMessage[]
  /** The main process adds the lesson and tasks itself. */
  activeFile?: WorkspaceFile
  lastCheck?: CheckResult[]
}

export type AiChatEvent =
  | { requestId: string; type: 'delta'; text: string }
  | { requestId: string; type: 'done' }
  | { requestId: string; type: 'error'; message: string }

export interface AiCompleteRequest {
  labId: string
  chapterId: string
  path: string
  prefix: string
  suffix: string
}

// ---------- IPC ----------

type Unsubscribe = () => void

/** window.api. Channels are `${namespace}:${method}`. */
export interface Api {
  content: {
    listLabs(): Promise<LabSummary[]>
    getChapter(labId: string, chapterId: string): Promise<Chapter>
    listPaths(): Promise<PathDef[]>
    /** The recording of one lesson part, named by `narrationKey` of its text; null when there is none. */
    narration(labId: string, chapterId: string, key: string): Promise<Uint8Array | null>
  }
  workspace: {
    /** Creates the folder from the starter files on first open; otherwise reads it from disk. */
    open(labId: string, chapterId: string): Promise<WorkspaceSnapshot>
    writeFile(labId: string, chapterId: string, path: string, content: string): Promise<void>
    /** Restores the starter files. Progress is kept. */
    reset(labId: string, chapterId: string): Promise<WorkspaceSnapshot>
  }
  checks: {
    /** Runs the hidden tests for the given tasks (all when omitted) and records progress. */
    run(
      labId: string,
      chapterId: string,
      taskIds?: string[]
    ): Promise<{ results: CheckResult[]; progress: ProgressState }>
    runtimeStatus(): Promise<RuntimeStatus>
    /** Installs the lab dependencies if needed. */
    ensureRuntime(): Promise<RuntimeStatus>
  }
  progress: {
    get(): Promise<ProgressState>
    /** Records the chapter as opened, creating its progress entry. */
    touch(labId: string, chapterId: string): Promise<ProgressState>
  }
  terminal: {
    create(opts: { labId: string; chapterId: string; cols: number; rows: number }): Promise<string>
    write(id: string, data: string): void
    resize(id: string, cols: number, rows: number): void
    kill(id: string): void
    onData(listener: (id: string, data: string) => void): Unsubscribe
    onExit(listener: (id: string, exitCode: number) => void): Unsubscribe
  }
  tools: {
    status(): Promise<ToolStatus[]>
    /** Downloads Node into the app's own folder. Other programs do not see it. */
    installNode(): Promise<ToolStatus[]>
  }
  github: {
    /** Stars the app's repository with the person's own GitHub CLI. False when that is not possible. */
    star(): Promise<boolean>
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
    /** Sends one tiny fixed prompt through the chosen provider and model; resolves with the reply. */
    test(): Promise<string>
  }
}

/** Methods the preload bridges with ipcRenderer.invoke, per namespace. */
export const INVOKE_METHODS = {
  content: ['listLabs', 'getChapter', 'listPaths', 'narration'],
  workspace: ['open', 'writeFile', 'reset'],
  checks: ['run', 'runtimeStatus', 'ensureRuntime'],
  progress: ['get', 'touch'],
  terminal: ['create'],
  tools: ['status', 'installNode'],
  github: ['star'],
  ai: ['getConfig', 'setConfig', 'setKey', 'chat', 'complete', 'test']
} as const

/** Fire-and-forget renderer to main messages. */
export const SEND_METHODS = {
  terminal: ['write', 'resize', 'kill'],
  ai: ['cancel']
} as const

/** Main to renderer events. */
export const EVENTS = {
  terminalData: 'terminal:data',
  terminalExit: 'terminal:exit',
  aiChat: 'ai:chatEvent'
} as const
