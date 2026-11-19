import type { MapFrame } from '../types'

export function MapView({ frame }: { frame: MapFrame }): React.JSX.Element {
  return <pre className="text-xs text-muted-foreground">{JSON.stringify(frame)}</pre>
}
