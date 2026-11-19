import { execFile } from 'child_process'
import { promisify } from 'util'

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
  env.PATH = await shellPath
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
