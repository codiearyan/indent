import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { WorkspaceSnapshot } from '@shared/types'
import { handle } from '../ipc'
import { chapterContentDir, workspaceDir } from '../paths'
import { loadChapter } from './content'
import { copyStarter, emptyDir, readWorkspace } from './workspaceFiles'

const queues = new Map<string, Promise<unknown>>()

// Two opens of the same new workspace would both copy the starter files and collide.
function oneAtATime<T>(key: string, job: () => Promise<T>): Promise<T> {
  const result = (queues.get(key) ?? Promise.resolve()).then(job, job)
  queues.set(
    key,
    result.catch(() => {})
  )
  return result
}

function open(labId: string, chapterId: string, reset = false): Promise<WorkspaceSnapshot> {
  const dir = workspaceDir(labId, chapterId)
  return oneAtATime(dir, async () => {
    const chapter = await loadChapter(labId, chapterId)
    const starterDir = join(chapterContentDir(labId, chapterId), 'starter')
    if (reset) await emptyDir(dir)
    if (reset || !existsSync(dir)) await copyStarter(starterDir, dir)
    const starter = existsSync(starterDir) ? await readWorkspace(starterDir, []) : []
    return {
      dir,
      files: await readWorkspace(dir, chapter.files),
      starter: Object.fromEntries(starter.map((f) => [f.path, f.content]))
    }
  })
}

async function write(
  labId: string,
  chapterId: string,
  path: string,
  content: string
): Promise<void> {
  const file = join(workspaceDir(labId, chapterId), path)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, content)
}

export function register(): void {
  handle('workspace', {
    open: (labId, chapterId) => open(labId, chapterId),
    writeFile: write,
    reset: (labId, chapterId) => open(labId, chapterId, true)
  })
}
