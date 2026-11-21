import { useEffect, useRef, useState } from 'react'
import { Check, Pause, Play, RotateCcw, X } from 'lucide-react'
import type { Intro, IntroStation } from '@shared/types'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/features/workspace/IconButton'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { cn } from '@/lib/utils'
import {
  LAST_FRAME,
  lit,
  shot,
  STAGE_H,
  STATION_H,
  STATION_TOP,
  STATION_W,
  stationLeft,
  ticketStation
} from './camera'
import './intro.css'

const BEATS = ['The ask', 'The problem', 'Your part', 'Done']
/** How long a frame holds before the next one, in ms. */
const HOLD = [2400, 3200, 2800, 2800]
/** When a frame's ticket changes: after the move that brings it there (see intro.css). */
const TURN: Record<number, number> = { 1: 1300, 3: 1500, 4: 2300 }
const ROAD_Y = STATION_TOP + STATION_H + 26
/** The stage before it is measured: the lesson panel at its default size. */
const DEFAULT_WIDTH = 456

const box = { top: STATION_TOP, width: STATION_W, height: STATION_H }
const row = 'flex h-[26px] items-center border-t border-rule'

interface Props {
  intro: Intro
  /** Play once by itself, the first time it is on screen. */
  autoPlay: boolean
  /** Whether the lesson is the tab in front. */
  active: boolean
}

/** An issue's story in five frames: the ask, the problem, your part, done, the whole trip. */
export function IntroPlayer({ intro, autoPlay, active }: Props): React.JSX.Element {
  const reduced = useReducedMotion()
  const [armed, setArmed] = useState(autoPlay && !reduced)
  const [frame, setFrame] = useState(armed ? 0 : LAST_FRAME)
  const [playing, setPlaying] = useState(false)
  const [turned, setTurned] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)

  if (armed && active) {
    setArmed(false)
    setPlaying(true)
  }
  // Nobody saw a run that the Tasks tab covered: it starts over when the lesson is back in front.
  if (playing && !active) {
    setPlaying(false)
    setFrame(0)
    setTurned(false)
    setArmed(true)
  }

  useEffect(() => {
    const el = stage.current
    if (!el) return
    // A hidden tab measures 0; the last real width stays.
    const observer = new ResizeObserver(([entry]) =>
      setWidth((last) => entry.contentRect.width || last)
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!playing) return
    const timers = [
      setTimeout(() => setTurned(true), TURN[frame] ?? 0),
      frame < LAST_FRAME
        ? setTimeout(() => {
            setFrame(frame + 1)
            setTurned(false)
          }, HOLD[frame])
        : setTimeout(() => setPlaying(false), TURN[LAST_FRAME])
    ]
    return () => timers.forEach(clearTimeout)
  }, [playing, frame])

  const playFrom = (next: number): void => {
    setFrame(next)
    setTurned(false)
    setPlaying(true)
  }

  const { stations, ticket } = intro
  const count = stations.length
  const mine = stations.findIndex((station) => station.mine)
  const view = shot(frame, count, mine, width ?? DEFAULT_WIDTH)
  const on = lit(frame, count, mine)
  // A paused frame shows how it ends.
  const late = turned || !playing
  const ending =
    frame === 1 && late ? 'wrong' : (frame === 3 && late) || frame === LAST_FRAME ? 'right' : 'ask'
  const answered = frame === 1 || ending === 'right'
  const ended = frame === LAST_FRAME && !playing
  const gapStart = stationLeft(mine - 1) + STATION_W
  const roadEnd = stationLeft(count - 1) + STATION_W

  return (
    <div>
      <div
        ref={stage}
        role="img"
        aria-label={stations.map((s) => (s.mine ? `${s.title} (your part)` : s.title)).join(', ')}
        data-still={width === null}
        className="intro-stage relative overflow-hidden"
        style={{ height: STAGE_H }}
      >
        <div
          className="intro-world absolute top-0 left-0"
          style={{
            transform: `translate(${(width ?? DEFAULT_WIDTH) / 2 - view.x * view.scale}px, ${
              ((1 - view.scale) * STAGE_H) / 2
            }px) scale(${view.scale})`
          }}
        >
          <div
            className="absolute left-0 border-t border-muted-foreground/50"
            style={{ top: ROAD_Y, width: gapStart }}
          />
          <div
            className={cn(
              'absolute border-t border-muted-foreground/50',
              frame < 2 && 'border-dashed'
            )}
            style={{ top: ROAD_Y, left: gapStart, width: roadEnd - gapStart }}
          />

          {stations.map((station, i) =>
            station.mine ? (
              <Mine key={i} station={station} left={stationLeft(i)} frame={frame} />
            ) : (
              <Station
                key={i}
                station={station}
                left={stationLeft(i)}
                dim={!on.includes(i)}
                answered={answered}
              />
            )
          )}

          <div
            className="intro-ticket absolute flex items-center gap-1.5"
            data-frame={frame}
            style={{ top: ROAD_Y - 12, left: stationLeft(ticketStation(frame, count, mine)) }}
          >
            <span className="rounded-md bg-foreground px-2.5 font-mono text-xs leading-6 font-medium whitespace-nowrap text-background">
              {ticket.label} {ending === 'ask' ? '?' : ticket[ending]}
            </span>
            {ending === 'wrong' && (
              <span className="rounded-sm bg-card">
                <span className="flex items-center gap-1 rounded-sm bg-destructive/10 px-1.5 text-[11px] leading-[18px] whitespace-nowrap text-destructive">
                  <X className="size-3" />
                  {ticket.why}
                </span>
              </span>
            )}
            {frame === LAST_FRAME && late && (
              <span className="rounded-sm bg-card">
                <span className="block rounded-sm bg-success/10 p-0.5 text-success">
                  <Check className="size-3.5" />
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      <p aria-live="polite" className="mt-3 min-h-10 text-sm">
        {intro.captions[frame]}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-rule pt-2">
        {BEATS.map((beat, i) => {
          const current = Math.min(frame, BEATS.length - 1) === i
          return (
            <Button
              key={beat}
              variant="ghost"
              size="xs"
              aria-pressed={current}
              onClick={() => playFrom(i)}
              className={cn(
                'font-normal text-muted-foreground',
                current && 'bg-accent text-foreground'
              )}
            >
              {beat}
            </Button>
          )
        })}
        <IconButton
          label={playing ? 'Pause' : ended ? 'Replay' : 'Play'}
          className="ml-auto"
          onClick={() => (ended ? playFrom(0) : setPlaying(!playing))}
        >
          {playing ? <Pause /> : ended ? <RotateCcw /> : <Play />}
        </IconButton>
      </div>
    </div>
  )
}

function Station({
  station,
  left,
  dim,
  answered
}: {
  station: IntroStation
  left: number
  dim: boolean
  /** The marked row lights up while the story points at the answer. */
  answered: boolean
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'intro-station absolute rounded-lg border border-border p-3 text-[13px] leading-[18px]',
        dim && 'opacity-30'
      )}
      style={{ ...box, left }}
    >
      <div className="mb-2 font-semibold">{station.title}</div>
      {station.say && (
        <div className="inline-block rounded-lg border border-border px-2.5 py-1.5">
          {station.say}
        </div>
      )}
      {station.text && <p>{station.text}</p>}
      {station.rows?.map((cells, i) => (
        <div
          key={i}
          className={cn(
            row,
            '-mx-1.5 gap-1.5 rounded-sm px-1.5 text-xs text-muted-foreground transition-colors duration-(--motion-state)',
            answered && station.mark === i && 'bg-accent text-foreground'
          )}
        >
          {cells.length > 1 && (
            <span className="font-mono text-[11px] whitespace-nowrap">{cells[0]}</span>
          )}
          <span className="truncate">{cells[cells.length - 1]}</span>
        </div>
      ))}
      {station.note && <p className="mt-2 text-xs text-muted-foreground">{station.note}</p>}
    </div>
  )
}

/** The learner's station: a hole while the story has the problem, then the part that fills it. */
function Mine({
  station,
  left,
  frame
}: {
  station: IntroStation
  left: number
  frame: number
}): React.JSX.Element {
  return (
    <>
      <div
        className="intro-station intro-gap absolute grid place-content-center justify-items-center gap-1.5 rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground"
        data-shown={frame === 1}
        style={{ ...box, left }}
      >
        <span className="rounded-sm bg-destructive/10 p-0.5 text-destructive">
          <X className="size-3" />
        </span>
        {station.gap}
      </div>
      <div
        className="intro-station intro-mine absolute rounded-lg border-2 border-primary p-[11px] text-[13px] leading-[18px]"
        data-shown={frame >= 2}
        style={{ ...box, left }}
      >
        <div className="mb-2 font-semibold">{station.title}</div>
        {station.tasks?.map((task, i) => (
          <div
            key={i}
            className={cn(row, 'intro-task gap-2 text-xs')}
            style={{ '--row': i } as React.CSSProperties}
          >
            <span className="font-mono text-[11px] text-muted-foreground">{i + 1}</span>
            <span className="truncate">{task}</span>
          </div>
        ))}
        {station.file && (
          <div className="absolute right-[11px] bottom-2 left-[11px] truncate font-mono text-[11px] leading-4 text-muted-foreground">
            {station.file}
          </div>
        )}
      </div>
    </>
  )
}
