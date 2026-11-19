import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// The shared lab packs at the repo root; next build runs with apps/site as the working directory.
const contentDir = join(process.cwd(), '..', '..', 'content')

export interface Lab {
  id: string
  title: string
  description: string
  category: string
  kind: 'lab' | 'challenge'
  difficulty?: 'easy' | 'medium' | 'hard'
  chapters: number
}

export interface LearningPath {
  id: string
  title: string
  tagline: string
  stages: { title: string; labs: string[] }[]
}

interface LabFile extends Omit<Lab, 'chapters'> {
  parts: { chapters: string[] }[]
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T

export function listLabs(): Lab[] {
  return readdirSync(join(contentDir, 'labs')).map((id) => {
    const { parts, ...lab } = readJson<LabFile>(join(contentDir, 'labs', id, 'lab.json'))
    return { ...lab, chapters: parts.reduce((n, p) => n + p.chapters.length, 0) }
  })
}

export function listPaths(): LearningPath[] {
  return readJson<LearningPath[]>(join(contentDir, 'paths.json'))
}
