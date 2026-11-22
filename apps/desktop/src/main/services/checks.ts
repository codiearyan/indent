import { execFile, type ExecFileOptions } from 'child_process'
import { existsSync } from 'fs'
import { copyFile, mkdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { CheckResult, ProgressState, RuntimeStatus, TraceResult } from '@shared/types'
import { EVENTS } from '@shared/types'
import { chapterKey } from '@shared/rules'
import { emit, handle } from '../ipc'
import { labEnv } from '../labEnv'
import { chapterContentDir, contentDir, safeId, workspaceDir, workspacesRoot } from '../paths'
import { loadChapter, openChapter } from './content'
import {
  failedResults,
  failedTrace,
  gradeRun,
  nodeSupported,
  parseTrace,
  type RunOutcome
} from './grader'
import { labModelProblem, labModelReady, labUsesModel, startLabModel } from './labModel'
import { getProgress, recordCheck } from './progress'
import { findMissing } from './workspaceSync'
import { InstallError } from '../library'
import { perf } from '../perf'
import {
  downloadTools,
  installedTools,
  npmFailed,
  recordTools,
  TOOLS_RELEASES,
  toolsFailed,
  toolsVersion
} from '../repoTools'

const CHECK_TIMEOUT_MS = 90_000
const TRACE_TIMEOUT_MS = 30_000
const INSTALL_TIMEOUT_MS = 10 * 60_000

function runProcess(cmd: string, args: string[], options: ExecFileOptions): Promise<RunOutcome> {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      { ...options, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true },
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

const runtimeFile = (name: string): string => join(contentDir(), 'runtime', name)

async function wantedTools(): Promise<string> {
  return toolsVersion(await readFile(runtimeFile('package-lock.json'), 'utf8').catch(() => ''))
}

async function depsInstalled(): Promise<boolean> {
  const root = workspacesRoot()
  if (installedTools(root) !== (await wantedTools())) return false
  const pkg = JSON.parse(
    await readFile(runtimeFile('package.json'), 'utf8').catch(() => '{}')
  ) as Record<string, Record<string, string> | undefined>
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
      error: 'Checks need Node.js, which is not on this computer.'
    }
  }
  if (!nodeSupported(node)) {
    return {
      node,
      ready: false,
      error: `Checks need Node 22.18 or newer. This computer has ${node}.`
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

/** `<platform>-<arch>` of the Node that runs the repos, which picks the tools to download. */
async function nodeSystem(env: Record<string, string>): Promise<string | null> {
  const run = await runProcess('node', ['-p', 'process.platform + "-" + process.arch'], {
    env,
    timeout: 10_000
  })
  return run.exitCode === 0 ? run.stdout.trim() : null
}

/**
 * Downloads the repo tools built for this system. Without a build for it, or when the download
 * fails, npm installs the same versions from the lockfile.
 */
async function install(): Promise<RuntimeStatus> {
  const status = await runtimeStatus()
  if (status.ready || status.error) return publish(status)
  publish({ ...status, installing: true })
  const root = workspacesRoot()
  const env = await labEnv()
  try {
    await mkdir(root, { recursive: true })
    await copyFile(runtimeFile('package.json'), join(root, 'package.json'))
    await copyFile(runtimeFile('package-lock.json'), join(root, 'package-lock.json'))
  } catch (error) {
    return publish({ ...status, ...toolsFailed('failed', String(error)) })
  }
  const version = await wantedTools()
  const system = await nodeSystem(env)
  if (system) {
    let shown = 0
    try {
      await downloadTools(root, TOOLS_RELEASES, version, system, (done) => {
        // A percent at a time, not an event per chunk.
        if (done - shown < 0.01 && done < 1) return
        shown = done
        publish({ ...status, installing: true, progress: done })
      })
      return publish({ ...(await runtimeStatus()), via: 'download' })
    } catch (error) {
      if (error instanceof InstallError && error.reason === 'no-space') {
        return publish({ ...status, ...toolsFailed('no-space', error.message) })
      }
      publish({ ...status, installing: true })
    }
  }
  const run = await runProcess('npm', ['ci', '--no-audit', '--no-fund'], {
    cwd: root,
    // On Windows npm is npm.cmd, which only a shell can start.
    shell: process.platform === 'win32',
    env,
    timeout: INSTALL_TIMEOUT_MS
  })
  if (run.exitCode !== 0) return publish({ ...status, ...npmFailed(run) })
  recordTools(root, version)
  return publish({ ...(await runtimeStatus()), via: 'npm' })
}

let installing: Promise<RuntimeStatus> | undefined

export function ensureRuntime(): Promise<RuntimeStatus> {
  return (installing ??= install().finally(() => (installing = undefined)))
}

const sandboxRoot = async (): Promise<string> => {
  const dir = join(workspacesRoot(), '.sandbox')
  await mkdir(dir, { recursive: true })
  return dir
}

/**
 * Runs the example in a task's flow on the learner's code. It needs no check first: when to offer
 * it is the renderer's call.
 */
async function trace(labId: string, chapterId: string, taskId: string): Promise<TraceResult> {
  const chapter = await openChapter(labId, chapterId)
  if (!chapter.tasks.some((task) => task.id === safeId(taskId)))
    throw new Error(`Unknown task: ${taskId}`)
  if (!chapter.flow?.tasks?.[taskId]?.trace) throw new Error(`Task ${taskId} has no trace`)

  const status = await ensureRuntime()
  if (!status.ready) return failedTrace(status.error ?? 'The repo tools are not ready yet.')
  if (labUsesModel(labId)) await labModelReady()
  const error = labModelProblem(labId)
  if (error) return failedTrace(error)
  const args = [
    join(contentDir(), 'kit', 'run-trace.mjs'),
    ...['--chapter', chapterContentDir(labId, chapterId)],
    ...['--workspace', workspaceDir(labId, chapterId)],
    ...['--sandbox-root', await sandboxRoot()],
    ...['--task', taskId]
  ]
  const run = await runProcess('node', args, {
    env: await labEnv(),
    timeout: TRACE_TIMEOUT_MS,
    killSignal: 'SIGKILL'
  })
  return parseTrace(run, TRACE_TIMEOUT_MS / 1000)
}

async function runCheck(
  labId: string,
  chapterId: string,
  taskIds?: string[]
): Promise<{ results: CheckResult[]; progress: ProgressState }> {
  const began = Date.now()
  const chapter = await loadChapter(labId, chapterId)
  const known = chapter.tasks.map((task) => task.id)
  const ids = taskIds ?? known
  const unknown = ids.find((id) => !known.includes(id))
  if (unknown) throw new Error(`Unknown task: ${unknown}`)

  // The banner across the issue names the missing files; checks would only fail on their imports.
  const starterDir = join(chapterContentDir(labId, chapterId), 'starter')
  const missing = chapter.movesFiles
    ? []
    : await findMissing(starterDir, workspaceDir(labId, chapterId), chapter.files)
  if (missing.length > 0) {
    return { results: [], progress: await getProgress() }
  }
  const status = await ensureRuntime()
  // The notice above the tasks says what is wrong; the tasks are not failed for it.
  if (!status.ready) return { results: [], progress: await getProgress() }
  if (labUsesModel(labId)) await labModelReady()
  const error = labModelProblem(labId)
  let results: CheckResult[]
  if (error) {
    results = failedResults(ids, error, 0, new Date().toISOString())
  } else {
    const args = [
      join(contentDir(), 'kit', 'run-check.mjs'),
      ...['--chapter', chapterContentDir(labId, chapterId)],
      ...['--workspace', workspaceDir(labId, chapterId)],
      ...['--sandbox-root', await sandboxRoot()],
      ...ids.flatMap((id) => ['--task', id])
    ]
    const started = Date.now()
    perf('check, before the grader', started - began)
    const run = await runProcess('node', args, {
      env: await labEnv(),
      timeout: CHECK_TIMEOUT_MS,
      killSignal: 'SIGKILL'
    })
    perf('check, in the grader', Date.now() - started)
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
    trace,
    runtimeStatus: async () => (installing && latest ? latest : runtimeStatus()),
    ensureRuntime
  })
}
