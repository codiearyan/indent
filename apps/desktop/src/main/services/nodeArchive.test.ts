import { describe, expect, it } from 'vitest'
import { pickNodeArchive } from './nodeArchive'

const sha = (letter: string): string => letter.repeat(64)
const LIST = [
  `${sha('a')}  node-v24.22.3-darwin-arm64.tar.gz`,
  `${sha('b')}  node-v24.22.3-darwin-arm64.tar.xz`,
  `${sha('c')}  node-v24.22.3-darwin-x64.tar.gz`,
  `${sha('d')}  node-v24.22.3-linux-x64.tar.gz`,
  `${sha('e')}  node-v24.22.3-win-x64.zip`,
  `${sha('f')}  node-v24.22.3-headers.tar.gz`,
  `${sha('1')}  win-x64/node.exe`
].join('\n')

describe('pickNodeArchive', () => {
  it('finds the archive for the platform and chip', () => {
    expect(pickNodeArchive(LIST, 'darwin', 'arm64')).toEqual({
      name: 'node-v24.22.3-darwin-arm64.tar.gz',
      sha256: sha('a')
    })
    expect(pickNodeArchive(LIST, 'darwin', 'x64')?.sha256).toBe(sha('c'))
    expect(pickNodeArchive(LIST, 'win32', 'x64')?.name).toBe('node-v24.22.3-win-x64.zip')
  })

  it('returns null when there is no download for the computer', () => {
    expect(pickNodeArchive(LIST, 'linux', 'arm64')).toBeNull()
    expect(pickNodeArchive(LIST, 'freebsd', 'x64')).toBeNull()
    expect(pickNodeArchive(LIST, 'darwin', 'ia32')).toBeNull()
  })

  it('ignores lines without a real checksum', () => {
    expect(pickNodeArchive('nothash  node-v24.0.0-darwin-arm64.tar.gz', 'darwin', 'arm64')).toBe(
      null
    )
  })
})
