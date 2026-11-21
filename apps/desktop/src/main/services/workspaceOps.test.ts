import { existsSync } from 'fs'
import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { createFile, createFolder, removePath, renamePath } from './workspaceOps'

/** A workspace with a few files and the app's own folder, plus a file just outside it. */
async function workspace(): Promise<string> {
  const base = await mkdtemp(join(tmpdir(), 'indent-ops-'))
  const dir = join(base, 'ws')
  const files: Record<string, string> = {
    'a.js': 'a',
    'src/b.js': 'b',
    'src/lib/c.js': 'c',
    '.indent/starter.json': '{}'
  }
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(dir, path, '..'), { recursive: true })
    await writeFile(join(dir, path), content)
  }
  await writeFile(join(base, 'outside.js'), 'x')
  return dir
}

const read = (dir: string, path: string): Promise<string> => readFile(join(dir, path), 'utf8')

const unsafe = ['../outside.js', '/etc/passwd', 'src/../../outside.js', '.indent/starter.json', '']

describe('createFile', () => {
  it('makes an empty file, and the folders above it', async () => {
    const dir = await workspace()
    await createFile(dir, 'notes.md')
    await createFile(dir, 'test/deep/x.test.js')
    expect(await read(dir, 'notes.md')).toBe('')
    expect(await read(dir, 'test/deep/x.test.js')).toBe('')
  })

  it('refuses a name that exists, as a file or a folder', async () => {
    const dir = await workspace()
    await expect(createFile(dir, 'a.js')).rejects.toThrow('a.js already exists.')
    await expect(createFile(dir, 'src')).rejects.toThrow('src already exists.')
    expect(await read(dir, 'a.js')).toBe('a')
  })

  it.each(unsafe)('refuses %j', async (path) => {
    const dir = await workspace()
    await expect(createFile(dir, path)).rejects.toThrow()
    expect(await read(dir, '.indent/starter.json')).toBe('{}')
  })
})

describe('createFolder', () => {
  it('makes an empty folder', async () => {
    const dir = await workspace()
    await createFolder(dir, 'src/empty')
    expect(await readdir(join(dir, 'src/empty'))).toEqual([])
  })

  it('refuses a name that exists', async () => {
    const dir = await workspace()
    await expect(createFolder(dir, 'src/lib')).rejects.toThrow('src/lib already exists.')
    await expect(createFolder(dir, 'a.js')).rejects.toThrow('a.js already exists.')
  })

  it.each(unsafe)('refuses %j', async (path) => {
    const dir = await workspace()
    await expect(createFolder(dir, path)).rejects.toThrow()
  })
})

describe('renamePath', () => {
  it('renames a file and keeps its content', async () => {
    const dir = await workspace()
    await renamePath(dir, 'a.js', 'main.js')
    expect(existsSync(join(dir, 'a.js'))).toBe(false)
    expect(await read(dir, 'main.js')).toBe('a')
  })

  it('renames a folder with everything in it', async () => {
    const dir = await workspace()
    await renamePath(dir, 'src', 'app')
    expect(existsSync(join(dir, 'src'))).toBe(false)
    expect(await read(dir, 'app/b.js')).toBe('b')
    expect(await read(dir, 'app/lib/c.js')).toBe('c')
  })

  it('changes only the case of a name', async () => {
    const dir = await workspace()
    await renamePath(dir, 'a.js', 'A.js')
    expect(await readdir(dir)).toContain('A.js')
    expect(await readdir(dir)).not.toContain('a.js')
  })

  it('refuses a name that exists, a missing source and a folder into itself', async () => {
    const dir = await workspace()
    await expect(renamePath(dir, 'a.js', 'src/b.js')).rejects.toThrow('src/b.js already exists.')
    await expect(renamePath(dir, 'gone.js', 'x.js')).rejects.toThrow('gone.js is not there')
    await expect(renamePath(dir, 'src', 'src/lib/src')).rejects.toThrow('inside itself')
    expect(await read(dir, 'src/b.js')).toBe('b')
  })

  it.each(unsafe)('refuses to rename from or to %j', async (path) => {
    const dir = await workspace()
    await expect(renamePath(dir, 'a.js', path)).rejects.toThrow()
    await expect(renamePath(dir, path, 'b.js')).rejects.toThrow()
    expect(await read(dir, 'a.js')).toBe('a')
    expect(await read(dir, '.indent/starter.json')).toBe('{}')
  })
})

describe('removePath', () => {
  it('deletes a file', async () => {
    const dir = await workspace()
    await removePath(dir, 'src/b.js')
    expect(await readdir(join(dir, 'src'))).toEqual(['lib'])
  })

  it('deletes a folder with everything in it', async () => {
    const dir = await workspace()
    await removePath(dir, 'src')
    expect((await readdir(dir)).sort()).toEqual(['.indent', 'a.js'])
  })

  it('refuses a path that is not there', async () => {
    const dir = await workspace()
    await expect(removePath(dir, 'gone.js')).rejects.toThrow('gone.js is not there')
  })

  it.each([...unsafe, '.', '.indent', 'src/..'])(
    'refuses %j and keeps everything',
    async (path) => {
      const dir = await workspace()
      await expect(removePath(dir, path)).rejects.toThrow()
      expect(existsSync(dir)).toBe(true)
      expect(existsSync(join(dir, '..', 'outside.js'))).toBe(true)
      expect(await read(dir, '.indent/starter.json')).toBe('{}')
      expect(await read(dir, 'a.js')).toBe('a')
    }
  )
})
