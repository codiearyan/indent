import { app } from 'electron'
import { createHash } from 'crypto'
import { createWriteStream, existsSync } from 'fs'
import { mkdir, readdir, rename, rm, writeFile } from 'fs/promises'
import { delimiter, join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import type { ReadableStream } from 'stream/web'
import type { NodeOption, ToolId, ToolInstallResult, ToolStatus } from '@shared/types'
import { EVENTS } from '@shared/types'
import { emit, handle } from '../ipc'
import { labEnv, pickedNode, pickNode, refreshShellPath, shellEnv } from '../labEnv'
import { ownJavaBin, ownJavaDir, ownNodeBin, ownNodeDir, python3ShimDir, toolsDir } from '../paths'
import { which } from './ai/cli'
import { ensureRuntime } from './checks'
import { labModelStatus, restartLabModel, startLabModelIfNodeWasMissing } from './labModel'
import { nodeSupported } from './grader'
import { javaListUrl, pickJavaArchive } from './javaArchive'
import { pickNodeArchive } from './nodeArchive'
import { byVersion, findNodeBins, nodeSource } from './nodeOptions'
import {
  cppVersion,
  installerFor,
  javacVersion,
  javaSupported,
  javaVersion,
  LINUX_MANAGERS,
  PYTHON3_SHIM,
  pythonSupported,
  pythonVersion,
  wantsPython3Shim,
  type Installer,
  type SystemTool
} from './toolLogic'
import { run } from '../run'

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

type Env = Record<string, string>

const XCODE: [string, string[]] = ['xcode-select', ['-p']]
const JAVA_HOME: [string, string[]] = ['/usr/libexec/java_home', []]

/** On a Mac, /usr/bin/git, python3, g++, clang++ and javac open an install prompt when the tool
 * behind them is missing. `probe` says without a prompt whether it is there. */
async function stubbed(bin: string, env: Env, probe: [string, string[]]): Promise<boolean> {
  if (process.platform !== 'darwin' || (await which(bin, env.PATH ?? '')) !== `/usr/bin/${bin}`) {
    return false
  }
  try {
    await run(probe[0], probe[1], { timeout: 5000 })
    return false
  } catch {
    return true
  }
}

/** Both output streams of a tool, or null when it is missing, a stub or fails. */
async function outputOf(
  bin: string,
  args: string[],
  env: Env,
  probe: [string, string[]] = XCODE
): Promise<string | null> {
  if (await stubbed(bin, env, probe)) return null
  try {
    const { stdout, stderr } = await run(bin, args, { env, timeout: 10_000 })
    return `${stdout}\n${stderr}`
  } catch {
    return null
  }
}

async function gitVersion(env: Env): Promise<string | null> {
  if (await stubbed('git', env, XCODE)) return null
  return (await versionOf('git', env))?.replace(/^git version /, '') ?? null
}

/** Python 3 as `python3`, else as `python`; `python3` alone is null when only `python` has it. */
async function pythonVersions(
  env: Env
): Promise<{ python3: string | null; python: string | null }> {
  // The app's own `python3` is left out, or it would always find itself.
  const path = (env.PATH ?? '').split(delimiter).filter((dir) => dir !== python3ShimDir())
  const bare = { ...env, PATH: path.join(delimiter) }
  const read = async (bin: string): Promise<string | null> =>
    pythonVersion((await outputOf(bin, ['--version'], bare)) ?? '')
  const python3 = await read('python3')
  return { python3, python: python3 ? null : await read('python') }
}

/** Writes or removes the app's own `python3` on Windows; elsewhere there is none. */
async function placePython3Shim(python3: string | null, python: string | null): Promise<void> {
  if (process.platform !== 'win32') return
  if (wantsPython3Shim(process.platform, python3, python)) {
    await mkdir(python3ShimDir(), { recursive: true })
    await writeFile(join(python3ShimDir(), 'python3.cmd'), PYTHON3_SHIM)
  } else {
    await rm(python3ShimDir(), { recursive: true, force: true })
  }
}

async function javaFound(env: Env): Promise<{ javac: string | null; java: string | null }> {
  const javac = javacVersion((await outputOf('javac', ['-version'], env, JAVA_HOME)) ?? '')
  if (javac) return { javac, java: null }
  return { javac, java: javaVersion((await outputOf('java', ['-version'], env, JAVA_HOME)) ?? '') }
}

async function cppFound(env: Env): Promise<string | null> {
  const output =
    (await outputOf('g++', ['--version'], env)) ?? (await outputOf('clang++', ['--version'], env))
  return output && cppVersion(output)
}

function nodeNote(version: string | null, ok: boolean): string {
  const use = 'Runs your code and the checks.'
  if (!version) return `${use} Not found on this computer.`
  if (!ok) return `${use} Needs 22.18 or newer.`
  return !pickedNode() && existsSync(ownNodeBin()) ? `${use} This copy belongs to the app.` : use
}

function toolNote(use: string, version: string | null, ok: boolean, min = ''): string {
  if (!version) return `${use} Not found on this computer.`
  return ok ? use : `${use} Needs ${min} or newer; this computer has ${version}.`
}

const LABELS: Record<SystemTool, string> = {
  git: 'Git',
  python: 'Python',
  java: 'Java',
  cpp: 'C++'
}

const PAGES: Record<SystemTool, string> = {
  git: 'https://git-scm.com/downloads',
  python: 'https://www.python.org/downloads/',
  java: 'https://adoptium.net/',
  cpp: 'https://isocpp.org/get-started'
}

/** Where the system has no installer for Java, the app downloads a kit of its own. */
const javaList = (): string | null => javaListUrl(process.platform, process.arch)

async function installer(id: SystemTool, path: string): Promise<Installer | null> {
  const bins = ['winget', 'pkexec', ...LINUX_MANAGERS.map(([name]) => name)]
  const found = await Promise.all(bins.map(async (bin) => ((await which(bin, path)) ? bin : '')))
  return installerFor(id, process.platform, new Set(found))
}

async function status(): Promise<ToolStatus[]> {
  // A tool installed while the app is open is on the shell's PATH, not the one read at start.
  refreshShellPath()
  const env = await labEnv()
  const [node, git, { python3, python }, { javac, java }, cpp] = await Promise.all([
    versionOf('node', env),
    gitVersion(env),
    pythonVersions(env),
    javaFound(env),
    cppFound(env)
  ])
  await placePython3Shim(python3, python)
  const nodeOk = !!node && nodeSupported(node)
  const py = python3 ?? python
  const system = async (
    id: SystemTool,
    version: string | null,
    ok: boolean,
    note: string
  ): Promise<ToolStatus> => ({
    id,
    label: LABELS[id],
    version,
    ok,
    note,
    installable:
      !ok && (!!(await installer(id, env.PATH ?? '')) || (id === 'java' && !!javaList())),
    url: PAGES[id]
  })
  const pyOk = !!py && pythonSupported(py)
  const javaOk = !!javac && javaSupported(javac)
  const javaUse = 'Builds and runs the Java repos.'
  const others = await Promise.all([
    system('git', git, !!git, toolNote('Keeps the history of a project.', git, !!git)),
    system('python', py, pyOk, toolNote('Runs the Python repos.', py, pyOk, '3.9')),
    system(
      'java',
      javac,
      javaOk,
      java
        ? `${javaUse} Java ${java} is here, but not javac, the compiler that comes with a JDK.`
        : javaOk && existsSync(ownJavaBin())
          ? `${javaUse} This copy belongs to the app.`
          : toolNote(javaUse, javac, javaOk, '17')
    ),
    system('cpp', cpp, !!cpp, toolNote('Builds the C++ repos.', cpp, !!cpp))
  ])
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
    ...others
  ]
}

const aborts = new Set<AbortController>()
const CANCELLED = 'The download was cancelled.'

async function download(url: string, signal: AbortSignal, label: string): Promise<Response> {
  const response = await fetch(url, { signal }).catch(() => null)
  if (signal.aborted) throw new Error(CANCELLED)
  if (!response?.ok) {
    throw new Error(`Could not download ${label}. Check your internet connection and try again.`)
  }
  return response
}

interface Archive {
  url: string
  sha256: string
  zip: boolean
}

/** Downloads a tool's archive, checks it, and puts the one folder it holds at `dest`. */
async function installArchive(
  id: 'node' | 'java',
  find: (signal: AbortSignal) => Promise<Archive | null>,
  dest: string
): Promise<ToolStatus[]> {
  const label = id === 'node' ? 'Node.js' : LABELS[id]
  const abort = new AbortController()
  aborts.add(abort)
  const { signal } = abort
  const work = join(toolsDir(), `.download-${id}`)
  try {
    const archive = await find(signal)
    if (!archive) throw new Error(`There is no ${label} download for this kind of computer.`)
    const out = join(work, 'out')
    await rm(work, { recursive: true, force: true })
    await mkdir(out, { recursive: true })
    const file = join(work, archive.zip ? 'archive.zip' : 'archive.tar.gz')
    const response = await download(archive.url, signal, label)
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
          if (percent !== shown) emit(EVENTS.toolInstall, id, (shown = percent) / 100)
          yield chunk
        }
      },
      createWriteStream(file),
      { signal }
    ).catch((error) => {
      throw signal.aborted ? new Error(CANCELLED) : error
    })
    if (hash.digest('hex') !== archive.sha256) {
      throw new Error(`The ${label} download was damaged on the way. Try again.`)
    }
    await run('tar', ['-xf', file, '-C', out], { timeout: 120_000 })
    const folder = (await readdir(out, { withFileTypes: true })).find((entry) =>
      entry.isDirectory()
    )
    if (!folder) throw new Error(`The ${label} download was damaged on the way. Try again.`)
    await rm(dest, { recursive: true, force: true })
    await rename(join(out, folder.name), dest)
  } finally {
    aborts.delete(abort)
    await rm(work, { recursive: true, force: true })
  }
  return status()
}

async function nodeArchive(signal: AbortSignal): Promise<Archive | null> {
  const checksums = await (await download(`${NODE_DIST}/SHASUMS256.txt`, signal, 'Node.js')).text()
  const archive = pickNodeArchive(checksums, process.platform, process.arch)
  return (
    archive && {
      url: `${NODE_DIST}/${archive.name}`,
      sha256: archive.sha256,
      zip: archive.name.endsWith('.zip')
    }
  )
}

async function installNode(): Promise<ToolInstallResult> {
  const tools = await installArchive('node', nodeArchive, ownNodeDir())
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

async function installSystemTool(id: SystemTool): Promise<ToolInstallResult> {
  const env = await labEnv()
  const command = await installer(id, env.PATH ?? '')
  const list = id === 'java' && !command ? javaList() : null
  if (list) {
    const find = async (signal: AbortSignal): Promise<Archive | null> =>
      pickJavaArchive(await (await download(list, signal, 'Java')).json().catch(() => null))
    return { tools: await installArchive('java', find, ownJavaDir()) }
  }
  if (!command) return { tools: await status(), url: PAGES[id] }
  if (process.platform === 'darwin') {
    try {
      await run(command.cmd, command.args, { timeout: 10_000 })
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
    await run(command.cmd, command.args, { env, timeout: 15 * 60_000 })
  } catch (error) {
    // pkexec exits 126 when the password prompt is closed.
    const cancelled = (error as { code?: unknown }).code === 126
    const message = cancelled
      ? 'The install was cancelled.'
      : `${LABELS[id]} did not install. Try again.`
    throw new Error(message, { cause: error })
  }
  // status() reads the PATH again (from the registry on Windows), so the new tool is found.
  return { tools: await status() }
}

const installs = new Map<ToolId, Promise<ToolInstallResult>>()

/** One install per tool at a time; a second call joins the first. */
function install(id: ToolId): Promise<ToolInstallResult> {
  const running = installs.get(id)
  if (running) return running
  const job = (id === 'node' ? installNode() : installSystemTool(id)).finally(() =>
    installs.delete(id)
  )
  installs.set(id, job)
  return job
}

export function register(): void {
  handle('tools', {
    status,
    install,
    cancelInstall: async () => aborts.forEach((abort) => abort.abort()),
    nodeOptions,
    pickNode: choose,
    labModel: async () => labModelStatus(),
    restartLabModel
  })
}
