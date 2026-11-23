import { chmod, mkdtemp, mkdir, readdir, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  copyStarter,
  emptyDir,
  isAppPath,
  readFolders,
  readWorkspace,
  resolveInside
} from './workspaceFiles'

// Permissions mean nothing on Windows, and root reads everything.
const hasPermissions = process.platform !== 'win32' && process.getuid?.() !== 0

async function tree(files: Record<string, string | Buffer>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'indent-ws-'))
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(dir, path, '..'), { recursive: true })
    await writeFile(join(dir, path), content)
  }
  return dir
}

describe('resolveInside', () => {
  const dir = '/tmp/ws'

  it('accepts nested relative paths', () => {
    expect(resolveInside(dir, 'src/a.ts')).toBe('/tmp/ws/src/a.ts')
    expect(resolveInside(dir, './b/../a.ts')).toBe('/tmp/ws/a.ts')
  })

  it.each(['../x.ts', '../ws2/a.ts', '/etc/passwd', 'a/../../x', '', '.'])('rejects %j', (p) => {
    expect(() => resolveInside(dir, p)).toThrow('outside workspace')
  })
})

describe('isAppPath', () => {
  it('marks only the app folder at the top of the workspace', () => {
    expect(isAppPath('/tmp/ws', '/tmp/ws/.indent/starter.json')).toBe(true)
    expect(isAppPath('/tmp/ws', '/tmp/ws/.indent')).toBe(true)
    expect(isAppPath('/tmp/ws', '/tmp/ws/src/.indent/a.ts')).toBe(false)
    expect(isAppPath('/tmp/ws', '/tmp/ws/.indentation.ts')).toBe(false)
  })
})

describe('workspace files', () => {
  it('copies the starter and reads text files in chapter order then alphabetical', async () => {
    const starter = await tree({
      'b.ts': 'b',
      'src/z.ts': 'z',
      'a.ts': 'a',
      'main.ts': 'main',
      '.env': 'secret',
      'node_modules/x/index.js': 'x',
      'logo.png': Buffer.from([0x89, 0x50, 0x00, 0x01]),
      'big.txt': 'x'.repeat(1024 * 1024 + 1)
    })
    const dir = join(await mkdtemp(join(tmpdir(), 'indent-ws-')), 'lab', 'chapter')
    await copyStarter(starter, dir)
    const files = await readWorkspace(dir, ['src/z.ts', 'main.ts', 'missing.ts'])
    expect(files.map((f) => f.path)).toEqual(['src/z.ts', 'main.ts', 'a.ts', 'b.ts'])
    expect(files[1].content).toBe('main')
  })

  it('reads a dot file only when the chapter lists it, and never a dot folder', async () => {
    const dir = await tree({
      'shop/.gitignore': 'drafts/',
      'shop/.env': 'secret',
      '.git/config': 'core',
      'shop/index.html': 'page'
    })
    const listed = ['shop/.gitignore', '.git/config']
    expect((await readWorkspace(dir, listed)).map((f) => f.path)).toEqual([
      'shop/.gitignore',
      'shop/index.html'
    ])
    expect((await readWorkspace(dir, [])).map((f) => f.path)).toEqual(['shop/index.html'])
  })

  it('creates an empty folder when the chapter has no starter', async () => {
    const dir = join(await mkdtemp(join(tmpdir(), 'indent-ws-')), 'w')
    await copyStarter(join(dir, 'no-starter'), dir)
    expect(await readWorkspace(dir, [])).toEqual([])
  })

  it('empties a folder but keeps it', async () => {
    const dir = await tree({ 'a.ts': 'a', 'src/b.ts': 'b', '.hidden': 'h' })
    await emptyDir(dir)
    expect(await readdir(dir)).toEqual([])
  })

  it.skipIf(!hasPermissions)('leaves out a file and a folder the learner locked', async () => {
    const dir = await tree({ 'a.txt': 'a', 'locked.txt': 'l', 'shut/b.txt': 'b' })
    await chmod(join(dir, 'locked.txt'), 0o000)
    await chmod(join(dir, 'shut'), 0o000)

    expect((await readWorkspace(dir, [])).map((f) => f.path)).toEqual(['a.txt'])
    expect(await readFolders(dir)).toEqual(['shut'])

    await chmod(join(dir, 'shut'), 0o700)
  })
})
