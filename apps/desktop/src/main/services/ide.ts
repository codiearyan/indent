import { access } from 'fs/promises'
import { homedir } from 'os'
import { screen } from 'electron'
import type { IdeInfo } from '@shared/types'
import { appWindows, handle } from '../ipc'
import { shellEnv } from '../labEnv'
import { workspaceDir } from '../paths'
import { which } from './ai/cli'
import { IDES, launch, launchCandidates, type Ide } from './ideLogic'

/** Width of the window while an issue is worked on in an IDE, so both fit side by side. */
const COMPACT_WIDTH = 480
const COMPACT_MIN_WIDTH = 400

const exists = (file: string): Promise<boolean> =>
  access(file).then(
    () => true,
    () => false
  )

/** The program that starts an IDE here and what comes before the folder, or null when it is not installed. */
async function find(ide: Ide): Promise<{ command: string; args: string[] } | null> {
  const env = await shellEnv()
  const places = {
    home: homedir(),
    localAppData: process.env['LOCALAPPDATA'],
    programFiles: process.env['ProgramFiles']
  }
  for (const candidate of launchCandidates(ide, process.platform, places)) {
    if (candidate.file) {
      if (await exists(candidate.file)) {
        return { command: candidate.command ?? candidate.file, args: candidate.args }
      }
    } else if (candidate.bin) {
      const command = await which(candidate.bin, env['PATH'] ?? '')
      if (command) return { command, args: candidate.args }
    }
  }
  return null
}

async function list(): Promise<IdeInfo[]> {
  const found = await Promise.all(IDES.map(find))
  return IDES.filter((_, i) => found[i]).map(({ id, label }) => ({ id, label }))
}

async function open(ideId: string, labId: string, chapterId: string): Promise<void> {
  const ide = IDES.find((i) => i.id === ideId)
  if (!ide) throw new Error('This IDE is not one Indent knows.')
  // workspaceDir checks both ids, so the folder is always inside the work folder.
  const dir = workspaceDir(String(labId), String(chapterId))
  if (!(await exists(dir))) throw new Error('This issue has no folder yet. Open the issue first.')
  const found = await find(ide)
  if (!found) throw new Error(`${ide.label} was not found on this computer.`)
  await launch(found.command, [...found.args, dir], ide.label, undefined, await shellEnv())
}

let before: { bounds: Electron.Rectangle; minimum: number[] } | null = null

/** Makes the window narrow and docks it to the right of its screen, or gives its size back. */
async function setCompact(compact: boolean): Promise<void> {
  const window = appWindows()[0]
  if (!window || window.isDestroyed()) return
  if (compact && !before && !window.isFullScreen()) {
    if (window.isMaximized()) window.unmaximize()
    before = { bounds: window.getBounds(), minimum: window.getMinimumSize() }
    const area = screen.getDisplayMatching(before.bounds).workArea
    window.setMinimumSize(COMPACT_MIN_WIDTH, before.minimum[1])
    window.setBounds({
      x: area.x + area.width - COMPACT_WIDTH,
      y: area.y,
      width: COMPACT_WIDTH,
      height: area.height
    })
  } else if (!compact && before) {
    window.setMinimumSize(before.minimum[0], before.minimum[1])
    window.setBounds(before.bounds)
    before = null
  }
}

export function register(): void {
  handle('ide', { list, open, setCompact })
}
