import type { Chapter } from '@shared/types'
import { handle } from '../ipc'
import { contentDir, safeId } from '../paths'
import { getChapter, listLabs, listPaths } from './packs'

export function loadChapter(labId: string, chapterId: string): Promise<Chapter> {
  return getChapter(contentDir(), safeId(labId), safeId(chapterId))
}

export function register(): void {
  handle('content', {
    listLabs: () => listLabs(contentDir()),
    getChapter: loadChapter,
    listPaths: () => listPaths(contentDir())
  })
}
