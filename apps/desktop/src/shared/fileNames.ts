/** Why a file or folder name can't be used, in plain words, or null when it can. */
export function nameProblem(name: string): string | null {
  if (!name.trim()) return 'Type a name.'
  if (name !== name.trim()) return "A name can't start or end with a space."
  if (/[/\\]/.test(name)) return "A name can't have a slash in it."
  if (name === '.' || name === '..') return 'Pick a name other than . or ..'
  if (name.startsWith('.')) return "A name can't start with a dot here."
  if (name === 'node_modules') return 'That name is kept for installed packages.'
  if (name.length > 255) return 'That name is too long.'
  return null
}

/** Checks every part of a workspace path, folders split by `/`. */
export function pathProblem(path: string): string | null {
  for (const name of path.split('/')) {
    const problem = nameProblem(name)
    if (problem) return problem
  }
  return null
}

export function joinPath(folder: string | null, name: string): string {
  return folder ? `${folder}/${name}` : name
}

/**
 * Checks a name for a new item, or a renamed one, in `folder`. `taken` lists every path in the
 * workspace. Names that differ only in case clash, as they do on most disks.
 */
export function newNameProblem(
  name: string,
  folder: string | null,
  taken: string[],
  renaming?: string
): string | null {
  const problem = nameProblem(name)
  if (problem) return problem
  const path = joinPath(folder, name).toLowerCase()
  const clash = taken.some((p) => p.toLowerCase() === path && p !== renaming)
  return clash ? `There is already something named ${name} here.` : null
}
