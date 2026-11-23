import { renameSync, rmSync, writeFileSync } from 'fs'
import { rename, rm, writeFile } from 'fs/promises'

const queues = new Map<string, Promise<void>>()
let count = 0

const tempFor = (file: string): string => `${file}.${process.pid}.${++count}.tmp`

/**
 * Replaces a file whole: it is written beside the old one and renamed over it, so a crash or a
 * full drive halfway leaves the old file, never half of each. Writes to one file land in the
 * order they were asked for.
 */
export function writeWhole(file: string, data: string | Uint8Array): Promise<void> {
  const write = async (): Promise<void> => {
    const temp = tempFor(file)
    try {
      await writeFile(temp, data)
      await rename(temp, file)
    } catch (error) {
      await rm(temp, { force: true }).catch(() => {})
      throw error
    }
  }
  const done = (queues.get(file) ?? Promise.resolve()).then(write)
  const settled = done.catch(() => {})
  queues.set(file, settled)
  void settled.then(() => {
    if (queues.get(file) === settled) queues.delete(file)
  })
  return done
}

/** Settles once the writes to `file` asked for so far are done, whether they worked or not. */
export function writesDone(file: string): Promise<void> {
  return queues.get(file) ?? Promise.resolve()
}

/** `writeWhole` for startup and other code that cannot wait. */
export function writeWholeSync(file: string, data: string | Uint8Array): void {
  const temp = tempFor(file)
  try {
    writeFileSync(temp, data)
    renameSync(temp, file)
  } catch (error) {
    rmSync(temp, { force: true })
    throw error
  }
}
