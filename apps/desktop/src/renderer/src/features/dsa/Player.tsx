import { useEffect } from 'react'
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { IconButton } from '@/features/workspace/IconButton'
import { isShortcut, type ShortcutId } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import type { Player as PlayerControls } from './usePlayer'

function inTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

type KeyInput = Pick<
  KeyboardEvent,
  'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'target' | 'defaultPrevented'
> & { preventDefault(): void }

function onPlayerKey(event: KeyInput, player: PlayerControls): void {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
  if (inTextField(event.target)) return
  const target = event.target instanceof HTMLElement ? event.target : null
  // A focused button or slider already handles these keys itself.
  const space = isShortcut(event, 'playPause')
  if (space && target?.closest('button')) return
  if (!space && target?.closest('[role="slider"]')) return
  const actions: [ShortcutId, () => void][] = [
    ['playPause', player.toggle],
    ['stepBack', player.prev],
    ['stepForward', player.next],
    ['firstStep', () => player.seek(0)],
    ['lastStep', () => player.seek(player.count - 1)]
  ]
  const action = actions.find(([id]) => isShortcut(event, id))?.[1]
  if (!action) return
  event.preventDefault()
  action()
}

/**
 * `embedded` is for a player inside another screen, such as a task's flow: its keys work only
 * while focus is inside it, and Play is not a filled button, since that screen has its own.
 */
export function Player({
  player,
  embedded
}: {
  player: PlayerControls
  embedded?: boolean
}): React.JSX.Element {
  const { index, count, playing, speed } = player
  const last = count - 1

  useEffect(() => {
    if (embedded) return
    const onKey = (event: KeyboardEvent): void => onPlayerKey(event, player)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [player, embedded])

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
      onKeyDown={embedded ? (event) => onPlayerKey(event, player) : undefined}
    >
      <div className="flex items-center gap-1">
        <IconButton label="Restart" onClick={() => player.seek(0)}>
          <RotateCcw />
        </IconButton>
        <IconButton label="Step back" onClick={player.prev} disabled={index === 0}>
          <SkipBack />
        </IconButton>
        <IconButton
          label={playing ? 'Pause' : 'Play'}
          variant={embedded ? 'outline' : 'default'}
          className={cn(embedded && 'border-input bg-transparent shadow-none dark:bg-transparent')}
          onClick={player.toggle}
        >
          {playing ? <Pause /> : <Play />}
        </IconButton>
        <IconButton label="Step forward" onClick={player.next} disabled={index === last}>
          <SkipForward />
        </IconButton>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              onClick={player.cycleSpeed}
              aria-label={`Speed ${speed}x`}
              className="ml-1 w-11 bg-transparent font-mono font-normal tabular-nums shadow-none dark:bg-transparent"
            >
              {speed}x
            </Button>
          </TooltipTrigger>
          <TooltipContent>Speed</TooltipContent>
        </Tooltip>
      </div>
      <Slider
        value={[index]}
        min={0}
        max={last}
        step={1}
        onValueChange={([value]) => player.seek(value)}
        aria-label="Step"
        className={cn(
          'min-w-32 flex-1 [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-accent',
          embedded &&
            '[&_[data-slot=slider-range]]:bg-foreground [&_[data-slot=slider-thumb]]:border-foreground'
        )}
      />
      <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
        Step {index + 1} of {count}
      </span>
    </div>
  )
}
