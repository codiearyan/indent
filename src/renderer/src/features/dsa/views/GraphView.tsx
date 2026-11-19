import { cn } from '@/lib/utils'
import { MOVE, toneLine, toneShape } from '../tones'
import type { GraphFrame } from '../types'
import { FrameLabel } from './FrameLabel'
import { arrowPath, pathStyle } from './svgPath'

const WIDTH = 640
const HEIGHT = 320
const PAD = 36
const R = 18
// Two edges between the same pair in opposite directions each shift this far to their own side.
const PAIR_OFFSET = 5

const chipWidth = (text: string): number => text.length * 6.2 + 10

export function GraphView({ frame }: { frame: GraphFrame }): React.JSX.Element {
  const pos = new Map(
    frame.nodes.map((node) => [
      node.id,
      { x: PAD + node.x * (WIDTH - PAD * 2), y: PAD + node.y * (HEIGHT - PAD * 2) }
    ])
  )
  const pairs = new Set(frame.edges.map((edge) => `${edge.from}->${edge.to}`))
  const used = new Map<string, number>()

  const edges = frame.edges.flatMap((edge) => {
    const a = pos.get(edge.from)
    const b = pos.get(edge.to)
    if (!a || !b || edge.from === edge.to) return []
    const id = `${edge.from}->${edge.to}`
    const count = used.get(id) ?? 0
    used.set(id, count + 1)

    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const ux = (b.x - a.x) / len
    const uy = (b.y - a.y) / len
    const off = pairs.has(`${edge.to}->${edge.from}`) ? PAIR_OFFSET : 0
    const px = -uy * off
    const py = ux * off
    const start = { x: a.x + ux * R + px, y: a.y + uy * R + py }
    const end = { x: b.x - ux * (R + 1) + px, y: b.y - uy * (R + 1) + py }
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
    const d = frame.directed
      ? arrowPath(start, mid, end)
      : `M ${start.x} ${start.y} L ${end.x} ${end.y}`
    return [{ ...edge, key: count ? `${id}#${count}` : id, d, mid }]
  })

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {frame.label && <FrameLabel>{frame.label}</FrameLabel>}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-80 w-full overflow-visible" role="img">
        {edges.map((edge) => (
          <path
            key={edge.key}
            className={cn('fill-none', MOVE, toneLine[edge.tone ?? 'none'])}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={pathStyle(edge.d)}
          />
        ))}
        {edges.map((edge) =>
          edge.label ? (
            <g
              key={edge.key}
              className={MOVE}
              style={{ transform: `translate(${edge.mid.x}px, ${edge.mid.y}px)` }}
            >
              <rect
                x={-chipWidth(edge.label) / 2}
                y={-8}
                width={chipWidth(edge.label)}
                height={16}
                rx={4}
                className="fill-card"
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-muted-foreground font-mono text-[11px]"
              >
                {edge.label}
              </text>
            </g>
          ) : null
        )}
        {frame.nodes.map((node) => {
          const at = pos.get(node.id) ?? { x: 0, y: 0 }
          const tone = node.tone ?? 'none'
          return (
            <g
              key={node.id}
              className={MOVE}
              style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
            >
              <circle r={R} className="fill-card" />
              <circle r={R} className={cn(MOVE, toneShape[tone])} strokeWidth={1.5} />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                className={cn(
                  'font-mono text-[13px]',
                  MOVE,
                  tone === 'muted' ? 'fill-muted-foreground' : 'fill-foreground'
                )}
              >
                {node.label}
              </text>
              {node.badge !== undefined && (
                <g transform={`translate(${R * 0.55} ${-R * 0.55 - 14})`}>
                  <rect
                    width={chipWidth(node.badge)}
                    height={14}
                    rx={7}
                    className="fill-card stroke-border"
                  />
                  <text
                    x={chipWidth(node.badge) / 2}
                    y={7}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-foreground font-mono text-[10px]"
                  >
                    {node.badge}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
