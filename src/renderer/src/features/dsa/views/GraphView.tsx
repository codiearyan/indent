import type { GraphFrame } from '../types'

export function GraphView({ frame }: { frame: GraphFrame }): React.JSX.Element {
  return <pre className="text-xs text-muted-foreground">{JSON.stringify(frame)}</pre>
}
