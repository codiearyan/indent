import { app } from 'electron'
import { randomUUID } from 'crypto'
import { chmodSync, existsSync, statSync } from 'fs'
import { dirname, join } from 'path'
import { spawn, type IPty } from 'node-pty'
import { EVENTS } from '@shared/types'
import { emit, handle, listen } from '../ipc'
import { firstDirs, labEnv } from '../labEnv'
import { shellLaunch } from '../shellStart'
import { labModelProblem } from './labModel'
import { workspaceDir } from '../paths'

const terminals = new Map<string, IPty>()

// A shell can print thousands of small chunks a second. They go to the page together, a few
// times a frame at most, instead of one message each.
const BATCH_MS = 8
const BATCH_MAX = 64 * 1024

// The npm tarball of node-pty 1.1.0 ships prebuilds/darwin-*/spawn-helper without the executable
// bit, and every spawn fails with "posix_spawnp failed" until it is set.
function ensureSpawnHelperExecutable(): void {
  if (process.platform !== 'darwin') return
  const root = dirname(require.resolve('node-pty/package.json')).replace(
    'app.asar',
    'app.asar.unpacked'
  )
  for (const dir of ['build/Release', `prebuilds/darwin-${process.arch}`]) {
    const helper = join(root, dir, 'spawn-helper')
    try {
      if (existsSync(helper) && (statSync(helper).mode & 0o111) === 0) chmodSync(helper, 0o755)
    } catch (error) {
      console.error(`Could not make ${helper} executable`, error)
    }
  }
}

function size(value: number, fallback: number): number {
  return Number.isInteger(value) && value > 0 ? value : fallback
}

/** Ends every shell; each one reports its exit to the renderer as usual. Also when the window goes. */
export function killAll(): void {
  for (const pty of terminals.values()) pty.kill()
}

export function register(): void {
  ensureSpawnHelperExecutable()

  handle('terminal', {
    create: async ({ labId, chapterId, cols, rows }) => {
      const cwd = workspaceDir(labId, chapterId)
      const windows = process.platform === 'win32'
      const shell = windows ? 'powershell.exe' : process.env.SHELL || '/bin/zsh'
      const base = { ...(await labEnv()), TERM: 'xterm-256color' }
      const { args, env } = windows
        ? { args: [], env: base }
        : shellLaunch(shell, firstDirs(), base)
      const pty = spawn(shell, args, {
        name: 'xterm-256color',
        cwd,
        env,
        cols: size(cols, 80),
        rows: size(rows, 24)
      })
      const id = randomUUID()
      terminals.set(id, pty)
      // Goes in front of the shell's first output: anything sent before the renderer has the id is lost.
      const problem = labModelProblem(labId)
      let pending = problem ? `\x1b[2m${problem}\x1b[0m\r\n` : ''
      let timer: ReturnType<typeof setTimeout> | undefined
      const send = (): void => {
        clearTimeout(timer)
        timer = undefined
        if (pending) emit(EVENTS.terminalData, id, pending)
        pending = ''
      }
      pty.onData((data) => {
        pending += data
        if (pending.length >= BATCH_MAX) send()
        else timer ??= setTimeout(send, BATCH_MS)
      })
      pty.onExit(({ exitCode }) => {
        send()
        terminals.delete(id)
        emit(EVENTS.terminalExit, id, exitCode)
      })
      return id
    }
  })

  listen('terminal', {
    write: (id, data) => {
      if (typeof data === 'string') terminals.get(id)?.write(data)
    },
    resize: (id, cols, rows) => {
      if (size(cols, 0) && size(rows, 0)) terminals.get(id)?.resize(cols, rows)
    },
    kill: (id) => {
      terminals.get(id)?.kill()
      terminals.delete(id)
    }
  })

  app.on('before-quit', () => {
    for (const pty of terminals.values()) pty.kill()
    terminals.clear()
  })
}
