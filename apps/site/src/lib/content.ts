import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { patterns } from '../../../desktop/src/renderer/src/features/dsa/registry'

// Patterns are plain data and logic with no React, so the site reads the app's own list.
export const listPatterns = (): { title: string; group: string; time: string }[] =>
  patterns.map((p) => ({ title: p.title, group: p.group, time: p.complexity.time }))

// The shared repo packs at the monorepo root; the site builds with apps/site as the working directory.
const contentDir = resolve(process.cwd(), '..', '..', 'content')

export interface Issue {
  id: string
  title: string
  tasks: number
}

export interface Repo {
  id: string
  title: string
  description: string
  problem: string
  category: string
  language: string
  tags: string[]
  issues: Issue[]
  tasks: number
}

export interface Roadmap {
  id: string
  title: string
  tagline: string
  description: string
  stages: { title: string; labs: string[] }[]
}

export interface Task {
  id: string
  title: string
  hints: string[]
}

interface LabFile {
  id: string
  title: string
  description: string
  category: string
  language: string
  tags: string[]
  parts: { title: string; chapters: string[] }[]
}

interface ChapterFile {
  id: string
  title: string
  tasks: Task[]
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T

const readChapter = (labId: string, chapterId: string): ChapterFile =>
  readJson<ChapterFile>(join(contentDir, 'labs', labId, chapterId, 'chapter.json'))

const firstSentence = (text: string): string => text.split(/(?<=\.)\s+(?=[A-Z])/)[0]

export function listRepos(): Repo[] {
  return readdirSync(join(contentDir, 'labs'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const lab = readJson<LabFile>(join(contentDir, 'labs', entry.name, 'lab.json'))
      const issues = lab.parts
        .flatMap((part) => part.chapters)
        .map((chapterId) => {
          const chapter = readChapter(lab.id, chapterId)
          return { id: chapter.id, title: chapter.title, tasks: chapter.tasks.length }
        })
      return {
        id: lab.id,
        title: lab.title,
        description: lab.description,
        problem: firstSentence(lab.description),
        category: lab.category,
        language: lab.language,
        tags: lab.tags,
        issues,
        tasks: issues.reduce((n, issue) => n + issue.tasks, 0)
      }
    })
}

export function listRoadmaps(): Roadmap[] {
  return readJson<Roadmap[]>(join(contentDir, 'paths.json'))
}

export function readTask(labId: string, chapterId: string, taskId: string): Task {
  const task = readChapter(labId, chapterId).tasks.find((t) => t.id === taskId)
  if (!task) throw new Error(`No task ${labId}/${chapterId}/${taskId}`)
  return task
}

export function readSource(labId: string, path: string): string {
  return readFileSync(join(contentDir, 'labs', labId, path), 'utf8')
}
