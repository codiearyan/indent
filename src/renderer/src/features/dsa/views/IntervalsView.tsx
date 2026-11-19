import type { IntervalsFrame } from '../types'

export function IntervalsView({ frame }: { frame: IntervalsFrame }): React.JSX.Element {
  return <pre className="text-xs text-muted-foreground">{JSON.stringify(frame)}</pre>
}
