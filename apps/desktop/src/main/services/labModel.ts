import { spawn, type ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { createInterface } from 'readline'
import { app } from 'electron'
import { labEnv, setLabModelUrl } from '../labEnv'
import type { LabModelStatus } from '@shared/types'
import { contentDir } from '../paths'

const MAX_BACKOFF_MS = 30_000

let child: ChildProcess | undefined
let retry: ReturnType<typeof setTimeout> | undefined
let quitting = false
let backoffMs = 1000
let up = false
let origin: string | undefined
let status: LabModelStatus = { state: 'starting' }
const waiters: (() => void)[] = []

const wake = (): void => {
  for (const resolve of waiters.splice(0)) resolve()
}

async function start(): Promise<void> {
  retry = undefined
  status = { state: 'starting' }
  const proc = spawn('node', [join(contentDir(), 'kit', 'lab-model.mjs')], {
    env: await labEnv(),
    stdio: ['ignore', 'pipe', 'inherit'],
    windowsHide: true
  })
  child = proc
  const lines = createInterface({ input: proc.stdout! })
  lines.once('line', (line) => {
    const port = Number(/"port"\s*:\s*(\d+)/.exec(line)?.[1])
    if (!port) {
      console.error('Lab model printed no port:', line)
      status = { state: 'failed', reason: 'It started but did not say which port it uses.' }
      proc.kill()
      return
    }
    origin = `http://127.0.0.1:${port}`
    setLabModelUrl(`${origin}/v1`)
    up = true
    status = { state: 'running' }
    backoffMs = 1000
    wake()
  })
  proc.on('error', (error: NodeJS.ErrnoException) => {
    console.error('Lab model failed to start', error)
    if (error.code === 'ENOENT') {
      status = { state: 'failed', reason: 'Node.js was not found.', nodeMissing: true }
      wake()
    }
  })
  proc.on('close', (code) => {
    // A restart already replaced this process.
    if (child !== proc) return
    up = false
    child = undefined
    // Without Node a retry fails the same way; it starts again once Node is there.
    if (quitting || status.nodeMissing) return
    if (status.state !== 'failed') {
      status = {
        state: 'failed',
        reason: code === null ? 'It stopped.' : `It stopped (exit code ${code}).`
      }
    }
    console.warn(`Lab model exited (${code}); restarting in ${backoffMs} ms`)
    retry = setTimeout(() => void start(), backoffMs)
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

export function labModelStatus(): LabModelStatus {
  return status
}

/** Stops the local model if it runs and starts it again; resolves once it answers or gives up. */
export async function restartLabModel(): Promise<LabModelStatus> {
  clearTimeout(retry)
  backoffMs = 1000
  const old = child
  child = undefined
  up = false
  old?.kill()
  await start()
  await labModelReady(5000)
  return status
}

/** Only the repos with a `model.mjs` talk to the local model. */
export function labUsesModel(labId: string): boolean {
  return existsSync(join(contentDir(), 'labs', labId, 'model.mjs'))
}

/** What to tell a learner whose repo uses the local model while it is down, or null. */
export function labModelProblem(labId: string): string | null {
  if (status.state !== 'failed') return null
  if (!labUsesModel(labId)) return null
  return status.nodeMissing
    ? 'The local model needs Node.js, which was not found. Get it in Settings, Tools.'
    : "The local model isn't running. Restart it in Settings, Tools."
}

/** After Node was found or downloaded: starts a local model that stopped for lack of it. */
export async function startLabModelIfNodeWasMissing(): Promise<void> {
  if (status.nodeMissing) await restartLabModel()
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
  if (up || status.nodeMissing) return Promise.resolve()
  return new Promise((resolve) => {
    const done = (): void => {
      clearTimeout(timer)
      const at = waiters.indexOf(done)
      if (at !== -1) waiters.splice(at, 1)
      resolve()
    }
    const timer = setTimeout(done, timeoutMs)
    waiters.push(done)
  })
}
