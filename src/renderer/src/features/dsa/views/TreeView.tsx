import type { TreeFrame } from '../types'

export function TreeView({ frame }: { frame: TreeFrame }): React.JSX.Element {
  return <pre className="text-xs text-muted-foreground">{JSON.stringify(frame)}</pre>
}
