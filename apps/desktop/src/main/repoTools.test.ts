import { execFileSync } from 'child_process'
import { createHash } from 'crypto'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  writeFileSync
} from 'fs'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { InstallError } from './library'
import { downloadTools, installedTools, toolsArchive, toolsVersion } from './repoTools'

const temp = (prefix: string): string => mkdtempSync(join(tmpdir(), prefix))
const repoRoot = join(__dirname, '../../../..')

/** A node_modules folder with one package and a .bin link to it, packed the way CI packs it. */
function toolsTarGz(link = '../pkg/bin.js'): Buffer {
  const dir = temp('tools-src-')
  mkdirSync(join(dir, 'node_modules/pkg'), { recursive: true })
  mkdirSync(join(dir, 'node_modules/.bin'))
  writeFileSync(join(dir, 'node_modules/pkg/package.json'), '{"name":"pkg"}')
  writeFileSync(join(dir, 'node_modules/pkg/bin.js'), 'console.log(1)')
  symlinkSync(link, join(dir, 'node_modules/.bin/pkg'))
  execFileSync('tar', ['-czf', 'tools.tar.gz', 'node_modules'], { cwd: dir })
  return readFileSync(join(dir, 'tools.tar.gz'))
}

const sum = (data: Buffer): { sha256: string; size: number } => ({
  sha256: createHash('sha256').update(data).digest('hex'),
  size: data.length
})

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

function publish(
  version: string,
  archive: Buffer,
  checksums = { [toolsArchive('os-cpu')]: sum(archive) }
): void {
  files.set(`tools-js-${version}/checksums.json`, Buffer.from(JSON.stringify(checksums)))
  files.set(`tools-js-${version}/${toolsArchive('os-cpu')}`, archive)
}

const reason = (promise: Promise<unknown>): Promise<string> =>
  promise.then(
    () => 'ok',
    (error: InstallError) => error.reason
  )

describe('toolsVersion', () => {
  it('matches the script the workflow uses, whatever the line ends', () => {
    const lock = readFileSync(join(repoRoot, 'packages/content/runtime/package-lock.json'), 'utf8')
    const script = execFileSync(process.execPath, [join(repoRoot, 'scripts/tools-version.mjs')], {
      encoding: 'utf8'
    }).trim()
    expect(toolsVersion(lock)).toBe(script)
    expect(toolsVersion(lock.replace(/\n/g, '\r\n'))).toBe(script)
    expect(script).toMatch(/^[0-9a-f]{12}$/)
  })
})

describe('downloadTools', () => {
  it('replaces node_modules with the download, keeping links, and records the version', async () => {
    publish('v1', toolsTarGz())
    const root = temp('root-')
    mkdirSync(join(root, 'node_modules/old'), { recursive: true })
    const seen: number[] = []
    await downloadTools(root, base, 'v1', 'os-cpu', (done) => seen.push(done))
    expect(existsSync(join(root, 'node_modules/old'))).toBe(false)
    expect(readFileSync(join(root, 'node_modules/pkg/package.json'), 'utf8')).toContain('pkg')
    expect(readlinkSync(join(root, 'node_modules/.bin/pkg'))).toBe('../pkg/bin.js')
    expect(installedTools(root)).toBe('v1')
    expect(seen.at(-1)).toBe(1)
    expect(existsSync(join(root, '.tools-download'))).toBe(false)
  })

  it('keeps the tools on disk when the download is damaged', async () => {
    const archive = toolsTarGz()
    publish('v2', archive, {
      [toolsArchive('os-cpu')]: { ...sum(archive), sha256: 'f'.repeat(64) }
    })
    const root = temp('root-')
    mkdirSync(join(root, 'node_modules/old'), { recursive: true })
    expect(await reason(downloadTools(root, base, 'v2', 'os-cpu', () => {}))).toBe('damaged')
    expect(existsSync(join(root, 'node_modules/old'))).toBe(true)
    expect(installedTools(root)).toBe(null)
  })

  it('says missing without a release or a file for this system, offline without a server', async () => {
    publish('v3', toolsTarGz())
    expect(await reason(downloadTools(temp('root-'), base, 'none', 'os-cpu', () => {}))).toBe(
      'missing'
    )
    expect(await reason(downloadTools(temp('root-'), base, 'v3', 'other-cpu', () => {}))).toBe(
      'missing'
    )
    expect(
      await reason(downloadTools(temp('root-'), 'http://127.0.0.1:9', 'v3', 'os-cpu', () => {}))
    ).toBe('offline')
  })

  it('refuses a link that points outside the folder, writing nothing', async () => {
    publish('v4', toolsTarGz('../../../outside'))
    const root = temp('root-')
    expect(await reason(downloadTools(root, base, 'v4', 'os-cpu', () => {}))).toBe('broken')
    expect(existsSync(join(root, 'node_modules'))).toBe(false)
  })
})
