import { execFile } from 'child_process'
import { app } from 'electron'
import { createHash } from 'crypto'
import { createWriteStream, existsSync } from 'fs'
import { mkdir, rename, rm } from 'fs/promises'
import { join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import type { ReadableStream } from 'stream/web'
import { promisify } from 'util'
import type { NodeOption, ToolId, ToolInstallResult, ToolStatus } from '@shared/types'
import { EVENTS } from '@shared/types'
import { emit, handle } from '../ipc'
import { labEnv, pickedNode, pickNode, refreshShellPath, shellEnv } from '../labEnv'
import { ownNodeBin, ownNodeDir, toolsDir } from '../paths'
import { which } from './ai/cli'
import { ensureRuntime } from './checks'
import { labModelStatus, restartLabModel, startLabModelIfNodeWasMissing } from './labModel'
import { nodeSupported } from './grader'
import { pickNodeArchive } from './nodeArchive'
import { byVersion, findNodeBins, nodeSource } from './nodeOptions'

const run = promisify(execFile)

// The long-term support line that is downloaded. Any release of it runs the repos.
const NODE_DIST = 'https://nodejs.org/dist/latest-v24.x'

async function versionOf(bin: string, env: Record<string, string>): Promise<string | null> {
  try {
    const { stdout } = await run(bin, ['--version'], { env, timeout: 10_000 })
    return stdout.trim() || null
  } catch {
    return null
  }
}

async function gitVersion(env: Record<string, string>): Promise<string | null> {
  if (process.platform === 'darwin' && (await which('git', env.PATH ?? '')) === '/usr/bin/git') {
    // Without Apple's developer tools this git is a stub that opens an install prompt when run.
    try {
      await run('xcode-select', ['-p'], { timeout: 5000 })
    } catch {
      return null
    }
  }
  return (await versionOf('git', env))?.replace(/^git version /, '') ?? null
}

function nodeNote(version: string | null, ok: boolean): string {
  const use = 'Runs your code and the checks.'
  if (!version) return `${use} Not found on this computer.`
  if (!ok) return `${use} Needs 22.18 or newer.`
  return !pickedNode() && existsSync(ownNodeBin()) ? `${use} This copy belongs to the app.` : use
}

function gitNote(version: string | null): string {
  const use = 'Keeps the history of a project.'
  return version ? use : `${use} Not found on this computer.`
}

const GIT_PAGE = 'https://git-scm.com/downloads'

// Tried in order on Linux, each with the arguments that install without asking again.
const LINUX_MANAGERS: [string, string[]][] = [
  ['apt-get', ['install', '-y']],
  ['dnf', ['install', '-y']],
  ['pacman', ['-S', '--noconfirm']],
  ['zypper', ['--non-interactive', 'install']]
]

/**
 * The command that installs Git here: Apple's installer, winget (Windows asks for permission), or
 * the package manager through pkexec (which asks for the password). Null leaves the download page.
 */
async function gitInstaller(path: string): Promise<{ cmd: string; args: string[] } | null> {
  if (process.platform === 'darwin') return { cmd: 'xcode-select', args: ['--install'] }
  if (process.platform === 'win32') {
    if (!(await which('winget', path))) return null
    const args = ['install', '--id', 'Git.Git', '-e', '--source', 'winget']
    return {
      cmd: 'winget',
      args: [...args, '--accept-package-agreements', '--accept-source-agreements']
    }
  }
  if (!(await which('pkexec', path))) return null
  for (const [manager, args] of LINUX_MANAGERS) {
    if (await which(manager, path)) return { cmd: 'pkexec', args: [manager, ...args, 'git'] }
  }
  return null
}

async function status(): Promise<ToolStatus[]> {
  // A tool installed while the app is open is on the shell's PATH, not the one read at start.
  refreshShellPath()
  const env = await labEnv()
  const [node, git] = await Promise.all([versionOf('node', env), gitVersion(env)])
  const nodeOk = !!node && nodeSupported(node)
  const gitInstallable = !git && !!(await gitInstaller(env.PATH ?? ''))
  // Awaited, so the local model's status read after this one already shows the restart.
  if (nodeOk) await startLabModelIfNodeWasMissing()
  return [
    {
      id: 'node',
      label: 'Node.js',
      version: node,
      ok: nodeOk,
      note: nodeNote(node, nodeOk),
      installable: true
    },
    {
      id: 'git',
      label: 'Git',
      version: git,
      ok: !!git,
      note: gitNote(git),
      installable: gitInstallable,
      url: GIT_PAGE
    }
  ]
}

let abort: AbortController | undefined
const CANCELLED = 'The download was cancelled.'

async function download(url: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch(url, { signal }).catch(() => null)
  if (signal.aborted) throw new Error(CANCELLED)
  if (!response?.ok) {
    throw new Error('Could not download Node.js. Check your internet connection and try again.')
  }
  return response
}

async function downloadNode(): Promise<ToolStatus[]> {
  abort = new AbortController()
  const { signal } = abort
  const checksums = await (await download(`${NODE_DIST}/SHASUMS256.txt`, signal)).text()
  const archive = pickNodeArchive(checksums, process.platform, process.arch)
  if (!archive) throw new Error('There is no Node.js download for this kind of computer.')

  const work = join(toolsDir(), '.download')
  await rm(work, { recursive: true, force: true })
  await mkdir(work, { recursive: true })
  try {
    const file = join(work, archive.name)
    const response = await download(`${NODE_DIST}/${archive.name}`, signal)
    const total = Number(response.headers.get('content-length')) || 0
    const hash = createHash('sha256')
    let received = 0
    let shown = -1
    await pipeline(
      Readable.fromWeb(response.body as ReadableStream),
      async function* (chunks) {
        for await (const chunk of chunks) {
          hash.update(chunk)
          received += chunk.length
          const percent = total ? Math.floor((received / total) * 100) : 0
          if (percent !== shown) emit(EVENTS.toolInstall, 'node', (shown = percent) / 100)
          yield chunk
        }
      },
      createWriteStream(file),
      { signal }
    ).catch((error) => {
      throw signal.aborted ? new Error(CANCELLED) : error
    })
    if (hash.digest('hex') !== archive.sha256) {
      throw new Error('The Node.js download was damaged on the way. Try again.')
    }
    await run('tar', ['-xf', file, '-C', work], { timeout: 120_000 })
    await rm(ownNodeDir(), { recursive: true, force: true })
    await rename(join(work, archive.name.replace(/\.(tar\.gz|zip)$/, '')), ownNodeDir())
  } finally {
    await rm(work, { recursive: true, force: true })
  }
  return status()
}

async function installNode(): Promise<ToolInstallResult> {
  const tools = await downloadNode()
  void ensureRuntime()
  return { tools }
}

async function nodeOptions(): Promise<{ options: NodeOption[]; picked: string | null }> {
  const env = await shellEnv()
  const bins = findNodeBins(env.PATH ?? '', app.getPath('home'), ownNodeBin())
  const found = await Promise.all(
    bins.map(async (bin) => ({ bin, version: await versionOf(bin, env) }))
  )
  const options = found
    .filter((option): option is { bin: string; version: string } => !!option.version)
    .map(({ bin, version }) => ({
      bin,
      version,
      source: nodeSource(bin, ownNodeBin()),
      supported: nodeSupported(version)
    }))
    .sort((a, b) => byVersion(a.version, b.version))
  return { options, picked: pickedNode() }
}

/** Only a binary this process found itself and that runs the repos can be picked. */
async function choose(bin: string | null): Promise<ToolStatus[]> {
  if (bin !== null) {
    const option = (await nodeOptions()).options.find((candidate) => candidate.bin === bin)
    if (!option?.supported) throw new Error('Pick a Node.js 22.18 or newer from the list.')
  }
  // The local model keeps the Node it started with: a restart would move it to a new port, which
  // open terminals of AI repos would no longer reach.
  pickNode(bin)
  return status()
}

async function installGit(): Promise<ToolInstallResult> {
  const env = await labEnv()
  const installer = await gitInstaller(env.PATH ?? '')
  if (!installer) return { tools: await status(), url: GIT_PAGE }
  if (process.platform === 'darwin') {
    try {
      await run(installer.cmd, installer.args, { timeout: 10_000 })
    } catch (error) {
      // It also exits non-zero when the tools are already there, which is fine.
      if (!/already installed/i.test(String((error as { stderr?: string }).stderr))) {
        throw new Error("Could not open Apple's installer. Try again.", { cause: error })
      }
    }
    // Apple's installer runs in its own window; the person finishes it there, then checks again.
    return { tools: await status(), waiting: true }
  }
  try {
    await run(installer.cmd, installer.args, { env, timeout: 15 * 60_000 })
  } catch (error) {
    // pkexec exits 126 when the password prompt is closed.
    const cancelled = (error as { code?: unknown }).code === 126
    throw new Error(cancelled ? 'The install was cancelled.' : 'Git did not install. Try again.', {
      cause: error
    })
  }
  // status() reads the PATH again (from the registry on Windows), so the new Git is found.
  return { tools: await status() }
}

const installs = new Map<ToolId, Promise<ToolInstallResult>>()

/** One install per tool at a time; a second call joins the first. */
function install(id: ToolId): Promise<ToolInstallResult> {
  const running = installs.get(id)
  if (running) return running
  const job = (id === 'node' ? installNode() : installGit()).finally(() => installs.delete(id))
  installs.set(id, job)
  return job
}

export function register(): void {
  handle('tools', {
    status,
    install,
    cancelInstall: async () => abort?.abort(),
    nodeOptions,
    pickNode: choose,
    labModel: async () => labModelStatus(),
    restartLabModel
  })
}
