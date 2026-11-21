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
import type { NodeOption, ToolStatus } from '@shared/types'
import { handle } from '../ipc'
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
  if (version) return use
  return process.platform === 'darwin'
    ? `${use} To get it, run xcode-select --install in a terminal.`
    : `${use} Get it from git-scm.com.`
}

async function status(): Promise<ToolStatus[]> {
  // A tool installed while the app is open is on the shell's PATH, not the one read at start.
  refreshShellPath()
  const env = await labEnv()
  const [node, git] = await Promise.all([versionOf('node', env), gitVersion(env)])
  const nodeOk = !!node && nodeSupported(node)
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
    { id: 'git', label: 'Git', version: git, ok: !!git, note: gitNote(git), installable: false }
  ]
}

async function download(url: string): Promise<Response> {
  const response = await fetch(url).catch(() => null)
  if (!response?.ok) {
    throw new Error('Could not download Node.js. Check your internet connection and try again.')
  }
  return response
}

async function downloadNode(): Promise<ToolStatus[]> {
  const checksums = await (await download(`${NODE_DIST}/SHASUMS256.txt`)).text()
  const archive = pickNodeArchive(checksums, process.platform, process.arch)
  if (!archive) throw new Error('There is no Node.js download for this kind of computer.')

  const work = join(toolsDir(), '.download')
  await rm(work, { recursive: true, force: true })
  await mkdir(work, { recursive: true })
  try {
    const file = join(work, archive.name)
    const { body } = await download(`${NODE_DIST}/${archive.name}`)
    const hash = createHash('sha256')
    await pipeline(
      Readable.fromWeb(body as ReadableStream),
      async function* (chunks) {
        for await (const chunk of chunks) {
          hash.update(chunk)
          yield chunk
        }
      },
      createWriteStream(file)
    )
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

let installing: Promise<ToolStatus[]> | undefined

function installNode(): Promise<ToolStatus[]> {
  return (installing ??= downloadNode()
    .then((tools) => {
      void ensureRuntime()
      return tools
    })
    .finally(() => (installing = undefined)))
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
  pickNode(bin)
  // The local model was started with the Node from before.
  void restartLabModel()
  return status()
}

/** Opens Apple's installer window; the person finishes it there, then checks again. */
async function installGit(): Promise<void> {
  if (process.platform !== 'darwin') throw new Error('Get Git from git-scm.com/downloads.')
  try {
    await run('xcode-select', ['--install'], { timeout: 10_000 })
  } catch (error) {
    // It also exits non-zero when the tools are already there, which is fine.
    if (!/already installed/i.test(String((error as { stderr?: string }).stderr))) {
      throw new Error(
        "Could not open Apple's installer. Run xcode-select --install in a terminal.",
        {
          cause: error
        }
      )
    }
  }
}

export function register(): void {
  handle('tools', {
    status,
    installNode,
    nodeOptions,
    pickNode: choose,
    installGit,
    labModel: async () => labModelStatus(),
    restartLabModel
  })
}
