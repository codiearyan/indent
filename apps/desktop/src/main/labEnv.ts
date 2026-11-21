import { execFile } from 'child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { delimiter, dirname } from 'path'
import { promisify } from 'util'
import { dataFile, ownNodeBin } from './paths'

const run = promisify(execFile)

let shellPath: Promise<string> | undefined
let labModelUrl: string | undefined

/** Apps launched from Finder get a bare PATH; ask the login shell for the real one. */
function resolveShellPath(): Promise<string> {
  if (process.platform === 'win32') return Promise.resolve(process.env.PATH ?? '')
  const shell = process.env.SHELL || '/bin/zsh'
  return run(shell, ['-ilc', 'printf "__PATH__%s__PATH__" "$PATH"'], { timeout: 5000 })
    .then(({ stdout }) => stdout.match(/__PATH__(.*)__PATH__/s)?.[1] || process.env.PATH || '')
    .catch(() => process.env.PATH ?? '')
}

/** Asks the login shell again, so a CLI installed while the app is open is found. */
export function refreshShellPath(): void {
  shellPath = undefined
}

const pickFile = (): string => dataFile('node.json')

/** The Node binary picked in Settings, or null for automatic or when it is gone. */
export function pickedNode(): string | null {
  try {
    const bin = (JSON.parse(readFileSync(pickFile(), 'utf8')) as { bin?: unknown }).bin
    return typeof bin === 'string' && existsSync(bin) ? bin : null
  } catch {
    return null
  }
}

export function pickNode(bin: string | null): void {
  if (bin) writeFileSync(pickFile(), JSON.stringify({ bin }))
  else rmSync(pickFile(), { force: true })
}

/**
 * The folder whose Node goes first on the PATH: the one picked in Settings, else the app's own
 * copy, which is only downloaded when the computer's is missing or old. Null leaves the PATH alone.
 */
export function firstNodeDir(): string | null {
  const picked = pickedNode()
  if (picked) return dirname(picked)
  return existsSync(ownNodeBin()) ? ownNodeBin() : null
}

/** Called once the lab model server is listening. */
export function setLabModelUrl(url: string): void {
  labModelUrl = url
}

/** The learner's own environment with the PATH of their login shell. */
export async function shellEnv(): Promise<Record<string, string>> {
  shellPath ??= resolveShellPath()
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !key.startsWith('ELECTRON_')) env[key] = value
  }
  const first = firstNodeDir()
  env.PATH = first ? `${first}${delimiter}${await shellPath}` : await shellPath
  return env
}

/**
 * Environment for every process that runs learner code: the terminal and the checks.
 * It points the OpenAI client at the lab model, so never use it for a real AI provider.
 */
export async function labEnv(): Promise<Record<string, string>> {
  const env = await shellEnv()
  if (labModelUrl) {
    env.LAB_MODEL_URL = labModelUrl
    env.OPENAI_BASE_URL = labModelUrl
    env.OPENAI_API_KEY = 'lab-model'
  }
  return env
}
