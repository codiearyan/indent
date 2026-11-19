import { safeStorage } from 'electron'
import { randomUUID } from 'crypto'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type {
  AiChatEvent,
  AiChatRequest,
  AiCompleteRequest,
  AiConfig,
  AiProviderId,
  AiProviderInfo,
  ChapterDef
} from '@shared/types'
import { EVENTS } from '@shared/types'
import { emit, handle, listen } from '../ipc'
import { shellEnv } from '../labEnv'
import { chapterContentDir, dataFile } from '../paths'
import { CLI_BINS, cliModels, cliVersion, runCli, which } from './ai/cli'
import { GEMINI_URL, OPENAI_URL, anthropicStream, openAiCompatibleStream } from './ai/http'
import type { CliProviderId } from './ai/parsers'
import {
  COMPLETION_RULES,
  cleanCompletion,
  completionPrompt,
  maskKey,
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
const AI_OFF = 'AI is off. Turn it on from the AI menu.'
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
    const env = await shellEnv()
    return Promise.all(
      CLI_PROVIDERS.map(async ({ id, label }): Promise<AiProviderInfo> => {
        const path = await which(CLI_BINS[id], env.PATH ?? '')
        if (!path) {
          cliPaths.delete(id)
          return { id, label, kind: 'cli', available: false, detail: 'Not installed', models: [] }
        }
        cliPaths.set(id, path)
        const [detail, models] = await Promise.all([
          cliVersion(path, env),
          cliModels(id, path, env)
        ])
        return { id, label, kind: 'cli', available: true, detail, models }
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
  const providers = await providerList(fresh)
  const saved = await loadSettings()
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
    throw new Error('No AI provider is set up yet. Open the AI menu to pick one.')
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
    const [chapter, lesson] = await loadChapter(request.labId, request.chapterId)
    const messages = trimHistory(request.messages)
    if (messages[messages.length - 1]?.role !== 'user') throw new Error('Ask a question first.')
    await streamReply(await buildConfig(), {
      system: tutorSystemPrompt({
        chapter,
        lesson,
        activeFile: request.activeFile,
        lastCheck: request.lastCheck
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
            String(request.suffix).slice(0, 1000)
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
    return cancel.signal.aborted ? '' : cleanCompletion(text)
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
  let text = ''
  try {
    await streamReply(config, {
      system: 'You check that a connection works. Answer in one short sentence.',
      messages: [{ role: 'user', content: 'Greet a learner in five words or fewer.' }],
      quick: false,
      signal: timeout,
      onDelta: (delta) => {
        text += delta
      }
    })
  } catch (error) {
    if (timeout.aborted)
      throw new Error(`No reply within ${limit / 1000} seconds.`, { cause: error })
    throw error
  }
  const reply = text.trim().replace(/\s+/g, ' ').slice(0, 200)
  if (!reply) throw new Error(`${provider.label} answered with nothing.`)
  return reply
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
      return buildConfig()
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

    test: testConnection
  })

  listen('ai', {
    cancel: (requestId) => chats.get(requestId)?.abort()
  })
}
