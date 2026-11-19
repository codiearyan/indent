import { cn } from '@/lib/utils'
import { MOVE, toneBox, toneText } from '../tones'
import type { BucketFrame } from '../types'
import { FrameLabel } from './FrameLabel'

const ITEM = 36
const ITEM_STEP = ITEM + 4
const VISIBLE = 6

type Item = BucketFrame['items'][number]

function Empty(): React.JSX.Element {
  return <span className="m-auto text-xs text-muted-foreground">empty</span>
}

function Marker({
  label,
  caret,
  offset,
  hidden
}: {
  label: string
  caret: 'up' | 'down'
  offset: number
  hidden: boolean
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'absolute top-0 left-0 flex h-5 w-11 items-center justify-center gap-0.5',
        caret === 'up' ? 'flex-col-reverse' : 'flex-col',
        MOVE,
        toneText.none,
        hidden && 'opacity-0'
      )}
      style={{ transform: `translateX(${offset}px)` }}
    >
      <span className="font-mono text-xs leading-3">{label}</span>
      <svg width="8" height="5" viewBox="0 0 8 5" className="fill-current" aria-hidden>
        <path d={caret === 'down' ? 'M0 0h8L4 5z' : 'M0 5h8L4 0z'} />
      </svg>
    </div>
  )
}

function Stack({ items }: { items: Item[] }): React.JSX.Element {
  const visible = Math.min(items.length, VISIBLE)
  return (
    <div className="relative">
      <div
        className={cn(
          'absolute right-full bottom-1.5 mr-2 flex h-9 items-center gap-1',
          MOVE,
          toneText.none,
          items.length === 0 && 'opacity-0'
        )}
        style={{ transform: `translateY(${-Math.max(visible - 1, 0) * ITEM_STEP}px)` }}
      >
        <span className="font-mono text-xs">top</span>
        <svg width="5" height="8" viewBox="0 0 5 8" className="fill-current" aria-hidden>
          <path d="M0 0v8l5-4z" />
        </svg>
      </div>
      <div className="flex h-[248px] w-24 flex-col gap-1 overflow-y-auto rounded-b-md border-x-2 border-b-2 border-muted-foreground/40 p-1">
        {items.length === 0 && <Empty />}
        {[...items].reverse().map((item, i) => (
          <div
            key={item.key}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-md border px-1 font-mono text-sm',
              'animate-in fade-in slide-in-from-top-2 motion-reduce:animate-none',
              MOVE,
              toneBox[item.tone ?? 'none'],
              i === 0 && 'mt-auto'
            )}
            style={{ height: ITEM }}
          >
            <span className="truncate">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Queue({ items }: { items: Item[] }): React.JSX.Element {
  const empty = items.length === 0
  return (
    <div className="max-w-full overflow-x-auto">
      <div className="w-max min-w-[300px]">
        <div className="relative h-5">
          <Marker label="front" caret="down" offset={4} hidden={empty} />
        </div>
        <div className="flex h-[52px] items-center gap-1 border-y-2 border-muted-foreground/40 px-1">
          {empty && <Empty />}
          {items.map((item) => (
            <div
              key={item.key}
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-md border px-0.5 font-mono text-sm',
                'animate-in fade-in slide-in-from-right-2 motion-reduce:animate-none',
                MOVE,
                toneBox[item.tone ?? 'none']
              )}
            >
              <span className="truncate">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="relative h-5">
          <Marker
            label="back"
            caret="up"
            offset={4 + Math.max(items.length - 1, 0) * 48}
            hidden={empty}
          />
        </div>
      </div>
    </div>
  )
}

export function BucketView({ frame }: { frame: BucketFrame }): React.JSX.Element {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      {frame.label && <FrameLabel>{frame.label}</FrameLabel>}
      {frame.shape === 'stack' ? <Stack items={frame.items} /> : <Queue items={frame.items} />}
    </div>
  )
}
