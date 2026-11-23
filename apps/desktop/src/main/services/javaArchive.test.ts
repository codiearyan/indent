import { describe, expect, it } from 'vitest'
import { javaListUrl, pickJavaArchive } from './javaArchive'

const sha = 'a'.repeat(64)
const link =
  'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.13.1%2B2/OpenJDK21U-jdk_aarch64_mac_hotspot_21.0.13.1_2.tar.gz'
const reply = (pack: Record<string, unknown>): unknown => [{ binary: { package: pack } }]

describe('javaListUrl', () => {
  it('asks for the kit of the platform and chip', () => {
    expect(javaListUrl('darwin', 'arm64')).toContain('architecture=aarch64&image_type=jdk&os=mac')
    expect(javaListUrl('win32', 'x64')).toContain('architecture=x64&image_type=jdk&os=windows')
    expect(javaListUrl('linux', 'x64')).toContain('os=linux')
  })

  it('returns null when there is no download for the computer', () => {
    expect(javaListUrl('freebsd', 'x64')).toBeNull()
    expect(javaListUrl('darwin', 'ia32')).toBeNull()
  })
})

describe('pickJavaArchive', () => {
  it('reads the archive and its checksum', () => {
    expect(pickJavaArchive(reply({ link, checksum: sha }))).toEqual({
      url: link,
      sha256: sha,
      zip: false
    })
    const zip = link.replace('.tar.gz', '.zip')
    expect(pickJavaArchive(reply({ link: zip, checksum: sha }))?.zip).toBe(true)
  })

  it('refuses a reply without a kit, a download from elsewhere and a bad checksum', () => {
    expect(pickJavaArchive([])).toBeNull()
    expect(pickJavaArchive(null)).toBeNull()
    expect(pickJavaArchive({ errorMessage: 'none' })).toBeNull()
    expect(pickJavaArchive(reply({ link, checksum: 'abc' }))).toBeNull()
    expect(
      pickJavaArchive(reply({ link: link.replace('.tar.gz', '.pkg'), checksum: sha }))
    ).toBeNull()
    expect(
      pickJavaArchive(reply({ link: 'https://example.com/jdk.tar.gz', checksum: sha }))
    ).toBeNull()
    expect(
      pickJavaArchive(
        reply({ link: link.replace('https://github.com', 'http://github.com'), checksum: sha })
      )
    ).toBeNull()
  })
})
