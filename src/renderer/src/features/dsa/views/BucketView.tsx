import type { BucketFrame } from '../types'

export function BucketView({ frame }: { frame: BucketFrame }): React.JSX.Element {
  return <pre className="text-xs text-muted-foreground">{JSON.stringify(frame)}</pre>
}
