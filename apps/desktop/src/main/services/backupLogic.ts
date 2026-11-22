import type { ProgressState } from '@shared/types'
import { readProgressFile } from './progressLogic'

/** The file at the top of a backup archive; the workspaces sit beside it as `<labId>/<chapterId>/`. */
export const MANIFEST = 'indent-backup.json'
export const BACKUP_FORMAT = 1
export const NOT_A_BACKUP = 'That is not an Indent backup.'

export interface BackupManifest {
  format: number
  progress: ProgressState
  /** The renderer's own settings, minus what belongs to one computer. */
  app: Record<string, unknown> | null
  /** The saved AI choice; API keys are never part of it. */
  ai: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

export function readManifest(text: string): BackupManifest {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(NOT_A_BACKUP)
  }
  if (!isRecord(data) || data.format !== BACKUP_FORMAT) throw new Error(NOT_A_BACKUP)
  let progress: ProgressState
  try {
    progress = readProgressFile(JSON.stringify(data.progress))
  } catch {
    throw new Error(NOT_A_BACKUP)
  }
  return {
    format: BACKUP_FORMAT,
    progress,
    app: isRecord(data.app) ? data.app : null,
    ai: isRecord(data.ai) ? data.ai : null
  }
}
