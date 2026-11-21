import { spawn, type ChildProcess } from 'child_process'
import { join } from 'path'
import { createInterface } from 'readline'
import { app } from 'electron'
import { labEnv, setLabModelUrl } from '../labEnv'
import { contentDir } from '../paths'

const MAX_BACKOFF_MS = 30_000

let child: ChildProcess | undefined
let quitting = false
let backoffMs = 1000
let up = false
let origin: string | undefined
const waiters: (() => void)[] = []

async function start(): Promise<void> {
  const proc = spawn('node', [join(contentDir(), 'kit', 'lab-model.mjs')], {
    env: await labEnv(),
    stdio: ['ignore', 'pipe', 'inherit']
  })
  child = proc
  const lines = createInterface({ input: proc.stdout! })
  lines.once('line', (line) => {
    const port = Number(/"port"\s*:\s*(\d+)/.exec(line)?.[1])
    if (!port) {
      console.error('Lab model printed no port:', line)
      proc.kill()
      return
    }
    origin = `http://127.0.0.1:${port}`
    setLabModelUrl(`${origin}/v1`)
    up = true
    backoffMs = 1000
    for (const resolve of waiters.splice(0)) resolve()
  })
  proc.on('error', (error) => console.error('Lab model failed to start', error))
  proc.on('close', (code) => {
    up = false
    child = undefined
    if (quitting) return
    console.warn(`Lab model exited (${code}); restarting in ${backoffMs} ms`)
    setTimeout(() => void start(), backoffMs)
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS)
  })
}

export function startLabModel(): void {
  app.on('before-quit', () => {
    quitting = true
    child?.kill()
  })
  void start()
}

/**
 * Loads the repos' models again after a repo was installed or updated. The server keeps its port,
 * which open terminals hold in their environment. One still starting reads the new files anyway.
 */
export async function reloadLabModel(): Promise<void> {
  if (!up || !origin) return
  await fetch(`${origin}/reload`, { method: 'POST' }).catch((error) =>
    console.warn('Could not reload the local model:', error)
  )
}

/** Resolves once the lab model is listening, or after `timeoutMs` so checks that do not need it still run. */
export function labModelReady(timeoutMs = 15_000): Promise<void> {
  if (up) return Promise.resolve()
  return new Promise((resolve) => {
    waiters.push(resolve)
    setTimeout(resolve, timeoutMs)
  })
}
