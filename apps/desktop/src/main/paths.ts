import { app } from 'electron'
import { join } from 'path'

/** Lab packs: the repo root's content/ folder in dev, an extra resource when packaged. */
export function contentDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'content')
    : join(app.getAppPath(), '..', '..', 'content')
}

/** Parent of every learner workspace. Lab dependencies are installed here so each workspace resolves them. */
export function workspacesRoot(): string {
  return join(app.getPath('userData'), 'workspaces')
}

/** Tools the app downloaded for itself. Nothing outside the app looks here. */
export function toolsDir(): string {
  return join(app.getPath('userData'), 'tools')
}

/** Where the app's own copy of Node goes, and the folder inside it that holds `node`. */
export function ownNodeDir(): string {
  return join(toolsDir(), 'node')
}

export function ownNodeBin(): string {
  return process.platform === 'win32' ? ownNodeDir() : join(ownNodeDir(), 'bin')
}

export function dataFile(name: string): string {
  return join(app.getPath('userData'), name)
}

/** Ids come from the renderer; reject anything that could escape its folder. */
export function safeId(id: string): string {
  if (!/^[a-z0-9][a-z0-9-_]*$/i.test(id)) throw new Error(`Invalid id: ${id}`)
  return id
}

export function workspaceDir(labId: string, chapterId: string): string {
  return join(workspacesRoot(), safeId(labId), safeId(chapterId))
}

export function chapterContentDir(labId: string, chapterId: string): string {
  return join(contentDir(), 'labs', safeId(labId), safeId(chapterId))
}
