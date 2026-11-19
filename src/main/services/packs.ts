import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { Chapter, ChapterDef, LabMeta, LabSummary, PathDef } from '../../shared/types'

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T
}

const readLab = (root: string, labId: string): Promise<LabMeta> =>
  readJson<LabMeta>(join(root, 'labs', labId, 'lab.json'))

const readChapterDef = (root: string, labId: string, chapterId: string): Promise<ChapterDef> =>
  readJson<ChapterDef>(join(root, 'labs', labId, chapterId, 'chapter.json'))

async function readLabSummary(root: string, labId: string): Promise<LabSummary> {
  const lab = await readLab(root, labId)
  const chapters: LabSummary['chapters'] = []
  for (const part of lab.parts) {
    for (const chapterId of part.chapters) {
      const def = await readChapterDef(root, labId, chapterId)
      chapters.push({
        id: chapterId,
        number: chapters.length + 1,
        title: def.title,
        part: part.title,
        taskCount: def.tasks.length,
        points: def.tasks.reduce((sum, task) => sum + task.points, 0)
      })
    }
  }
  return { ...lab, id: labId, chapters }
}

export async function listLabs(root: string): Promise<LabSummary[]> {
  const entries = await readdir(join(root, 'labs'), { withFileTypes: true }).catch(() => [])
  const labs: LabSummary[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    try {
      labs.push(await readLabSummary(root, entry.name))
    } catch (error) {
      console.warn(`Skipping lab ${entry.name}:`, error)
    }
  }
  return labs
}

/** Ids must already be validated with safeId. */
export async function getChapter(root: string, labId: string, chapterId: string): Promise<Chapter> {
  const lab = await readLab(root, labId)
  const order = lab.parts.flatMap((part) => part.chapters)
  const index = order.indexOf(chapterId)
  if (index === -1) throw new Error(`Issue ${chapterId} is not part of repo ${labId}`)
  const def = await readChapterDef(root, labId, chapterId)
  const lesson = await readFile(join(root, 'labs', labId, chapterId, 'lesson.md'), 'utf8')
  return {
    ...def,
    id: chapterId,
    labId,
    labTitle: lab.title,
    number: index + 1,
    lesson,
    prevChapterId: order[index - 1],
    nextChapterId: order[index + 1]
  }
}

export const listPaths = (root: string): Promise<PathDef[]> =>
  readJson<PathDef[]>(join(root, 'paths.json'))
