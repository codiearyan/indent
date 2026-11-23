export interface JavaArchive {
  url: string
  sha256: string
  zip: boolean
}

const SYSTEMS: Record<string, string> = { darwin: 'mac', linux: 'linux', win32: 'windows' }
const CHIPS: Record<string, string> = { arm64: 'aarch64', x64: 'x64' }

// The long-term support line that is downloaded. The repos need 17 or newer.
const LIST = 'https://api.adoptium.net/v3/assets/latest/21/hotspot'

/** Where the newest Java kit for this kind of computer is listed; null when there is none. */
export function javaListUrl(platform: string, arch: string): string | null {
  const os = SYSTEMS[platform]
  const chip = CHIPS[arch]
  if (!os || !chip) return null
  return `${LIST}?architecture=${chip}&image_type=jdk&os=${os}&vendor=eclipse`
}

/** The kit in that list's reply, only when it is an archive from the project's own releases. */
export function pickJavaArchive(list: unknown): JavaArchive | null {
  const pack = (list as { binary?: { package?: Record<string, unknown> } }[] | null)?.[0]?.binary
    ?.package
  const { link, checksum } = pack ?? {}
  if (typeof link !== 'string' || typeof checksum !== 'string') return null
  if (!/^https:\/\/github\.com\/adoptium\/[\w.-]+\/releases\/download\/[\w.%+/-]+$/.test(link)) {
    return null
  }
  const kind = /\.(tar\.gz|zip)$/.exec(link)?.[1]
  if (!kind || !/^[0-9a-f]{64}$/.test(checksum)) return null
  return { url: link, sha256: checksum, zip: kind === 'zip' }
}
