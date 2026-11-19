import type { GridFrame } from '../types'

export function GridView({ frame }: { frame: GridFrame }): React.JSX.Element {
  return <pre className="text-xs text-muted-foreground">{JSON.stringify(frame)}</pre>
}
