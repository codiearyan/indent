import desktop from '../../../desktop/package.json'

export const VERSION = desktop.version
export const REPO_URL = 'https://github.com/codiearyan/labbench'

// The release workflow gives each installer a name without a version, so these never change.
const latest = (file: string): string => `${REPO_URL}/releases/latest/download/${file}`

export interface Download {
  id: 'mac-arm64' | 'mac-x64' | 'windows' | 'linux'
  /** What the main button says for a visitor on this system. */
  button: string
  /** The name in the list of every download. */
  label: string
  note: string
  href: string
}

export const DOWNLOADS: Download[] = [
  {
    id: 'mac-arm64',
    button: 'Download for macOS',
    label: 'macOS, Apple Silicon',
    note: 'M1 and newer',
    href: latest('Indent-mac-arm64.dmg')
  },
  {
    id: 'mac-x64',
    button: 'Download for Intel Mac',
    label: 'macOS, Intel',
    note: 'Macs from before 2020',
    href: latest('Indent-mac-x64.dmg')
  },
  {
    id: 'windows',
    button: 'Download for Windows',
    label: 'Windows',
    note: '64-bit, new and less tested',
    href: latest('Indent-windows-x64-setup.exe')
  },
  {
    id: 'linux',
    button: 'Download for Linux',
    label: 'Linux',
    note: 'AppImage, new and less tested',
    href: latest('Indent-linux-x86_64.AppImage')
  }
]
