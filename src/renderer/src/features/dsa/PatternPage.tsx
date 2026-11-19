import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSettings } from '@/stores/settings'
import { EmptyState } from '@/features/catalog/EmptyState'
import { IconButton } from '@/features/workspace/IconButton'
import { Markdown } from '@/features/workspace/Markdown'
import { CodeView } from './CodeView'
import { InputPanel } from './InputPanel'
import { Player } from './Player'
import { patterns, findPattern } from './registry'
import type { Frame, Pattern, Step } from './types'
import { usePlayer } from './usePlayer'
import { FrameView } from './views/FrameView'

export function PatternPage(): React.JSX.Element {
  const { patternId } = useParams()
  const pattern = findPattern(patternId)
  if (!pattern) {
    return (
      <EmptyState title="This pattern does not exist">
        <Button variant="outline" size="sm" asChild>
          <Link to="/dsa">Back to DSA patterns</Link>
        </Button>
      </EmptyState>
    )
  }
  return <PatternView key={pattern.id} pattern={pattern} />
}

function PatternView({ pattern }: { pattern: Pattern }): React.JSX.Element {
  const [steps, setSteps] = useState<Step[]>(() => pattern.build(pattern.presets[0].values))
  const player = usePlayer(steps)
  const step = steps[Math.min(player.index, steps.length - 1)]
  const markDsaWatched = useSettings((s) => s.markDsaWatched)
  const atEnd = player.index === steps.length - 1

  useEffect(() => {
    if (atEnd) markDsaWatched(pattern.id)
  }, [atEnd, markDsaWatched, pattern.id])

  return (
    <div className="space-y-8">
      <PatternHeader pattern={pattern} />

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:items-start">
        <section
          aria-label="Animation"
          className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-5"
        >
          {/* Controls and the note stay in view above the frames, however tall the stage gets. */}
          <div className="sticky top-0 z-10 -mx-5 -mt-5 space-y-4 rounded-t-xl bg-card px-5 pt-5">
            <Player player={player} />
            <p aria-live="polite" className="h-12 overflow-y-auto text-sm leading-6">
              {step.note}
            </p>
            <Vars vars={step.vars} />
          </div>
          <Frames frames={step.frames} />
        </section>
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-0">
          <CodeView code={pattern.code} lines={step.lines} />
          <div className="rounded-xl border border-border bg-card p-5">
            <InputPanel pattern={pattern} onRun={setSteps} />
          </div>
        </div>
      </div>

      <section aria-label="About this pattern" className="grid gap-4 md:grid-cols-2">
        <Panel title="The idea">
          <Markdown compact>{pattern.idea}</Markdown>
        </Panel>
        <Panel title="Reach for it when">
          <BulletList items={pattern.signals} />
        </Panel>
        <Panel title="Complexity">
          <div className="flex flex-wrap gap-2 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              Time
              <Badge variant="outline" className="font-mono">
                {pattern.complexity.time}
              </Badge>
            </span>
            <span className="flex items-center gap-1.5">
              Space
              <Badge variant="outline" className="font-mono">
                {pattern.complexity.space}
              </Badge>
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground/85">{pattern.complexity.why}</p>
        </Panel>
        <Panel title="Common mistakes">
          <BulletList items={pattern.mistakes} />
        </Panel>
      </section>
    </div>
  )
}

function PatternHeader({ pattern }: { pattern: Pattern }): React.JSX.Element {
  const at = patterns.indexOf(pattern)
  const prev = patterns[at - 1]
  const next = patterns[at + 1]
  return (
    <header className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="-ml-2.5 text-muted-foreground" asChild>
          <Link to="/dsa">
            <ArrowLeft />
            DSA patterns
          </Link>
        </Button>
        <div className="flex items-center gap-1">
          <NeighborButton pattern={prev} direction="Previous" />
          <NeighborButton pattern={next} direction="Next" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-medium tracking-tight">{pattern.title}</h1>
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {pattern.group}
        </Badge>
      </div>
      <div className="max-w-3xl">
        <Markdown compact>{pattern.problem}</Markdown>
      </div>
    </header>
  )
}

function NeighborButton({
  pattern,
  direction
}: {
  pattern: Pattern | undefined
  direction: 'Previous' | 'Next'
}): React.JSX.Element {
  const icon = direction === 'Previous' ? <ChevronLeft /> : <ChevronRight />
  if (!pattern) {
    return (
      <IconButton label={`No ${direction.toLowerCase()} pattern`} disabled>
        {icon}
      </IconButton>
    )
  }
  return (
    <IconButton label={`${direction}: ${pattern.title}`} asChild>
      <Link to={`/dsa/${pattern.id}`}>{icon}</Link>
    </IconButton>
  )
}

/** Tall, narrow stacks stand beside the other frames instead of pushing them down. */
function Frames({ frames }: { frames: Frame[] }): React.JSX.Element {
  const keyed = frames.map((frame, i) => ({ frame, key: i }))
  const isStack = (frame: Frame): boolean => frame.kind === 'bucket' && frame.shape === 'stack'
  const side = keyed.filter(({ frame }) => isStack(frame))
  const main = keyed.filter(({ frame }) => !isStack(frame))
  return (
    <div className="flex min-h-56 min-w-0 items-start justify-center gap-8 border-t border-border pt-5">
      <div className="min-w-0 flex-1 space-y-5">
        {main.map(({ frame, key }) => (
          <FrameView key={key} frame={frame} />
        ))}
      </div>
      {side.length > 0 && (
        <div className="shrink-0 space-y-5">
          {side.map(({ frame, key }) => (
            <FrameView key={key} frame={frame} />
          ))}
        </div>
      )}
    </div>
  )
}

function Vars({ vars }: { vars: Step['vars'] }): React.JSX.Element {
  return (
    <div className="flex min-h-7 flex-wrap gap-2">
      {Object.entries(vars ?? {}).map(([name, value]) => (
        <span
          key={name}
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-md border px-2 font-mono text-xs',
            name === 'answer'
              ? 'border-success/40 bg-success/10 text-success'
              : 'border-border bg-muted/40'
          )}
        >
          <span className={name === 'answer' ? undefined : 'text-muted-foreground'}>{name}</span>
          {value}
        </span>
      ))}
    </div>
  )
}

function Panel({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 text-sm font-medium">{title}</h2>
      {children}
    </div>
  )
}

function BulletList({ items }: { items: string[] }): React.JSX.Element {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground/85 marker:text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
