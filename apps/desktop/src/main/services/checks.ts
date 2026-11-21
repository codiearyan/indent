import { execFile, type ExecFileOptions } from 'child_process'
import { existsSync } from 'fs'
import { copyFile, mkdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { CheckResult, ProgressState, RuntimeStatus } from '@shared/types'
import { EVENTS } from '@shared/types'
import { chapterKey } from '@shared/rules'
import { emit, handle } from '../ipc'
import { labEnv } from '../labEnv'
import { chapterContentDir, contentDir, workspaceDir, workspacesRoot } from '../paths'
import { loadChapter } from './content'
import { failedResults, gradeRun, nodeSupported, tail, type RunOutcome } from './grader'
import { labModelProblem, labModelReady, startLabModel } from './labModel'
import { getProgress, recordCheck } from './progress'

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

/** The last status sent to the renderer, which shows it above the tasks and in Settings. */
let latest: RuntimeStatus | undefined

function publish(status: RuntimeStatus): RuntimeStatus {
  latest = status
  emit(EVENTS.runtime, status)
  return status
}

const OFFLINE = /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH/

async function install(): Promise<RuntimeStatus> {
  const status = await runtimeStatus()
  if (status.ready || status.error) return publish(status)
  publish({ ...status, installing: true })
  const root = workspacesRoot()
  try {
    await mkdir(root, { recursive: true })
    await copyFile(runtimePackage(), join(root, 'package.json'))
  } catch (error) {
    return publish({
      ...status,
      error: 'Could not get the repo tools ready.',
      details: String(error)
    })
  }
  const run = await runProcess('npm', ['install', '--no-audit', '--no-fund'], {
    cwd: root,
    env: await labEnv(),
    timeout: INSTALL_TIMEOUT_MS
  })
  if (run.exitCode !== 0) {
    const error = OFFLINE.test(run.stderr)
      ? 'Getting the repo tools needs an internet connection once. Connect and try again.'
      : run.timedOut
        ? 'Getting the repo tools took too long. Try again.'
        : 'Could not get the repo tools ready. Try again.'
    return publish({ ...status, error, details: tail(run.stderr) })
  }
  return publish(await runtimeStatus())
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
  // The notice above the tasks says what is wrong; the tasks are not failed for it.
  if (!status.ready) return { results: [], progress: await getProgress() }
  await labModelReady()
  const error = labModelProblem(labId)
  let results: CheckResult[]
  if (error) {
    results = failedResults(ids, error, 0, new Date().toISOString())
  } else {
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
  handle('checks', {
    run,
    runtimeStatus: async () => (installing && latest ? latest : runtimeStatus()),
    ensureRuntime
  })
}
