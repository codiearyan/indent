export interface FileNode {
  kind: 'file'
  path: string
  name: string
}

export interface FolderNode {
  kind: 'folder'
  path: string
  name: string
  children: TreeNode[]
  /** Holds a file that differs from the starter, at any depth. */
  changed: boolean
}

export type TreeNode = FileNode | FolderNode

export interface TreeRow {
  node: TreeNode
  /** 1 at the top of the workspace, as `aria-level` counts. */
  level: number
  parent: string | null
}

export function parentOf(path: string): string | null {
  const slash = path.lastIndexOf('/')
  return slash === -1 ? null : path.slice(0, slash)
}

export function nameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

/** Every folder above the given paths, outermost first. */
export function foldersAbove(paths: string[]): string[] {
  const folders = new Set<string>()
  for (const path of paths) {
    for (let parent = parentOf(path); parent; parent = parentOf(parent)) folders.add(parent)
  }
  return [...folders].sort()
}

const byKindThenName = (a: TreeNode, b: TreeNode): number =>
  a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'folder' ? -1 : 1

/** Nests the workspace's paths into folders: folders first, then files, each alphabetical. */
export function buildTree(files: string[], folders: string[], changed: string[]): TreeNode[] {
  const root: TreeNode[] = []
  const byPath = new Map<string, FolderNode>()
  const folder = (path: string): FolderNode => {
    const existing = byPath.get(path)
    if (existing) return existing
    const node: FolderNode = {
      kind: 'folder',
      path,
      name: nameOf(path),
      children: [],
      changed: false
    }
    byPath.set(path, node)
    const parent = parentOf(path)
    ;(parent ? folder(parent).children : root).push(node)
    return node
  }
  for (const path of folders) folder(path)
  for (const path of files) {
    const parent = parentOf(path)
    ;(parent ? folder(parent).children : root).push({ kind: 'file', path, name: nameOf(path) })
  }
  for (const path of foldersAbove(changed)) {
    const node = byPath.get(path)
    if (node) node.changed = true
  }
  const sort = (nodes: TreeNode[]): void => {
    nodes.sort(byKindThenName)
    for (const node of nodes) if (node.kind === 'folder') sort(node.children)
  }
  sort(root)
  return root
}

/** The rows on screen: every node whose folders are all expanded. */
export function visibleRows(
  nodes: TreeNode[],
  expanded: ReadonlySet<string>,
  level = 1,
  parent: string | null = null
): TreeRow[] {
  return nodes.flatMap((node) => {
    const row = { node, level, parent }
    if (node.kind === 'file' || !expanded.has(node.path)) return [row]
    return [row, ...visibleRows(node.children, expanded, level + 1, node.path)]
  })
}

/** A path after `from` was renamed to `to`: the item itself or anything inside it moves along. */
export function movedPath(path: string, from: string, to: string): string {
  if (path === from) return to
  return path.startsWith(`${from}/`) ? to + path.slice(from.length) : path
}

export function isInside(path: string, folder: string): boolean {
  return path === folder || path.startsWith(`${folder}/`)
}
