import { execFileSync } from 'child_process'
import { createHash } from 'crypto'
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync
} from 'fs'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PackEntry, PackIndex } from '@shared/types'
import { packArchive, packVersion, tarGz } from './packArchive'
import {
  InstallError,
  installPack,
  listAll,
  parseIndex,
  recordVersion,
  seedContent,
  staleRepos,
  unpack
} from './library'

const temp = (prefix: string): string => mkdtempSync(join(tmpdir(), prefix))

function write(dir: string, files: Record<string, string>): string {
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true })
    writeFileSync(join(dir, name), text)
  }
  return dir
}

const lab = (title: string, chapters = ['one']): Record<string, string> => ({
  'lab.json': JSON.stringify({
    title,
    description: 'd',
    category: 'c',
    language: 'javascript',
    tags: [],
    parts: [{ title: 'Part', chapters }]
  }),
  'one/chapter.json': JSON.stringify({
    title: 'One',
    files: [],
    terminal: { description: '' },
    tasks: [{ id: 't', points: 10 }]
  }),
  'one/lesson.md': '# One',
  'one/grader/checks.mjs': 'export const checks = {}'
})

function entryFor(
  id: string,
  archive: Buffer,
  dir: string,
  extra: Partial<PackEntry> = {}
): PackEntry {
  return {
    id,
    version: packVersion(dir),
    format: 1,
    file: `${id}.tar.gz`,
    size: archive.length,
    sha256: createHash('sha256').update(archive).digest('hex'),
    summary: {
      id,
      title: id,
      description: '',
      category: '',
      language: '',
      tags: [],
      parts: [],
      chapters: []
    },
    ...extra
  }
}

const files = new Map<string, Buffer>()
let server: Server
let base: string

beforeAll(async () => {
  server = createServer((req, res) => {
    const body = files.get(req.url!.slice(1))
    res.writeHead(body ? 200 : 404).end(body)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(() => server.close())

describe('seedContent', () => {
  it('copies the kit, runtime, roadmaps and missing repos once per app version', async () => {
    const bundled = write(temp('bundled-'), {
      'kit/run-check.mjs': 'v1',
      'runtime/package.json': '{}',
      'paths.json': '[]',
      ...Object.fromEntries(Object.entries(lab('Shop')).map(([k, v]) => [`labs/shop/${k}`, v]))
    })
    const root = temp('root-')
    await seedContent(bundled, root, '1.0.0')
    expect(readFileSync(join(root, 'kit/run-check.mjs'), 'utf8')).toBe('v1')
    expect(existsSync(join(root, 'labs/shop/one/lesson.md'))).toBe(true)

    writeFileSync(join(root, 'labs/shop/lab.json'), 'downloaded copy')
    writeFileSync(join(bundled, 'kit/run-check.mjs'), 'v2')
    await seedContent(bundled, root, '1.0.0')
    expect(readFileSync(join(root, 'kit/run-check.mjs'), 'utf8')).toBe('v1')

    await seedContent(bundled, root, '1.1.0')
    expect(readFileSync(join(root, 'kit/run-check.mjs'), 'utf8')).toBe('v2')
    expect(readFileSync(join(root, 'labs/shop/lab.json'), 'utf8')).toBe('downloaded copy')
  })

  it('records the versions of the repos it copied from the shipped index', async () => {
    const entry = { format: 1, size: 1, sha256: 'x', summary: {} }
    const bundled = write(temp('bundled-'), {
      'kit/run-check.mjs': 'v1',
      'runtime/package.json': '{}',
      'index.json': JSON.stringify({
        paths: [],
        labs: [
          { ...entry, id: 'shop', version: 'shipped1', file: 'shop.tar.gz' },
          { ...entry, id: 'bank', version: 'shipped2', file: 'bank.tar.gz' }
        ]
      }),
      ...Object.fromEntries(Object.entries(lab('Shop')).map(([k, v]) => [`labs/shop/${k}`, v])),
      ...Object.fromEntries(Object.entries(lab('Bank')).map(([k, v]) => [`labs/bank/${k}`, v]))
    })
    const root = temp('root-')
    // A newer download of the bank is already here, with its own version.
    write(join(root, 'labs/bank'), lab('Bank'))
    recordVersion(root, 'bank', 'downloaded')
    await seedContent(bundled, root, '1.0.0')
    expect(JSON.parse(readFileSync(join(root, 'versions.json'), 'utf8'))).toEqual({
      shop: 'shipped1',
      bank: 'downloaded'
    })
  })
})

describe('parseIndex', () => {
  const index = (labs: unknown[]): string => JSON.stringify({ paths: [], labs })
  const good = {
    id: 'shop',
    version: 'v',
    format: 1,
    file: 'shop-v.tar.gz',
    size: 1,
    sha256: 'x',
    summary: {}
  }

  it('accepts a well formed index', () => {
    expect(parseIndex(index([good])).labs[0].id).toBe('shop')
  })

  it('rejects ids and file names that could leave their folder', () => {
    expect(() => parseIndex(index([{ ...good, id: '../shop' }]))).toThrow()
    expect(() => parseIndex(index([{ ...good, file: '../../x.tar.gz' }]))).toThrow()
    expect(() => parseIndex(index([{ ...good, cover: 'a/b.webp' }]))).toThrow()
    expect(() => parseIndex('{"labs": 1}')).toThrow()
  })
})

describe('listAll', () => {
  it('lists repos on disk and the ones the library has, marking those too new', async () => {
    const root = temp('root-')
    write(join(root, 'labs/shop'), lab('Shop'))
    const remote = (id: string, format: number): PackEntry =>
      ({ id, format, summary: { title: id, chapters: [] } }) as unknown as PackEntry
    const index = { paths: [], labs: [remote('shop', 1), remote('bank', 1), remote('cafe', 9)] }
    const labs = await listAll(root, index)
    expect(labs.map((l) => [l.id, l.availability])).toEqual([
      ['bank', 'download'],
      ['cafe', 'app-update'],
      ['shop', undefined]
    ])
  })
})

describe('installPack', () => {
  const reason = (promise: Promise<unknown>): Promise<string> =>
    promise.then(
      () => 'ok',
      (error: InstallError) => error.reason
    )

  it('downloads, checks and unpacks a repo, and records its version', async () => {
    const source = write(temp('src-'), lab('Shop'))
    const archive = packArchive(source)
    files.set('shop.tar.gz', archive)
    const root = temp('root-')
    const seen: number[] = []
    await installPack(root, base, entryFor('shop', archive, source), (done) => seen.push(done))
    expect(readFileSync(join(root, 'labs/shop/one/lesson.md'), 'utf8')).toBe('# One')
    expect(seen.at(-1)).toBe(1)
    expect(existsSync(join(root, '.download/shop'))).toBe(false)
    expect(staleRepos({ paths: [], labs: [entryFor('shop', archive, source)] }, root)).toEqual([])
  })

  it('keeps the copy on disk when the download is damaged', async () => {
    const source = write(temp('src-'), lab('Shop'))
    const archive = packArchive(source)
    files.set('shop.tar.gz', archive)
    const root = write(temp('root-'), { 'labs/shop/lab.json': 'old' })
    const entry = entryFor('shop', archive, source, { sha256: 'f'.repeat(64) })
    expect(await reason(installPack(root, base, entry, () => {}))).toBe('damaged')
    expect(readFileSync(join(root, 'labs/shop/lab.json'), 'utf8')).toBe('old')
  })

  it('names what went wrong', async () => {
    const source = write(temp('src-'), lab('Shop'))
    const archive = packArchive(source)
    const entry = entryFor('shop', archive, source, { file: 'gone.tar.gz' })
    expect(await reason(installPack(temp('root-'), base, entry, () => {}))).toBe('missing')
    expect(await reason(installPack(temp('root-'), 'http://127.0.0.1:9', entry, () => {}))).toBe(
      'offline'
    )
    expect(await reason(installPack(temp('root-'), base, { ...entry, format: 99 }, () => {}))).toBe(
      'too-new'
    )
  })

  it('refuses an archive with a path outside its folder, writing nothing', async () => {
    const evil = tarGz([{ name: '../evil.txt', data: Buffer.from('x') }])
    files.set('evil.tar.gz', evil)
    const root = temp('root-')
    const entry = entryFor('shop', evil, temp('src-'), { file: 'evil.tar.gz' })
    expect(await reason(installPack(root, base, entry, () => {}))).toBe('broken')
    expect(existsSync(join(root, 'labs/shop'))).toBe(false)
    expect(existsSync(join(root, '.download/evil.txt'))).toBe(false)
  })

  it('refuses a repo whose issues do not load', async () => {
    const source = write(temp('src-'), lab('Shop', ['one', 'two']))
    const archive = packArchive(source)
    files.set('broken.tar.gz', archive)
    const entry = entryFor('shop', archive, source, { file: 'broken.tar.gz' })
    expect(await reason(installPack(temp('root-'), base, entry, () => {}))).toBe('broken')
  })
})

describe('staleRepos', () => {
  it('picks repos on disk whose version changed, skipping too new ones', () => {
    const root = temp('root-')
    for (const id of ['shop', 'bank', 'cafe', 'deli']) write(join(root, 'labs', id), lab(id))
    for (const id of ['shop', 'bank', 'cafe', 'deli']) recordVersion(root, id, 'old')
    const entry = (id: string, version: string, format = 1): PackEntry =>
      ({ id, version, format }) as PackEntry
    const index: PackIndex = {
      paths: [],
      labs: [
        entry('shop', 'new'),
        entry('bank', 'old'),
        entry('cafe', 'new'),
        entry('deli', 'new', 9),
        entry('eel', 'new')
      ]
    }
    expect(staleRepos(index, root).map((e) => e.id)).toEqual(['shop', 'cafe'])
  })

  it('hashes a repo with no recorded version once, then remembers it', () => {
    const root = temp('root-')
    const dir = write(join(root, 'labs', 'shop'), lab('Shop'))
    const index: PackIndex = {
      paths: [],
      labs: [{ id: 'shop', version: packVersion(dir), format: 1 } as PackEntry]
    }
    expect(staleRepos(index, root)).toEqual([])
    expect(JSON.parse(readFileSync(join(root, 'versions.json'), 'utf8'))).toEqual({
      shop: packVersion(dir)
    })
  })
})

describe('unpack', () => {
  it('takes a link only when asked to and only when it stays inside', async () => {
    const dir = write(temp('src-'), { 'a/file.txt': 'x' })
    symlinkSync('../a/file.txt', join(dir, 'link'))
    execFileSync('tar', ['-czf', 'links.tar.gz', 'a', 'link'], { cwd: dir })
    const archive = join(dir, 'links.tar.gz')
    const reason = (promise: Promise<unknown>): Promise<string> =>
      promise.then(
        () => 'ok',
        (error: InstallError) => error.reason
      )
    expect(await reason(unpack(archive, temp('dest-')))).toBe('broken')
    const dest = temp('dest-')
    expect(await reason(unpack(archive, join(dest, 'in'), { links: true }))).toBe('broken')
    symlinkSync('a/file.txt', join(dir, 'inside'))
    linkSync(join(dir, 'a/file.txt'), join(dir, 'hard'))
    execFileSync('tar', ['-czf', 'inside.tar.gz', 'a', 'inside', 'hard'], { cwd: dir })
    await unpack(join(dir, 'inside.tar.gz'), dest, { links: true })
    expect(readFileSync(join(dest, 'inside'), 'utf8')).toBe('x')
    expect(readFileSync(join(dest, 'hard'), 'utf8')).toBe('x')
  })
})
