import type { TreeFrame } from '../types'

export interface TreeSlot {
  /** In-order position, 0-based. */
  order: number
  depth: number
  parent: string | null
}

/** Places every node reachable from `root`: x from in-order position, y from depth. */
export function layoutTree(frame: Pick<TreeFrame, 'root' | 'nodes'>): Map<string, TreeSlot> {
  const byId = new Map(frame.nodes.map((node) => [node.id, node]))
  const slots = new Map<string, TreeSlot>()
  const seen = new Set<string>()

  const visit = (id: string | undefined, depth: number, parent: string | null): void => {
    const node = id === undefined ? undefined : byId.get(id)
    if (!node || seen.has(node.id)) return
    seen.add(node.id)
    visit(node.left, depth + 1, node.id)
    slots.set(node.id, { order: slots.size, depth, parent })
    visit(node.right, depth + 1, node.id)
  }

  visit(frame.root ?? undefined, 0, null)
  return slots
}
