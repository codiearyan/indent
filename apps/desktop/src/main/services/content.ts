import { readFile } from 'fs/promises'
import { join } from 'path'
import type { Chapter } from '@shared/types'
import { handle } from '../ipc'
import { chapterContentDir, contentDir, safeId } from '../paths'
import { getChapter, listLabs, listPaths } from './packs'

export function loadChapter(labId: string, chapterId: string): Promise<Chapter> {
  return getChapter(contentDir(), safeId(labId), safeId(chapterId))
}

/** A recording exists only for the exact text it was made from, so the key is its file name. */
async function narration(
  labId: string,
  chapterId: string,
  key: string
): Promise<Uint8Array | null> {
  if (!/^[0-9a-f]{8}$/.test(key)) throw new Error(`Invalid narration key: ${key}`)
  return readFile(join(chapterContentDir(labId, chapterId), 'audio', `${key}.ogg`)).catch(
    () => null
  )
}

export function register(): void {
  handle('content', {
    listLabs: () => listLabs(contentDir()),
    getChapter: loadChapter,
    listPaths: () => listPaths(contentDir()),
    narration
  })
}
