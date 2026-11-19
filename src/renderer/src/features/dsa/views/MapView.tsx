import { cn } from '@/lib/utils'
import { MOVE, toneBox } from '../tones'
import type { MapFrame } from '../types'
import { FrameLabel } from './FrameLabel'

export function MapView({ frame }: { frame: MapFrame }): React.JSX.Element {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      {frame.label && <FrameLabel>{frame.label}</FrameLabel>}
      <div className="flex h-24 w-full max-w-2xl flex-wrap content-start justify-center gap-1.5 overflow-y-auto">
        {frame.entries.length === 0 && (
          <span className="self-center text-xs text-muted-foreground">empty</span>
        )}
        {frame.entries.map((entry) => (
          <div
            key={entry.key}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-md border px-2 font-mono text-sm',
              'animate-in fade-in zoom-in-95 motion-reduce:animate-none',
              MOVE,
              toneBox[entry.tone ?? 'none']
            )}
          >
            <span>{entry.key}</span>
            <span className="text-muted-foreground">→</span>
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
