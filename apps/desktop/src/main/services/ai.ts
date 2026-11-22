import { safeStorage } from 'electron'
import { randomUUID } from 'crypto'
import { existsSync } from 'fs'
import { copyFile, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type {
  AiChatEvent,
  AiChatRequest,
  AiCompleteRequest,
  AiConfig,
  AiProviderId,
  AiProviderInfo,
  ChapterDef,
  LabMeta,
  ProgressState,
  WorkspaceFile
} from '@shared/types'
import { EVENTS } from '@shared/types'
import { FAILS_BEFORE_TIP, chapterKey } from '@shared/rules'
import { emit, handle, listen } from '../ipc'
import { refreshShellPath, shellEnv } from '../labEnv'
import { chapterContentDir, dataFile, ownOpencodeBin, workspaceDir } from '../paths'
import { getProgress, saveTip } from './progress'
import { resolveInside } from './workspaceFiles'
import { CLI_BINS, cliModels, cliVersion, runCli, which } from './ai/cli'
import { GEMINI_URL, OPENAI_URL, anthropicStream, openAiCompatibleStream } from './ai/http'
import type { CliProviderId } from './ai/parsers'
import { learnerContext } from './ai/learner'
import { freeModel } from './ai/opencodeBuild'
import { installOpencode, removeOpencode } from './ai/opencodeInstall'
import {
  COMPLETION_RULES,
  TIP_RULES,
  cleanCompletion,
  cleanTip,
  completionPrompt,
  completionTask,
  maskKey,
  tipPrompt,
  transcript,
  trimHistory,
  tutorSystemPrompt
} from './ai/prompt'
import { readSettings, suggestionMode, withKey, type AiSettings } from './ai/settings'

type ApiProviderId = Exclude<AiProviderId, CliProviderId>

const CLI_PROVIDERS: { id: CliProviderId; label: string }[] = [
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'codex', label: 'Codex' },
  { id: 'opencode', label: 'OpenCode' },
  { id: 'gemini-cli', label: 'Gemini CLI' }
]

/** The first model is the default for chat; `fast` is used for inline suggestions. */
const API_PROVIDERS: { id: ApiProviderId; label: string; models: string[]; fast: string }[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    models: ['claude-fable-5-2', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
    fast: 'claude-haiku-5-5'
  },
  {
    id: 'openai',
    label: 'OpenAI',
    models: ['gpt-6.2-astra', 'gpt-6.2-sol', 'gpt-6.1-terra', 'gpt-6-luna'],
    fast: 'gpt-6-luna'
  },
  {
    id: 'gemini',
    label: 'Gemini',
    models: ['gemini-3.8-flash', 'gemini-4-carbon', 'gemini-3.5-flash-lite'],
    fast: 'gemini-3.5-flash-lite'
  }
]

const CLI_FAST_MODEL: Partial<Record<CliProviderId, string>> = { 'claude-code': 'haiku' }

const CHAT_TIMEOUT_MS = 120_000
const AI_OFF = 'AI is off. Turn it on from the tutor or in Settings.'
// A CLI starts a whole agent before it answers, so it gets longer than an HTTP call.
const TEST_TIMEOUT_MS = { cli: 45_000, api: 20_000 }
const COMPLETE_TIMEOUT_MS = { cli: 20_000, api: 8_000 }

const settingsFile = (): string => dataFile('ai.json')
const keysFile = (): string => dataFile('ai-keys.bin')

let settings: AiSettings | undefined
let keys: Partial<Record<ApiProviderId, string>> | undefined
let detected: Promise<AiProviderInfo[]> | undefined
const cliPaths = new Map<AiProviderId, string>()

async function loadSettings(): Promise<AiSettings> {
  if (settings) return settings
  try {
    settings = readSettings(JSON.parse(await readFile(settingsFile(), 'utf8')))
  } catch {
    settings = readSettings({})
  }
  return settings
}

async function saveSettings(): Promise<void> {
  await writeFile(settingsFile(), JSON.stringify(settings, null, 2))
}

async function loadKeys(): Promise<Partial<Record<ApiProviderId, string>>> {
  if (!keys) {
    try {
      keys = JSON.parse(safeStorage.decryptString(await readFile(keysFile())))
    } catch {
      keys = {}
    }
  }
  return keys ?? {}
}

function detectClis(): Promise<AiProviderInfo[]> {
  detected = (async () => {
    refreshShellPath()
    const env = await shellEnv()
    return Promise.all(
      CLI_PROVIDERS.map(async ({ id, label }): Promise<AiProviderInfo> => {
        let path = await which(CLI_BINS[id], env.PATH ?? '')
        // The learner's own OpenCode wins; the app's copy is used only when there is none.
        const managed = !path && id === 'opencode' && existsSync(ownOpencodeBin())
        if (managed) path = ownOpencodeBin()
        if (!path) {
          cliPaths.delete(id)
          return { id, label, kind: 'cli', available: false, detail: 'Not installed', models: [] }
        }
        cliPaths.set(id, path)
        const [detail, models] = await Promise.all([
          cliVersion(path, env),
          cliModels(id, path, env)
        ])
        const bin = managed ? path : undefined
        return { id, label, kind: 'cli', available: true, detail, models, managed, bin }
      })
    )
  })()
  return detected
}

/** `fresh` looks for CLIs again; otherwise the last detection is reused, since spawning is slow. */
async function providerList(fresh: boolean): Promise<AiProviderInfo[]> {
  const [clis, stored] = await Promise.all([
    fresh || !detected ? detectClis() : detected,
    loadKeys()
  ])
  const apis = API_PROVIDERS.map(({ id, label, models }): AiProviderInfo => {
    const key = stored[id]
    return {
      id,
      label,
      kind: 'api',
      available: !!key,
      detail: key ? maskKey(key) : undefined,
      models
    }
  })
  return [...clis, ...apis]
}

async function buildConfig(fresh = false): Promise<AiConfig> {
  const saved = await loadSettings()
  // With AI off nothing is looked for, so no CLI is started on the learner's behalf.
  const providers = saved.enabled ? await providerList(fresh) : []
  const chosen = providers.find((p) => p.id === saved.provider && p.available)
  const active = chosen ?? providers.find((p) => p.available) ?? null
  let model = chosen ? saved.model : null
  if (!model && active?.kind === 'api') model = active.models[0]
  return {
    enabled: saved.enabled,
    provider: active?.id ?? null,
    model,
    suggestions: saved.suggestions,
    nudge: saved.nudge,
    providers
  }
}

interface Reply {
  system: string
  messages: AiChatRequest['messages']
  quick: boolean
  signal: AbortSignal
  onDelta(text: string): void
}

async function streamReply(config: AiConfig, reply: Reply): Promise<void> {
  if (!config.provider)
    throw new Error('No AI provider is set up yet. Open AI settings to pick one.')
  const apiDef = API_PROVIDERS.find((p) => p.id === config.provider)
  if (apiDef) {
    const key = (await loadKeys())[apiDef.id] ?? ''
    const model = reply.quick ? apiDef.fast : (config.model ?? apiDef.models[0])
    const run = { ...reply, key, model }
    if (apiDef.id === 'anthropic') return anthropicStream(run)
    return openAiCompatibleStream(apiDef.id === 'openai' ? OPENAI_URL : GEMINI_URL, run)
  }
  const id = config.provider as CliProviderId
  return runCli({
    provider: id,
    path: cliPaths.get(id) ?? CLI_BINS[id],
    model: (reply.quick && CLI_FAST_MODEL[id]) || config.model,
    system: reply.system,
    prompt: transcript(reply.messages),
    env: await shellEnv(),
    signal: reply.signal,
    onDelta: reply.onDelta
  })
}

/** The repo's lab.json; null when it cannot be read, so the chat still works without it. */
async function loadLab(labId: string, chapterId: string): Promise<LabMeta | null> {
  const file = join(dirname(chapterContentDir(labId, chapterId)), 'lab.json')
  return readFile(file, 'utf8').then(
    (text) => JSON.parse(text) as LabMeta,
    () => null
  )
}

async function loadChapter(labId: string, chapterId: string): Promise<[ChapterDef, string]> {
  const dir = chapterContentDir(labId, chapterId)
  const [chapter, lesson] = await Promise.all([
    readFile(join(dir, 'chapter.json'), 'utf8'),
    readFile(join(dir, 'lesson.md'), 'utf8')
  ])
  return [JSON.parse(chapter) as ChapterDef, lesson]
}

const chats = new Map<string, AbortController>()
let completion: AbortController | undefined
let testing: AbortController | undefined
const tips = new Map<string, AbortController>()

function stopEverything(): void {
  for (const chat of chats.values()) chat.abort()
  for (const tip of tips.values()) tip.abort()
  completion?.abort()
  testing?.abort()
}

let opencodeInstall: AbortController | undefined

/** Installs the app's OpenCode, then picks it with a free model so AI works right away. */
async function setUpOpencode(): Promise<AiConfig> {
  if (opencodeInstall) throw new Error('OpenCode is already being installed.')
  const cancel = (opencodeInstall = new AbortController())
  try {
    await installOpencode(cancel.signal, (done) => emit(EVENTS.aiInstall, done))
  } finally {
    opencodeInstall = undefined
  }
  const opencode = (await providerList(true)).find((p) => p.id === 'opencode')
  settings = { ...(await loadSettings()), enabled: true, provider: 'opencode', model: null }
  if (opencode?.managed) settings.model = freeModel(opencode.models)
  await saveSettings()
  return buildConfig()
}

/** Deletes the app's OpenCode; the learner's own copy, if any, is left alone and stays picked. */
async function removeOwnOpencode(): Promise<AiConfig> {
  await removeOpencode()
  const opencode = (await providerList(true)).find((p) => p.id === 'opencode')
  const current = await loadSettings()
  if (current.provider === 'opencode' && !opencode?.available) {
    settings = { ...current, provider: null, model: null }
    await saveSettings()
  }
  return buildConfig()
}

function send(event: AiChatEvent): void {
  emit(EVENTS.aiChat, event)
}

async function runChat(
  requestId: string,
  request: AiChatRequest,
  cancel: AbortController
): Promise<void> {
  const timeout = AbortSignal.timeout(CHAT_TIMEOUT_MS)
  try {
    const [[chapter, lesson], progress, lab] = await Promise.all([
      loadChapter(request.labId, request.chapterId),
      getProgress(),
      loadLab(request.labId, request.chapterId)
    ])
    const messages = trimHistory(request.messages)
    if (messages[messages.length - 1]?.role !== 'user') throw new Error('Ask a question first.')
    await streamReply(await buildConfig(), {
      system: tutorSystemPrompt({
        chapter,
        lesson,
        activeFile: request.activeFile,
        lastCheck: request.lastCheck,
        progress: progress.chapters[chapterKey(request.labId, request.chapterId)],
        learner: lab
          ? learnerContext(progress, request.labId, lab, chapter, request.learner)
          : undefined
      }),
      messages,
      quick: false,
      signal: AbortSignal.any([cancel.signal, timeout]),
      onDelta: (text) => send({ requestId, type: 'delta', text })
    })
    send({ requestId, type: 'done' })
  } catch (error) {
    if (cancel.signal.aborted) return send({ requestId, type: 'done' })
    const message = timeout.aborted
      ? 'No reply within two minutes. Try again or pick another provider.'
      : error instanceof Error
        ? error.message
        : String(error)
    send({ requestId, type: 'error', message })
  } finally {
    chats.delete(requestId)
  }
}

async function complete(request: AiCompleteRequest): Promise<string> {
  if (!(await loadSettings()).enabled) throw new Error(AI_OFF)
  completion?.abort()
  const cancel = new AbortController()
  completion = cancel
  try {
    const config = await buildConfig()
    const provider = config.providers.find((p) => p.id === config.provider)
    if (config.suggestions === 'off' || !provider) return ''
    let text = ''
    await streamReply(config, {
      system: COMPLETION_RULES,
      messages: [
        {
          role: 'user',
          content: completionPrompt(
            String(request.path).slice(0, 200),
            String(request.prefix).slice(-4000),
            String(request.suffix).slice(0, 1000),
            completionTask(request.task)
          )
        }
      ],
      quick: true,
      signal: AbortSignal.any([
        cancel.signal,
        AbortSignal.timeout(COMPLETE_TIMEOUT_MS[provider.kind])
      ]),
      onDelta: (delta) => {
        text += delta
      }
    })
    return cancel.signal.aborted ? '' : cleanCompletion(text, String(request.prefix))
  } catch {
    return ''
  } finally {
    if (completion === cancel) completion = undefined
  }
}

async function testConnection(): Promise<string> {
  const config = await buildConfig()
  if (!config.enabled) throw new Error(AI_OFF)
  const provider = config.providers.find((p) => p.id === config.provider)
  if (!provider) throw new Error('No AI provider is set up yet.')
  const limit = TEST_TIMEOUT_MS[provider.kind]
  const timeout = AbortSignal.timeout(limit)
  testing?.abort()
  const cancel = (testing = new AbortController())
  let text = ''
  try {
    await streamReply(config, {
      system: 'You check that a connection works. Answer in one short sentence.',
      messages: [{ role: 'user', content: 'Greet a learner in five words or fewer.' }],
      quick: false,
      signal: AbortSignal.any([timeout, cancel.signal]),
      onDelta: (delta) => {
        text += delta
      }
    })
  } catch (error) {
    if (timeout.aborted)
      throw new Error(`No reply within ${limit / 1000} seconds.`, { cause: error })
    throw error
  } finally {
    if (testing === cancel) testing = undefined
  }
  const reply = text.trim().replace(/\s+/g, ' ').slice(0, 200)
  if (!reply) throw new Error(`${provider.label} answered with nothing.`)
  return reply
}

async function readTaskFile(
  labId: string,
  chapterId: string,
  path: string
): Promise<WorkspaceFile | undefined> {
  try {
    const content = await readFile(resolveInside(workspaceDir(labId, chapterId), path), 'utf8')
    return { path, content }
  } catch {
    return undefined
  }
}

/**
 * Writes the one tip a task gets once it has failed FAILS_BEFORE_TIP checks, and saves it. Does
 * nothing (and resolves with the progress as it is) when AI is off or the task needs no tip.
 */
async function tip(labId: string, chapterId: string, taskId: string): Promise<ProgressState> {
  const [state, config, [chapter]] = await Promise.all([
    getProgress(),
    buildConfig(),
    loadChapter(labId, chapterId)
  ])
  const key = `${chapterKey(labId, chapterId)}/${taskId}`
  const task = chapter.tasks.find((t) => t.id === taskId)
  const progress = state.chapters[chapterKey(labId, chapterId)]?.tasks[taskId]
  const provider = config.providers.find((p) => p.id === config.provider)
  const due = progress && !progress.passed && !progress.tip
  if (!config.enabled || !provider || !task || !due || tips.has(key)) return state
  if ((progress.failedChecks ?? 0) < FAILS_BEFORE_TIP) return state
  const cancel = new AbortController()
  tips.set(key, cancel)
  try {
    let text = ''
    await streamReply(config, {
      system: TIP_RULES,
      messages: [
        {
          role: 'user',
          content: tipPrompt(task, progress, await readTaskFile(labId, chapterId, task.file))
        }
      ],
      quick: false,
      signal: AbortSignal.any([cancel.signal, AbortSignal.timeout(TEST_TIMEOUT_MS[provider.kind])]),
      onDelta: (delta) => {
        text += delta
      }
    })
    // Turning AI off mid-way stops the tip, and a stopped tip is never saved.
    if (cancel.signal.aborted) return state
    const written = cleanTip(text)
    return written ? await saveTip(labId, chapterId, taskId, written) : state
  } catch (error) {
    if (cancel.signal.aborted) return state
    throw error
  } finally {
    tips.delete(key)
  }
}

export const savedAiChoice = (): Promise<AiSettings> => loadSettings()

/** Takes the AI choice from a backup. A provider this version does not know is left unpicked. */
export async function restoreAiChoice(saved: unknown): Promise<void> {
  const next = readSettings(saved)
  if (![...CLI_PROVIDERS, ...API_PROVIDERS].some((p) => p.id === next.provider)) {
    next.provider = null
    next.model = null
  }
  if (next.model?.startsWith('-')) next.model = null
  // Kept aside like the progress, so the choice made on this computer can be recovered.
  await copyFile(settingsFile(), `${settingsFile()}.replaced-${Date.now()}`).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error
    }
  )
  settings = next
  await saveSettings()
  if (!next.enabled) stopEverything()
}

export function register(): void {
  handle('ai', {
    getConfig: () => buildConfig(true),

    setConfig: async (patch) => {
      const current = await loadSettings()
      const next = { ...current }
      if (patch.provider !== undefined && patch.provider !== current.provider) {
        next.provider = patch.provider
        next.model = null
      }
      // The model is passed to a CLI as an argument; it must not read as a flag.
      if (patch.model?.startsWith('-')) throw new Error('That is not a model name.')
      if (patch.model !== undefined) next.model = patch.model || null
      if (patch.suggestions !== undefined) next.suggestions = suggestionMode(patch.suggestions)
      if (patch.enabled !== undefined) next.enabled = !!patch.enabled
      if (patch.nudge !== undefined) next.nudge = !!patch.nudge
      settings = next
      await saveSettings()
      if (!next.enabled) stopEverything()
      const config = await buildConfig()
      // The provider shown as picked becomes the saved one, so a later install cannot move it.
      if (!next.provider && config.provider) {
        settings = { ...next, provider: config.provider }
        await saveSettings()
        return buildConfig()
      }
      return config
    },

    setKey: async (provider, key) => {
      if (!API_PROVIDERS.some((p) => p.id === provider)) throw new Error('Unknown provider')
      const stored = withKey(await loadKeys(), provider as ApiProviderId, key)
      if (stored[provider as ApiProviderId] && !safeStorage.isEncryptionAvailable()) {
        throw new Error('This computer offers no secure storage for keys.')
      }
      await writeFile(keysFile(), safeStorage.encryptString(JSON.stringify(stored)))
      keys = stored
      return buildConfig()
    },

    chat: async (request) => {
      if (!(await loadSettings()).enabled) throw new Error(AI_OFF)
      const requestId = randomUUID()
      const cancel = new AbortController()
      chats.set(requestId, cancel)
      void runChat(requestId, request, cancel)
      return requestId
    },

    complete,

    test: testConnection,
    tip,
    installOpencode: setUpOpencode,
    removeOpencode: removeOwnOpencode
  })

  listen('ai', {
    cancel: (requestId) => chats.get(requestId)?.abort(),
    cancelComplete: () => completion?.abort(),
    cancelOpencodeInstall: () => opencodeInstall?.abort()
  })
}
