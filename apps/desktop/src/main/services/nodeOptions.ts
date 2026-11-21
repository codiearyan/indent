import { existsSync, readdirSync, realpathSync } from 'fs'
import { basename, delimiter, join } from 'path'

const EXE = process.platform === 'win32' ? 'node.exe' : 'node'

const children = (dir: string): string[] => {
  try {
    return readdirSync(dir).map((name) => join(dir, name))
  } catch {
    return []
  }
}

/** Every `node` binary in the PATH, the version managers' folders, Homebrew and the app's copy. */
export function findNodeBins(path: string, home: string, ownBin: string): string[] {
  const found = [
    ...path.split(delimiter).map((dir) => join(dir, EXE)),
    ...children(join(home, '.nvm', 'versions', 'node')).map((dir) => join(dir, 'bin', EXE)),
    ...[
      join(home, '.local', 'share', 'fnm', 'node-versions'),
      join(home, 'Library', 'Application Support', 'fnm', 'node-versions')
    ].flatMap((root) => children(root).map((dir) => join(dir, 'installation', 'bin', EXE))),
    ...children(join(home, '.volta', 'tools', 'image', 'node')).map((dir) => join(dir, 'bin', EXE)),
    ...['/opt/homebrew/opt', '/usr/local/opt'].flatMap((root) =>
      children(root)
        .filter((dir) => /^node(@\d+)?$/.test(basename(dir)))
        .map((dir) => join(dir, 'bin', EXE))
    ),
    ...(process.env.APPDATA
      ? children(join(process.env.APPDATA, 'nvm')).map((d) => join(d, EXE))
      : []),
    join(ownBin, EXE)
  ]
  const seen = new Set<string>()
  return found.filter((bin) => {
    if (!existsSync(bin)) return false
    const real = realpathSync(bin)
    // A version manager's shim is not Node itself; the real binaries are listed on their own.
    if (basename(real) !== EXE || seen.has(real)) return false
    seen.add(real)
    return true
  })
}

/** Where a Node binary comes from, in the words Settings shows. */
export function nodeSource(bin: string, ownBin: string): string {
  if (bin.startsWith(ownBin)) return "the app's copy"
  if (/[/\\]\.nvm[/\\]|[/\\]nvm[/\\]v/.test(bin)) return 'nvm'
  if (/[/\\]fnm[/\\]/.test(bin)) return 'fnm'
  if (/[/\\]\.volta[/\\]/.test(bin)) return 'Volta'
  if (/homebrew|[/\\]Cellar[/\\]|[/\\]opt[/\\]node/.test(bin)) return 'Homebrew'
  return 'on this computer'
}

/** Newest first: "v24.1.0" before "v22.18.0". */
export function byVersion(a: string, b: string): number {
  const parts = (v: string): number[] => v.replace(/^v/, '').split('.').map(Number)
  const [x, y] = [parts(a), parts(b)]
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return (y[i] ?? 0) - (x[i] ?? 0)
  return 0
}
