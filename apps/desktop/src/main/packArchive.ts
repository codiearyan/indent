import { createHash } from 'crypto'
import { readdirSync, readFileSync } from 'fs'
import { join, relative, sep } from 'path'
import { gzipSync } from 'zlib'

// Runs in the site build too (scripts/build-packs.mjs), so it imports only Node built-ins.

const SYSTEM_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini'])

/** Every file of a repo as a sorted forward-slash path, so a pack is the same on every machine. */
export function packFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && !SYSTEM_FILES.has(entry.name))
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort()
}

/** A hash of a repo's files: a repo whose files did not change keeps its version. */
export function packVersion(dir: string): string {
  const hash = createHash('sha256')
  for (const file of packFiles(dir)) {
    const data = readFileSync(join(dir, file))
    hash.update(`${file}\0${data.length}\0`).update(data)
  }
  return hash.digest('hex').slice(0, 12)
}

const octal = (value: number, width: number): string =>
  `${value.toString(8).padStart(width - 1, '0')}\0`

function tarHeader(name: string, size: number): Buffer {
  if (Buffer.byteLength(name) > 100) throw new Error(`Path too long for a pack: ${name}`)
  const header = Buffer.alloc(512)
  header.write(name, 0)
  header.write(octal(0o644, 8), 100)
  header.write(octal(0, 8), 108)
  header.write(octal(0, 8), 116)
  header.write(octal(size, 12), 124)
  header.write(octal(0, 12), 136)
  header.write(' '.repeat(8), 148)
  header.write('0', 156)
  header.write('ustar\u000000', 257)
  const sum = header.reduce((total, byte) => total + byte, 0)
  header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148)
  return header
}

/**
 * A repo as a tar.gz with fixed modes and times, so the same files always give the same bytes:
 * an app holding an older index still gets the archive whose checksum it expects.
 */
export function packArchive(dir: string): Buffer {
  const parts: Buffer[] = []
  for (const file of packFiles(dir)) {
    const data = readFileSync(join(dir, file))
    parts.push(tarHeader(file, data.length), data, Buffer.alloc((512 - (data.length % 512)) % 512))
  }
  parts.push(Buffer.alloc(1024))
  return gzipSync(Buffer.concat(parts), { level: 9 })
}
