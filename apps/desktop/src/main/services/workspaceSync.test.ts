import { existsSync } from 'fs'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { createFolder, removePath, renamePath } from './workspaceOps'
import {
  findMissing,
  openWorkspace,
  resetWorkspace,
  resolveConflict,
  restoreMissing
} from './workspaceSync'

async function writeTree(dir: string, files: Record<string, string>): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(dir, path, '..'), { recursive: true })
    await writeFile(join(dir, path), content)
  }
}

/** A repo issue's starter folder and a workspace path that does not exist yet. */
async function setup(
  starter: Record<string, string>
): Promise<{ starterDir: string; dir: string }> {
  const base = await mkdtemp(join(tmpdir(), 'indent-sync-'))
  const starterDir = join(base, 'content', 'starter')
  await writeTree(starterDir, starter)
  return { starterDir, dir: join(base, 'work', 'lab', 'issue') }
}

/** Replaces the repo's starter, the way a library update replaces the repo folder. */
async function updateStarter(starterDir: string, files: Record<string, string>): Promise<void> {
  await rm(starterDir, { recursive: true, force: true })
  await writeTree(starterDir, files)
}

const read = (dir: string, path: string): Promise<string> => readFile(join(dir, path), 'utf8')

const remembered = async (dir: string): Promise<Record<string, string>> =>
  JSON.parse(await read(dir, '.indent/starter.json'))

describe('openWorkspace', () => {
  it('copies the starter on first open and remembers it out of sight', async () => {
    const { starterDir, dir } = await setup({ 'src/a.ts': 'a', 'b.ts': 'b' })
    const snap = await openWorkspace(starterDir, dir, ['b.ts'])
    expect(snap.files.map((f) => f.path)).toEqual(['b.ts', 'src/a.ts'])
    expect(snap.starter).toEqual({ 'src/a.ts': 'a', 'b.ts': 'b' })
    expect(snap.conflicts).toEqual([])
    expect(snap.updated).toEqual([])
    expect(snap.remembered).toBe(true)
    expect(await remembered(dir)).toEqual({ 'src/a.ts': 'a', 'b.ts': 'b' })
  })

  it('brings an update in, keeps edits and files the learner added, and lists conflicts', async () => {
    const { starterDir, dir } = await setup({
      'same.ts': 'same',
      'edited.ts': 'e',
      'both.ts': 'x',
      'src/topCandles.ts': 'candles'
    })
    await openWorkspace(starterDir, dir, [])
    await writeTree(dir, { 'edited.ts': 'my e', 'both.ts': 'my x', 'notes.md': 'mine' })
    await updateStarter(starterDir, {
      'same.ts': 'same 2',
      'edited.ts': 'e',
      'both.ts': 'x 2',
      'src/topTeas.ts': 'teas'
    })

    const snap = await openWorkspace(starterDir, dir, [])

    expect(await read(dir, 'same.ts')).toBe('same 2')
    expect(await read(dir, 'edited.ts')).toBe('my e')
    expect(await read(dir, 'both.ts')).toBe('my x')
    expect(await read(dir, 'src/topTeas.ts')).toBe('teas')
    expect(await read(dir, 'notes.md')).toBe('mine')
    expect(existsSync(join(dir, 'src', 'topCandles.ts'))).toBe(false)
    expect(snap.conflicts).toEqual(['both.ts'])
    expect(snap.updated.sort()).toEqual(['same.ts', 'src/topCandles.ts', 'src/topTeas.ts'])
    expect(snap.starter).toEqual({
      'same.ts': 'same 2',
      'edited.ts': 'e',
      'both.ts': 'x',
      'src/topTeas.ts': 'teas'
    })

    const again = await openWorkspace(starterDir, dir, [])
    expect(again.conflicts).toEqual(['both.ts'])
    expect(again.updated).toEqual([])
  })

  it('removes a folder the repo dropped once it is empty, but keeps one with learner files', async () => {
    const { starterDir, dir } = await setup({ 'a.ts': 'a', 'old/x.ts': 'x', 'keep/y.ts': 'y' })
    await openWorkspace(starterDir, dir, [])
    await writeTree(dir, { 'keep/mine.ts': 'mine' })
    await updateStarter(starterDir, { 'a.ts': 'a' })
    await openWorkspace(starterDir, dir, [])
    expect(existsSync(join(dir, 'old'))).toBe(false)
    expect(await readdir(join(dir, 'keep'))).toEqual(['mine.ts'])
    expect(existsSync(dir)).toBe(true)
  })

  it('lists folders, empty ones too, and never the app folder', async () => {
    const { starterDir, dir } = await setup({ 'src/lib/a.ts': 'a' })
    await openWorkspace(starterDir, dir, [])
    await createFolder(dir, 'empty')
    expect((await openWorkspace(starterDir, dir, [])).folders).toEqual(['empty', 'src', 'src/lib'])
  })

  it('treats a starter file the learner deleted or renamed as their change', async () => {
    const { starterDir, dir } = await setup({ 'a.ts': 'a', 'src/b.ts': 'b', 'c.ts': 'c' })
    await openWorkspace(starterDir, dir, [])
    await removePath(dir, 'a.ts')
    await renamePath(dir, 'src', 'lib')
    await updateStarter(starterDir, { 'a.ts': 'a', 'src/b.ts': 'b', 'c.ts': 'c 2' })

    const snap = await openWorkspace(starterDir, dir, [])

    expect(snap.files.map((f) => f.path)).toEqual(['c.ts', 'lib/b.ts'])
    expect(await read(dir, 'c.ts')).toBe('c 2')
    expect(snap.conflicts).toEqual([])
    expect(await remembered(dir)).toEqual({ 'a.ts': 'a', 'src/b.ts': 'b', 'c.ts': 'c 2' })

    const reset = await resetWorkspace(starterDir, dir, [])
    expect(reset.files.map((f) => f.path)).toEqual(['a.ts', 'c.ts', 'lib/b.ts', 'src/b.ts'])
  })

  it('leaves a workspace from before the starter was kept as it is', async () => {
    const { starterDir, dir } = await setup({ 'a.ts': 'a' })
    await writeTree(dir, { 'a.ts': 'old a', 'gone.ts': 'g' })
    await updateStarter(starterDir, { 'a.ts': 'a', 'b.ts': 'b' })
    const snap = await openWorkspace(starterDir, dir, [])
    expect(snap.files.map((f) => f.path)).toEqual(['a.ts', 'gone.ts'])
    expect(snap.starter).toEqual({ 'a.ts': 'a', 'b.ts': 'b' })
    expect(snap.conflicts).toEqual([])
    expect(snap.remembered).toBe(false)
    expect(existsSync(join(dir, '.indent'))).toBe(false)
  })
})

describe('resolveConflict', () => {
  async function conflicted(): Promise<{ starterDir: string; dir: string }> {
    const paths = await setup({ 'src/a.ts': 'a', 'b.ts': 'b' })
    await openWorkspace(paths.starterDir, paths.dir, [])
    await writeTree(paths.dir, { 'src/a.ts': 'my a', 'b.ts': 'my b' })
    await updateStarter(paths.starterDir, { 'src/a.ts': 'a 2', 'b.ts': 'b 2' })
    expect((await openWorkspace(paths.starterDir, paths.dir, [])).conflicts).toEqual([
      'b.ts',
      'src/a.ts'
    ])
    return paths
  }

  it('keeps mine and takes the new version as its base', async () => {
    const { starterDir, dir } = await conflicted()
    const snap = await resolveConflict(starterDir, dir, [], 'src/a.ts', 'mine')
    expect(await read(dir, 'src/a.ts')).toBe('my a')
    expect(snap.conflicts).toEqual(['b.ts'])
    expect(snap.starter['src/a.ts']).toBe('a 2')
  })

  it('takes the new version and keeps no copy of mine', async () => {
    const { starterDir, dir } = await conflicted()
    const snap = await resolveConflict(starterDir, dir, [], 'src/a.ts', 'new')
    expect(await read(dir, 'src/a.ts')).toBe('a 2')
    expect(await readdir(join(dir, '.indent'))).toEqual(['starter.json'])
    expect(snap.conflicts).toEqual(['b.ts'])
    expect(snap.starter['src/a.ts']).toBe('a 2')
  })

  it('refuses a file that is not a conflict, or one outside the workspace', async () => {
    const { starterDir, dir } = await conflicted()
    await expect(resolveConflict(starterDir, dir, [], 'other.ts', 'new')).rejects.toThrow()
    await expect(resolveConflict(starterDir, dir, [], '../x.ts', 'new')).rejects.toThrow()
    await expect(
      resolveConflict(starterDir, dir, [], '.indent/starter.json', 'new')
    ).rejects.toThrow()
  })
})

describe('resetWorkspace', () => {
  it('rewrites starter files, drops ones the repo removed and keeps learner files', async () => {
    const { starterDir, dir } = await setup({ 'a.ts': 'a', 'gone.ts': 'g' })
    await openWorkspace(starterDir, dir, [])
    await writeTree(dir, { 'a.ts': 'my a', 'gone.ts': 'my g', 'notes.md': 'mine' })
    await updateStarter(starterDir, { 'a.ts': 'a 2', 'b.ts': 'b' })

    const snap = await resetWorkspace(starterDir, dir, [])

    expect(snap.files).toEqual([
      { path: 'a.ts', content: 'a 2' },
      { path: 'b.ts', content: 'b' },
      { path: 'notes.md', content: 'mine' }
    ])
    expect(snap.starter).toEqual({ 'a.ts': 'a 2', 'b.ts': 'b' })
    expect(await remembered(dir)).toEqual({ 'a.ts': 'a 2', 'b.ts': 'b' })
  })

  it('empties a workspace from before the starter was kept, then remembers the starter', async () => {
    const { starterDir, dir } = await setup({ 'a.ts': 'a' })
    await writeTree(dir, { 'a.ts': 'old a', 'stray.ts': 's' })
    const snap = await resetWorkspace(starterDir, dir, [])
    expect(snap.files).toEqual([{ path: 'a.ts', content: 'a' }])
    expect(await remembered(dir)).toEqual({ 'a.ts': 'a' })
  })
})

describe('restoreMissing', () => {
  it('finds starter files that are gone and brings back only those', async () => {
    const { starterDir, dir } = await setup({ 'src/data.ts': 'data', 'src/tools.ts': 'tools' })
    await openWorkspace(starterDir, dir, [])
    await renamePath(dir, 'src/data.ts', 'src/old.ts')
    await writeTree(dir, { 'src/tools.ts': 'my tools', 'notes.md': 'mine' })

    expect((await openWorkspace(starterDir, dir, [])).missing).toEqual(['src/data.ts'])
    expect(await findMissing(starterDir, dir)).toEqual(['src/data.ts'])

    const snap = await restoreMissing(starterDir, dir, [])

    expect(snap.missing).toEqual([])
    expect(await read(dir, 'src/data.ts')).toBe('data')
    expect(await read(dir, 'src/tools.ts')).toBe('my tools')
    expect(await read(dir, 'src/old.ts')).toBe('data')
    expect(await read(dir, 'notes.md')).toBe('mine')
  })
})
