import { useMemo } from 'react'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TOUR } from '@/features/tour/anchors'
import { useShortcuts } from '@/lib/useShortcuts'
import { IconButton } from './IconButton'
import { lessonParts } from '@shared/narration'
import { useSpeech } from './useSpeech'

/** Mount with `key={chapter.id}` so speech stops when the chapter changes. */
export function AudioCard({
  lesson,
  labId,
  chapterId
}: {
  lesson: string
  labId: string
  chapterId: string
}): React.JSX.Element | null {
  const parts = useMemo(() => lessonParts(lesson), [lesson])
  const { status, index, rate, toggle, go, cycleRate } = useSpeech(parts, labId, chapterId)
  useShortcuts({ readAloud: parts.length > 0 && toggle })

  if (parts.length === 0 || !('speechSynthesis' in window)) return null

  const playing = status === 'playing'

  return (
    <div
      data-tour={TOUR.audio}
      className="flex h-12 items-center gap-3 rounded-lg border border-border pr-1.5 pl-2"
    >
      <Button
        variant="outline"
        size="icon-sm"
        className="shrink-0 rounded-full border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent [&_svg]:stroke-[1.5]"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={toggle}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate text-sm">Read aloud</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {status === 'idle'
            ? `${parts.length} ${parts.length === 1 ? 'part' : 'parts'}`
            : `Part ${index + 1} of ${parts.length}${status === 'paused' ? ', paused' : ''}`}
        </span>
      </div>
      <div className="flex shrink-0 items-center">
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
          className="w-11 px-0 font-normal text-muted-foreground tabular-nums hover:text-foreground"
          aria-label={`Speed ${rate}x`}
          onClick={cycleRate}
        >
          {rate}x
        </Button>
      </div>
    </div>
  )
}
