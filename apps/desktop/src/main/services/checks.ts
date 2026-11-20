import { execFile, type ExecFileOptions } from 'child_process'
import { existsSync } from 'fs'
import { copyFile, mkdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { CheckResult, ProgressState, RuntimeStatus } from '@shared/types'
import { chapterKey } from '@shared/rules'
import { handle } from '../ipc'
import { labEnv } from '../labEnv'
import { chapterContentDir, contentDir, workspaceDir, workspacesRoot } from '../paths'
import { loadChapter } from './content'
import { failedResults, gradeRun, nodeSupported, tail, type RunOutcome } from './grader'
import { labModelReady, startLabModel } from './labModel'
import { recordCheck } from './progress'

const CHECK_TIMEOUT_MS = 90_000
const INSTALL_TIMEOUT_MS = 10 * 60_000

function runProcess(cmd: string, args: string[], options: ExecFileOptions): Promise<RunOutcome> {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      { ...options, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const exitCode = !error ? 0 : typeof error.code === 'number' ? error.code : null
        resolve({
          stdout,
          stderr: stderr || (exitCode === null ? (error?.message ?? '') : ''),
          exitCode,
          timedOut: Boolean(error?.killed)
        })
      }
    )
  })
}

const runtimePackage = (): string => join(contentDir(), 'runtime', 'package.json')

async function depsInstalled(): Promise<boolean> {
  const root = workspacesRoot()
  const wanted = await readFile(runtimePackage(), 'utf8').catch(() => '')
  const current = await readFile(join(root, 'package.json'), 'utf8').catch(() => '')
  if (!wanted || wanted !== current) return false
  const pkg = JSON.parse(wanted) as Record<string, Record<string, string> | undefined>
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
  return deps.every((dep) => existsSync(join(root, 'node_modules', dep, 'package.json')))
}

async function runtimeStatus(): Promise<RuntimeStatus> {
  const run = await runProcess('node', ['--version'], { env: await labEnv(), timeout: 10_000 })
  const node = run.exitCode === 0 ? run.stdout.trim() : null
  if (!node) {
    return {
      node,
      ready: false,
      error: 'Node.js was not found. Open Settings, then Tools, to download it.'
    }
  }
  if (!nodeSupported(node)) {
    return {
      node,
      ready: false,
      error: `Repos need Node 22.18 or newer. This computer has ${node}. Open Settings, then Tools, to download a newer one.`
    }
  }
  return { node, ready: await depsInstalled() }
}

async function install(): Promise<RuntimeStatus> {
  const status = await runtimeStatus()
  if (status.ready || status.error) return status
  const root = workspacesRoot()
  try {
    await mkdir(root, { recursive: true })
    await copyFile(runtimePackage(), join(root, 'package.json'))
  } catch (error) {
    return { ...status, error: `Could not prepare the runtime dependencies: ${String(error)}` }
  }
  const run = await runProcess('npm', ['install', '--no-audit', '--no-fund'], {
    cwd: root,
    env: await labEnv(),
    timeout: INSTALL_TIMEOUT_MS
  })
  if (run.exitCode !== 0) {
    const reason = run.timedOut ? 'The install took too long.' : tail(run.stderr)
    return {
      ...status,
      error: `Could not install the runtime dependencies. Check your internet connection and try again.\n${reason}`
    }
  }
  return runtimeStatus()
}

let installing: Promise<RuntimeStatus> | undefined

export function ensureRuntime(): Promise<RuntimeStatus> {
  return (installing ??= install().finally(() => (installing = undefined)))
}

async function runCheck(
  labId: string,
  chapterId: string,
  taskIds?: string[]
): Promise<{ results: CheckResult[]; progress: ProgressState }> {
  const chapter = await loadChapter(labId, chapterId)
  const known = chapter.tasks.map((task) => task.id)
  const ids = taskIds ?? known
  const unknown = ids.find((id) => !known.includes(id))
  if (unknown) throw new Error(`Unknown task: ${unknown}`)

  const status = await ensureRuntime()
  let results: CheckResult[]
  if (!status.ready) {
    const error = status.error ?? 'The runtime dependencies are not installed.'
    results = failedResults(ids, error, 0, new Date().toISOString())
  } else {
    await labModelReady()
    const sandboxRoot = join(workspacesRoot(), '.sandbox')
    await mkdir(sandboxRoot, { recursive: true })
    const args = [
      join(contentDir(), 'kit', 'run-check.mjs'),
      ...['--chapter', chapterContentDir(labId, chapterId)],
      ...['--workspace', workspaceDir(labId, chapterId)],
      ...['--sandbox-root', sandboxRoot],
      ...ids.flatMap((id) => ['--task', id])
    ]
    const started = Date.now()
    const run = await runProcess('node', args, {
      env: await labEnv(),
      timeout: CHECK_TIMEOUT_MS,
      killSignal: 'SIGKILL'
    })
    results = gradeRun(ids, run, Date.now() - started, new Date().toISOString())
  }
  return { results, progress: await recordCheck(labId, chapterId, chapter.tasks, results) }
}

const queues = new Map<string, Promise<unknown>>()

/** One check at a time per chapter; a second request waits for the first. */
function run(labId: string, chapterId: string, taskIds?: string[]): ReturnType<typeof runCheck> {
  const key = chapterKey(labId, chapterId)
  const next = (queues.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(() => runCheck(labId, chapterId, taskIds))
  queues.set(key, next)
  const cleanup = (): void => {
    if (queues.get(key) === next) queues.delete(key)
  }
  next.then(cleanup, cleanup)
  return next
}

export function register(): void {
  startLabModel()
  handle('checks', { run, runtimeStatus, ensureRuntime })
}
