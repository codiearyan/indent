import type { ListFrame } from '../types'

export function ListView({ frame }: { frame: ListFrame }): React.JSX.Element {
  return <pre className="text-xs text-muted-foreground">{JSON.stringify(frame)}</pre>
}
