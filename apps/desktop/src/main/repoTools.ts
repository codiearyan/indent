import { createHash } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { REPO_URL } from '@shared/repo'
import { asInstallError, download, InstallError, replaceFolder, unpack } from './library'

// The repo tools: runtime/node_modules, built once per system by .github/workflows/tools.yml and
// published as the release tools-js-<version>. No Electron here, so it runs in tests.

export const TOOLS_RELEASES = `${REPO_URL}/releases/download`

const CHECKSUMS_TIMEOUT_MS = 8000

/** The version in the release tag. scripts/tools-version.mjs computes the same for the workflow. */
export function toolsVersion(lock: string): string {
  // A Windows checkout may end the lockfile's lines with CRLF.
  return createHash('sha256').update(lock.replace(/\r\n/g, '\n')).digest('hex').slice(0, 12)
}

/** `system` is `<platform>-<arch>` of the Node that runs the repos. */
export const toolsArchive = (system: string): string => `javascript-tools-${system}.tar.gz`

const marker = (root: string): string => join(root, '.tools-version')

export function installedTools(root: string): string | null {
  try {
    return readFileSync(marker(root), 'utf8').trim()
  } catch {
    return null
  }
}

export function recordTools(root: string, version: string): void {
  writeFileSync(marker(root), version)
}

type Checksums = Record<string, { sha256: string; size: number }>

function parseChecksums(text: string): Checksums {
  const sums = JSON.parse(text) as unknown
  if (!sums || typeof sums !== 'object') throw new InstallError('broken')
  for (const entry of Object.values(sums)) {
    const { sha256, size } = (entry ?? {}) as Record<string, unknown>
    if (typeof sha256 !== 'string' || typeof size !== 'number') throw new InstallError('broken')
  }
  return sums as Checksums
}

/**
 * Downloads the tools for `system` into root/node_modules. The folder there is replaced only once
 * the new one is complete and checked; any failure leaves it as it was. 'missing' means there is
 * no release for this version or no file for this system.
 */
export async function downloadTools(
  root: string,
  baseUrl: string,
  version: string,
  system: string,
  onProgress: (done: number) => void
): Promise<void> {
  const release = `${baseUrl}/tools-js-${version}`
  const response = await fetch(`${release}/checksums.json`, {
    signal: AbortSignal.timeout(CHECKSUMS_TIMEOUT_MS)
  }).catch(() => null)
  if (response?.status === 404) throw new InstallError('missing')
  if (!response?.ok) throw new InstallError('offline')
  const name = toolsArchive(system)
  const entry = parseChecksums(await response.text().catch(() => ''))[name]
  if (!entry) throw new InstallError('missing')

  const work = join(root, '.tools-download')
  await rm(work, { recursive: true, force: true })
  await mkdir(work, { recursive: true })
  try {
    const archive = join(work, name)
    await download(`${release}/${name}`, archive, entry, onProgress)
    await unpack(archive, join(work, 'fresh'), { links: true })
    const fresh = join(work, 'fresh', 'node_modules')
    if (!existsSync(fresh)) throw new InstallError('broken')
    await replaceFolder(fresh, join(root, 'node_modules'), join(work, 'old'))
    recordTools(root, version)
  } catch (error) {
    throw asInstallError(error)
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}
