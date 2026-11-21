import { useMemo } from 'react'
import { edgeId } from '@shared/flow'
import type { FlowScene, FlowStep } from '@shared/types'
import { cn } from '@/lib/utils'
import { Player } from '@/features/dsa/Player'
import { usePlayer } from '@/features/dsa/usePlayer'
import { FrameView } from '@/features/dsa/views/FrameView'
import { FlowView } from './FlowView'

/** A task's flow, played step by step over the issue's scene. */
export function FlowPlayer({
  scene,
  steps
}: {
  scene: FlowScene
  steps: FlowStep[]
}): React.JSX.Element {
  const player = usePlayer(steps)
  const index = Math.min(player.index, steps.length - 1)
  const step = steps[index]
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
                  <FrameView frame={s.value} />
                </div>
              )
          )}
        </div>
      )}
      <p aria-live="polite" className="text-sm">
        {step.note}
      </p>
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
