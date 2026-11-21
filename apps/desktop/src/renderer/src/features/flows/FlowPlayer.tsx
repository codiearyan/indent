import type { FlowScene, FlowStep } from '@shared/types'
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
  const step = steps[Math.min(player.index, steps.length - 1)]

  return (
    <div className="space-y-3">
      <FlowView scene={scene} active={step.active} stepKey={player.index} />
      {step.value && <FrameView frame={step.value} />}
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
