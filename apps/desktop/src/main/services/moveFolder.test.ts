import { mkdtemp, mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  NEW_FOLDER,
  bringRepoBack,
  clearIfNoWork,
  isEmptyFolder,
  isInsideOrSame,
  moveContents,
  moveRepos,
  planMove,
  reposIn,
  sizeOf
} from './moveFolder'

async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'indent-move-'))
}

describe('moveContents', () => {
  it('moves the work and the runtime, drops skipped entries and removes the old folder', async () => {
    const base = await tempDir()
    const from = join(base, 'old')
    const to = join(base, 'new')
    await mkdir(join(from, 'js-foundations', 'variables'), { recursive: true })
    await writeFile(join(from, 'js-foundations', 'variables', 'index.js'), 'let a = 1')
    await mkdir(join(from, 'node_modules', 'vitest'), { recursive: true })
    await writeFile(join(from, 'package.json'), '{}')
    await mkdir(join(from, '.sandbox', 'tmp'), { recursive: true })

    await moveContents(from, to, ['.sandbox'])

    expect(await readFile(join(to, 'js-foundations', 'variables', 'index.js'), 'utf8')).toBe(
      'let a = 1'
    )
    expect(existsSync(join(to, 'node_modules', 'vitest'))).toBe(true)
    expect(existsSync(join(to, 'package.json'))).toBe(true)
    expect(existsSync(join(to, '.sandbox'))).toBe(false)
    expect(existsSync(from)).toBe(false)
  })

  it('puts everything back when one entry cannot move', async () => {
    const base = await tempDir()
    const from = join(base, 'old')
    const to = join(base, 'new')
    await mkdir(join(from, 'a-lab', 'issue'), { recursive: true })
    await writeFile(join(from, 'a-lab', 'issue', 'index.js'), 'mine')
    await mkdir(join(from, 'b-lab', 'issue'), { recursive: true })
    // A folder with content already at the target makes the second rename fail.
    await mkdir(join(to, 'b-lab', 'taken'), { recursive: true })

    await expect(moveContents(from, to)).rejects.toThrow()

    expect(await readFile(join(from, 'a-lab', 'issue', 'index.js'), 'utf8')).toBe('mine')
    expect(existsSync(join(from, 'b-lab', 'issue'))).toBe(true)
    expect(existsSync(join(to, 'a-lab'))).toBe(false)
    expect(existsSync(join(to, 'b-lab', 'taken'))).toBe(true)
  })

  it('creates the new folder when there is nothing to move', async () => {
    const base = await tempDir()
    await moveContents(join(base, 'missing'), join(base, 'new'))
    expect(existsSync(join(base, 'new'))).toBe(true)
  })
})

describe('isEmptyFolder', () => {
  it('counts a missing folder and one with only system files as empty', async () => {
    const base = await tempDir()
    expect(await isEmptyFolder(join(base, 'missing'))).toBe(true)
    await writeFile(join(base, '.DS_Store'), '')
    expect(await isEmptyFolder(base)).toBe(true)
    await writeFile(join(base, 'notes.txt'), 'mine')
    expect(await isEmptyFolder(base)).toBe(false)
  })
})

describe('isInsideOrSame', () => {
  it('tells a folder inside another from a sibling', () => {
    expect(isInsideOrSame('/home/a/Indent/sub', '/home/a/Indent')).toBe(true)
    expect(isInsideOrSame('/home/a/Indent', '/home/a/Indent')).toBe(true)
    expect(isInsideOrSame('/home/a/Indent2', '/home/a/Indent')).toBe(false)
  })
})

describe('planMove', () => {
  it('uses an empty folder, or a new folder inside one that has files', async () => {
    const base = await tempDir()
    const current = join(base, 'Indent')
    const app = join(base, 'app')
    await mkdir(join(base, 'empty'))
    expect(await planMove(current, join(base, 'empty'), app)).toEqual({
      to: join(base, 'empty'),
      inside: false
    })

    await mkdir(join(base, 'code'))
    await writeFile(join(base, 'code', 'notes.txt'), 'x')
    expect(await planMove(current, join(base, 'code'), app)).toEqual({
      to: join(base, 'code', NEW_FOLDER),
      inside: true
    })

    await mkdir(join(base, 'code', NEW_FOLDER))
    await writeFile(join(base, 'code', NEW_FOLDER, 'other.txt'), 'x')
    await expect(planMove(current, join(base, 'code'), app)).rejects.toThrow('Pick another folder')
  })

  it('refuses the parent or child and the app', async () => {
    const base = await tempDir()
    const current = join(base, 'Indent')
    const app = join(base, 'app')
    await expect(planMove(current, base, app)).rejects.toThrow('does not hold it')
    await expect(planMove(current, join(current, 'sub'), app)).rejects.toThrow('not inside')
    await expect(planMove(current, join(app, 'x'), app)).rejects.toThrow('outside the app')
    expect(await planMove(current, current, app)).toEqual({ to: current, inside: false })
  })
})

async function workFolder(base: string): Promise<string> {
  const root = join(base, 'old')
  for (const [lab, issue] of [
    ['a-lab', 'one'],
    ['a-lab', 'two'],
    ['b-lab', 'one'],
    ['c-lab', 'one']
  ]) {
    await mkdir(join(root, lab, issue), { recursive: true })
    await writeFile(join(root, lab, issue, 'index.js'), `${lab} ${issue}`)
  }
  await mkdir(join(root, 'node_modules', 'vitest'), { recursive: true })
  await writeFile(join(root, 'package.json'), '{}')
  await mkdir(join(root, '.sandbox'), { recursive: true })
  return root
}

describe('reposIn', () => {
  it('lists the repos with work and how many issues each has', async () => {
    const root = await workFolder(await tempDir())
    await mkdir(join(root, 'empty-lab'))
    expect(await reposIn(root)).toEqual([
      { labId: 'a-lab', issues: 2 },
      { labId: 'b-lab', issues: 1 },
      { labId: 'c-lab', issues: 1 }
    ])
  })

  it('finds nothing in a missing folder', async () => {
    expect(await reposIn(join(await tempDir(), 'missing'))).toEqual([])
  })
})

describe('moveRepos', () => {
  it('moves the repo tools and the chosen repos, and leaves the others', async () => {
    const base = await tempDir()
    const from = await workFolder(base)
    const to = join(base, 'new')
    const seen: (string | null)[] = []

    const result = await moveRepos(from, to, ['a-lab', 'c-lab'], (p) => seen.push(p.labId))

    expect(result).toEqual({ moved: ['a-lab', 'c-lab'], failed: null })
    // The same drive: renames, nothing to measure.
    expect(seen).toEqual([null, 'a-lab', 'c-lab'])
    expect(await readFile(join(to, 'a-lab', 'two', 'index.js'), 'utf8')).toBe('a-lab two')
    expect(existsSync(join(to, 'node_modules', 'vitest'))).toBe(true)
    expect(existsSync(join(to, 'b-lab'))).toBe(false)
    expect(await readFile(join(from, 'b-lab', 'one', 'index.js'), 'utf8')).toBe('b-lab one')
    expect(existsSync(join(from, 'a-lab'))).toBe(false)
  })

  it('stops at a repo that cannot move and keeps it and the rest in the old folder', async () => {
    const base = await tempDir()
    const from = await workFolder(base)
    const to = join(base, 'new')
    await mkdir(join(to, 'b-lab', 'taken'), { recursive: true })

    const result = await moveRepos(from, to, ['a-lab', 'b-lab', 'c-lab'])

    expect(result.moved).toEqual(['a-lab'])
    expect(result.failed?.labId).toBe('b-lab')
    expect(existsSync(join(to, 'a-lab', 'one'))).toBe(true)
    expect(existsSync(join(from, 'b-lab', 'one'))).toBe(true)
    expect(existsSync(join(from, 'c-lab', 'one'))).toBe(true)
  })
})

describe('bringRepoBack', () => {
  it('brings the issues of a repo over and keeps an issue already started here', async () => {
    const base = await tempDir()
    const earlier = await workFolder(base)
    const current = join(base, 'new')
    await mkdir(join(current, 'a-lab', 'two'), { recursive: true })
    await writeFile(join(current, 'a-lab', 'two', 'index.js'), 'fresh here')

    await bringRepoBack(earlier, current, 'a-lab')

    expect(await readFile(join(current, 'a-lab', 'one', 'index.js'), 'utf8')).toBe('a-lab one')
    expect(await readFile(join(current, 'a-lab', 'two', 'index.js'), 'utf8')).toBe('fresh here')
    expect(await readFile(join(earlier, 'a-lab', 'two', 'index.js'), 'utf8')).toBe('a-lab two')
    expect(existsSync(join(earlier, 'a-lab', 'one'))).toBe(false)
  })
})

describe('clearIfNoWork', () => {
  it('keeps a folder that still has repos', async () => {
    const root = await workFolder(await tempDir())
    expect(await clearIfNoWork(root)).toBe(false)
    expect(existsSync(join(root, 'node_modules'))).toBe(true)
  })

  it('removes the repo tools and the folder once no repo is left', async () => {
    const base = await tempDir()
    const root = await workFolder(base)
    await moveRepos(root, join(base, 'new'), ['a-lab', 'b-lab', 'c-lab'])
    await writeFile(join(root, 'package.json'), '{}')
    expect(await clearIfNoWork(root)).toBe(true)
    expect(existsSync(root)).toBe(false)
  })
})

describe('sizeOf', () => {
  it('adds up the files under a folder', async () => {
    const root = await workFolder(await tempDir())
    // Four index.js files of 9 bytes ('a-lab one' and so on) and package.json of 2.
    expect(await sizeOf(join(root, 'a-lab'))).toBe(18)
    expect(await sizeOf(root)).toBe(38)
    expect(await sizeOf(join(root, 'missing'))).toBe(0)
  })
})
