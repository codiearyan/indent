import { useMemo } from 'react'
import { Check, Circle, X } from 'lucide-react'
import { edgeId } from '@shared/flow'
import type { FlowScene, FlowStep } from '@shared/types'
import { cn } from '@/lib/utils'
import { Player } from '@/features/dsa/Player'
import { usePlayer } from '@/features/dsa/usePlayer'
import { FrameView } from '@/features/dsa/views/FrameView'
import { FlowView } from './FlowView'
import type { TraceRow } from './traceView'

/** A task's flow, played step by step over the issue's scene. */
export function FlowPlayer({
  scene,
  steps,
  rows
}: {
  scene: FlowScene
  steps: FlowStep[]
  rows?: TraceRow[]
}): React.JSX.Element {
  const player = usePlayer(steps)
  const index = Math.min(player.index, steps.length - 1)
  const step = steps[index]
  const row = rows?.[index]
  const Mark = row?.status === 'went elsewhere' ? X : row?.status === 'reached' ? Check : Circle
  const taskScene = useMemo(() => {
    // A task shows only the parts its steps touch, and only those are the learner's here.
    const touched = new Set(steps.flatMap((s) => s.active))
    const edges = scene.edges.filter((edge) => touched.has(edgeId(edge)))
    const kept = new Set([...touched, ...edges.flatMap((edge) => [edge.from, edge.to])])
    const nodes = scene.nodes.filter((node) => kept.has(node.id))
    if (nodes.length === 0) return scene
    return {
      ...scene,
      nodes: nodes.map((node) => ({ ...node, mine: node.mine && touched.has(node.id) })),
      edges: scene.edges.filter((edge) => kept.has(edge.from) && kept.has(edge.to))
    }
  }, [scene, steps])

  return (
    <div className="space-y-3">
      <FlowView scene={taskScene} active={step.active} stepKey={index} />
      {steps.some((s) => s.value) && (
        // Every value is laid in the same cell, so the player keeps the height of the tallest.
        <div className="grid">
          {steps.map(
            (s, i) =>
              s.value && (
                <div
                  key={i}
                  aria-hidden={i !== index}
                  className={cn('[grid-area:1/1]', i !== index && 'invisible')}
                >
                  <FrameView frame={s.value} fit />
                </div>
              )
          )}
        </div>
      )}
      <div aria-live="polite" className="space-y-1 text-sm">
        <p className="flex items-start gap-2">
          {row && (
            <>
              <Mark
                aria-hidden="true"
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  row.status === 'went elsewhere'
                    ? 'text-destructive'
                    : row.status === 'reached'
                      ? 'text-success'
                      : 'text-muted-foreground'
                )}
              />
              <span className="sr-only">{row.status}. </span>
            </>
          )}
          <span className="min-w-0 break-words">{row?.note ?? step.note}</span>
        </p>
        {row?.returned !== undefined && (
          <p className="break-words text-xs text-muted-foreground">
            Your code returned <code>{row.returned}</code>
          </p>
        )}
      </div>
      <Player player={player} embedded />
    </div>
  )
}

/** A scene without steps, with its note under it. */
export function FlowFigure({ scene }: { scene: FlowScene }): React.JSX.Element {
  return (
    <figure className="space-y-3">
      <FlowView scene={scene} />
      <figcaption className="text-[13px] text-muted-foreground">{scene.note}</figcaption>
    </figure>
  )
}
