import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
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
    <div className="space-y-6">
      <PatternHeader pattern={pattern} />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
        <section
          aria-label="Animation"
          className="flex min-w-0 flex-col gap-5 rounded-lg border border-border p-5"
        >
          {/* Controls and the note stay in view above the frames, however tall the stage gets. */}
          <div className="sticky top-0 z-10 -mx-5 -mt-5 space-y-3 rounded-t-lg border-b border-rule bg-card px-5 pt-5 pb-4">
            <Player player={player} />
            <p aria-live="polite" className="h-12 overflow-y-auto text-sm leading-6">
              {step.note}
            </p>
            <Vars vars={step.vars} />
          </div>
          <Frames frames={step.frames} />
        </section>
        <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-0 lg:self-start">
          <CodeView code={pattern.code} lines={step.lines} />
          <InputPanel pattern={pattern} onRun={setSteps} />
        </div>
      </div>

      <section
        aria-label="About this pattern"
        className="grid overflow-hidden rounded-lg border border-border md:grid-cols-2"
      >
        <Panel title="The idea">
          <Markdown compact>{pattern.idea}</Markdown>
        </Panel>
        <Panel title="Reach for it when" className="border-t md:border-t-0 md:border-l">
          <BulletList items={pattern.signals} />
        </Panel>
        <Panel title="Complexity" className="border-t">
          <div className="flex gap-8">
            {(['time', 'space'] as const).map((key) => (
              <div key={key}>
                <div className="text-[13px] text-muted-foreground capitalize">{key}</div>
                <div className="mt-0.5 font-mono text-sm">{pattern.complexity[key]}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6">{pattern.complexity.why}</p>
        </Panel>
        <Panel title="Common mistakes" className="border-t md:border-l">
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
    <header>
      <Link
        to="/dsa"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-foreground"
      >
        <ArrowLeft className="size-4" strokeWidth={1.5} />
        DSA patterns
      </Link>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-7 font-semibold">{pattern.title}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{pattern.group}</p>
        </div>
        <div className="flex items-center gap-1">
          <NeighborButton pattern={prev} direction="Previous" />
          <NeighborButton pattern={next} direction="Next" />
        </div>
      </div>
      <div className="mt-4 max-w-3xl">
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
    <div className="flex min-h-56 min-w-0 items-start justify-center gap-8">
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
    <div className="flex min-h-6 flex-wrap gap-1.5">
      {Object.entries(vars ?? {}).map(([name, value]) => (
        <span
          key={name}
          className={cn(
            'flex h-6 items-center gap-1.5 rounded-sm border px-2 font-mono text-xs',
            name === 'answer'
              ? 'border-success/40 bg-success/10 text-success'
              : 'border-border bg-muted'
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
  className,
  children
}: {
  title: string
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className={cn('min-w-0 border-rule p-5', className)}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  )
}

function BulletList({ items }: { items: string[] }): React.JSX.Element {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 marker:text-muted-foreground">
      {items.map((item) => (
        <li key={item}>
          <InlineCode text={item} />
        </li>
      ))}
    </ul>
  )
}

/** Pattern notes mark code with backticks; show those spans as code. */
function InlineCode({ text }: { text: string }): React.JSX.Element {
  return (
    <>
      {text.split('`').map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]">
            {part}
          </code>
        ) : (
          part
        )
      )}
    </>
  )
}
