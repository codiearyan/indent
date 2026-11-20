import { execFile } from 'child_process'
import { createWriteStream, existsSync } from 'fs'
import { mkdir, rename, rm } from 'fs/promises'
import { join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import type { ReadableStream } from 'stream/web'
import { promisify } from 'util'
import type { ToolStatus } from '@shared/types'
import { handle } from '../ipc'
import { labEnv } from '../labEnv'
import { ownNodeBin, ownNodeDir, toolsDir } from '../paths'
import { which } from './ai/cli'
import { nodeSupported } from './grader'
import { pickNodeArchive } from './nodeArchive'

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
  return existsSync(ownNodeBin()) ? `${use} This copy belongs to the app.` : use
}

function gitNote(version: string | null): string {
  const use = 'Used by the repos about git.'
  if (version) return use
  return process.platform === 'darwin'
    ? `${use} To get it, run xcode-select --install in a terminal.`
    : `${use} Get it from git-scm.com.`
}

async function status(): Promise<ToolStatus[]> {
  const env = await labEnv()
  const [node, git] = await Promise.all([versionOf('node', env), gitVersion(env)])
  const nodeOk = !!node && nodeSupported(node)
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
    await pipeline(Readable.fromWeb(body as ReadableStream), createWriteStream(file))
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
  return (installing ??= downloadNode().finally(() => (installing = undefined)))
}

export function register(): void {
  handle('tools', { status, installNode })
}
