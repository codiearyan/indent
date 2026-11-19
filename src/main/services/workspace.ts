import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { WorkspaceSnapshot } from '@shared/types'
import { handle } from '../ipc'
import { chapterContentDir, workspaceDir } from '../paths'
import { loadChapter } from './content'
import { copyStarter, emptyDir, readWorkspace, resolveInside } from './workspaceFiles'

async function open(labId: string, chapterId: string, reset = false): Promise<WorkspaceSnapshot> {
  const chapter = await loadChapter(labId, chapterId)
  const dir = workspaceDir(labId, chapterId)
  if (reset) await emptyDir(dir)
  if (reset || !existsSync(dir)) {
    await copyStarter(join(chapterContentDir(labId, chapterId), 'starter'), dir)
  }
  return { dir, files: await readWorkspace(dir, chapter.files) }
}

async function write(
  labId: string,
  chapterId: string,
  path: string,
  content: string
): Promise<void> {
  const file = resolveInside(workspaceDir(labId, chapterId), path)
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
