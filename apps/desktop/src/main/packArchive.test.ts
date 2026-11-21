import { execFileSync } from 'child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { describe, expect, it } from 'vitest'
import { packArchive, packFiles, packVersion } from './packArchive'

function makeRepo(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'pack-'))
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true })
    writeFileSync(join(dir, name), text)
  }
  return dir
}

const files = {
  'lab.json': '{"title":"Shop"}',
  'first/chapter.json': '{}',
  'first/starter/src/app.js': 'export {}\n',
  '.DS_Store': 'junk'
}

describe('packs', () => {
  it('lists files sorted with forward slashes and without system files', () => {
    expect(packFiles(makeRepo(files))).toEqual([
      'first/chapter.json',
      'first/starter/src/app.js',
      'lab.json'
    ])
  })

  it('keeps the version and the archive bytes for the same files', () => {
    const a = makeRepo(files)
    const b = makeRepo(files)
    expect(packVersion(a)).toBe(packVersion(b))
    expect(packArchive(a).equals(packArchive(b))).toBe(true)
  })

  it('changes the version when a file changes', () => {
    expect(packVersion(makeRepo(files))).not.toBe(
      packVersion(makeRepo({ ...files, 'lab.json': '{"title":"Shop 2"}' }))
    )
  })

  it('writes an archive tar unpacks back into the same files', () => {
    const work = mkdtempSync(join(tmpdir(), 'unpack-'))
    writeFileSync(join(work, 'pack.tar.gz'), packArchive(makeRepo(files)))
    mkdirSync(join(work, 'out'))
    execFileSync('tar', ['-xzf', join(work, 'pack.tar.gz'), '-C', join(work, 'out')])
    expect(packFiles(join(work, 'out'))).toEqual(packFiles(makeRepo(files)))
    expect(readFileSync(join(work, 'out', 'first/starter/src/app.js'), 'utf8')).toBe('export {}\n')
  })

  it('refuses a path too long for the archive format', () => {
    expect(() => packArchive(makeRepo({ [`${'a'.repeat(101)}.js`]: '' }))).toThrow(/too long/)
  })
})
