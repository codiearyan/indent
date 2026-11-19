import { useMemo } from 'react'
import { Headphones, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TOUR } from '@/features/tour/anchors'
import { IconButton } from './IconButton'
import { lessonParts } from './lessonSpeech'
import { useSpeech } from './useSpeech'

/** Mount with `key={chapter.id}` so speech stops when the chapter changes. */
export function AudioCard({ lesson }: { lesson: string }): React.JSX.Element | null {
  const parts = useMemo(() => lessonParts(lesson), [lesson])
  const { status, index, rate, toggle, go, cycleRate } = useSpeech(parts)

  if (parts.length === 0 || !('speechSynthesis' in window)) return null

  const playing = status === 'playing'

  return (
    <div data-tour={TOUR.audio} className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <Button
        variant="outline"
        size="icon"
        className="shrink-0 rounded-full"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={toggle}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Headphones className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">Listen to this chapter</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {status === 'idle'
            ? `${parts.length} ${parts.length === 1 ? 'part' : 'parts'}, read aloud. Keep reading or coding while it plays.`
            : `Part ${index + 1} of ${parts.length}${status === 'paused' ? ', paused' : ''}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton label="Previous part" disabled={index === 0} onClick={() => go(index - 1)}>
          <SkipBack />
        </IconButton>
        <IconButton
          label="Next part"
          disabled={index >= parts.length - 1}
          onClick={() => go(index + 1)}
        >
          <SkipForward />
        </IconButton>
        <Button
          variant="ghost"
          size="sm"
          className="w-12 tabular-nums"
          aria-label={`Speed ${rate}x`}
          onClick={cycleRate}
        >
          {rate}x
        </Button>
      </div>
    </div>
  )
}
