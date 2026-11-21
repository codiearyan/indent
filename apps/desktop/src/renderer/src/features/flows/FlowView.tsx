import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FlowScene } from '@shared/types'
import { cn } from '@/lib/utils'
import { layoutScene, NODE_H, NODE_W } from './layout'
import './flows.css'

const STATE = 'duration-(--motion-state) ease-out motion-reduce:transition-none'
/** Below this the labels get too small to read, so the scene scrolls instead. */
const MIN_SCALE = 0.7

interface Props {
  scene: FlowScene
  /** Node ids and `from->to` edges to emphasise. */
  active?: string[]
  /** Changes with every step, so the dot runs along the active lines again. */
  stepKey?: number
}

/** The boxes of a scene and the lines between them, scrolling sideways inside its own box. */
export function FlowView({ scene, active = [], stepKey = 0 }: Props): React.JSX.Element {
  const layout = useMemo(() => layoutScene(scene), [scene])
  const box = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState<number | null>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setRoom(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const fit = room === null ? 1 : room / layout.width
  const scale = fit >= 1 ? 1 : fit >= MIN_SCALE ? fit : 1
  const on = new Set(active)
  const arrow = useId()
  const summary = scene.nodes
    .map((node) => (node.mine ? `${node.label} (your part)` : node.label))
    .join(', ')

  return (
    <div ref={box} className="max-w-full overflow-x-auto">
      <div
        className="mx-auto"
        style={{ width: layout.width * scale, height: layout.height * scale }}
      >
        <div
          role="img"
          aria-label={summary}
          className="relative origin-top-left"
          style={{ width: layout.width, height: layout.height, transform: `scale(${scale})` }}
        >
          <svg width={layout.width} height={layout.height} className="absolute inset-0" aria-hidden>
            <defs>
              {(['idle', 'on'] as const).map((state) => (
                <marker
                  key={state}
                  id={`${arrow}-${state}`}
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="8"
                  markerHeight="8"
                  markerUnits="userSpaceOnUse"
                  orient="auto"
                >
                  <path
                    d="M0 0.5 7.5 4 0 7.5z"
                    className={state === 'on' ? 'fill-foreground' : 'fill-muted-foreground/70'}
                  />
                </marker>
              ))}
            </defs>
            {layout.edges.map((edge) => (
              <path
                key={edge.id}
                d={edge.d}
                fill="none"
                markerEnd={`url(#${arrow}-${on.has(edge.id) ? 'on' : 'idle'})`}
                className={cn(
                  'transition-[stroke,stroke-width]',
                  STATE,
                  on.has(edge.id)
                    ? 'stroke-foreground stroke-2'
                    : 'stroke-muted-foreground/50 stroke-1'
                )}
              />
            ))}
            {layout.edges.map(
              (edge) =>
                edge.label && (
                  <text
                    key={edge.id}
                    x={edge.labelAt.x}
                    y={edge.labelAt.y - 5}
                    textAnchor="middle"
                    paintOrder="stroke"
                    strokeWidth={4}
                    strokeLinejoin="round"
                    className={cn(
                      'stroke-card text-[11px]',
                      on.has(edge.id) ? 'fill-foreground' : 'fill-muted-foreground'
                    )}
                  >
                    {edge.label}
                  </text>
                )
            )}
          </svg>

          {layout.edges
            .filter((edge) => on.has(edge.id))
            .map((edge) => (
              <span
                key={`${stepKey}:${edge.id}`}
                className="flow-dot bg-foreground"
                style={{ offsetPath: `path("${edge.d}")` }}
              />
            ))}

          {layout.nodes.map((node) => (
            <div
              key={node.id}
              title={node.label}
              className={cn(
                'absolute flex flex-col justify-center rounded-md border px-2.5',
                'outline-2 outline-offset-2 transition-[outline-color]',
                STATE,
                on.has(node.id) ? 'outline-foreground' : 'outline-transparent',
                'bg-card text-foreground',
                node.mine ? 'border-2 border-primary' : 'border-border',
                node.kind === 'data' && !node.mine && 'border-dashed'
              )}
              style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
            >
              <span
                className={cn(
                  'line-clamp-2 leading-4 wrap-anywhere',
                  node.kind === 'file' || node.kind === 'function'
                    ? 'font-mono text-xs'
                    : 'text-[13px]'
                )}
              >
                {node.label}
              </span>
              {node.mine && (
                <span className="text-[11px] leading-4 text-muted-foreground">Your part</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
