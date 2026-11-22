import type { ToolId } from '@shared/types'

/** The tools the system installs; the app downloads Node itself. */
export type SystemTool = Exclude<ToolId, 'node'>

export interface Installer {
  cmd: string
  args: string[]
}

/** `3.12.1` from `Python 3.12.1`; null for Python 2 or anything else. */
export function pythonVersion(output: string): string | null {
  return /^Python (3\.\d+\S*)/m.exec(output)?.[1] ?? null
}

/** `21.0.2` from `javac 21.0.2`. */
export function javacVersion(output: string): string | null {
  return /^javac (\S+)/m.exec(output)?.[1] ?? null
}

/** `21.0.2` from `openjdk version "21.0.2" 2024-01-16`. */
export function javaVersion(output: string): string | null {
  return /version "([^"]+)"/.exec(output)?.[1] ?? null
}

/** The compiler's name and version from the output of `g++ --version` or `clang++ --version`. */
export function cppVersion(output: string): string | null {
  const clang = /^(.*clang) version (\d[\w.]*)/m.exec(output)
  if (clang) return `${clang[1]} ${clang[2]}`
  const gcc = /^(\S+?)(?:\.exe)? \(.*\) (\d[\w.]*)/m.exec(output)
  if (gcc) return `${gcc[1]} ${gcc[2]}`
  return output.trim().split('\n')[0] || null
}

export function pythonSupported(version: string): boolean {
  const [major, minor] = version.split('.').map((part) => parseInt(part))
  return major > 3 || (major === 3 && minor >= 9)
}

/** Java 8 and older call themselves 1.x. */
export function javaSupported(version: string): boolean {
  const [first, second] = version.split('.').map((part) => parseInt(part))
  return (first === 1 ? second : first) >= 17
}

/**
 * The Python installer on Windows gives `python` and no `python3`, which the lessons use. The app
 * then keeps a `python3` of its own that runs it.
 */
export function wantsPython3Shim(
  platform: NodeJS.Platform,
  python3: string | null,
  python: string | null
): boolean {
  return platform === 'win32' && !python3 && !!python
}

export const PYTHON3_SHIM = '@python %*\r\n'

// Tried in order on Linux, each with the arguments that install without asking again.
export const LINUX_MANAGERS: [string, string[]][] = [
  ['apt-get', ['install', '-y']],
  ['dnf', ['install', '-y']],
  ['pacman', ['-S', '--noconfirm']],
  ['zypper', ['--non-interactive', 'install']]
]

const LINUX_PACKAGES: Record<SystemTool, Record<string, string>> = {
  git: { 'apt-get': 'git', dnf: 'git', pacman: 'git', zypper: 'git' },
  python: { 'apt-get': 'python3', dnf: 'python3', pacman: 'python', zypper: 'python3' },
  // Debian 12 has no 21; 17 is in every apt suite still supported and is new enough.
  java: {
    'apt-get': 'openjdk-17-jdk',
    dnf: 'java-21-openjdk-devel',
    pacman: 'jdk21-openjdk',
    zypper: 'java-21-openjdk-devel'
  },
  cpp: { 'apt-get': 'g++', dnf: 'gcc-c++', pacman: 'gcc', zypper: 'gcc-c++' }
}

const WINGET: Record<SystemTool, string | null> = {
  git: 'Git.Git',
  python: 'Python.Python.3.14',
  java: 'EclipseAdoptium.Temurin.25.JDK',
  cpp: null
}

// Apple's developer tools hold Git, Python 3.9 and a C++ compiler; a Java kit is its own download.
const APPLE_DEV_TOOLS: SystemTool[] = ['git', 'python', 'cpp']

/**
 * The command that installs a tool here: Apple's installer, winget (Windows asks for permission),
 * or the package manager through pkexec (which asks for the password). `found` holds the commands
 * on the PATH. Null leaves the download page.
 */
export function installerFor(
  id: SystemTool,
  platform: NodeJS.Platform,
  found: Set<string>
): Installer | null {
  if (platform === 'darwin') {
    return APPLE_DEV_TOOLS.includes(id) ? { cmd: 'xcode-select', args: ['--install'] } : null
  }
  if (platform === 'win32') {
    const pkg = WINGET[id]
    if (!pkg || !found.has('winget')) return null
    return {
      cmd: 'winget',
      args: [
        ...['install', '--id', pkg, '-e', '--source', 'winget'],
        ...['--accept-package-agreements', '--accept-source-agreements']
      ]
    }
  }
  if (!found.has('pkexec')) return null
  const manager = LINUX_MANAGERS.find(([name]) => found.has(name))
  if (!manager) return null
  const [name, args] = manager
  return { cmd: 'pkexec', args: [name, ...args, LINUX_PACKAGES[id][name]] }
}
