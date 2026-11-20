export interface NodeArchive {
  name: string
  sha256: string
}

const PLATFORMS: Record<string, string> = { darwin: 'darwin', linux: 'linux', win32: 'win' }

/**
 * The Node download for this kind of computer, read from the checksum list that nodejs.org
 * publishes next to its downloads: one `<sha256>  <file name>` per line.
 */
export function pickNodeArchive(
  checksums: string,
  platform: string,
  arch: string
): NodeArchive | null {
  const os = PLATFORMS[platform]
  if (!os || !['arm64', 'x64'].includes(arch)) return null
  const wanted = `-${os}-${arch}.${os === 'win' ? 'zip' : 'tar.gz'}`
  for (const line of checksums.split('\n')) {
    const [sha256, name] = line.trim().split(/\s+/)
    if (name?.endsWith(wanted) && /^node-v[\d.]+-/.test(name) && /^[0-9a-f]{64}$/.test(sha256)) {
      return { name, sha256 }
    }
  }
  return null
}
