import { spawn } from 'child_process'
import { access, constants, mkdtemp, readFile, rm } from 'fs/promises'
import { homedir, tmpdir } from 'os'
import { delimiter, join } from 'path'
import { lineSplitter, opencodeLogError, parseCliLine, type CliProviderId } from './parsers'
import { withInstructions } from './prompt'
import { run } from '../../run'

export const CLI_BINS: Record<CliProviderId, string> = {
  'claude-code': 'claude',
  codex: 'codex',
  opencode: 'opencode',
  'gemini-cli': 'gemini'
}

/** Finds an executable on the given PATH, the way a shell would. */
export async function which(bin: string, path: string): Promise<string | null> {
  const names = process.platform === 'win32' ? [`${bin}.exe`, `${bin}.cmd`, bin] : [bin]
  for (const dir of path.split(delimiter).filter(Boolean)) {
    for (const name of names) {
      const full = join(dir, name)
      try {
        await access(full, constants.X_OK)
        return full
      } catch {
        // keep looking
      }
    }
  }
  return null
}

export async function cliVersion(path: string, env: Record<string, string>): Promise<string> {
  try {
    const { stdout } = await run(path, ['--version'], { env, timeout: 5000 })
    return stdout.trim().split('\n')[0] || path
  } catch {
    return path
  }
}

/** Models the learner's own CLI setup offers; the CLI's default is always available too. */
export async function cliModels(
  provider: CliProviderId,
  path: string,
  env: Record<string, string>
): Promise<string[]> {
  if (provider === 'claude-code') return ['opus', 'sonnet', 'haiku', 'fable']
  if (provider === 'gemini-cli')
    return ['gemini-3.8-flash', 'gemini-4-carbon', 'gemini-3.5-flash-lite']
  try {
    if (provider === 'opencode') {
      const { stdout } = await run(path, ['models'], { env, timeout: 10_000 })
      return stdout
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /^[\w.-]+\/\S+$/.test(l))
    }
    // shortcut: Codex keeps its model list in an internal cache file; empty until Codex has run once.
    const cache = join(env.CODEX_HOME || join(homedir(), '.codex'), 'models_cache.json')
    const { models } = JSON.parse(await readFile(cache, 'utf8')) as { models?: { slug?: string }[] }
    return (models ?? []).flatMap((m) => (m.slug ? [m.slug] : [])).slice(0, 8)
  } catch {
    return []
  }
}

export interface CliRun {
  provider: CliProviderId
  path: string
  model: string | null
  system: string
  prompt: string
  env: Record<string, string>
  signal: AbortSignal
  onDelta(text: string): void
  /** How long OpenCode may stay silent after it logged an error before the run is stopped. */
  quietAfterErrorMs?: number
}

const QUIET_AFTER_ERROR_MS = 15_000

/** Text in, text out: every CLI runs without tools or file access, as far as each one allows. */
export function cliInvocation(
  provider: CliProviderId,
  { model, system, prompt }: Pick<CliRun, 'model' | 'system' | 'prompt'>,
  cwd: string
): { args: string[]; stdin?: string; env?: Record<string, string> } {
  const full = withInstructions(system, prompt)
  switch (provider) {
    case 'claude-code':
      return {
        args: [
          '-p',
          '--output-format',
          'stream-json',
          '--verbose',
          '--include-partial-messages',
          '--tools',
          '',
          '--strict-mcp-config',
          '--disable-slash-commands',
          '--no-session-persistence',
          '--settings',
          '{"disableAllHooks":true}',
          '--system-prompt',
          system,
          ...(model ? ['--model', model] : [])
        ],
        stdin: prompt
      }
    case 'codex':
      return {
        args: [
          'exec',
          '--json',
          '--sandbox',
          'read-only',
          '--skip-git-repo-check',
          '--ephemeral',
          '--color',
          'never',
          ...(model ? ['--model', model] : []),
          '-'
        ],
        stdin: full
      }
    case 'opencode':
      return {
        args: [
          'run',
          '--format',
          'json',
          '--dir',
          cwd,
          // The reason a reply failed is only in the log; see opencodeLogError.
          '--print-logs',
          '--log-level',
          'ERROR',
          ...(model ? ['--model', model] : []),
          full
        ],
        env: { OPENCODE_CONFIG_CONTENT: '{"permission":{"*":"deny"}}' }
      }
    case 'gemini-cli':
      return {
        args: [
          '--output-format',
          'stream-json',
          '--approval-mode',
          'plan',
          ...(model ? ['--model', model] : []),
          '--prompt',
          full
        ]
      }
  }
}

/** Runs one prompt in an empty temp folder and streams the reply's text. */
export async function runCli(options: CliRun): Promise<void> {
  const { provider, path, signal, onDelta } = options
  const cwd = await mkdtemp(join(tmpdir(), 'indent-ai-'))
  // OpenCode logs why a reply failed and then waits in silence, so the run is stopped here.
  const quiet = new AbortController()
  let quietTimer: NodeJS.Timeout | undefined
  try {
    const { args, stdin, env } = cliInvocation(provider, options, cwd)
    const child = spawn(path, args, {
      cwd,
      env: { ...options.env, ...env },
      signal: AbortSignal.any([signal, quiet.signal]),
      stdio: [stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      windowsHide: true
    })
    let streamed = false
    let final: string | undefined
    let failure: string | undefined
    let stderr = ''
    let logged: string | undefined
    const push = lineSplitter((line) => {
      const parsed = parseCliLine(provider, line)
      if (parsed.delta) {
        streamed = true
        onDelta(parsed.delta)
      }
      if (parsed.final !== undefined) final = parsed.final
      if (parsed.error) failure ??= parsed.error
    })
    const readLog = lineSplitter((line) => {
      const reason = provider === 'opencode' ? opencodeLogError(line) : undefined
      if (!reason) return
      logged = `OpenCode could not answer: ${reason}`
      clearTimeout(quietTimer)
      quietTimer = setTimeout(
        () => quiet.abort(new Error(logged)),
        options.quietAfterErrorMs ?? QUIET_AFTER_ERROR_MS
      )
    })
    child.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
      // Any output after a logged error means OpenCode tried again and got through.
      clearTimeout(quietTimer)
      push(chunk)
    })
    child.stderr?.setEncoding('utf8').on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-2000)
      readLog(chunk)
    })
    if (stdin !== undefined) child.stdin?.end(stdin)

    const code = await new Promise<number | null>((resolve, reject) => {
      child.on('error', reject)
      child.on('close', resolve)
    }).catch((error: unknown) => {
      throw quiet.signal.aborted && !signal.aborted ? quiet.signal.reason : error
    })
    push('\n')
    if (signal.aborted) throw signal.reason
    if (failure) throw new Error(failure)
    if (!streamed && final) onDelta(final)
    if (!streamed && (code !== 0 || logged)) {
      const lastLine = stderr.trim().split('\n').pop()
      throw new Error(logged || lastLine || `${CLI_BINS[provider]} exited with code ${code}`)
    }
  } finally {
    clearTimeout(quietTimer)
    // On Windows the CLI can still hold the folder for a moment. A leftover empty temp folder is
    // harmless; an error here would replace the reply or the real reason it failed.
    await rm(cwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {})
  }
}
