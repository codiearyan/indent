/**
 * The OpenCode release the app installs. Pinned, because the app reads OpenCode's JSON output:
 * a newer release is an app change, tested first. Sizes and sha256 are those GitHub lists for
 * each file of the release.
 */
export const OPENCODE_VERSION = '1.19.6'

export const OPENCODE_RELEASE = `https://github.com/anomalyco/opencode/releases/download/v${OPENCODE_VERSION}`

export interface OpencodeBuild {
  name: string
  size: number
  sha256: string
}

const BUILDS: Record<string, OpencodeBuild> = {
  'darwin-arm64': {
    name: 'opencode-darwin-arm64.zip',
    size: 64493115,
    sha256: 'c0be3f34dde2fdcb31b25120f303c6ed5b69b828f16e5e0fbecff21a882adda1'
  },
  'darwin-x64': {
    name: 'opencode-darwin-x64.zip',
    size: 69315249,
    sha256: '39aabb10005059f80f007a119a33405dcd46325300993eb6cbcc961c7243dd31'
  },
  'linux-x64': {
    name: 'opencode-linux-x64.tar.gz',
    size: 79862500,
    sha256: '47734e08968b30cc22a0bffb6d9feeed76ad4aa743213a12122040392d09a057'
  },
  'linux-arm64': {
    name: 'opencode-linux-arm64.tar.gz',
    size: 78729407,
    sha256: '5b68c1f4c5e75b4134e664cc8f36d634d64208d4fcfe5bcf3b48bab699c2dbac'
  },
  'win32-x64': {
    name: 'opencode-windows-x64.zip',
    size: 81943749,
    sha256: 'fa31c9ec0bac7611ab12699ef8e2fc4c173fb95ac977b09b189b255b8f559bcc'
  },
  'win32-arm64': {
    name: 'opencode-windows-arm64.zip',
    size: 75991503,
    sha256: 'dc72cf0cc9d5b434607e83efc4d172b19020bbc749842681fa195a4c051a4deb'
  }
}

/** The release file for this system and processor; null when OpenCode makes none. */
export function opencodeBuild(platform: string, arch: string): OpencodeBuild | null {
  return BUILDS[`${platform}-${arch}`] ?? null
}

/**
 * The model a fresh install starts on: one of OpenCode's own free models, which need no sign-in.
 * Read from the installed copy's list, since the free models change often. Null keeps OpenCode's
 * default.
 */
export function freeModel(models: string[]): string | null {
  return models.find((model) => /^opencode\/[\w.-]+-free$/.test(model)) ?? null
}
