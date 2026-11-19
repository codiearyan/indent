import type { ArrayFrame } from '../types'

export function ArrayView({ frame }: { frame: ArrayFrame }): React.JSX.Element {
  return <pre className="text-xs text-muted-foreground">{JSON.stringify(frame)}</pre>
}
