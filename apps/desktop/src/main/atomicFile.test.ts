import { mkdtemp, readdir, readFile, writeFile } from 'fs/promises'
import { readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { writeWhole, writeWholeSync } from './atomicFile'

const folder = (): Promise<string> => mkdtemp(join(tmpdir(), 'indent-atomic-'))

describe('writeWhole', () => {
  it('replaces the file and leaves nothing beside it', async () => {
    const dir = await folder()
    const file = join(dir, 'settings.json')
    await writeFile(file, 'old')
    await writeWhole(file, 'new')
    expect(await readFile(file, 'utf8')).toBe('new')
    expect(await readdir(dir)).toEqual(['settings.json'])
  })

  it('lands writes asked for together in the order they were asked', async () => {
    const dir = await folder()
    const file = join(dir, 'progress.json')
    await Promise.all(Array.from({ length: 20 }, (_, i) => writeWhole(file, String(i))))
    expect(await readFile(file, 'utf8')).toBe('19')
    expect(await readdir(dir)).toEqual(['progress.json'])
  })

  it('keeps the old file and cleans up when the write fails', async () => {
    const dir = await folder()
    const file = join(dir, 'keys.bin')
    await writeFile(file, 'old')
    // A folder where the file should go makes the rename fail.
    await expect(writeWhole(join(dir), 'x')).rejects.toThrow()
    expect(await readFile(file, 'utf8')).toBe('old')
    expect(await readdir(dir)).toEqual(['keys.bin'])
  })

  it('goes on with the next write after one failed', async () => {
    const dir = await folder()
    const file = join(dir, 'missing', 'a.json')
    await expect(writeWhole(file, 'x')).rejects.toThrow()
    const ok = join(dir, 'a.json')
    await writeWhole(ok, 'fine')
    expect(await readFile(ok, 'utf8')).toBe('fine')
  })
})

describe('writeWholeSync', () => {
  it('replaces the file and leaves nothing beside it', async () => {
    const dir = await folder()
    const file = join(dir, 'workspace.json')
    writeWholeSync(file, '{"root":"a"}')
    writeWholeSync(file, '{"root":"b"}')
    expect(readFileSync(file, 'utf8')).toBe('{"root":"b"}')
    expect(await readdir(dir)).toEqual(['workspace.json'])
  })
})
