import { mkdtemp, mkdir, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { getChapter, listLabs, listPaths } from './packs'

let root: string

async function put(path: string, content: unknown): Promise<void> {
  const file = join(root, path)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, typeof content === 'string' ? content : JSON.stringify(content))
}

const task = (id: string, points: number): object => ({
  id,
  title: id,
  file: 'index.ts',
  description: '',
  nextSteps: [],
  hints: ['a', 'b', 'c'],
  points
})

const chapter = (id: string, tasks: object[]): object => ({
  id,
  title: `Title ${id}`,
  files: ['index.ts'],
  terminal: { description: '' },
  tasks
})

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'labbench-packs-'))
  await put('paths.json', [{ id: 'p', title: 'P', tagline: '', description: '', stages: [] }])
  await put('labs/alpha/lab.json', {
    id: 'alpha',
    title: 'Alpha',
    description: '',
    category: 'AI engineering',
    language: 'typescript',
    tags: [],
    parts: [
      { title: 'One', chapters: ['c1', 'c2'] },
      { title: 'Two', chapters: ['c3'] }
    ]
  })
  await put('labs/alpha/c1/chapter.json', chapter('c1', [task('t1', 10), task('t2', 20)]))
  await put('labs/alpha/c2/chapter.json', chapter('c2', [task('t1', 5)]))
  await put('labs/alpha/c3/chapter.json', chapter('c3', []))
  for (const id of ['c1', 'c2', 'c3']) await put(`labs/alpha/${id}/lesson.md`, `## ${id}`)
  await put('labs/broken/lab.json', '{ not json')
})

describe('packs', () => {
  it('lists labs with flattened, numbered chapters and skips broken ones', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const labs = await listLabs(root)
    expect(warn).toHaveBeenCalledOnce()
    expect(labs.map((lab) => lab.id)).toEqual(['alpha'])
    expect(labs[0].chapters).toEqual([
      { id: 'c1', number: 1, title: 'Title c1', part: 'One', taskCount: 2, points: 30 },
      { id: 'c2', number: 2, title: 'Title c2', part: 'One', taskCount: 1, points: 5 },
      { id: 'c3', number: 3, title: 'Title c3', part: 'Two', taskCount: 0, points: 0 }
    ])
  })

  it('returns an empty list when there are no labs', async () => {
    expect(await listLabs(join(root, 'missing'))).toEqual([])
  })

  it('reads a chapter with lesson and neighbours across parts', async () => {
    const c2 = await getChapter(root, 'alpha', 'c2')
    expect(c2).toMatchObject({
      id: 'c2',
      labId: 'alpha',
      labTitle: 'Alpha',
      number: 2,
      lesson: '## c2',
      prevChapterId: 'c1',
      nextChapterId: 'c3'
    })
    const c1 = await getChapter(root, 'alpha', 'c1')
    expect(c1.prevChapterId).toBeUndefined()
    expect(c1.tasks).toHaveLength(2)
  })

  it('rejects a chapter that is not listed in the lab', async () => {
    await expect(getChapter(root, 'alpha', 'nope')).rejects.toThrow('not part of lab')
  })

  it('reads paths', async () => {
    expect((await listPaths(root))[0].id).toBe('p')
  })
})
