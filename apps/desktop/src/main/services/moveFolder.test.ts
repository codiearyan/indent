import { mkdtemp, mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { NEW_FOLDER, isEmptyFolder, isInsideOrSame, moveContents, planMove } from './moveFolder'

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
