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
import { labEnv } from '../labEnv'
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
const COMPLETE_TIMEOUT_MS = { cli: 20_000, api: 8_000 }

interface Settings {
  provider: AiProviderId | null
  model: string | null
  suggestions: boolean
}

const settingsFile = (): string => dataFile('ai.json')
const keysFile = (): string => dataFile('ai-keys.bin')

let settings: Settings | undefined
let keys: Partial<Record<ApiProviderId, string>> | undefined
let detected: Promise<AiProviderInfo[]> | undefined
const cliPaths = new Map<AiProviderId, string>()

async function loadSettings(): Promise<Settings> {
  if (settings) return settings
  try {
    const saved = JSON.parse(await readFile(settingsFile(), 'utf8')) as Partial<Settings>
    settings = {
      provider: saved.provider ?? null,
      model: saved.model ?? null,
      suggestions: saved.suggestions ?? false
    }
  } catch {
    settings = { provider: null, model: null, suggestions: false }
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
    const env = await labEnv()
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
  return { provider: active?.id ?? null, model, suggestions: saved.suggestions, providers }
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
    env: await labEnv(),
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
  completion?.abort()
  const cancel = new AbortController()
  completion = cancel
  try {
    const config = await buildConfig()
    const provider = config.providers.find((p) => p.id === config.provider)
    if (!config.suggestions || !provider) return ''
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
      if (patch.model !== undefined) next.model = patch.model || null
      if (patch.suggestions !== undefined) next.suggestions = !!patch.suggestions
      settings = next
      await saveSettings()
      return buildConfig()
    },

    setKey: async (provider, key) => {
      if (!API_PROVIDERS.some((p) => p.id === provider)) throw new Error('Unknown provider')
      const stored = { ...(await loadKeys()) }
      if (key?.trim()) {
        if (!safeStorage.isEncryptionAvailable()) {
          throw new Error('This computer offers no secure storage for keys.')
        }
        stored[provider as ApiProviderId] = key.trim()
      } else {
        delete stored[provider as ApiProviderId]
      }
      await writeFile(keysFile(), safeStorage.encryptString(JSON.stringify(stored)))
      keys = stored
      return buildConfig()
    },

    chat: async (request) => {
      const requestId = randomUUID()
      const cancel = new AbortController()
      chats.set(requestId, cancel)
      void runChat(requestId, request, cancel)
      return requestId
    },

    complete
  })

  listen('ai', {
    cancel: (requestId) => chats.get(requestId)?.abort()
  })
}
