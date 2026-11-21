import { cn } from '@/lib/utils'
import { MOVE, toneBox } from '../tones'
import type { MapFrame } from '../types'
import { FrameLabel } from './FrameLabel'

export function MapView({ frame, fit }: { frame: MapFrame; fit?: boolean }): React.JSX.Element {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      {frame.label && <FrameLabel>{frame.label}</FrameLabel>}
      <div
        className={cn(
          'flex w-full max-w-2xl flex-wrap content-start justify-center gap-1.5',
          fit ? 'max-h-48 overflow-y-auto' : 'h-24 overflow-y-auto'
        )}
      >
        {frame.entries.length === 0 && (
          <span className="self-center text-xs text-muted-foreground">empty</span>
        )}
        {frame.entries.map((entry) => (
          <div
            key={entry.key}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-2 font-mono text-sm',
              fit ? 'min-h-7 max-w-full py-0.5 wrap-anywhere' : 'h-7',
              'animate-in fade-in zoom-in-95 motion-reduce:animate-none',
              MOVE,
              toneBox[entry.tone ?? 'none']
            )}
          >
            <span className={cn(fit && 'min-w-0')}>{entry.key}</span>
            <span className="text-muted-foreground">→</span>
            <span className={cn(fit && 'min-w-0')}>{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
