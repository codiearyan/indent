import { spawn } from 'child_process'
import { join } from 'path'

export interface Ide {
  id: string
  label: string
  /** Its name in an Applications folder on macOS. */
  mac: string
  /** Its program inside a program folder on Windows, when it has a usual place there. */
  win?: string
  /** Its command on the PATH. */
  bin: string
}

/** The IDEs "Open in IDE" knows, in the order they are offered. */
export const IDES: Ide[] = [
  {
    id: 'vscode',
    label: 'VS Code',
    mac: 'Visual Studio Code',
    win: 'Microsoft VS Code/Code.exe',
    bin: 'code'
  },
  { id: 'cursor', label: 'Cursor', mac: 'Cursor', win: 'cursor/Cursor.exe', bin: 'cursor' },
  { id: 'zed', label: 'Zed', mac: 'Zed', win: 'Zed/Zed.exe', bin: 'zed' },
  {
    id: 'windsurf',
    label: 'Windsurf',
    mac: 'Windsurf',
    win: 'Windsurf/Windsurf.exe',
    bin: 'windsurf'
  },
  {
    id: 'sublime',
    label: 'Sublime Text',
    mac: 'Sublime Text',
    win: 'Sublime Text/sublime_text.exe',
    bin: 'subl'
  },
  { id: 'webstorm', label: 'WebStorm', mac: 'WebStorm', bin: 'webstorm' }
]

/** One way to start an IDE: a file that must exist or a command on the PATH, and what comes before the folder. */
export interface Candidate {
  file?: string
  bin?: string
  /** The program to run when it is not `file` itself. */
  command?: string
  args: string[]
}

export interface Places {
  home: string
  localAppData?: string
  programFiles?: string
}

/**
 * Where to look for an IDE on a system, best first.
 * shortcut: Windows looks only in the usual program folders, because a command on the PATH there
 * is a .cmd file that needs a shell; look on the PATH too once someone installs elsewhere.
 */
export function launchCandidates(ide: Ide, platform: string, places: Places): Candidate[] {
  if (platform === 'darwin') {
    const apps = ['/Applications', join(places.home, 'Applications')].map((dir) => {
      const file = join(dir, `${ide.mac}.app`)
      return { file, command: '/usr/bin/open', args: ['-a', file] }
    })
    return [...apps, { bin: ide.bin, args: [] }]
  }
  if (platform === 'win32') {
    if (!ide.win) return []
    const win = ide.win
    return [
      places.localAppData && join(places.localAppData, 'Programs', win),
      places.programFiles && join(places.programFiles, win)
    ].flatMap((file) => (file ? { file: file.replaceAll('\\', '/'), args: [] } : []))
  }
  return [{ bin: ide.bin, args: [] }]
}

/**
 * Starts an IDE and tells whether it opened. A program that ends at once without an error handed
 * the folder to a running IDE; one that is still there after `settle` ms is the IDE itself.
 */
export function launch(
  command: string,
  args: string[],
  label: string,
  settle = 1500,
  env?: NodeJS.ProcessEnv
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', env })
    const failed = (): void => reject(new Error(`${label} did not open.`))
    const timer = setTimeout(() => {
      child.unref()
      resolve()
    }, settle)
    child.once('error', () => {
      clearTimeout(timer)
      failed()
    })
    child.once('exit', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else failed()
    })
  })
}
