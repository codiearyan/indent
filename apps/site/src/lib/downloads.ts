import desktop from '../../../desktop/package.json'

export const VERSION = desktop.version
export const REPO_URL = 'https://github.com/codiearyan/labbench'

// The release workflow gives each installer a name without a version, so these never change.
export const RELEASES_URL = `${REPO_URL}/releases/latest`
const latest = (file: string): string => `${RELEASES_URL}/download/${file}`

export interface Download {
  id: 'mac-arm64' | 'mac-x64' | 'windows' | 'linux'
  os: 'mac' | 'windows' | 'linux'
  /** The system and the variant, as the two columns of the download menu. */
  name: string
  detail: string
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
    os: 'mac',
    name: 'macOS',
    detail: 'Apple Silicon',
    button: 'Download for macOS',
    label: 'macOS, Apple Silicon',
    note: 'M1 and newer',
    href: latest('Indent-mac-arm64.dmg')
  },
  {
    id: 'mac-x64',
    os: 'mac',
    name: 'macOS',
    detail: 'Intel',
    button: 'Download for Intel Mac',
    label: 'macOS, Intel',
    note: 'Macs from before 2020',
    href: latest('Indent-mac-x64.dmg')
  },
  {
    id: 'windows',
    os: 'windows',
    name: 'Windows',
    detail: '10 and 11',
    button: 'Download for Windows',
    label: 'Windows',
    note: '64-bit, new and less tested',
    href: latest('Indent-windows-x64-setup.exe')
  },
  {
    id: 'linux',
    os: 'linux',
    name: 'Linux',
    detail: 'AppImage',
    button: 'Download for Linux',
    label: 'Linux',
    note: 'AppImage, new and less tested',
    href: latest('Indent-linux-x86_64.AppImage')
  }
]
