/** True when `latest` ("v1.5.0" or "1.5.0") is a newer release than `current`. */
export function isNewer(latest: string, current: string): boolean {
  const parts = (v: string): number[] =>
    v
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0)
  const [a, b] = [parts(latest), parts(current)]
  for (let i = 0; i < 3; i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0)
  return false
}

/**
 * The release file for this computer. The names carry no version on purpose (the site links to
 * them), so they are fixed here. Linux updates only as an AppImage.
 */
export function assetName(platform: string, arch: string, appImage: boolean): string | null {
  if (platform === 'darwin') return `Indent-mac-${arch === 'arm64' ? 'arm64' : 'x64'}.dmg`
  if (platform === 'win32') return 'Indent-windows-x64-setup.exe'
  if (platform === 'linux' && appImage) return 'Indent-linux-x86_64.AppImage'
  return null
}

/** A few plain lines from a generated release body: its bullets, without authors and links. */
export function shortNotes(body: string, max = 5): string[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[*-] /.test(line))
    .map((line) =>
      line
        .replace(/^[*-] /, '')
        .replace(/ by @\S+ in https?:\/\/\S+$/, '')
        .replace(/^\w+(\([^)]*\))?!?: /, '')
    )
    .map((line) => line.charAt(0).toUpperCase() + line.slice(1))
    .slice(0, max)
}
