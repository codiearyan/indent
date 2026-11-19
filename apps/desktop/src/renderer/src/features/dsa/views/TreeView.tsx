import { cn } from '@/lib/utils'
import { MOVE, toneLine, toneShape, toneText } from '../tones'
import type { TreeFrame } from '../types'
import { FrameLabel } from './FrameLabel'
import { pathStyle } from './svgPath'
import { layoutTree } from './treeLayout'

const COL = 44
const ROW = 64
const PAD = 28
const R = 18
const MIN_SLOTS = 7
const MIN_ROWS = 4

export function TreeView({ frame }: { frame: TreeFrame }): React.JSX.Element {
  const slots = layoutTree(frame)
  // Sizing by the full node list keeps the scale steady while nodes are inserted or removed.
  const columns = Math.max(frame.nodes.length, slots.size, MIN_SLOTS)
  const offset = (columns - slots.size) / 2
  const depth = Math.max(0, ...[...slots.values()].map((slot) => slot.depth))
  const width = (columns - 1) * COL + PAD * 2
  const height = (Math.max(depth + 1, MIN_ROWS) - 1) * ROW + PAD * 2

  const pos = (id: string): { x: number; y: number } => {
    const slot = slots.get(id)
    if (!slot) return { x: 0, y: 0 }
    return { x: PAD + (slot.order + offset) * COL, y: PAD + slot.depth * ROW }
  }

  const drawn = frame.nodes.filter((node) => slots.has(node.id))
  const stack = new Map<string, number>()
  const pointers = (frame.pointers ?? [])
    .filter((pointer) => slots.has(pointer.node))
    .map((pointer) => {
      const row = stack.get(pointer.node) ?? 0
      stack.set(pointer.node, row + 1)
      const at = pos(pointer.node)
      return { ...pointer, x: at.x + R + 4, y: at.y - R + 6 + row * 13 }
    })

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {frame.label && <FrameLabel>{frame.label}</FrameLabel>}
      {slots.size === 0 ? (
        <div className="flex h-80 w-full items-center justify-center text-sm text-muted-foreground">
          empty tree
        </div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-80 w-full" role="img">
          {drawn.map((node) => {
            const parent = slots.get(node.id)?.parent
            if (!parent) return null
            const a = pos(parent)
            const b = pos(node.id)
            return (
              <path
                key={node.id}
                className={cn('fill-none', MOVE, toneLine.none)}
                strokeWidth={1.5}
                style={pathStyle(`M ${a.x} ${a.y} L ${b.x} ${b.y}`)}
              />
            )
          })}
          {drawn.map((node) => {
            const at = pos(node.id)
            const tone = node.tone ?? 'none'
            return (
              <g
                key={node.id}
                className={MOVE}
                style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
              >
                <NodeShape label={String(node.value)} className="fill-card" />
                <NodeShape
                  label={String(node.value)}
                  className={cn(MOVE, toneShape[tone])}
                  strokeWidth={1.5}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn(
                    'font-mono',
                    String(node.value).length > 3 ? 'text-[11px]' : 'text-[13px]',
                    MOVE,
                    tone === 'muted' ? 'fill-muted-foreground' : 'fill-foreground'
                  )}
                >
                  {node.value}
                </text>
              </g>
            )
          })}
          {pointers.map((pointer) => (
            <text
              key={pointer.label}
              dominantBaseline="central"
              className={cn(
                'fill-current font-mono text-[11px]',
                MOVE,
                toneText[pointer.tone ?? 'none']
              )}
              style={{ transform: `translate(${pointer.x}px, ${pointer.y}px)` }}
            >
              {pointer.label}
            </text>
          ))}
        </svg>
      )}
    </div>
  )
}

/** A circle for short labels; a pill that grows with the text for longer ones. */
function NodeShape({
  label,
  ...props
}: { label: string } & React.SVGProps<SVGRectElement>): React.JSX.Element {
  const width = Math.max(2 * R, label.length * 7 + 14)
  return <rect x={-width / 2} y={-R} width={width} height={2 * R} rx={R} {...props} />
}
