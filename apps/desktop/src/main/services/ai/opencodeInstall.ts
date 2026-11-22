import { createHash } from 'crypto'
import { createWriteStream, existsSync } from 'fs'
import { chmod, mkdir, rename, rm } from 'fs/promises'
import { basename, join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import type { ReadableStream } from 'stream/web'
import { unpack } from '../../library'
import { ownOpencodeBin, ownOpencodeDir, toolsDir } from '../../paths'
import { OPENCODE_RELEASE, opencodeBuild } from './opencodeBuild'

const CANCELLED = 'The install was cancelled.'
const DAMAGED = 'The OpenCode download was damaged on the way. Try again.'

function plain(error: unknown, signal: AbortSignal): Error {
  if (signal.aborted) return new Error(CANCELLED)
  if ((error as NodeJS.ErrnoException).code === 'ENOSPC') {
    return new Error('There is not enough free space on this computer for OpenCode.')
  }
  return error instanceof Error ? error : new Error(String(error))
}

/**
 * Downloads the pinned OpenCode release for this computer into the app's tools folder. The file
 * must match the size and sha256 written in the app before it is unpacked, and the copy that was
 * there is replaced only once the new one is complete.
 */
export async function installOpencode(
  signal: AbortSignal,
  onProgress: (done: number) => void
): Promise<void> {
  const build = opencodeBuild(process.platform, process.arch)
  if (!build) throw new Error('OpenCode has no download for this kind of computer.')
  const work = join(toolsDir(), '.opencode-download')
  await rm(work, { recursive: true, force: true })
  await mkdir(work, { recursive: true })
  try {
    const response = await fetch(`${OPENCODE_RELEASE}/${build.name}`, { signal }).catch(() => null)
    if (signal.aborted) throw new Error(CANCELLED)
    if (!response?.ok || !response.body) {
      throw new Error('Could not download OpenCode. Check your internet connection and try again.')
    }
    const file = join(work, build.name)
    const hash = createHash('sha256')
    let received = 0
    let shown = -1
    await pipeline(
      Readable.fromWeb(response.body as ReadableStream),
      async function* (chunks) {
        for await (const chunk of chunks) {
          hash.update(chunk)
          received += chunk.length
          const percent = Math.min(100, Math.floor((received / build.size) * 100))
          if (percent !== shown) onProgress((shown = percent) / 100)
          yield chunk
        }
      },
      createWriteStream(file),
      { signal }
    ).catch((error: unknown) => {
      throw plain(error, signal)
    })
    if (received !== build.size || hash.digest('hex') !== build.sha256) throw new Error(DAMAGED)

    const unpacked = join(work, 'opencode')
    await unpack(file, unpacked).catch(() => {
      throw new Error(DAMAGED)
    })
    const bin = join(unpacked, basename(ownOpencodeBin()))
    if (!existsSync(bin)) throw new Error(DAMAGED)
    if (process.platform !== 'win32') await chmod(bin, 0o755)
    await rm(ownOpencodeDir(), { recursive: true, force: true })
    await rename(unpacked, ownOpencodeDir()).catch((error: unknown) => {
      throw plain(error, signal)
    })
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}

export async function removeOpencode(): Promise<void> {
  await rm(ownOpencodeDir(), { recursive: true, force: true })
}
