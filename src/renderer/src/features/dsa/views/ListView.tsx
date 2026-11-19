import { cn } from '@/lib/utils'
import { MOVE, toneBox, toneText } from '../tones'
import type { ListFrame } from '../types'
import { FrameLabel } from './FrameLabel'
import { arrowPath, pathStyle, type Point } from './svgPath'

const W = 48
const H = 36
const GAP = 48
const PAD = 8
const ARC = 52
const POINTER_ROW = 18
const POINTER_ROWS = 3
const NULL_W = 32

const ROW_TOP = ARC
const MID = ARC + H / 2
const POINTERS_TOP = ARC + H + 6
const HEIGHT = POINTERS_TOP + POINTER_ROW * POINTER_ROWS + 2

const left = (i: number): number => PAD + i * (W + GAP)
const center = (i: number): number => left(i) + W / 2

function linkPath(from: number, to: number | 'null' | undefined): string {
  const sx = left(from) + W
  if (to === 'null' || to === undefined) {
    const end = { x: sx + (to === 'null' ? 16 : 1), y: MID }
    return arrowPath({ x: sx, y: MID }, { x: (sx + end.x) / 2, y: MID }, end)
  }
  if (to === from + 1) {
    const ex = left(to) - 1
    return arrowPath({ x: sx, y: MID }, { x: (sx + ex) / 2, y: MID }, { x: ex, y: MID })
  }
  const dir = to >= from ? 1 : -1
  const start: Point = { x: center(from) + dir * 8, y: ROW_TOP }
  const end: Point = { x: center(to) - dir * 8, y: ROW_TOP - 1 }
  const peak = Math.min(ARC - 8, 16 + 7 * Math.max(Math.abs(to - from), 1))
  return arrowPath(start, { x: (start.x + end.x) / 2, y: ROW_TOP - 2 * peak }, end)
}

function tailOfFirst(frame: ListFrame): string | null {
  const byId = new Map(frame.nodes.map((node) => [node.id, node]))
  const seen = new Set<string>()
  let node: ListFrame['nodes'][number] | undefined = frame.nodes[0]
  while (node && !seen.has(node.id)) {
    seen.add(node.id)
    if (node.next === null) return node.id
    node = byId.get(node.next)
  }
  return null
}

export function ListView({ frame }: { frame: ListFrame }): React.JSX.Element {
  const n = frame.nodes.length
  const index = new Map(frame.nodes.map((node, i) => [node.id, i]))
  const tail = tailOfFirst(frame)
  const nullX = n > 0 ? left(n - 1) + W + 20 : PAD
  const width = nullX + NULL_W + PAD

  const rows = new Map<string, number>()
  const pointers = (frame.pointers ?? []).map((pointer) => {
    const at = pointer.node === null ? undefined : index.get(pointer.node)
    const slot = at === undefined ? 'null' : String(at)
    const row = rows.get(slot) ?? 0
    rows.set(slot, row + 1)
    const x = at === undefined ? nullX + NULL_W / 2 - 3 : center(at)
    return { ...pointer, x, row: Math.min(row, POINTER_ROWS - 1) }
  })

  const last = frame.nodes[n - 1]
  const showSlotNull = n === 0 || last?.next === null || rows.has('null')

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {frame.label && <FrameLabel>{frame.label}</FrameLabel>}
      <div className="w-full overflow-x-auto">
        <div className="relative mx-auto" style={{ width, height: HEIGHT }}>
          <svg
            width={width}
            height={HEIGHT}
            className="pointer-events-none absolute inset-0 overflow-visible"
            aria-hidden
          >
            {frame.nodes.map((node, i) => {
              const nullShown = node.next === null && (i === n - 1 || node.id === tail)
              const target = node.next === null ? undefined : index.get(node.next)
              const visible = target !== undefined || nullShown
              return (
                <path
                  key={node.id}
                  className={cn('fill-none stroke-muted-foreground', MOVE, !visible && 'opacity-0')}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={pathStyle(linkPath(i, nullShown ? 'null' : target))}
                />
              )
            })}
          </svg>

          {frame.nodes.map((node, i) => (
            <div
              key={node.id}
              className={cn(
                'absolute flex items-center justify-center overflow-hidden rounded-md border px-1 font-mono text-[13px]',
                MOVE,
                toneBox[node.tone ?? 'none']
              )}
              style={{ left: left(i), top: ROW_TOP, width: W, height: H }}
              title={String(node.value)}
            >
              <span className="truncate">{node.value}</span>
            </div>
          ))}

          {frame.nodes.map((node, i) =>
            i < n - 1 ? (
              <span
                key={`null-${node.id}`}
                className={cn(
                  'absolute font-mono text-[11px] leading-4 text-muted-foreground',
                  MOVE,
                  (node.next !== null || node.id !== tail) && 'opacity-0'
                )}
                style={{ left: left(i) + W + 19, top: MID - 8 }}
              >
                null
              </span>
            ) : null
          )}
          <span
            className={cn(
              'absolute font-mono text-[11px] leading-4 text-muted-foreground',
              MOVE,
              !showSlotNull && 'opacity-0'
            )}
            style={{ left: nullX, top: MID - 8 }}
          >
            null
          </span>

          {pointers.map((pointer) => (
            <div
              key={pointer.label}
              className={cn(
                'absolute top-0 left-0 flex flex-col items-center',
                MOVE,
                toneText[pointer.tone ?? 'none']
              )}
              style={{
                height: POINTER_ROW,
                transform: `translate(${pointer.x}px, ${POINTERS_TOP + pointer.row * POINTER_ROW}px) translateX(-50%)`
              }}
            >
              <svg
                width="8"
                height="5"
                viewBox="0 0 8 5"
                className={cn('mb-px fill-current', MOVE, pointer.row > 0 && 'opacity-0')}
                aria-hidden
              >
                <path d="M0 5h8L4 0z" />
              </svg>
              <span className="font-mono text-xs leading-3 whitespace-nowrap">{pointer.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
